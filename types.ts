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
  Sensor,
  Outlet,
  Weather,
  Switch,
  Fan,
  DoorSensor,
  Camera,
  Unknown, // Fallback for unmapped devices
}

export interface WeatherForecast {
    condition: string;
    temperature: number; // high temp
    templow: number; // low temp
    datetime: string;
}

export interface Device {
  id: string; // Will be entity_id from Home Assistant
  name: string;
  status: string; // 'På', 'Okänt', 'Heating', etc.
  type: DeviceType;
  icon?: DeviceType; // Custom icon override
  brightness?: number; // For DimmableLight
  temperature?: number; // For Thermostat current temp or weather temp
  targetTemperature?: number; // For Thermostat target temp
  unit?: string; // For sensors, thermostats, weather
  forecast?: WeatherForecast[]; // For weather devices
  condition?: string; // For weather, the raw state like 'partlycloudy'
  presetMode?: string; // For Thermostat
  presetModes?: string[]; // For Thermostat
  history?: number[]; // For sensor sparklines
  haDomain?: string;
  haDeviceClass?: string;
}

export interface Room {
  id: string; // Will be area_id from Home Assistant
  name: string;
  devices: Device[];
}

export interface GridLayoutItem {
  deviceId: string;
  col: number;
  row: number;
}

// Represents a user-created tab on the dashboard
export interface Tab {
  id: string;
  name: string;
  layout: GridLayoutItem[]; // The source of truth for device positions
  gridSettings: {
    cols: number;
    rows: number;
  };
}

// Types for user customizations
export interface DeviceCustomization {
  name?: string;
  type?: DeviceType;
  icon?: DeviceType;
  isHidden?: boolean;
}

export type DeviceCustomizations = Record<string, DeviceCustomization>; // Key is device.id (entity_id)

export type Page = 'dashboard' | 'settings' | 'all-devices';

export type ClockSize = 'sm' | 'md' | 'lg';

export interface ClockSettings {
    format: '12h' | '24h';
    showSeconds: boolean;
    size: ClockSize;
}

export interface CameraSettings {
  selectedEntityId: string | null;
}

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
    // Allow forecast to be `any` to support various unpredictable structures from HA integrations.
    forecast?: any;
    preset_mode?: string;
    preset_modes?: string[];
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