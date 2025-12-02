export type Page = 'dashboard' | 'all-devices' | 'helpers' | 'settings' | 'template-gallery' | 'all-entities';

export enum DeviceType {
  // Physical/Standard Types
  Light = 1,
  Switch = 2,
  Sensor = 3,
  BinarySensor = 4,
  MediaPlayer = 6,
  Climate = 7,
  Thermostat = 7,
  Vacuum = 8,
  Lock = 9,
  Cover = 10,
  Fan = 11,
  InputBoolean = 12,
  InputNumber = 13,
  InputText = 14,
  InputSelect = 15,
  Timer = 16,
  Scene = 17,
  Script = 18,
  Automation = 19,
  Update = 20,
  Person = 21,
  Weather = 22,
  Siren = 23,
  Unknown = 0,

  // Virtual/Derived Types
  DimmableLight = 101,
  Lamp = 102,
  Spotlight = 103,
  BalconyLight = 104,
  TV = 105,
  Speaker = 106,
  Playstation = 107,
  Computer = 108,
  Monitor = 109,
  DoorSensor = 110,
  Outlet = 111,
  Humidifier = 112,
  EventTimer = 113,
  Custom = 114,
  BatteryWidget = 115,
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    device_class?: string;
    unit_of_measurement?: string;
    [key: string]: any;
  };
  last_changed: string;
  last_updated: string;
}

export interface HassArea {
  area_id: string;
  name: string;
}

export interface HassDevice {
  id: string;
  name: string;
  area_id: string | null;
}

export interface HassEntityRegistryEntry {
  entity_id: string;
  device_id: string | null;
  area_id: string | null;
  name: string | null;
  platform: string;
}

export interface WeatherForecast {
  datetime: string;
  condition: string;
  temperature: number;
  templow?: number;
  precipitation?: number;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  state: string;
  status: string;
  icon?: string;
  iconAnimation?: 'none' | 'spin' | 'pulse' | 'glow';
  unit?: string;
  haDomain: string;
  haDeviceClass?: string;
  attributes?: Record<string, any>;
  
  // Specific capabilities
  brightness?: number;
  temperature?: number;
  targetTemperature?: number;
  hvacAction?: string;
  hvacModes?: string[];
  presetMode?: string;
  presetModes?: string[];
  currentHumidity?: number;
  targetHumidity?: number;
  fanSpeed?: number | string;
  fanLevel?: string;
  fanLevels?: string[];
  currentPosition?: number;
  mediaTitle?: string;
  mediaArtist?: string;
  appName?: string;
  entityPictureUrl?: string;
  batteryLevel?: number;
  minTemp?: number;
  maxTemp?: number;
  
  // Weather specific
  condition?: string;
  forecast?: WeatherForecast[];

  // Event Timer Widget specific
  widgetId?: string;
  fillPercentage?: number;
  daysRemaining?: number;
  buttonText?: string;
  fillColors?: [string, string, string];
  animation?: 'smooth' | 'wave' | 'bubbles' | 'none';
  fillDirection?: 'bottom-to-top' | 'top-to-bottom';
  showName?: boolean;
  nameFontSize?: number;
  namePosition?: { x: number, y: number };
  daysRemainingFontSize?: number;
  daysRemainingPosition?: { x: number, y: number };
  cycleDays?: number;
  lastResetDate?: string | null;
  
  // History
  history?: number[];
}

export interface PhysicalDevice {
  id: string;
  name: string;
  entities: Device[];
}

export interface Room {
  id: string;
  name: string;
  devices: Device[];
}

export interface RoomWithPhysicalDevices {
  id: string;
  name: string;
  devices: PhysicalDevice[];
}

export interface GridLayoutItem {
  deviceId: string;
  col: number;
  row: number;
  width?: number;
  height?: number;
}

export interface GridSettings {
  cols: number;
  rows: number;
}

export interface Tab {
  id: string;
  name: string;
  layout: GridLayoutItem[];
  gridSettings: GridSettings;
  // Legacy fields
  orderedDeviceIds?: string[];
  deviceIds?: string[];
  groups?: any[];
  layoutMode?: any;
  gridLayout?: any;
}

export interface DeviceBinding {
  slotId: string;
  entityId: string;
  icon?: string;
  enabled: boolean;
}

export interface ThresholdRule {
  value: number;
  comparison: 'above' | 'below';
  style: {
    backgroundColor?: string;
    valueColor?: string;
  };
}

export interface DeviceCustomization {
  name?: string;
  type?: DeviceType;
  icon?: string;
  isHidden?: boolean;
  templateId?: string;
  iconAnimation?: 'none' | 'spin' | 'pulse' | 'glow';
  deviceBindings?: DeviceBinding[];
  thresholds?: ThresholdRule[];
}

export type DeviceCustomizations = Record<string, DeviceCustomization>;

