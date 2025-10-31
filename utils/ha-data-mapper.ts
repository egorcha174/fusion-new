
import { Device, Room, DeviceType, HassEntity, HassArea, HassDevice } from '../types';

const getDeviceType = (entity: HassEntity): DeviceType => {
  const entityId = entity.entity_id.split('.')[0];
  const attributes = entity.attributes;

  if (entityId === 'light') {
    return attributes.brightness !== undefined ? DeviceType.DimmableLight : DeviceType.Light;
  }
  if (entityId === 'switch') return DeviceType.Lamp; // Assumption
  if (entityId === 'media_player') {
    if (attributes.device_class === 'tv') return DeviceType.TV;
    return DeviceType.Speaker; // Generic media player
  }
  if (entityId === 'climate') return DeviceType.Thermostat;
  if (entityId.includes('playstation')) return DeviceType.Playstation;
  
  // More specific mapping based on attributes could be added here
  
  return DeviceType.Unknown;
};

const getStatusText = (entity: HassEntity): string => {
    if (entity.state === 'on') return 'På';
    if (entity.state === 'off') return 'Okänt';
    return entity.state.charAt(0).toUpperCase() + entity.state.slice(1);
}

const entityToDevice = (entity: HassEntity): Device | null => {
  const type = getDeviceType(entity);
  if (type === DeviceType.Unknown) {
    return null; // Don't include unknown devices in the UI
  }

  const device: Device = {
    id: entity.entity_id,
    name: entity.attributes.friendly_name || entity.entity_id,
    status: getStatusText(entity),
    type: type,
    unit: entity.attributes.unit_of_measurement
  };

  if (type === DeviceType.DimmableLight && entity.attributes.brightness) {
    device.brightness = Math.round((entity.attributes.brightness / 255) * 100);
  }
  
  if (type === DeviceType.Thermostat) {
    device.temperature = entity.attributes.current_temperature;
    device.targetTemperature = entity.attributes.temperature;
  }

  return device;
};

export const mapEntitiesToRooms = (entities: HassEntity[], areas: HassArea[], haDevices: HassDevice[]): Room[] => {
  const roomsMap: Map<string, Room> = new Map();

  // Initialize rooms from areas
  areas.forEach(area => {
    roomsMap.set(area.area_id, {
      id: area.area_id,
      name: area.name,
      devices: [],
    });
  });

  // Create a map for quick device lookup
  const deviceIdToAreaIdMap = new Map<string, string>();
  haDevices.forEach(d => {
      if(d.area_id) {
          deviceIdToAreaIdMap.set(d.id, d.area_id);
      }
  })

  entities.forEach(entity => {
    const device = entityToDevice(entity);
    if (device) {
        // Find device in registry to link to an area
        const haDevice = haDevices.find(d => d.id === entity.attributes.device_id);
        const areaId = haDevice?.area_id;

        if (areaId && roomsMap.has(areaId)) {
            roomsMap.get(areaId)?.devices.push(device);
        } else {
            // Fallback for devices not in an area
            if (!roomsMap.has('no_area')) {
                roomsMap.set('no_area', { id: 'no_area', name: 'No Area', devices: []});
            }
            roomsMap.get('no_area')?.devices.push(device);
        }
    }
  });

  return Array.from(roomsMap.values()).filter(room => room.devices.length > 0);
};
