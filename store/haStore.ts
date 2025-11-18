import { create } from 'zustand';
import { HassEntity, HassArea, HassDevice, HassEntityRegistryEntry, Device, Room, RoomWithPhysicalDevices, PhysicalDevice, DeviceType } from '../types';
import { constructHaUrl } from '../utils/url';
import { mapEntitiesToRooms, mapToAllKnownDevices, mapToRoomsWithPhysicalDevices } from '../utils/ha-data-mapper';
import { useAppStore } from './appStore';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'failed';

interface HassEntities {
  [key: string]: HassEntity;
}

interface HAState {
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  error: string | null;
  haUrl: string;
  entities: HassEntities;
  areas: HassArea[];
  devices: HassDevice[];
  entityRegistry: HassEntityRegistryEntry[];
  // Derived state
  readonly allKnownDevices: Map<string, Device>;
  readonly rooms: Room[];
  readonly allRoomsWithPhysicalDevices: RoomWithPhysicalDevices[];
  readonly allCameras: Device[];
  readonly batteryDevices: { deviceId: string; deviceName: string; batteryLevel: number }[];
  readonly allScenes: Device[];
  readonly allAutomations: Device[];
  readonly allScripts: Device[];
}

interface HAActions {
  connect: (url: string, token: string) => void;
  disconnect: () => void;
  callService: (domain: string, service: string, service_data: object) => void;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<{ url: string }>;
  getConfig: () => Promise<any>;
  getHistory: (entityIds: string[], startTime: string, endTime?: string) => Promise<any>;

  // Derived actions for convenience
  handleDeviceToggle: (deviceId: string) => void;
  handleTemperatureChange: (deviceId: string, temperature: number, isDelta?: boolean) => void;
  handleHvacModeChange: (deviceId: string, mode: string) => void;
  handleBrightnessChange: (deviceId: string, brightness: number) => void;
  handlePresetChange: (deviceId: string, preset: string) => void;
  handleFanSpeedChange: (deviceId: string, value: number | string) => void;
  triggerScene: (entityId: string) => void;
  triggerAutomation: (entityId: string) => void;
  triggerScript: (entityId: string) => void;
}

