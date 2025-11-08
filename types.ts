


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
  icon?: string; // Custom icon override (Iconify name)
  iconAnimation?: 'none' | 'spin' | 'pulse' | 'glow';
  brightness?: number; // For DimmableLight
  temperature?: number; // For Thermostat current temp or weather temp
  targetTemperature?: number; // For Thermostat target temp
  unit?: string; // For sensors, thermostats, weather
  forecast?: WeatherForecast[]; // For weather devices
  condition?: string; // For weather, the raw state like 'partlycloudy'
  presetMode?: string; // For Thermostat
  presetModes?: string[]; // For Thermostat
  hvacModes?: string[];
  hvacAction?: string;
  minTemp?: number;
  maxTemp?: number;
  history?: number[]; // For sensor sparklines
  haDomain?: string;
  haDeviceClass?: string;
  state?: string; // Raw state from HA
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
  width?: number;
  height?: number;
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
export interface DeviceBinding {
  slotId: string;
  entityId: string;
  icon?: string;
  enabled: boolean;
}

export interface DeviceCustomization {
  name?: string;
  type?: DeviceType;
  icon?: string; // Iconify name
  isHidden?: boolean;
  templateId?: string; // ID of the CardTemplate to use
  iconAnimation?: 'none' | 'spin' | 'pulse' | 'glow';
  deviceBindings?: DeviceBinding[];
  thresholds?: ThresholdRule[];
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


// --- Card Template System ---
export type CardElementId = 'name' | 'icon' | 'value' | 'unit' | 'chart' | 'status' | 'slider' | 'temperature' | 'target-temperature' | 'hvac-modes' | 'linked-entity';

export interface CardElement {
  id: CardElementId;
  visible: boolean;
  position: { x: number; y: number }; // in %
  size: { width: number; height: number }; // in %
  zIndex: number;
  styles: {
    // other styles can be added here
    decimalPlaces?: number;
    onColor?: string;
    offColor?: string;
    fontSize?: number;
    textAlign?: 'left' | 'center' | 'right';
    linkedEntityId?: string;
    showValue?: boolean;
    chartTimeRange?: number;
    chartTimeRangeUnit?: 'minutes' | 'hours' | 'days';
  };
}

export interface DeviceSlot {
  id: string;
  position: { x: number; y: number }; // %
  iconSize: number; // px
  visualStyle: {
    type: 'color' | 'glow' | 'animation' | 'color_glow' | 'color_animation';
    activeColor: string;
    inactiveColor: string;
    glowIntensity: number; // 0-1
    animationType: 'pulse' | 'rotate' | 'none';
    showValue?: boolean;
    decimalPlaces?: number;
    unit?: string;
    fontSize?: number;
  };
  interactive: boolean;
}

export interface ThresholdStyle {
  backgroundColor?: string;
  valueColor?: string;
}

export interface ThresholdRule {
  value: number;
  comparison: 'above' | 'below';
  style: ThresholdStyle;
}

export interface CardTemplate {
  id: string;
  name: string;
  deviceType: 'sensor' | 'light' | 'switch' | 'climate';
  elements: CardElement[];
  styles: {
    backgroundColor: string; // Dark mode off state
    lightBackgroundColor?: string; // Light mode off state
    onBackgroundColor?: string; // Dark mode on state
    lightOnBackgroundColor?: string; // Light mode on state
  };
  width?: number;
  height?: number;
  deviceSlots?: DeviceSlot[];
}

export type CardTemplates = Record<string, CardTemplate>;


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
    hvac_modes?: string[];
    hvac_action?: string;
    min_temp?: number;
    max_temp?: number;
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