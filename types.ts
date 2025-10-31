
export enum DeviceType {
  Light,
  Lamp,
  Spotlight,
  Climate,
  TV,
  Computer,
  Monitor,
  Speaker,
  Playstation,
  BalconyLight,
  DimmableLight,
  Thermostat,
  Unknown, // Fallback for unmapped devices
}

export interface Device {
  id: string; // Will be entity_id from Home Assistant
  name: string;
  status: string; // 'På', 'Okänt', 'Heating', etc.
  type: DeviceType;
  brightness?: number; // For DimmableLight
  temperature?: number; // For Thermostat current temp
  targetTemperature?: number; // For Thermostat target temp
  unit?: string; // For sensors, thermostats
}

export interface Room {
  id: string; // Will be area_id from Home Assistant
  name: string;
  devices: Device[];
}

// Types for user customizations
export interface DeviceCustomization {
  name?: string;
  icon?: DeviceType;
  isHidden?: boolean;
}

export type DeviceCustomizations = Record<string, DeviceCustomization>; // Key is device.id (entity_id)


// Types for Home Assistant WebSocket API
export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    device_class?: string;
    unit_of_measurement?: string;
    brightness?: number; // 0-255
    temperature?: number;
    current_temperature?: number;
    device_id?: string;
    [key: string]: any;
  };
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
  last_changed: string;
  last_updated: string;
}

export interface HassArea {
    area_id: string;
    name: string;
    picture: string | null;
}

export interface HassDevice {
    id: string;
    area_id: string | null;
    name: string;
    // other properties not needed for this app
}

export interface HassEntityRegistryEntry {
    entity_id: string;
    area_id: string | null;
    device_id: string | null;
}