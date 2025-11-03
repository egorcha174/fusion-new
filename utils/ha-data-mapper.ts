

import { Device, Room, DeviceType, HassEntity, HassArea, HassDevice, HassEntityRegistryEntry, DeviceCustomizations, DeviceCustomization } from '../types';

const getDeviceType = (entity: HassEntity): DeviceType => {
  const entityId = entity.entity_id;
  const attributes = entity.attributes || {};
  const friendlyName = (attributes.friendly_name || '').toLowerCase();
  const entityIdLower = entityId.toLowerCase();
  const domain = entityId.split('.')[0];

  // --- Priority 1: Direct Domain Mapping (unambiguous) ---
  switch (domain) {
    case 'camera': return DeviceType.Camera;
    case 'weather': return DeviceType.Weather;
    case 'sensor': return DeviceType.Sensor;
    case 'climate': return DeviceType.Thermostat;
    case 'fan': return DeviceType.Fan;
  }

  // --- Priority 2: Domain + Attributes/Device Class ---
  if (domain === 'light') {
    return attributes.brightness !== undefined ? DeviceType.DimmableLight : DeviceType.Light;
  }
  
  if (domain === 'switch') {
    if (attributes.device_class === 'outlet') return DeviceType.Outlet;
    // Heuristic: If a switch's name suggests it's a light, classify it as a light.
    if (friendlyName.includes('light') || friendlyName.includes('свет') || friendlyName.includes('лампа') || friendlyName.includes('торшер') || friendlyName.includes('люстра')) {
      return DeviceType.Light;
    }
  }
  
  if (domain === 'media_player') {
    if (attributes.device_class === 'tv') return DeviceType.TV;
  }

  // --- Priority 3: Keyword Matching on Name/ID (for ambiguous domains like switch, media_player) ---
  const combinedName = `${friendlyName} ${entityIdLower}`;

  if (combinedName.includes('tv') || combinedName.includes('телевизор')) return DeviceType.TV;
  if (combinedName.includes('playstation')) return DeviceType.Playstation;
  if (combinedName.includes('computer') || combinedName.includes('компьютер')) return DeviceType.Computer;
  if (combinedName.includes('monitor') || combinedName.includes('монитор')) return DeviceType.Monitor;
  if (combinedName.includes('speaker') || combinedName.includes('колонка')) return DeviceType.Speaker;
  if (combinedName.includes('fan') || combinedName.includes('вентилятор')) return DeviceType.Fan;
  
  // --- Priority 4: Fallback for remaining domains ---
  if (domain === 'switch') return DeviceType.Switch; // Any remaining switch is a generic switch
  if (domain === 'media_player') return DeviceType.Speaker; // Any remaining media player is a generic speaker

  // --- Final Fallback ---
  return DeviceType.Unknown;
};

const getStatusText = (entity: HassEntity): string => {
    const domain = entity.entity_id.split('.')[0];
    const attributes = entity.attributes || {};

    if (domain === 'weather') {
        const stateMap: Record<string, string> = {
            'clear-night': 'Ясно',
            'cloudy': 'Облачно',
            'exceptional': 'Особые условия',
            'fog': 'Туман',
            'hail': 'Град',
            'lightning': 'Гроза',
            'lightning-rainy': 'Гроза с дождем',
            'partlycloudy': 'Переменная облачность',
            'pouring': 'Ливень',
            'rainy': 'Дождь',
            'snowy': 'Снег',
            'snowy-rainy': 'Снег с дождем',
            'sunny': 'Солнечно',
            'windy': 'Ветрено',
            'windy-variant': 'Ветрено',
        };
        return stateMap[entity.state] || entity.state.charAt(0).toUpperCase() + entity.state.slice(1);
    }
    
    if (domain === 'sensor') {
        const numericState = parseFloat(entity.state);
        if (!isNaN(numericState)) {
            return String(Math.round(numericState * 10) / 10);
        }
        return entity.state;
    }
    
    if (entity.state === 'unavailable') return 'Недоступно';
    if (entity.state === 'on') return 'Включено';
    if (entity.state === 'off') return 'Выключено';
    return entity.state.charAt(0).toUpperCase() + entity.state.slice(1);
}

const entityToDevice = (entity: HassEntity, customization: DeviceCustomization = {}): Device | null => {
  const attributes = entity.attributes || {};
  const originalType = getDeviceType(entity);
  
  const device: Device = {
    id: entity.entity_id,
    name: customization.name || attributes.friendly_name || entity.entity_id,
    status: getStatusText(entity),
    type: customization.type !== undefined ? customization.type : originalType,
    icon: customization.icon,
    unit: attributes.unit_of_measurement,
    haDomain: entity.entity_id.split('.')[0],
    haDeviceClass: attributes.device_class,
  };

  if (device.type === DeviceType.DimmableLight && attributes.brightness) {
    device.brightness = Math.round((attributes.brightness / 255) * 100);
  }
  
  if (device.type === DeviceType.Thermostat) {
    device.temperature = attributes.current_temperature;
    device.targetTemperature = attributes.temperature;
    device.presetMode = attributes.preset_mode;
    device.presetModes = attributes.preset_modes;
  }
  
  if (device.type === DeviceType.Weather) {
      device.temperature = attributes.temperature;
      device.forecast = attributes.forecast;
      device.condition = entity.state;
  }

  return device;
};

export const mapEntitiesToRooms = (
    entities: HassEntity[], 
    areas: HassArea[], 
    haDevices: HassDevice[], 
    entityRegistry: HassEntityRegistryEntry[],
    customizations: DeviceCustomizations,
    showHidden: boolean = false
): Room[] => {
  const roomsMap: Map<string, Room> = new Map();

  areas.forEach(area => {
    roomsMap.set(area.area_id, {
      id: area.area_id,
      name: area.name,
      devices: [],
    });
  });
  roomsMap.set('no_area', { id: 'no_area', name: 'Без пространства', devices: []});

  const entityIdToAreaIdMap = new Map<string, string>();
  entityRegistry.forEach(entry => {
      if (entry.area_id) {
        entityIdToAreaIdMap.set(entry.entity_id, entry.area_id);
      }
  });

  const deviceIdToAreaIdMap = new Map<string, string>();
  haDevices.forEach(d => {
      if(d.area_id) {
          deviceIdToAreaIdMap.set(d.id, d.area_id);
      }
  })

  entities.forEach(entity => {
    if (!entity) return; // Extra safety check

    const customization = customizations[entity.entity_id] || {};
    if (customization.isHidden && !showHidden) {
        return; // Skip hidden devices unless showHidden is true
    }

    const device = entityToDevice(entity, customization);
    if (device && device.type !== DeviceType.Unknown) {
        let areaId: string | undefined | null = entityIdToAreaIdMap.get(entity.entity_id);

        if (!areaId && entity.attributes?.device_id) {
            const haDevice = haDevices.find(d => d.id === entity.attributes.device_id);
            if (haDevice?.area_id) {
                areaId = haDevice.area_id;
            }
        }

        const targetRoom = roomsMap.get(areaId || 'no_area') || roomsMap.get('no_area');
        targetRoom?.devices.push(device);
    }
  });

  return Array.from(roomsMap.values()).filter(room => room.devices.length > 0);
};