
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
  error: string | null;
  haUrl: string;
  entities: HassEntities;
  areas: HassArea[];
  devices: HassDevice[];
  entityRegistry: HassEntityRegistryEntry[];
  
  // Store separately fetched forecasts from weather.get_forecasts
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
  const serviceReturnCallbacks = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>();
  let brightnessTimeoutRef: number | null = null;

  const sendMessage = (message: object) => {
    if (socketRef?.readyState === WebSocket.OPEN) {
      socketRef.send(JSON.stringify(message));
    }
  };
  
  const updateDerivedState = (entities: HassEntities, areas: HassArea[], devices: HassDevice[], entityRegistry: HassEntityRegistryEntry[]) => {
      const { customizations, lowBatteryThreshold, eventTimerWidgets, customCardWidgets } = useAppStore.getState();
      // Pass stored forecasts to mapper
      const rooms = mapEntitiesToRooms(Object.values(entities), areas, devices, entityRegistry, customizations, true, get().forecasts);
      const deviceMap = new Map<string, Device>();
      rooms.forEach(room => {
          room.devices.forEach(device => {
              deviceMap.set(device.id, device);
          });
      });
      
      // --- Новая логика для поиска уровня заряда батареи по физическим устройствам ---
      const deviceIdToEntityIds = new Map<string, string[]>();
      entityRegistry.forEach(e => {
        if (e.device_id) {
          if (!deviceIdToEntityIds.has(e.device_id)) {
            deviceIdToEntityIds.set(e.device_id, []);
          }
          deviceIdToEntityIds.get(e.device_id)!.push(e.entity_id);
        }
      });

      const batteryDevicesList: BatteryDevice[] = [];

      // Итерируем по физическим устройствам из Home Assistant
      devices.forEach(haDevice => {
        if (!haDevice.id) return;

        const associatedEntityIds = deviceIdToEntityIds.get(haDevice.id) || [];
        if (associatedEntityIds.length === 0) return;

        let batteryLevel: number | undefined = undefined;

        // Стратегия 1: Найти выделенный сенсор батареи для этого устройства
        const batterySensorEntity = associatedEntityIds
          .map(id => entities[id])
          .find(entity => entity?.attributes.device_class === 'battery' && !isNaN(parseFloat(entity.state)));
        
        if (batterySensorEntity) {
          batteryLevel = parseFloat(batterySensorEntity.state);
        } else {
          // Стратегия 2: Найти любую сущность для этого устройства, у которой есть атрибут battery_level
          const entityWithBatteryAttribute = associatedEntityIds
            .map(id => entities[id])
            .find(entity => typeof entity?.attributes.battery_level === 'number');

          if (entityWithBatteryAttribute) {
            batteryLevel = entityWithBatteryAttribute.attributes.battery_level;
          }
        }

        if (batteryLevel !== undefined) {
          const roundedBatteryLevel = Math.round(batteryLevel);

          // Добавляем одну запись для физического устройства в наш список
          batteryDevicesList.push({
            deviceId: haDevice.id,
            deviceName: haDevice.name,
            batteryLevel: roundedBatteryLevel,
          });

          // Распространяем этот уровень заряда на все связанные сущности в нашей карте `allKnownDevices`
          associatedEntityIds.forEach(entityId => {
            const device = deviceMap.get(entityId);
            if (device) {
              device.batteryLevel = roundedBatteryLevel;
            }
          });
        }
      });
      
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
          state: String(batteryDevicesList.length), // Total device count
          haDomain: 'internal',
        };
        deviceMap.set(batteryWidgetDevice.id, batteryWidgetDevice);
        if (!widgetsRoom.devices.some(d => d.id === batteryWidgetDevice.id)) {
            widgetsRoom.devices.push(batteryWidgetDevice);
        }
      }

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
                buttonText: buttonText,
                fillColors: fillColors,
                animation: animation,
                fillDirection: fillDirection,
                showName: showName,
                nameFontSize,
                namePosition,
                daysRemainingFontSize,
                daysRemainingPosition,
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
                buttonText: buttonText,
                fillColors: fillColors,
                animation: animation,
                fillDirection: fillDirection,
                showName: showName,
                nameFontSize,
                namePosition,
                daysRemainingFontSize,
                daysRemainingPosition,
            };
        }
        deviceMap.set(timerDevice.id, timerDevice);
        if (!widgetsRoom.devices.some(d => d.id === timerDevice.id)) {
            widgetsRoom.devices.push(timerDevice);
        }
      });
      
      // Custom Card Widgets
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


      const cameras = Array.from(deviceMap.values()).filter((d: Device) => d.haDomain === 'camera');
      const scenes = Array.from(deviceMap.values()).filter((d: Device) => d.type === DeviceType.Scene);
      const automations = Array.from(deviceMap.values()).filter((d: Device) => d.type === DeviceType.Automation);
      const scripts = Array.from(deviceMap.values()).filter((d: Device) => d.type === DeviceType.Script);
      
      // Сортируем список физических устройств по уровню заряда
      batteryDevicesList.sort((a, b) => a.batteryLevel - b.batteryLevel);
      
      // --- NEW: Logic for rooms with physical devices ---
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

      devices.forEach(haDevice => { // HassDevice
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
  };
  
  // Re-compute derived state whenever customizations change
  useAppStore.subscribe(
    (state, prevState) => {
        const shouldUpdate = state.customizations !== prevState.customizations ||
                             state.lowBatteryThreshold !== prevState.lowBatteryThreshold ||
                             state.eventTimerWidgets !== prevState.eventTimerWidgets ||
                             state.customCardWidgets !== prevState.customCardWidgets;
        
        if (shouldUpdate) {
            const { entities, areas, devices, entityRegistry } = get();
            updateDerivedState(entities, areas, devices, entityRegistry);
        }
    }
  );

  return {
    connectionStatus: 'idle',
    isLoading: false,
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
                                const callbacks = [signPathCallbacks, cameraStreamCallbacks, configCallbacks, historyPeriodCallbacks, serviceReturnCallbacks];
                                for (const cbMap of callbacks) {
                                    if (cbMap.has(data.id)) {
                                        const callback = cbMap.get(data.id);
                                        if (data.success) callback?.resolve(data.result);
                                        else callback?.reject(data.error);
                                        cbMap.delete(data.id);
                                        // Don't return here, some generic fetches (like init) might share ID logic or be parallel, though unlikely with unique IDs.
                                        // But typically a message ID is unique per request.
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
                                            const s = get();
                                            updateDerivedState(s.entities, s.areas, s.devices, s.entityRegistry);
                                            set({ isLoading: false });
                                        }
                                    }
                                }
                            } else if (data.type === 'event' && data.event.event_type === 'state_changed') {
                                const { entity_id, new_state } = data.event.data;
                                const newEntities = { ...get().entities, [entity_id]: new_state };
                                if (!new_state) delete newEntities[entity_id];
                                set({ entities: newEntities });
                                updateDerivedState(newEntities, get().areas, get().devices, get().entityRegistry);
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
    callService: (domain, service, service_data, returnResponse = false) => new Promise((resolve, reject) => {
        const id = messageIdRef++;
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
        const id = messageIdRef++;
        signPathCallbacks.set(id, { resolve, reject });
        sendMessage({ id, type: 'auth/sign_path', path });
    }),
    getCameraStreamUrl: (entityId) => new Promise((resolve, reject) => {
        const id = messageIdRef++;
        cameraStreamCallbacks.set(id, { resolve, reject });
        sendMessage({ id, type: 'camera/stream', entity_id: entityId });
    }),
    getConfig: () => new Promise((resolve, reject) => {
        const id = messageIdRef++;
        configCallbacks.set(id, { resolve, reject });
        sendMessage({ id, type: 'get_config' });
    }),
    getHistory: (entityIds, startTime, endTime) => new Promise((resolve, reject) => {
        const id = messageIdRef++;
        historyPeriodCallbacks.set(id, { resolve, reject });
        sendMessage({ id, type: 'history/history_during_period', entity_ids: entityIds, start_time: startTime, end_time: endTime, minimal_response: true });
    }),
    fetchWeatherForecasts: async (entityIds) => {
        if (!entityIds.length) return;
        const forecastsMap: Record<string, WeatherForecast[]> = { ...get().forecasts };
        
        const fetchForEntity = async (entityId: string) => {
             try {
                let rawForecast = null;
                // Try daily forecast first
                try {
                    const response = await get().callService('weather', 'get_forecasts', { entity_id: entityId, type: 'daily' }, true);
                    if (response?.[entityId]?.forecast?.length) {
                        rawForecast = response[entityId].forecast;
                    }
                } catch (e) {
                    // Daily fetch failed, silently continue to hourly
                }

                // Try hourly forecast if daily failed or returned empty
                if (!rawForecast || rawForecast.length === 0) {
                     try {
                        const response = await get().callService('weather', 'get_forecasts', { entity_id: entityId, type: 'hourly' }, true);
                        const hourly = response?.[entityId]?.forecast;
                        if (hourly && hourly.length > 0) {
                            // Aggregate hourly to daily
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
                                    // Optionally aggregate condition (mode/worst/best), keeping first found for now
                                }
                            });
                            // Sort by date
                            rawForecast = Array.from(dailyMap.values()).sort((a:any, b:any) => a.datetime.localeCompare(b.datetime));
                        }
                     } catch (e) { 
                        console.warn(`Hourly forecast fetch failed for ${entityId}`, e); 
                     }
                }

                if (rawForecast && rawForecast.length > 0) {
                     // Normalize and store
                     const normalized: WeatherForecast[] = rawForecast.map((fc: any) => ({
                         datetime: fc.datetime || fc.date,
                         condition: fc.condition || fc.state,
                         temperature: fc.temperature ?? fc.max_temp ?? fc.temp,
                         templow: fc.templow ?? fc.min_temp
                     })).filter((f: any) => f.datetime && f.temperature !== undefined);
                     
                     forecastsMap[entityId] = normalized;
                }
             } catch (e) {
                 console.warn(`Failed to fetch forecast for ${entityId}`, e);
                 // Don't throw, just skip updating this entity's forecast
             }
        };

        await Promise.all(entityIds.map(fetchForEntity));
        
        // Update state and re-calculate derived state
        set({ forecasts: forecastsMap });
        const s = get();
        updateDerivedState(s.entities, s.areas, s.devices, s.entityRegistry);
    },

    // --- Derived Actions ---
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
  };
});
