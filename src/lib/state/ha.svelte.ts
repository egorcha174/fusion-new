
import { browser } from '$app/environment';
import { mapEntitiesToRooms } from '$utils/ha-data-mapper';
import type { ConnectionStatus, HassEntity, HassArea, HassDevice, HassEntityRegistryEntry, Device } from '$types';
import { haManager } from '$lib/modules/ha/manager.svelte';

declare function $state<T>(value: T): T;
declare function $derived<T>(value: T): T;
declare namespace $derived {
    function by<T>(fn: () => T): T;
}
declare function $effect(fn: () => void | (() => void)): void;

/**
 * Legacy Singleton для совместимости с существующими компонентами UI.
 * Теперь он выступает в роли прокси для haManager.
 */
class HomeAssistant {
    // UI State (Sync from haManager)
    connectionStatus = $state<ConnectionStatus>('idle');
    error = $state<string | null>(null);
    
    // Data State (Sync from haManager)
    entities = $state<Record<string, HassEntity>>({});
    areas = $state<HassArea[]>([]);
    devices = $state<HassDevice[]>([]);
    entityRegistry = $state<HassEntityRegistryEntry[]>([]);

    // Derived: Mapped Devices (Оставляем логику маппинга здесь, пока не перенесем в manager)
    allKnownDevices = $derived.by(() => {
        try {
            // Используем entities из haManager напрямую, если они там есть, или локальную копию
            const currentEntities = Object.keys(this.entities).length > 0 ? this.entities : haManager.entities;
            
            const rooms = mapEntitiesToRooms(
                Object.values(currentEntities), 
                this.areas, 
                this.devices, 
                this.entityRegistry, 
                {}, 
                true
            );
            
            const map: Record<string, Device> = {};
            rooms.forEach(r => r.devices.forEach(d => map[d.id] = d));
            return map;
        } catch (e) {
            console.error('[HA] Error mapping entities:', e);
            return {};
        }
    });

    constructor() {
        if (browser) {
            // Реактивная синхронизация с haManager
            $effect(() => {
                this.connectionStatus = haManager.status;
                this.error = haManager.lastError;
                this.entities = haManager.entities;
                
                // В будущем haManager должен загружать и эти данные
                // Пока оставим пустыми или перенесем логику загрузки в manager
            });
        }
    }

    // Proxy methods
    public callService(domain: string, service: string, service_data: object) {
        // @ts-ignore - доступ к приватному драйверу через any, либо нужно расширить API manager'а
        if (haManager['driver']) {
             // @ts-ignore
            haManager['driver'].sendCommand('call_service', { domain, service, service_data });
        }
    }
}

export const ha = new HomeAssistant();
