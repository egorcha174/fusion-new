import { create } from 'zustand';
import { HassEntity, HassArea, HassDevice, HassEntityRegistryEntry, Device, Room, RoomWithPhysicalDevices, PhysicalDevice, DeviceType, WeatherForecast } from '../types';
import { constructHaUrl } from '../utils/url';
import { mapEntitiesToRooms } from '../utils/ha-data-mapper';
import { useAppStore } from './appStore';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'failed';

interface HassEntities {
  [key: string]: HassEntity;
}

interface BatteryDevice {
    deviceId: string;
    deviceName: string;
    batteryLevel: number;
}

interface HAState {
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  isInitialLoadComplete: boolean;
  error: string | null;
  haUrl: string;
  entities: HassEntities;
  areas: HassArea[];
  devices: HassDevice[];
  entityRegistry: HassEntityRegistryEntry[];
  
  forecasts: Record<string, WeatherForecast[]>;

  allKnownDevices: Map<string, Device>;
  allRoomsForDevicePage: Room[];
  allRoomsWithPhysicalDevices: RoomWithPhysicalDevices[];
  allCameras: Device[];
  batteryDevices: BatteryDevice[];
  allScenes: Device[];
  allAutomations: Device[];
  allScripts: Device[];
}

interface HAActions {
  connect: (url: string, token: string) => void;
  disconnect: () => void;
  callService: (domain: string, service: string, service_data: object, returnResponse?: boolean) => Promise<any>;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<{ url: string }>;
  getConfig: () => Promise<any>;
  getHistory: (entityIds: string[], startTime: string, endTime?: string) => Promise<any>;
  fetchWeatherForecasts: (entityIds: string[]) => Promise<void>;

  handleDeviceToggle: (deviceId: string) => void;
  handleTemperatureChange: (deviceId: string, temperature: number, isDelta?: boolean) => void;
  handleHvacModeChange: (deviceId: string, mode: string) => void;
  handleBrightnessChange: (deviceId: string, brightness: number) => void;
  handlePresetChange: (deviceId: string, preset: string) => void;
  handleFanSpeedChange: (deviceId: string, value: number | string) => void;
  triggerScene: (entityId: string) => void;
  triggerAutomation: (entityId: string) => void;
  triggerScript: (entityId: string) => void;
  updateDerivedState: () => void;
}

// Global counter for message IDs to ensure uniqueness across the session
let globalMessageId = 1;

// Batching globals to reduce render frequency
let pendingUpdates: Record<string, any> = {};
let updateThrottleTimeout: ReturnType<typeof setTimeout> | null = null;