export type CardElementId = 'name' | 'icon' | 'value' | 'unit' | 'chart' | 'status' | 'slider' | 'temperature' | 'target-temperature' | 'hvac-modes' | 'linked-entity' | 'battery' | 'fan-speed-control' | 'target-temperature-text' | 'current-temperature-prefixed' | 'temperature-slider';

export interface ElementStyles {
  fontFamily?: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  onColor?: string;
  offColor?: string;
  iconBackgroundColorOn?: string;
  iconBackgroundColorOff?: string;
  decimalPlaces?: number;
  chartTimeRange?: number;
  chartTimeRangeUnit?: 'hours' | 'days';
  chartType?: 'line' | 'gradient';
  linkedEntityId?: string;
  linkedFanEntityId?: string;
  showValue?: boolean;
  idleLabelColor?: string;
  heatingLabelColor?: string;
  coolingLabelColor?: string;
}

export interface CardElement {
  id: CardElementId;
  uniqueId: string;
  visible: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  styles: ElementStyles;
  sizeMode: 'card' | 'cell';
  locked?: boolean;
}

export interface CardTemplate {
  id: string;
  name: string;
  deviceType: string;
  width?: number;
  height?: number;
  elements: CardElement[];
  styles?: any;
  interactionType?: 'passive' | 'active';
  mainActionEntityId?: string;
  deviceSlots?: { id: string; name: string }[];
}

export type CardTemplates = Record<string, CardTemplate>;

export type ClockSize = 'sm' | 'md' | 'lg';

export interface ClockSettings {
  format: '12h' | '24h';
  showSeconds: boolean;
  size: ClockSize;
}

export interface ThemeColors {
  dashboardBackgroundType: 'color' | 'gradient' | 'image';
  dashboardBackgroundColor1: string;
  dashboardBackgroundColor2?: string;
  dashboardBackgroundImage?: string;
  dashboardBackgroundImageBlur?: number;
  dashboardBackgroundImageBrightness?: number;
  
  cardOpacity?: number;
  panelOpacity?: number;
  cardBorderRadius?: number;
  // FIX: Added missing theme properties for card borders and icon backgrounds.
  cardBorderWidth?: number;
  cardBorderColor?: string;
  cardBorderColorOn?: string;
  
  iconBackgroundShape?: 'circle' | 'rounded-square';
  iconBackgroundColorOn?: string;
  iconBackgroundColorOff?: string;

  cardBackground: string;
  cardBackgroundOn: string;
  
  nameTextColor: string;
  statusTextColor: string;
  valueTextColor: string;
  unitTextColor: string;
  
  nameTextColorOn: string;
  statusTextColorOn: string;
  valueTextColorOn: string;
  unitTextColorOn: string;
  
  tabTextColor: string;
  activeTabTextColor: string;
  tabIndicatorColor: string;
  clockTextColor: string;
  
  thermostatHandleColor: string;
  thermostatDialTextColor: string;
  thermostatDialLabelColor: string;
  thermostatHeatingColor: string;
  thermostatCoolingColor: string;
  
  weatherIconSize?: number;
  weatherForecastIconSize?: number;
  weatherCurrentTempFontSize?: number;
  weatherCurrentDescFontSize?: number;
  weatherForecastDayFontSize?: number;
  weatherForecastMaxTempFontSize?: number;
  weatherForecastMinTempFontSize?: number;
}

export interface ColorScheme {
    light: ThemeColors;
    dark: ThemeColors;
}

export type ColorThemeSet = ColorScheme;

export interface ThemeDefinition {
  id: string;
  name: string;
  isCustom: boolean;
  scheme: ColorScheme;
}

export interface EventTimerWidget {
  id: string;
  name: string;
  cycleDays: number;
  lastResetDate: string | null;
  buttonText?: string;
  fillColors?: [string, string, string];
  animation?: 'smooth' | 'wave' | 'bubbles' | 'none';
  fillDirection?: 'bottom-to-top' | 'top-to-bottom';
  showName?: boolean;
  nameFontSize?: number;
  namePosition?: { x: number, y: number };
  daysRemainingFontSize?: number;
  daysRemainingPosition?: { x: number, y: number };
}

export interface CustomCardWidget {
  id: string;
  name: string;
}

export interface WeatherSettings {
  iconPack: 'default' | 'meteocons' | 'weather-icons' | 'material-symbols-light';
  forecastDays: number;
}

export interface ServerConfig {
  id: string;
  name: string;
  url: string;
  token: string;
}

export interface AuroraSettings {
  color1: string;
  color2: string;
  color3: string;
  speed: number;
  intensity: number;
  blur: number;
  saturate: number;
  starsEnabled: boolean;
  starsSpeed: number;
}

export interface ThemePackage {
  schemaVersion: number;
  manifest: {
    name: string;
    version: string;
    author: string;
    description: string;
    generatedAt: string;
  };
  theme: ThemeDefinition;
  templates?: CardTemplate[];
}

export interface WeatherData {
    current: {
        temp: number;
        desc: string;
        icon: string;
    };
    forecast: {
        day: string;
        tempMax: number;
        tempMin: number;
        icon: string;
    }[];
}