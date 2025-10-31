
// FIX: Import DeviceCustomization type to resolve reference error.
import { Device, Room, DeviceType, HassEntity, HassArea, HassDevice, HassEntityRegistryEntry, DeviceCustomizations, DeviceCustomization } from '../types';

const getDeviceType = (entity: HassEntity): DeviceType => {
  const entityIdDomain = entity.entity_id.split('.')[0];
  const attributes = entity.attributes;

  if (entityIdDomain === 'light') {
    return attributes.brightness !== undefined ? DeviceType.DimmableLight : DeviceType.Light;
  }
  if (entityIdDomain === 'switch') return DeviceType.Lamp; // Assumption
  if (entityIdDomain === 'media_player') {
    if (attributes.device_class === 'tv') return DeviceType.TV;
    return DeviceType.Speaker; // Generic media player
  }
  if (entityIdDomain === 'climate') return DeviceType.Thermostat;
  if (entity.entity_id.includes('playstation')) return DeviceType.Playstation;
  
  return DeviceType.Unknown;
};

const getStatusText = (entity: HassEntity): string => {
    if (entity.state === 'unavailable') return 'Недоступно';
    if (entity.state === 'on') return 'Вкл';
    if (entity.state === 'off') return 'Выкл';
    return entity.state.charAt(0).toUpperCase() + entity.state.slice(1);
}

const entityToDevice = (entity: HassEntity, customization: DeviceCustomization = {}): Device | null => {
  const originalType = getDeviceType(entity);
  
  const device: Device = {
    id: entity.entity_id,
    name: customization.name || entity.attributes.friendly_name || entity.entity_id,
    status: getStatusText(entity),
    type: customization.icon !== undefined ? customization.icon : originalType,
    unit: entity.attributes.unit_of_measurement
  };

  if (device.type === DeviceType.DimmableLight && entity.attributes.brightness) {
    device.brightness = Math.round((entity.attributes.brightness / 255) * 100);
  }
  
  if (device.type === DeviceType.Thermostat) {
    device.temperature = entity.attributes.current_temperature;
    device.targetTemperature = entity.attributes.temperature;
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
    const customization = customizations[entity.entity_id] || {};
    if (customization.isHidden && !showHidden) {
        return; // Skip hidden devices unless showHidden is true
    }

    const device = entityToDevice(entity, customization);
    if (device && device.type !== DeviceType.Unknown) {
        let areaId: string | undefined | null = entityIdToAreaIdMap.get(entity.entity_id);

        if (!areaId) {
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