export const useHAStore = create<HAState & HAActions>((set, get) => {
  let socketRef: WebSocket | null = null;
  
  // Callback maps to handle responses to specific command IDs
  const signPathCallbacks = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>();
  const cameraStreamCallbacks = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>();
  const configCallbacks = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>();
  const historyPeriodCallbacks = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>();
  const serviceReturnCallbacks = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>();
  
  // Timers and intervals
  let brightnessTimeoutRef: number | null = null;
  let forecastRefreshInterval: any = null;
  let connectionTimeoutRef: ReturnType<typeof setTimeout> | null = null;
  let initialLoadWatchdogRef: ReturnType<typeof setTimeout> | null = null;

  const clearCallbacks = () => {
      signPathCallbacks.clear();
      cameraStreamCallbacks.clear();
      configCallbacks.clear();
      historyPeriodCallbacks.clear();
      serviceReturnCallbacks.clear();
  };

  const sendMessage = (message: object) => {
    if (socketRef?.readyState === WebSocket.OPEN) {
      socketRef.send(JSON.stringify(message));
    } else {
        console.warn('WebSocket is not open, cannot send message:', message);
    }
  };

  // Helper to flush batched updates to state
  const flushUpdates = () => {
      const currentPending = pendingUpdates;
      pendingUpdates = {}; // Clear immediately to start collecting next batch
      updateThrottleTimeout = null;

      if (Object.keys(currentPending).length > 0) {
          // 1. Update Entities State
          set((state) => {
              const newEntities = { ...state.entities, ...currentPending };
              // Remove deleted entities (if new_state is null)
              Object.keys(currentPending).forEach(key => {
                  if (currentPending[key] === null) {
                      delete newEntities[key];
                  }
              });
              return { entities: newEntities };
          });

          // 2. Update Derived State (Only once per batch)
          if (get().isInitialLoadComplete) {
              get().updateDerivedState();
          }
      }
  };
  
  const updateDerivedState = () => {
      try {
          // Strictly block updates until we have the full picture.
          if (!get().isInitialLoadComplete) return;

          const { entities, areas, devices, entityRegistry } = get();
          const appStore = useAppStore.getState();
          
          if (!appStore) return;

          const { customizations, lowBatteryThreshold, eventTimerWidgets, customCardWidgets } = appStore;
          
          // MAPPING LOGIC
          const rooms = mapEntitiesToRooms(Object.values(entities), areas, devices, entityRegistry, customizations, true, get().forecasts);
          
          const deviceMap = new Map<string, Device>();
          rooms.forEach(room => {
              room.devices.forEach(device => {
                  deviceMap.set(device.id, device);
              });
          });
          
          // Helper: map device_id -> entity_ids
          const deviceIdToEntityIds = new Map<string, string[]>();
          entityRegistry.forEach(e => {
            if (e.device_id) {
              if (!deviceIdToEntityIds.has(e.device_id)) {
                deviceIdToEntityIds.set(e.device_id, []);
              }
              deviceIdToEntityIds.get(e.device_id)!.push(e.entity_id);
            }
          });

          // BATTERY LEVELS
          const batteryDevicesList: BatteryDevice[] = [];
          devices.forEach(haDevice => {
            if (!haDevice.id) return;
            const associatedEntityIds = deviceIdToEntityIds.get(haDevice.id) || [];
            if (associatedEntityIds.length === 0) return;

            let batteryLevel: number | undefined = undefined;
            // Try finding a battery entity first
            const batterySensorEntity = associatedEntityIds
              .map(id => entities[id])
              .find(entity => entity?.attributes.device_class === 'battery' && !isNaN(parseFloat(entity.state)));
            
            if (batterySensorEntity) {
              batteryLevel = parseFloat(batterySensorEntity.state);
            } else {
              // Try finding battery_level attribute
              const entityWithBatteryAttribute = associatedEntityIds
                .map(id => entities[id])
                .find(entity => typeof entity?.attributes.battery_level === 'number');
              if (entityWithBatteryAttribute) {
                batteryLevel = entityWithBatteryAttribute.attributes.battery_level;
              }
            }

            if (batteryLevel !== undefined) {
              const roundedBatteryLevel = Math.round(batteryLevel);
              batteryDevicesList.push({
                deviceId: haDevice.id,
                deviceName: haDevice.name,
                batteryLevel: roundedBatteryLevel,
              });
              // Update all entities of this physical device with battery level
              associatedEntityIds.forEach(entityId => {
                const device = deviceMap.get(entityId);
                if (device) {
                  device.batteryLevel = roundedBatteryLevel;
                }
              });
            }
          });
          
          // WIDGETS ROOM
          let widgetsRoom = rooms.find(r => r.id === 'internal::widgets');
          if (!widgetsRoom) {
              widgetsRoom = { id: 'internal::widgets', name: 'Виджеты', devices: [] };
              rooms.push(widgetsRoom);
          }
          
          // Battery Widget
          if (batteryDevicesList.length > 0) {
            const lowBatteryCount = batteryDevicesList.filter(d => d.batteryLevel <= lowBatteryThreshold).length;
            const batteryWidgetDevice: Device = {
              id: 'internal::battery_widget',
              name: 'Уровень заряда',
              status: lowBatteryCount > 0 ? `${lowBatteryCount} устр. с низким зарядом` : 'Все устройства заряжены',
              type: DeviceType.BatteryWidget,
              state: String(batteryDevicesList.length),
              haDomain: 'internal',
            };
            deviceMap.set(batteryWidgetDevice.id, batteryWidgetDevice);
            if (!widgetsRoom.devices.some(d => d.id === batteryWidgetDevice.id)) {
                widgetsRoom.devices.push(batteryWidgetDevice);
            }
          }

          // Event Timers
          eventTimerWidgets.forEach(widget => {
            const { id, name, lastResetDate, cycleDays, buttonText, fillColors, animation, fillDirection, showName, nameFontSize, namePosition, daysRemainingFontSize, daysRemainingPosition } = widget;
            let timerDevice: Device;

            if (lastResetDate) {
                const resetDate = new Date(lastResetDate);
                const now = new Date();
                const daysPassed = Math.floor((now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24));
                const daysRemaining = Math.max(0, cycleDays - daysPassed);
                const fillPercentage = Math.min(100, (daysPassed / cycleDays) * 100);

                timerDevice = {
                    id: `internal::event-timer_${id}`,
                    name: name,
                    status: `Осталось ${daysRemaining} дн.`,
                    type: DeviceType.EventTimer,
                    haDomain: 'internal',
                    fillPercentage: fillPercentage,
                    daysRemaining: daysRemaining,
                    state: 'active',
                    widgetId: id,
                    buttonText, fillColors, animation, fillDirection, showName,
                    nameFontSize, namePosition, daysRemainingFontSize, daysRemainingPosition,
                };
            } else {
                timerDevice = {
                    id: `internal::event-timer_${id}`,
                    name: name,
                    status: 'Настройте таймер',
                    type: DeviceType.EventTimer,
                    haDomain: 'internal',
                    fillPercentage: 0,
                    daysRemaining: cycleDays,
                    state: 'inactive',
                    widgetId: id,
                    buttonText, fillColors, animation, fillDirection, showName,
                    nameFontSize, namePosition, daysRemainingFontSize, daysRemainingPosition,
                };
            }
            deviceMap.set(timerDevice.id, timerDevice);
            if (!widgetsRoom.devices.some(d => d.id === timerDevice.id)) {
                widgetsRoom.devices.push(timerDevice);
            }
          });
          
          // Custom Cards
          customCardWidgets.forEach(widget => {
              const cardDevice: Device = {
                  id: `internal::custom-card_${widget.id}`,
                  name: widget.name,
                  status: 'Кастомная карточка',
                  type: DeviceType.Custom,
                  haDomain: 'internal',
                  state: 'active',
                  widgetId: widget.id,
              };
              deviceMap.set(cardDevice.id, cardDevice);
              if (!widgetsRoom.devices.some(d => d.id === cardDevice.id)) {
                  widgetsRoom.devices.push(cardDevice);
              }
          });

          // Specific Categories
          const cameras = Array.from(deviceMap.values()).filter((d: Device) => d.haDomain === 'camera');
          const scenes = Array.from(deviceMap.values()).filter((d: Device) => d.type === DeviceType.Scene);
          const automations = Array.from(deviceMap.values()).filter((d: Device) => d.type === DeviceType.Automation);
          const scripts = Array.from(deviceMap.values()).filter((d: Device) => d.type === DeviceType.Script);
          
          batteryDevicesList.sort((a, b) => a.batteryLevel - b.batteryLevel);
          
          // Physical Devices Grouping
          const deviceIdToEntities = new Map<string, Device[]>();
          const entityIdToDeviceId = new Map<string, string>();
          entityRegistry.forEach(entry => {
              if (entry.device_id) {
                  entityIdToDeviceId.set(entry.entity_id, entry.device_id);
              }
          });

          deviceMap.forEach((device, entityId) => {
              const deviceId = entityIdToDeviceId.get(entityId);
              if (deviceId) {
                  if (!deviceIdToEntities.has(deviceId)) {
                      deviceIdToEntities.set(deviceId, []);
                  }
                  deviceIdToEntities.get(deviceId)!.push(device);
              }
          });

          const roomsWithPhysicalDevicesMap = new Map<string, RoomWithPhysicalDevices>();
          areas.forEach(area => {
              roomsWithPhysicalDevicesMap.set(area.area_id, { id: area.area_id, name: area.name, devices: [] });
          });
          roomsWithPhysicalDevicesMap.set('no_area', { id: 'no_area', name: 'Без пространства', devices: [] });

          devices.forEach(haDevice => { 
              const entitiesForDevice = deviceIdToEntities.get(haDevice.id) || [];
              if (entitiesForDevice.length > 0) {
                  const physicalDevice: PhysicalDevice = {
                      id: haDevice.id,
                      name: haDevice.name,
                      entities: entitiesForDevice.sort((a,b) => a.name.localeCompare(b.name)),
                  };
                  const areaId = haDevice.area_id || 'no_area';
                  const room = roomsWithPhysicalDevicesMap.get(areaId);
                  room?.devices.push(physicalDevice);
              }
          });

          const allRoomsWithPhysicalDevices = Array.from(roomsWithPhysicalDevicesMap.values())
              .filter(room => room.devices.length > 0)
              .sort((a,b) => a.name.localeCompare(b.name));

          set({ 
            allKnownDevices: deviceMap, 
            allRoomsForDevicePage: rooms, 
            allCameras: cameras, 
            batteryDevices: batteryDevicesList, 
            allRoomsWithPhysicalDevices,
            allScenes: scenes.sort((a,b) => a.name.localeCompare(b.name)),
            allAutomations: automations.sort((a,b) => a.name.localeCompare(b.name)),
            allScripts: scripts.sort((a,b) => a.name.localeCompare(b.name)),
        });
      } catch (e) {
          console.error("Error updating derived state:", e);
      }
  };
  
  // Subscribe to app settings changes to trigger re-calculation
  useAppStore.subscribe(
    (state, prevState) => {
        const shouldUpdate = state.customizations !== prevState.customizations ||
                             state.lowBatteryThreshold !== prevState.lowBatteryThreshold ||
                             state.eventTimerWidgets !== prevState.eventTimerWidgets ||
                             state.customCardWidgets !== prevState.customCardWidgets;
        
        // Only trigger update if we are fully loaded.
        if (shouldUpdate && get().isInitialLoadComplete) {
            updateDerivedState();
        }
    }
  );

  return {
    connectionStatus: 'idle',
    isLoading: false,
    isInitialLoadComplete: false,
    error: null,
    haUrl: '',
    entities: {},
    areas: [],
    devices: [],
    entityRegistry: [],
    forecasts: {},
    allKnownDevices: new Map(),
    allRoomsForDevicePage: [],
    allRoomsWithPhysicalDevices: [],
    allCameras: [],
    batteryDevices: [],
    allScenes: [],
    allAutomations: [],
    allScripts: [],

    connect: (url, token) => {
        // Cleanup existing connection
        if (socketRef) {
            socketRef.close();
            socketRef = null;
        }
        clearCallbacks();
        if (forecastRefreshInterval) clearInterval(forecastRefreshInterval);
        if (updateThrottleTimeout) clearTimeout(updateThrottleTimeout);
        if (connectionTimeoutRef) clearTimeout(connectionTimeoutRef);
        if (initialLoadWatchdogRef) clearTimeout(initialLoadWatchdogRef);
        pendingUpdates = {};
        
        // RESET STATE completely to avoid stale data merging
        set({ 
            connectionStatus: 'connecting', 
            error: null, 
            isLoading: true, 
            isInitialLoadComplete: false,
            haUrl: url,
            entities: {}, 
            areas: [],
            devices: [],
            entityRegistry: [],
            allKnownDevices: new Map(),
        });
        
        // Safety timeout to prevent infinite spinner if socket hangs
        connectionTimeoutRef = setTimeout(() => {
            const currentState = get();
            if (currentState.isLoading || currentState.connectionStatus === 'connecting') {
                console.warn("Connection or data fetch timed out.");
                set({ 
                    isLoading: false, 
                    connectionStatus: currentState.connectionStatus === 'connected' ? 'connected' : 'failed',
                    error: currentState.connectionStatus === 'connected' ? "Таймаут загрузки данных." : "Таймаут соединения." 
                });
                if (socketRef) socketRef.close();
            }
        }, 30000); 

        try {
            const wsUrl = constructHaUrl(url, '/api/websocket', 'ws');
            socketRef = new WebSocket(wsUrl);

            socketRef.onopen = () => console.log('WebSocket connected');

            // State to track initial loading progress within this closure
            const initialFetchIds = new Set<number>();
            let fetches: any = {};

            socketRef.onmessage = (event) => {
                let data;
                try {
                    data = JSON.parse(event.data);
                } catch (e) {
                    console.error("Failed to parse WebSocket message", e);
                    return;
                }

                switch (data.type) {
                    case 'auth_required':
                        sendMessage({ type: 'auth', access_token: token });
                        break;
                    
                    case 'auth_ok':
                        set({ connectionStatus: 'connected', haUrl: url });
                        
                        // Prepare initial data requests
                        fetches = {
                            states: { id: globalMessageId++, type: 'get_states' },
                            areas: { id: globalMessageId++, type: 'config/area_registry/list' },
                            devices: { id: globalMessageId++, type: 'config/device_registry/list' },
                            entities: { id: globalMessageId++, type: 'config/entity_registry/list' },
                        };
                        
                        // Send all requests immediately
                        Object.values(fetches).forEach((f: any) => {
                            initialFetchIds.add(f.id);
                            sendMessage(f);
                        });
                        
                        // WATCHDOG: Ensure we don't get stuck in infinite spinner if one of these requests fails silently
                        initialLoadWatchdogRef = setTimeout(() => {
                            if (initialFetchIds.size > 0) {
                                console.warn("Initial load watchdog triggered. Forcing load completion. Missing IDs:", Array.from(initialFetchIds));
                                initialFetchIds.clear();
                                set({ isInitialLoadComplete: true });
                                try {
                                    updateDerivedState();
                                } catch (e) {
                                    console.error("Error updating derived state in watchdog:", e);
                                } finally {
                                    set({ isLoading: false });
                                }
                            }
                        }, 15000); 
                        
                        // Subscribe to events
                        sendMessage({ id: globalMessageId++, type: 'subscribe_events', event_type: 'state_changed' });
                        break;

                    case 'auth_invalid':
                        set({ error: `Authentication failed: ${data.message}`, connectionStatus: 'failed', isLoading: false });
                        if (socketRef) socketRef.close();
                        break;

                    case 'result':
                        // 1. Check explicit promise callbacks first
                        const callbacks = [signPathCallbacks, cameraStreamCallbacks, configCallbacks, historyPeriodCallbacks, serviceReturnCallbacks];
                        let handledCallback = false;
                        for (const cbMap of callbacks) {
                            if (cbMap.has(data.id)) {
                                const callback = cbMap.get(data.id);
                                if (data.success) callback?.resolve(data.result);
                                else callback?.reject(data.error);
                                cbMap.delete(data.id);
                                handledCallback = true;
                                break;
                            }
                        }
                        if (handledCallback) return;
    
                        // 2. Handle Initial Fetches
                        if (initialFetchIds.has(data.id)) {
                            if (data.success) {
                                const stateUpdate: Partial<HAState> = {};
                                if (data.id === fetches.states.id) {
                                    stateUpdate.entities = data.result.reduce((acc: HassEntities, entity: HassEntity) => ({ ...acc, [entity.entity_id]: entity }), {});
                                } else if (data.id === fetches.areas.id) {
                                    stateUpdate.areas = data.result;
                                } else if (data.id === fetches.devices.id) {
                                    stateUpdate.devices = data.result;
                                } else if (data.id === fetches.entities.id) {
                                    stateUpdate.entityRegistry = data.result;
                                }
                                set(stateUpdate);
                            } else {
                                console.error(`Initial fetch failed for ID ${data.id}:`, data.error);
                                if (data.id === fetches.states.id) {
                                    set({ error: "Ошибка загрузки состояний устройств." });
                                }
                            }

                            initialFetchIds.delete(data.id);
                            
                            // Check if ALL initial requests are done
                            if (initialFetchIds.size === 0) {
                                if (initialLoadWatchdogRef) clearTimeout(initialLoadWatchdogRef);
                                if (connectionTimeoutRef) clearTimeout(connectionTimeoutRef);
                                
                                try {
                                    // Now it is safe to calculate derived state
                                    set({ isInitialLoadComplete: true });
                                    updateDerivedState();
                                    
                                    // Start secondary fetches (Weather)
                                    const weatherEntities = (Object.values(get().entities) as HassEntity[])
                                        .filter(e => e.entity_id.startsWith('weather.'))
                                        .map(e => e.entity_id);

                                    if (weatherEntities.length > 0) {
                                        get().fetchWeatherForecasts(weatherEntities);
                                    }

                                    // Setup refresh interval
                                    forecastRefreshInterval = setInterval(() => {
                                        const currentStore = get();
                                        if (currentStore.connectionStatus === 'connected') {
                                            const wEntities = (Object.values(currentStore.entities) as HassEntity[])
                                                .filter(e => e.entity_id.startsWith('weather.'))
                                                .map(e => e.entity_id);
                                            
                                            if (wEntities.length > 0) {
                                                currentStore.fetchWeatherForecasts(wEntities);
                                            }
                                        }
                                    }, 30 * 60 * 1000);
                                } catch (e) {
                                    console.error("Post-initialization error:", e);
                                    set({ error: "Ошибка при финализации загрузки." });
                                } finally {
                                    // Crucial: Stop spinner
                                    set({ isLoading: false });
                                }
                            }
                        }
                        break;

                    case 'event':
                        // Batched State Updates
                        if (data.event.event_type === 'state_changed') {
                            const { entity_id, new_state } = data.event.data;
                            
                            // Accumulate update
                            pendingUpdates[entity_id] = new_state;

                            // Schedule flush if not already scheduled (Throttling)
                            if (!updateThrottleTimeout) {
                                // 100ms throttle provides good responsiveness while significantly reducing CPU load
                                updateThrottleTimeout = setTimeout(flushUpdates, 100);
                            }
                        }
                        break;
                }
            };

            socketRef.onclose = () => {
                // Cleanup
                if (forecastRefreshInterval) clearInterval(forecastRefreshInterval);
                if (updateThrottleTimeout) clearTimeout(updateThrottleTimeout);
                if (connectionTimeoutRef) clearTimeout(connectionTimeoutRef);
                if (initialLoadWatchdogRef) clearTimeout(initialLoadWatchdogRef);
                clearCallbacks();
                pendingUpdates = {};
                
                if (get().connectionStatus === 'connecting') {
                    set({ connectionStatus: 'failed', error: "Соединение закрыто сервером." });
                } else {
                    set({ connectionStatus: 'idle' });
                }
                
                set({ isLoading: false, isInitialLoadComplete: false });
            };
            
            socketRef.onerror = () => {
                if (connectionTimeoutRef) clearTimeout(connectionTimeoutRef);
                if (initialLoadWatchdogRef) clearTimeout(initialLoadWatchdogRef);
                set({ error: 'WebSocket error. Check URL and connection.', connectionStatus: 'failed', isLoading: false, isInitialLoadComplete: false });
            };

        } catch (e) {
            if (connectionTimeoutRef) clearTimeout(connectionTimeoutRef);
            if (initialLoadWatchdogRef) clearTimeout(initialLoadWatchdogRef);
            set({ error: 'Failed to connect. Invalid URL?', connectionStatus: 'failed', isLoading: false, isInitialLoadComplete: false });
        }
    },
    disconnect: () => {
        if (forecastRefreshInterval) clearInterval(forecastRefreshInterval);
        if (updateThrottleTimeout) clearTimeout(updateThrottleTimeout);
        if (connectionTimeoutRef) clearTimeout(connectionTimeoutRef);
        if (initialLoadWatchdogRef) clearTimeout(initialLoadWatchdogRef);
        clearCallbacks();
        pendingUpdates = {};
        
        if (socketRef) {
            socketRef.close();
            socketRef = null;
        }
        
        set({ 
            connectionStatus: 'idle', 
            entities: {}, 
            areas: [], 
            devices: [], 
            entityRegistry: [], 
            error: null, 
            isLoading: false,
            isInitialLoadComplete: false 
        });
    },
    callService: (domain, service, service_data, returnResponse = false) => new Promise((resolve, reject) => {
        const id = globalMessageId++;
        if (returnResponse) {
            serviceReturnCallbacks.set(id, { resolve, reject });
        }
        sendMessage({ 
            id, 
            type: 'call_service', 
            domain, 
            service, 
            service_data,
            return_response: returnResponse 
        });
        if (!returnResponse) resolve(null);
    }),
    signPath: (path) => new Promise((resolve, reject) => {
        const id = globalMessageId++;
        signPathCallbacks.set(id, { resolve, reject });
        sendMessage({ id, type: 'auth/sign_path', path });
    }),
    getCameraStreamUrl: (entityId) => new Promise((resolve, reject) => {
        const id = globalMessageId++;
        cameraStreamCallbacks.set(id, { resolve, reject });
        sendMessage({ id, type: 'camera/stream', entity_id: entityId });
    }),
    getConfig: () => new Promise((resolve, reject) => {
        const id = globalMessageId++;
        configCallbacks.set(id, { resolve, reject });
        sendMessage({ id, type: 'get_config' });
    }),
    getHistory: (entityIds, startTime, endTime) => new Promise((resolve, reject) => {
        const id = globalMessageId++;
        historyPeriodCallbacks.set(id, { resolve, reject });
        sendMessage({ id, type: 'history/history_during_period', entity_ids: entityIds, start_time: startTime, end_time: endTime, minimal_response: true });
    }),
    fetchWeatherForecasts: async (entityIds) => {
        if (!entityIds.length) return;
        const forecastsMap: Record<string, WeatherForecast[]> = { ...get().forecasts };
        
        const fetchForEntity = async (entityId: string) => {
             try {
                let rawForecast = null;
                try {
                    const response = await get().callService('weather', 'get_forecasts', { entity_id: entityId, type: 'daily' }, true);
                    if (response?.[entityId]?.forecast?.length) {
                        rawForecast = response[entityId].forecast;
                    }
                } catch (e) { }

                if (!rawForecast || rawForecast.length === 0) {
                     try {
                        const response = await get().callService('weather', 'get_forecasts', { entity_id: entityId, type: 'hourly' }, true);
                        const hourly = response?.[entityId]?.forecast;
                        if (hourly && hourly.length > 0) {
                            const dailyMap = new Map<string, any>();
                            hourly.forEach((h: any) => {
                                const d = new Date(h.datetime);
                                const dateStr = d.toISOString().split('T')[0];
                                if (!dailyMap.has(dateStr)) {
                                    dailyMap.set(dateStr, { 
                                        tempMax: h.temperature, 
                                        tempMin: h.temperature, 
                                        condition: h.condition, 
                                        datetime: dateStr 
                                    });
                                } else {
                                    const curr = dailyMap.get(dateStr);
                                    curr.tempMax = Math.max(curr.tempMax, h.temperature);
                                    curr.tempMin = Math.min(curr.tempMin, h.temperature);
                                }
                            });
                            rawForecast = Array.from(dailyMap.values()).sort((a:any, b:any) => a.datetime.localeCompare(b.datetime));
                        }
                     } catch (e) { 
                        console.warn(`Hourly forecast fetch failed for ${entityId}`, e); 
                     }
                }

                if (rawForecast && rawForecast.length > 0) {
                     const normalized: WeatherForecast[] = rawForecast.map((fc: any) => ({
                         datetime: fc.datetime || fc.date,
                         condition: fc.condition || fc.state,
                         temperature: fc.tempMax ?? fc.temperature ?? fc.max_temp ?? fc.temp,
                         templow: fc.tempMin ?? fc.templow ?? fc.min_temp
                     })).filter((f: any) => f.datetime && f.temperature !== undefined);
                     
                     forecastsMap[entityId] = normalized;
                }
             } catch (e) {
                 console.warn(`Failed to fetch forecast for ${entityId}`, e);
             }
        };

        await Promise.all(entityIds.map(fetchForEntity));
        
        set({ forecasts: forecastsMap });
        // Only update derived state if initial load is done
        if (get().isInitialLoadComplete) {
            updateDerivedState();
        }
    },

    handleDeviceToggle: (deviceId) => {
        const entity = get().entities[deviceId];
        if (!entity) return;
        const service = entity.state === 'on' ? 'turn_off' : 'turn_on';
        const [domain] = entity.entity_id.split('.');
        get().callService(domain, service, { entity_id: entity.entity_id });
    },
    handleTemperatureChange: (deviceId, value, isDelta = false) => {
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
    handleHvacModeChange: (deviceId, mode) => {
        const entity = get().entities[deviceId];
        if (!entity) return;
        get().callService('climate', 'set_hvac_mode', { entity_id: entity.entity_id, hvac_mode: mode });
    },
    handleBrightnessChange: (deviceId, brightness) => {
        if (brightnessTimeoutRef) clearTimeout(brightnessTimeoutRef);
        brightnessTimeoutRef = window.setTimeout(() => {
            const entity = get().entities[deviceId];
            if (!entity) return;
            get().callService('light', 'turn_on', { entity_id: entity.entity_id, brightness_pct: brightness });
        }, 200);
    },
    handlePresetChange: (deviceId, preset) => {
        const [domain] = deviceId.split('.');
        const serviceData = domain === 'humidifier'
            ? { entity_id: deviceId, mode: preset }
            : { entity_id: deviceId, preset_mode: preset };
        const serviceName = domain === 'humidifier' ? 'set_mode' : 'set_preset_mode';
        
        get().callService(domain, serviceName, serviceData);
    },
    handleFanSpeedChange: (deviceId, value) => {
        const entity = get().entities[deviceId];
        if (!entity) return;

        if (typeof value === 'number') {
            get().callService('fan', 'set_percentage', { entity_id: deviceId, percentage: value });
        } else if (typeof value === 'string') {
            get().callService('select', 'select_option', { entity_id: deviceId, option: value });
        }
    },
    triggerScene: (entityId) => {
        get().callService('scene', 'turn_on', { entity_id: entityId });
    },
    triggerAutomation: (entityId) => {
        get().callService('automation', 'trigger', { entity_id: entityId });
    },
    triggerScript: (entityId) => {
        get().callService('script', 'turn_on', { entity_id: entityId });
    },
    updateDerivedState, // Export for internal usage if needed
  };
});