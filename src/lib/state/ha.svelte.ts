
import { browser } from '$app/environment';
import { mapEntitiesToRooms } from '$utils/ha-data-mapper';
import { loadSecure, saveSecure } from '$utils/secureStorage';
import type { ConnectionStatus, HassEntity, HassArea, HassDevice, HassEntityRegistryEntry, Device } from '$types';
import { HAConnectionManager } from '../ha-connection/HAConnectionManager';
import { EntityBatcher } from '../ha-connection/EntityBatcher';

declare function $state<T>(value: T): T;
declare function $derived<T>(value: T): T;
declare namespace $derived {
    function by<T>(fn: () => T): T;
}

class HomeAssistant {
    // UI State
    connectionStatus = $state<ConnectionStatus>('idle');
    error = $state<string | null>(null);
    
    // Data State
    entities = $state<Record<string, HassEntity>>({});
    areas = $state<HassArea[]>([]);
    devices = $state<HassDevice[]>([]);
    entityRegistry = $state<HassEntityRegistryEntry[]>([]);

    // Managers
    private connection: HAConnectionManager | null = null;
    private batcher: EntityBatcher;

    // Derived: Mapped Devices
    allKnownDevices = $derived.by(() => {
        try {
            const rooms = mapEntitiesToRooms(
                Object.values(this.entities), 
                this.areas, 
                this.devices, 
                this.entityRegistry, 
                {}, // Customizations (todo: inject from appState via a separate helper to avoid circular dep)
                true
            );
            
            // Flatten for O(1) access
            const map: Record<string, Device> = {};
            rooms.forEach(r => r.devices.forEach(d => map[d.id] = d));
            return map;
        } catch (e) {
            console.error('[HA] Error mapping entities:', e);
            return {};
        }
    });

    constructor() {
        this.batcher = new EntityBatcher((updates) => {
            this.applyEntityUpdates(updates);
        });

        if (browser) {
            this.tryAutoConnect();
        }
    }

    private tryAutoConnect() {
        const savedUrl = localStorage.getItem('ha-url');
        const savedToken = loadSecure('ha-token', null);
        
        if (savedUrl && savedToken) {
            this.connect(savedUrl, savedToken);
        }
    }

    public connect(url: string, token: string) {
        if (!browser) return;

        // Persist credentials
        localStorage.setItem('ha-url', url);
        saveSecure('ha-token', token);

        // Teardown existing
        if (this.connection) this.connection.disconnect();

        // Initialize Connection Manager
        this.connection = new HAConnectionManager({
            url,
            token,
            onStateChange: (status, err) => {
                this.connectionStatus = status;
                if (err) this.error = err;
                if (status === 'connected') this.handleConnected();
                if (status === 'connecting') this.error = null;
            },
            onMessage: (data) => this.handleMessage(data)
        });

        this.connection.connect();
    }

    public disconnect() {
        if (this.connection) {
            this.connection.disconnect();
        }
        localStorage.removeItem('ha-token');
    }

    // --- Logic Handling ---

    private async handleConnected() {
        console.log('[HA] Connected. Fetching registry...');
        
        try {
            // Parallel fetch for static config data
            const [areas, devices, registry] = await Promise.all([
                this.connection?.send({ type: 'config/area_registry/list' }),
                this.connection?.send({ type: 'config/device_registry/list' }),
                this.connection?.send({ type: 'config/entity_registry/list' })
            ]);

            this.areas = areas || [];
            this.devices = devices || [];
            this.entityRegistry = registry || [];

            // Get initial states
            const states = await this.connection?.send({ type: 'get_states' });
            const entityMap: Record<string, HassEntity> = {};
            if (states) {
                states.forEach((e: HassEntity) => entityMap[e.entity_id] = e);
                this.entities = entityMap;
            }

            // Subscribe to events
            this.connection?.send({ type: 'subscribe_events', event_type: 'state_changed' });

        } catch (e: any) {
            console.error('[HA] Initial fetch failed:', e);
            this.error = "Failed to load HA configuration.";
        }
    }

    private handleMessage(data: any) {
        if (data.type === 'event' && data.event?.event_type === 'state_changed') {
            const { entity_id, new_state } = data.event.data;
            // Queue update for batching
            this.batcher.enqueue(entity_id, new_state);
        }
    }

    private applyEntityUpdates(updates: Record<string, any>) {
        // Create a shallow copy to trigger reactivity efficiently
        const nextEntities = { ...this.entities };
        let hasChanges = false;

        for (const [id, state] of Object.entries(updates)) {
            if (state === null) {
                if (nextEntities[id]) {
                    delete nextEntities[id];
                    hasChanges = true;
                }
            } else {
                nextEntities[id] = state;
                hasChanges = true;
            }
        }

        if (hasChanges) {
            this.entities = nextEntities;
        }
    }

    // --- Public API ---

    public async callService(domain: string, service: string, service_data: object) {
        if (!this.connection) return;
        try {
            await this.connection.send({
                type: 'call_service',
                domain,
                service,
                service_data
            });
        } catch (e) {
            console.error('[HA] Service call failed:', e);
        }
    }
}

export const ha = new HomeAssistant();
