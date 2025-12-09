
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
    connectionStatus = $state<string>('idle');
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
            {}, // Customizations (todo)
            true
        );
        // Flatten for easy access by ID
        const map: Record<string, Device> = {};
        rooms.forEach(r => r.devices.forEach(d => map[d.id] = d));
        return map;
    });

    socket: WebSocket | null = null;
    callbacks = new Map<number, { resolve: (val: any) => void, reject: (err: any) => void }>();

    constructor() {}

    connect(url: string, token: string) {
        if (!browser) return;
        if (this.socket) this.socket.close();

        this.connectionStatus = 'connecting';
        this.isLoading = true;
        this.error = null;
        this.haUrl = url;

        try {
            const wsUrl = constructHaUrl(url, '/api/websocket', 'ws');
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => console.log('WebSocket connected');

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data, token);
            };

            this.socket.onclose = () => {
                this.connectionStatus = 'idle';
                this.isLoading = false;
            };

            this.socket.onerror = () => {
                this.connectionStatus = 'failed';
                this.error = 'WebSocket error';
                this.isLoading = false;
            };

        } catch (e) {
            this.connectionStatus = 'failed';
            this.error = 'Failed to connect';
            this.isLoading = false;
        }
    }

    sendMessage(msg: any) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(msg));
        }
    }

    handleMessage(data: any, token: string) {
        switch (data.type) {
            case 'auth_required':
                this.sendMessage({ type: 'auth', access_token: token });
                break;
            case 'auth_ok':
                this.connectionStatus = 'connected';
                this.initialFetch();
                break;
            case 'auth_invalid':
                this.connectionStatus = 'failed';
                this.error = data.message;
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
            
            this.isLoading = false;
            // Subscribe to events after initial load
            this.sendMessage({ id: globalMessageId++, type: 'subscribe_events', event_type: 'state_changed' });
        } catch (e) {
            console.error(e);
            this.error = "Failed to load data";
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
