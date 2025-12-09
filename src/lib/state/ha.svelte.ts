
import { browser } from '$app/environment';
import { constructHaUrl } from '../utils/url';
import { mapEntitiesToRooms } from '../utils/ha-data-mapper';
import type { ConnectionStatus, HassEntity, HassArea, HassDevice, HassEntityRegistryEntry, Device } from '../types';

// Svelte 5 Runes declarations
declare const $state: <T>(value: T) => T;
declare const $derived: {
    <T>(value: T): T;
    by<T>(fn: () => T): T;
};

// Global message ID counter
let globalMessageId = 1;

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
    });

    socket: WebSocket | null = null;
    callbacks = new Map<number, { resolve: (val: any) => void, reject: (err: any) => void }>();
    connectionTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor() {}

    connect(url: string, token: string) {
        if (!browser) return;
        
        // Reset state
        this.cleanup();
        this.connectionStatus = 'connecting';
        this.isLoading = true;
        this.error = null;
        this.haUrl = url;

        // Set safety timeout (15s)
        this.connectionTimeout = setTimeout(() => {
            if (this.connectionStatus !== 'connected') {
                this.disconnect("Connection timed out. Check URL and network.");
            }
        }, 15000);

        try {
            const wsUrl = constructHaUrl(url, '/api/websocket', 'ws');
            console.log('[HA] Connecting to:', wsUrl);
            
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.log('[HA] WebSocket connected, waiting for auth...');
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
                if (this.connectionStatus === 'connecting' || this.connectionStatus === 'connected') {
                    this.connectionStatus = 'failed';
                    this.error = this.error || 'Connection closed by server.';
                } else {
                    this.connectionStatus = 'idle';
                }
                this.isLoading = false;
            };

            this.socket.onerror = (e) => {
                console.error('[HA] Socket error', e);
                // onError usually precedes onClose, so we handle state update in onClose or timeout
                if (!this.error) this.error = "WebSocket error (check console)";
            };

        } catch (e) {
            console.error('[HA] Connect exception:', e);
            this.connectionStatus = 'failed';
            this.error = 'Failed to create WebSocket. Invalid URL?';
            this.isLoading = false;
        }
    }

    disconnect(reason?: string) {
        this.cleanup();
        this.connectionStatus = 'failed';
        this.error = reason || 'Disconnected';
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
                console.log('[HA] Auth required, sending token...');
                this.sendMessage({ type: 'auth', access_token: token });
                break;
            
            case 'auth_ok':
                console.log('[HA] Auth OK. Fetching initial data...');
                // Do NOT set 'connected' yet. Wait for data.
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

        try {
            // Parallel fetch for speed
            const [states, areas, devices, reg] = await Promise.all([
                fetch('get_states'),
                fetch('config/area_registry/list'),
                fetch('config/device_registry/list'),
                fetch('config/entity_registry/list')
            ]);

            this.entities = (states as any[]).reduce((acc: any, curr: any) => ({...acc, [curr.entity_id]: curr}), {});
            this.areas = areas as any[];
            this.devices = devices as any[];
            this.entityRegistry = reg as any[];
            
            // Subscribe to events after initial load
            this.sendMessage({ id: globalMessageId++, type: 'subscribe_events', event_type: 'state_changed' });

            // Only NOW mark as connected
            console.log('[HA] Initial data loaded. Ready.');
            if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
            this.connectionStatus = 'connected';
            this.isLoading = false;

        } catch (e) {
            console.error('[HA] Initial fetch error:', e);
            this.disconnect("Failed to load initial data from Home Assistant.");
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