export const useHAStore = create<HAState & HAActions>((set, get) => {
  let socketRef: WebSocket | null = null;
  let messageIdRef = 1;
  const signPathCallbacks = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>();
  const cameraStreamCallbacks = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>();
  const configCallbacks = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>();
  const historyPeriodCallbacks = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>();
  let brightnessTimeoutRef: number | null = null;

  const sendMessage = (message: object) => {
    if (socketRef?.readyState === WebSocket.OPEN) {
      socketRef.send(JSON.stringify(message));
    }
  };

  return {
    connectionStatus: 'idle',
    isLoading: false,
    error: null,
    haUrl: '',
    entities: {},
    areas: [],
    devices: [],
    entityRegistry: [],

    get allKnownDevices() {
        const { entities } = get();
        const { customizations } = useAppStore.getState();
        const entitiesArray = Object.values(entities);
        return mapToAllKnownDevices(entitiesArray, customizations);
    },
    get rooms() {
        const { entities, areas, devices, entityRegistry } = get();
        const { customizations } = useAppStore.getState();
        const entitiesArray = Object.values(entities);
        return mapEntitiesToRooms(entitiesArray, areas, devices, entityRegistry, customizations);
    },
    get allRoomsWithPhysicalDevices() {
        const { allKnownDevices, areas, devices, entityRegistry } = get();
        return mapToRoomsWithPhysicalDevices(allKnownDevices, areas, devices, entityRegistry);
    },
    get allCameras() {
        const devices = Array.from(get().allKnownDevices.values());
        return devices.filter(d => d.type === DeviceType.Camera);
    },
    get batteryDevices() {
        return Array.from(get().allKnownDevices.values())
            .filter(d => d.batteryLevel !== undefined)
            .map(d => ({
                deviceId: d.id,
                deviceName: d.name,
                batteryLevel: d.batteryLevel!,
            }))
            .sort((a, b) => a.batteryLevel - b.batteryLevel);
    },
    get allScenes() {
        return Array.from(get().allKnownDevices.values()).filter(d => d.type === DeviceType.Scene);
    },
    get allAutomations() {
        return Array.from(get().allKnownDevices.values()).filter(d => d.type === DeviceType.Automation);
    },
    get allScripts() {
        return Array.from(get().allKnownDevices.values()).filter(d => d.type === DeviceType.Script);
    },

    connect: (url: string, token: string) => {
        if (socketRef) socketRef.close();
        
        set({ connectionStatus: 'connecting', error: null, isLoading: true, haUrl: url });
        messageIdRef = 1;

        try {
            const wsUrl = constructHaUrl(url, '/api/websocket', 'ws');
            socketRef = new WebSocket(wsUrl);

            socketRef.onopen = () => console.log('WebSocket connected');

            socketRef.onmessage = (event) => {
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case 'auth_required':
                        sendMessage({ type: 'auth', access_token: token });
                        break;
                    case 'auth_ok':
                        set({ connectionStatus: 'connected', haUrl: url });
                        const initialFetchIds = new Set<number>();
                        const fetches = {
                            states: { id: messageIdRef++, type: 'get_states' },
                            areas: { id: messageIdRef++, type: 'config/area_registry/list' },
                            devices: { id: messageIdRef++, type: 'config/device_registry/list' },
                            entities: { id: messageIdRef++, type: 'config/entity_registry/list' },
                        };
                        Object.values(fetches).forEach(f => {
                            initialFetchIds.add(f.id);
                            sendMessage(f);
                        });
                        sendMessage({ id: messageIdRef++, type: 'subscribe_events', event_type: 'state_changed' });
                        
                        socketRef!.onmessage = (event: MessageEvent) => {
                            const data = JSON.parse(event.data);
                            if (data.type === 'result') {
                                const callbacks = [signPathCallbacks, cameraStreamCallbacks, configCallbacks, historyPeriodCallbacks];
                                for (const cbMap of callbacks) {
                                    if (cbMap.has(data.id)) {
                                        const callback = cbMap.get(data.id);
                                        if (data.success) callback?.resolve(data.result);
                                        else callback?.reject(data.error);
                                        cbMap.delete(data.id);
                                        return;
                                    }
                                }
            
                                if (data.success && initialFetchIds.has(data.id)) {
                                    let stateUpdate: Partial<HAState> = {};
                                    let isInitialFetch = false;

                                    if (data.id === fetches.states.id) {
                                        stateUpdate.entities = data.result.reduce((acc: HassEntities, entity: HassEntity) => ({ ...acc, [entity.entity_id]: entity }), {});
                                        isInitialFetch = true;
                                    } else if (data.id === fetches.areas.id) {
                                        stateUpdate.areas = data.result;
                                        isInitialFetch = true;
                                    } else if (data.id === fetches.devices.id) {
                                        stateUpdate.devices = data.result;
                                        isInitialFetch = true;
                                    } else if (data.id === fetches.entities.id) {
                                        stateUpdate.entityRegistry = data.result;
                                        isInitialFetch = true;
                                    }
                                    
                                    if(isInitialFetch) {
                                        set(stateUpdate);
                                        initialFetchIds.delete(data.id);
                                        
                                        if (initialFetchIds.size === 0) {
                                            const { entities, areas, devices, entityRegistry } = get();
                                            // useAppStore.getState().processHAData(entities, areas, devices, entityRegistry);
                                            set({ isLoading: false });
                                        }
                                    }
                                }
                            } else if (data.type === 'event' && data.event.event_type === 'state_changed') {
                                const { entity_id, new_state } = data.event.data;
                                const newEntities = { ...get().entities, [entity_id]: new_state };
                                if (!new_state) delete newEntities[entity_id];
                                set({ entities: newEntities });
                                // const { areas, devices, entityRegistry } = get();
                                // useAppStore.getState().processHAData(newEntities, areas, devices, entityRegistry);
                            }
                        };
                        break;
                    case 'auth_invalid':
                        set({ error: `Authentication failed: ${data.message}`, connectionStatus: 'failed', isLoading: false });
                        socketRef?.close();
                        break;
                }
            };

            socketRef.onclose = () => {
                if (get().connectionStatus === 'connecting') set({ connectionStatus: 'failed' });
                else set({ connectionStatus: 'idle' });
                set({ isLoading: false });
            };
            socketRef.onerror = () => {
                set({ error: 'WebSocket error. Check URL and connection.', connectionStatus: 'failed', isLoading: false });
            };

        } catch (e) {
            set({ error: 'Failed to connect. Invalid URL?', connectionStatus: 'failed', isLoading: false });
        }
    },
    disconnect: () => {
        socketRef?.close();
        set({ connectionStatus: 'idle', entities: {}, areas: [], devices: [], entityRegistry: [], error: null, isLoading: false });
    },
    callService: (domain: string, service: string, service_data: object) => sendMessage({ id: messageIdRef++, type: 'call_service', domain, service, service_data }),
    signPath: (path: string) => new Promise((resolve, reject) => {
        const id = messageIdRef++;
        signPathCallbacks.set(id, { resolve, reject });
        sendMessage({ id, type: 'auth/sign_path', path });
    }),
    getCameraStreamUrl: (entityId: string) => new Promise((resolve, reject) => {
        const id = messageIdRef++;
        cameraStreamCallbacks.set(id, { resolve, reject });
        sendMessage({ id, type: 'camera/stream', entity_id: entityId });
    }),
    getConfig: () => new Promise((resolve, reject) => {
        const id = messageIdRef++;
        configCallbacks.set(id, { resolve, reject });
        sendMessage({ id, type: 'get_config' });
    }),
    getHistory: (entityIds: string[], startTime: string, endTime?: string) => new Promise((resolve, reject) => {
        const id = messageIdRef++;
        historyPeriodCallbacks.set(id, { resolve, reject });
        sendMessage({ id, type: 'history/history_during_period', entity_ids: entityIds, start_time: startTime, end_time: endTime, minimal_response: true });
    }),

    // --- Derived Actions ---
    handleDeviceToggle: (deviceId: string) => {
        const entity = get().entities[deviceId];
        if (!entity) return;
        const service = entity.state === 'on' ? 'turn_off' : 'turn_on';
        const [domain] = entity.entity_id.split('.');
        get().callService(domain, service, { entity_id: entity.entity_id });
    },
    handleTemperatureChange: (deviceId: string, value: number, isDelta = false) => {
      const entity = get().entities[deviceId];
      if (!entity) return;
      const [domain] = entity.entity_id.split('.');
      
      if (domain === 'climate') {
        const newTemp = isDelta ? (entity.attributes.temperature || 0) + value : value;
        get().callService('climate', 'set_temperature', { entity_id: deviceId, temperature: newTemp });
      } else if (domain === 'humidifier') {
        const newHumidity = isDelta ? (entity.attributes.humidity || 0) + value : value;
        const min = entity.attributes.min_humidity ?? 0;
        const max = entity.attributes.max_humidity ?? 100;
        const clampedHumidity = Math.max(min, Math.min(max, Math.round(newHumidity)));
        get().callService('humidifier', 'set_humidity', { entity_id: deviceId, humidity: clampedHumidity });
      }
    },
    handleHvacModeChange: (deviceId: string, mode: string) => {
        const entity = get().entities[deviceId];
        if (!entity) return;
        get().callService('climate', 'set_hvac_mode', { entity_id: entity.entity_id, hvac_mode: mode });
    },
    handleBrightnessChange: (deviceId: string, brightness: number) => {
        if (brightnessTimeoutRef) clearTimeout(brightnessTimeoutRef);
        brightnessTimeoutRef = window.setTimeout(() => {
            const entity = get().entities[deviceId];
            if (!entity) return;
            get().callService('light', 'turn_on', { entity_id: entity.entity_id, brightness_pct: brightness });
        }, 200);
    },
    handlePresetChange: (deviceId: string, preset: string) => {
        const [domain] = deviceId.split('.');
        const serviceData = domain === 'humidifier'
            ? { entity_id: deviceId, mode: preset }
            : { entity_id: deviceId, preset_mode: preset };
        const serviceName = domain === 'humidifier' ? 'set_mode' : 'set_preset_mode';
        
        get().callService(domain, serviceName, serviceData);
    },
    handleFanSpeedChange: (deviceId: string, value: number | string) => {
        const entity = get().entities[deviceId];
        if (!entity) return;

        if (typeof value === 'number') {
            get().callService('fan', 'set_percentage', { entity_id: deviceId, percentage: value });
        } else if (typeof value === 'string') {
            get().callService('select', 'select_option', { entity_id: deviceId, option: value });
        }
    },
    triggerScene: (entityId: string) => {
        get().callService('scene', 'turn_on', { entity_id: entityId });
    },
    triggerAutomation: (entityId: string) => {
        get().callService('automation', 'trigger', { entity_id: entityId });
    },
    triggerScript: (entityId: string) => {
        get().callService('script', 'turn_on', { entity_id: entityId });
    },
  };
});