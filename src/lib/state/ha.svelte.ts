
import { browser } from '$app/environment';
import { constructHaUrl } from '../utils/url';
import { mapEntitiesToRooms } from '../utils/ha-data-mapper';
import { loadSecure, saveSecure } from '../utils/secureStorage';
import type { ConnectionStatus, HassEntity, HassArea, HassDevice, HassEntityRegistryEntry, Device } from '../types';

// Svelte 5 Runes declarations
declare const $state: <T>(value: T) => T;
declare const $derived: {
    <T>(value: T): T;
    by<T>(fn: () => T): T;
};

// Global message ID counter
let globalMessageId = 1;

const RECONNECT_DELAY_BASE = 2000;
const RECONNECT_DELAY_MAX = 30000;

class HomeAssistant {
    connectionStatus = $state<ConnectionStatus>('idle');
    isLoading = $state(false);
    error = $state<string | null>(null);
    haUrl = $state('');
    
    // Raw Data
    entities = $state<Record<string, HassEntity>>({});
    areas = $state<HassArea[]>([]);
    devices = $state<HassDevice[]>([]);
    entityRegistry = $state<HassEntityRegistryEntry[]>([]);

    // Derived Data
    allKnownDevices = $derived.by(() => {
        try {
            const rooms = mapEntitiesToRooms(
                Object.values(this.entities), 
                this.areas, 
                this.devices, 
                this.entityRegistry, 
                {}, // Customizations (todo: inject from appState)
                true
            );
            // Flatten for easy access by ID
            const map: Record<string, Device> = {};
            rooms.forEach(r => r.devices.forEach(d => map[d.id] = d));
            return map;
        } catch (e) {
            console.error('[HA] Error mapping entities:', e);
            return {};
        }
    });

    private socket: WebSocket | null = null;
    private callbacks = new Map<number, { resolve: (val: any) => void, reject: (err: any) => void }>();
    private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private reconnectAttempts = 0;
    private savedToken: string | null = null;

    constructor() {
        if (browser) {
            // Attempt to load saved credentials on startup
            const savedUrl = localStorage.getItem('ha-url');
            this.savedToken = loadSecure('ha-token', null);
            
            if (savedUrl && this.savedToken) {
                this.connect(savedUrl, this.savedToken);
            }
        }
    }

    connect(url: string, token: string) {
        if (!browser) return;
        
        // Save credentials securely
        localStorage.setItem('ha-url', url);
        saveSecure('ha-token', token);
        this.savedToken = token;
        
        this.internalConnect(url, token);
    }

    private internalConnect(url: string, token: string) {
        // Reset state for new connection attempt
        this.cleanup();
        this.connectionStatus = 'connecting';
        this.isLoading = true;
        this.error = null;
        this.haUrl = url;

        // Set safety timeout (15s)
        this.connectionTimeout = setTimeout(() => {
            if (this.connectionStatus !== 'connected') {
                this.handleConnectionFailure("Connection timed out. Check URL and network.");
            }
        }, 15000);

        try {
            const wsUrl = constructHaUrl(url, '/api/websocket', 'ws');
            console.log('[HA] Connecting to:', wsUrl);
            
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.log('[HA] WebSocket connected, waiting for auth...');
                // Clear reconnect counter on successful open
                this.reconnectAttempts = 0;
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data, token);
                } catch (e) {
                    console.error('[HA] JSON Parse error:', e);
                }
            };

            this.socket.onclose = (e) => {
                console.log('[HA] Socket closed', e.code, e.reason);
                this.handleConnectionFailure('Connection closed by server.');
            };

            this.socket.onerror = (e) => {
                console.error('[HA] Socket error', e);
                // onError usually precedes onClose, waiting for close to handle logic
            };

        } catch (e) {
            console.error('[HA] Connect exception:', e);
            this.handleConnectionFailure('Failed to create WebSocket. Invalid URL?');
        }
    }

    private handleConnectionFailure(reason: string) {
        this.cleanup();
        this.connectionStatus = 'failed';
        this.error = reason;
        this.isLoading = false;

        // Automatic Reconnection Logic
        if (this.savedToken && this.haUrl) {
            const delay = Math.min(RECONNECT_DELAY_BASE * Math.pow(1.5, this.reconnectAttempts), RECONNECT_DELAY_MAX);
            console.log(`[HA] Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempts + 1})...`);
            
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectAttempts++;
                this.internalConnect(this.haUrl, this.savedToken!);
            }, delay);
        }
    }

    disconnect(reason?: string) {
        this.savedToken = null; // Prevent auto-reconnect
        localStorage.removeItem('ha-token'); // Clear stored token
        this.cleanup();
        this.connectionStatus = 'failed';
        this.error = reason || 'Disconnected by user';
        this.isLoading = false;
    }

    private cleanup() {
        if (this.socket) {
            this.socket.onclose = null; // Prevent firing onclose during manual cleanup
            this.socket.close();
            this.socket = null;
        }
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.callbacks.clear();
    }

    sendMessage(msg: any) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(msg));
        } else {
            console.warn('[HA] Cannot send, socket not open', msg);
        }
    }

    handleMessage(data: any, token: string) {
        switch (data.type) {
            case 'auth_required':
                this.sendMessage({ type: 'auth', access_token: token });
                break;
            
            case 'auth_ok':
                console.log('[HA] Auth OK. Fetching initial data...');
                this.initialFetch();
                break;
            
            case 'auth_invalid':
                console.error('[HA] Auth invalid:', data.message);
                this.disconnect(`Authentication failed: ${data.message}`);
                break;
            
            case 'result':
                if (this.callbacks.has(data.id)) {
                    const cb = this.callbacks.get(data.id);
                    if (data.success) cb?.resolve(data.result);
                    else cb?.reject(data.error);
                    this.callbacks.delete(data.id);
                }
                break;
            
            case 'event':
                if (data.event.event_type === 'state_changed') {
                    const { entity_id, new_state } = data.event.data;
                    if (new_state) {
                        this.entities[entity_id] = new_state;
                    } else {
                        delete this.entities[entity_id];
                    }
                }
                break;
        }
    }

    async initialFetch() {
        const fetch = (type: string) => {
            return new Promise((resolve, reject) => {
                const id = globalMessageId++;
                this.callbacks.set(id, { resolve, reject });
                this.sendMessage({ id, type });
            });
        };

        const safeFetch = async (type: string, fallback: any = []) => {
            try {
                return await fetch(type);
            } catch (e) {
                console.warn(`[HA] Failed to fetch ${type}, using fallback.`, e);
                return fallback;
            }
        };

        try {
            const [statesResult, areasResult, devicesResult, regResult] = await Promise.allSettled([
                fetch('get_states'),
                safeFetch('config/area_registry/list'),
                safeFetch('config/device_registry/list'),
                safeFetch('config/entity_registry/list')
            ]);

            if (statesResult.status === 'rejected') {
                throw new Error("Failed to fetch states: " + statesResult.reason);
            }
            this.entities = (statesResult.value as any[]).reduce((acc: any, curr: any) => ({...acc, [curr.entity_id]: curr}), {});

            this.areas = areasResult.status === 'fulfilled' ? areasResult.value : [];
            this.devices = devicesResult.status === 'fulfilled' ? devicesResult.value : [];
            this.entityRegistry = regResult.status === 'fulfilled' ? regResult.value : [];
            
            this.sendMessage({ id: globalMessageId++, type: 'subscribe_events', event_type: 'state_changed' });

            if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
            this.connectionStatus = 'connected';
            this.isLoading = false;

        } catch (e: any) {
            console.error('[HA] Initial fetch error:', e);
            // Don't disconnect here, retry logic will handle if socket closes
            this.error = "Failed to load initial data.";
        }
    }

    callService(domain: string, service: string, service_data: object) {
        this.sendMessage({
            id: globalMessageId++,
            type: 'call_service',
            domain,
            service,
            service_data
        });
    }
}

export const ha = new HomeAssistant();
