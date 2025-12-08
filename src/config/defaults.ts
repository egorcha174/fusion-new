
import {
    CardTemplates,
    ColorScheme,
    CardTemplate,
    DeviceType,
    ClockSettings,
    WeatherSettings,
    ThemeDefinition,
    AuroraSettings
} from '../types';
import { nanoid } from 'nanoid';
import appleTheme from '../apple-inspired-light.theme.json';

// --- Default Template IDs ---
export const DEFAULT_SENSOR_TEMPLATE_ID = 'default-sensor';
export const DEFAULT_LIGHT_TEMPLATE_ID = 'default-light';
export const DEFAULT_SWITCH_TEMPLATE_ID = 'default-switch';
export const DEFAULT_CLIMATE_TEMPLATE_ID = 'default-climate';
export const DEFAULT_HUMIDIFIER_TEMPLATE_ID = 'humidifier-card';
export const BEAUTIFUL_THERMOSTAT_TEMPLATE_ID = 'beautiful-thermostat';


// --- Default Font Family ---
export const DEFAULT_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// --- Default Templates ---
const defaultSensorTemplate: CardTemplate = {
  id: DEFAULT_SENSOR_TEMPLATE_ID, name: 'Стандартный сенсор', deviceType: 'sensor',
  styles: { },
  elements: [
    { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 7 }, size: { width: 65, height: 22 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 }, sizeMode: 'card', locked: false },
    { id: 'icon', uniqueId: nanoid(), visible: true, position: { x: 80, y: 7 }, size: { width: 15, height: 15 }, zIndex: 2, styles: {}, sizeMode: 'card', locked: false },
    { id: 'value', uniqueId: nanoid(), visible: true, position: { x: 8, y: 35 }, size: { width: 70, height: 40 }, zIndex: 2, styles: { decimalPlaces: 1, fontFamily: DEFAULT_FONT_FAMILY, fontSize: 52 }, sizeMode: 'card', locked: false },
    { id: 'unit', uniqueId: nanoid(), visible: true, position: { x: 70, y: 40 }, size: { width: 25, height: 25 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 24 }, sizeMode: 'card', locked: false },
    { id: 'chart', uniqueId: nanoid(), visible: true, position: { x: 0, y: 82 }, size: { width: 100, height: 18 }, zIndex: 1, styles: { chartTimeRange: 24, chartTimeRangeUnit: 'hours', chartType: 'gradient' }, sizeMode: 'card', locked: false },
    { id: 'status', uniqueId: nanoid(), visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {}, sizeMode: 'card', locked: false },
  ],
};

const defaultLightTemplate: CardTemplate = {
    id: DEFAULT_LIGHT_TEMPLATE_ID, name: 'Стандартный светильник', deviceType: 'light',
    styles: { },
    elements: [
      { id: 'icon', uniqueId: nanoid(), visible: true, position: { x: 8, y: 8 }, size: { width: 20, height: 20 }, zIndex: 2, styles: { onColor: 'rgb(59 130 246 / 1)' }, sizeMode: 'card', locked: false },
      { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 35 }, size: { width: 84, height: 22 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 }, sizeMode: 'card', locked: false },
      { id: 'status', uniqueId: nanoid(), visible: true, position: { x: 8, y: 58 }, size: { width: 84, height: 12 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 14 }, sizeMode: 'card', locked: false },
      { id: 'slider', uniqueId: nanoid(), visible: true, position: { x: 8, y: 78 }, size: { width: 84, height: 14 }, zIndex: 2, styles: {}, sizeMode: 'card', locked: false },
    ],
};

const defaultSwitchTemplate: CardTemplate = {
    id: DEFAULT_SWITCH_TEMPLATE_ID, name: 'Стандартный переключатель', deviceType: 'switch',
    styles: { },
    elements: [
      { id: 'icon', uniqueId: nanoid(), visible: true, position: { x: 8, y: 8 }, size: { width: 20, height: 20 }, zIndex: 2, styles: { onColor: 'rgb(59 130 246 / 1)' }, sizeMode: 'card', locked: false },
      { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 35 }, size: { width: 84, height: 22 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 }, sizeMode: 'card', locked: false },
      { id: 'status', uniqueId: nanoid(), visible: true, position: { x: 8, y: 58 }, size: { width: 84, height: 12 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 14 }, sizeMode: 'card', locked: false },
    ],
};

const defaultClimateTemplate: CardTemplate = {
  id: DEFAULT_CLIMATE_TEMPLATE_ID, name: 'Стандартный климат', deviceType: 'climate',
  styles: { },
  elements: [
    { id: 'temperature', uniqueId: nanoid(), visible: true, position: { x: 8, y: 15 }, size: { width: 40, height: 15 }, zIndex: 2, styles: { decimalPlaces: 0, fontFamily: DEFAULT_FONT_FAMILY, fontSize: 24 }, sizeMode: 'card', locked: false },
    { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 32 }, size: { width: 40, height: 10 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 }, sizeMode: 'card', locked: false },
    { id: 'status', uniqueId: nanoid(), visible: true, position: { x: 8, y: 44 }, size: { width: 40, height: 8 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 14 }, sizeMode: 'card', locked: false },
    { id: 'target-temperature', uniqueId: nanoid(), visible: true, position: { x: 25, y: 5 }, size: { width: 90, height: 90 }, zIndex: 1, styles: {}, sizeMode: 'card', locked: false },
    { id: 'hvac-modes', uniqueId: nanoid(), visible: true, position: { x: 80, y: 25 }, size: { width: 15, height: 50 }, zIndex: 2, styles: {}, sizeMode: 'card', locked: false },
    { id: 'linked-entity', uniqueId: nanoid(), visible: false, position: { x: 8, y: 8 }, size: { width: 10, height: 10 }, zIndex: 2, styles: { linkedEntityId: '', showValue: false }, sizeMode: 'card', locked: false },
  ],
};

const humidifierTemplate: CardTemplate = {
  id: "humidifier-card",
  name: "Увлажнитель (расширенный)",
  deviceType: "humidifier",
  styles: {},
  width: 2,
  height: 2,
  elements: [
    { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 5, y: 5 }, size: { width: 90, height: 8 }, zIndex: 2, styles: { textAlign: 'center', fontSize: 16 }, sizeMode: 'card', locked: false },
    { id: 'status', uniqueId: nanoid(), visible: true, position: { x: 5, y: 14 }, size: { width: 90, height: 7 }, zIndex: 2, styles: { textAlign: 'center', fontSize: 12 }, sizeMode: 'card', locked: false },
    { id: 'temperature', uniqueId: nanoid(), visible: true, position: { x: 5, y: 22 }, size: { width: 90, height: 7 }, zIndex: 2, styles: { textAlign: 'center', fontSize: 12 }, sizeMode: 'card', locked: false },
    { id: 'target-temperature', uniqueId: nanoid(), visible: true, position: { x: 20, y: 30 }, size: { width: 60, height: 60 }, zIndex: 1, styles: {}, sizeMode: 'card', locked: false },
    { id: 'fan-speed-control', uniqueId: nanoid(), visible: true, position: { x: 5, y: 85 }, size: { width: 90, height: 12 }, zIndex: 3, styles: { linkedFanEntityId: '' }, sizeMode: 'card', locked: false }
  ],
};

const customCardTemplate: CardTemplate = {
    id: 'custom-template', name: 'Стандартная кастомная', deviceType: 'custom',
    styles: { },
    width: 2,
    height: 2,
    elements: [
      { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 8 }, size: { width: 84, height: 15 }, zIndex: 1, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 }, sizeMode: 'card', locked: false },
    ],
};

const beautifulThermostatTemplate: CardTemplate = {
  id: BEAUTIFUL_THERMOSTAT_TEMPLATE_ID,
  name: 'Красивый термостат',
  deviceType: 'climate',
  width: 2,
  height: 2,
  styles: {},
  elements: [
    { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 50, y: 12 }, size: { width: 90, height: 10 }, zIndex: 1, styles: { textAlign: 'center', fontSize: 24 } , sizeMode: 'card', locked: false},
    { id: 'target-temperature-text', uniqueId: nanoid(), visible: true, position: { x: 50, y: 35 }, size: { width: 90, height: 25 }, zIndex: 1, styles: { textAlign: 'center', fontSize: 64 }, sizeMode: 'card', locked: false},
    { id: 'current-temperature-prefixed', uniqueId: nanoid(), visible: true, position: { x: 50, y: 58 }, size: { width: 90, height: 8 }, zIndex: 1, styles: { textAlign: 'center', fontSize: 16 }, sizeMode: 'card', locked: false},
    { id: 'temperature-slider', uniqueId: nanoid(), visible: true, position: { x: 50, y: 72 }, size: { width: 80, height: 5 }, zIndex: 1, styles: {}, sizeMode: 'card', locked: false},
    { id: 'hvac-modes', uniqueId: nanoid(), visible: true, position: { x: 50, y: 90 }, size: { width: 90, height: 12 }, zIndex: 1, styles: {}, sizeMode: 'card', locked: false}
  ]
};

export const defaultTemplates: CardTemplates = {
    [DEFAULT_SENSOR_TEMPLATE_ID]: defaultSensorTemplate,
    [DEFAULT_LIGHT_TEMPLATE_ID]: defaultLightTemplate,
    [DEFAULT_SWITCH_TEMPLATE_ID]: defaultSwitchTemplate,
    [DEFAULT_CLIMATE_TEMPLATE_ID]: defaultClimateTemplate,
    [BEAUTIFUL_THERMOSTAT_TEMPLATE_ID]: beautifulThermostatTemplate,
    'humidifier-card': humidifierTemplate,
    'custom-template': customCardTemplate,
};

// --- Default Color Scheme ---
const theme: any = appleTheme;
export const DEFAULT_COLOR_SCHEME: ColorScheme = theme.colorScheme;

// --- Other Default Settings ---
export const defaultClockSettings: ClockSettings = { format: '24h', showSeconds: true, size: 'md' };
export const DEFAULT_SIDEBAR_WIDTH = 320;
export const DEFAULT_SIDEBAR_VISIBLE = true;
export const DEFAULT_THEME_MODE: 'day' | 'night' | 'auto' | 'schedule' = 'auto';
export const DEFAULT_WEATHER_PROVIDER: 'openweathermap' | 'yandex' | 'foreca' = 'openweathermap';
export const DEFAULT_WEATHER_SETTINGS: WeatherSettings = {
  iconPack: 'default',
  forecastDays: 4,
};
export const DEFAULT_LOW_BATTERY_THRESHOLD = 20;
export const DEFAULT_AURORA_SETTINGS: AuroraSettings = {
  color1: '#00ffc8',
  color2: '#78c8ff',
  color3: '#00b4ff',
  speed: 22,
  intensity: 90,
  blur: 18,
  saturate: 140,
  starsEnabled: true,
  starsSpeed: 6,
};

// --- Built-in Themes ---
export const DEFAULT_THEMES: ThemeDefinition[] = [
    { id: 'apple-default', name: 'Стандартная', isCustom: false, scheme: DEFAULT_COLOR_SCHEME },
    { id: 'apple-graphite', name: 'Графит', isCustom: false, scheme: {"light":{"dashboardBackgroundType":"gradient","dashboardBackgroundColor1":"#EAEAEB","dashboardBackgroundColor2":"#DCDCDC","cardOpacity":0.85,"panelOpacity":0.75,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#D1D1D6","cardBorderColorOn":"#0A84FF","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.9)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.4)","cardBackground":"rgba(255, 255, 255, 0.8)","cardBackgroundOn":"rgba(255, 255, 255, 0.95)","tabTextColor":"#515154","activeTabTextColor":"#1D1D1F","tabIndicatorColor":"#1D1D1F","thermostatHandleColor":"#FFFFFF","thermostatDialTextColor":"#1D1D1F","thermostatDialLabelColor":"#515154","thermostatHeatingColor":"#F97316","thermostatCoolingColor":"#3B82F6","clockTextColor":"#1D1D1F","nameTextColor":"#1D1D1F","statusTextColor":"#515154","valueTextColor":"#1D1D1F","unitTextColor":"#1D1D1F","nameTextColorOn":"#1D1D1F","statusTextColorOn":"#515154","valueTextColorOn":"#1D1D1F","unitTextColorOn":"#1D1D1F"},"dark":{"dashboardBackgroundType":"color","dashboardBackgroundColor1":"#1C1C1E","cardOpacity":0.8,"panelOpacity":0.75,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#48484A","cardBorderColorOn":"#0A84FF","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.15)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.05)","cardBackground":"rgba(44, 44, 46, 0.8)","cardBackgroundOn":"rgba(60, 60, 62, 0.85)","tabTextColor":"#8E8E93","activeTabTextColor":"#F5F5F7","tabIndicatorColor":"#F5F5F7","thermostatHandleColor":"#1C1C1E","thermostatDialTextColor":"#F5F5F7","thermostatDialLabelColor":"#8E8E93","thermostatHeatingColor":"#F28C18","thermostatCoolingColor":"#0A84FF","clockTextColor":"#F5F5F7","nameTextColor":"#F5F5F7","statusTextColor":"#8E8E93","valueTextColor":"#F5F5F7","unitTextColor":"#F5F5F7","nameTextColorOn":"#F5F5F7","statusTextColorOn":"#8E8E93","valueTextColorOn":"#F5F5F7","unitTextColorOn":"#F5F5F7"}} },
    { id: 'apple-mint', name: 'Мята', isCustom: false, scheme: {"light":{"dashboardBackgroundType":"gradient","dashboardBackgroundColor1":"#F0F7F6","dashboardBackgroundColor2":"#E6F0EF","cardOpacity":0.85,"panelOpacity":0.75,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#D1FAE5","cardBorderColorOn":"#059669","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.9)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.4)","cardBackground":"rgba(255, 255, 255, 0.8)","cardBackgroundOn":"rgba(255, 255, 255, 0.95)","tabTextColor":"#374151","activeTabTextColor":"#065F46","tabIndicatorColor":"#059669","thermostatHandleColor":"#FFFFFF","thermostatDialTextColor":"#065F46","thermostatDialLabelColor":"#374151","thermostatHeatingColor":"#F97316","thermostatCoolingColor":"#3B82F6","clockTextColor":"#065F46","nameTextColor":"#374151","statusTextColor":"#6B7280","valueTextColor":"#065F46","unitTextColor":"#065F46","nameTextColorOn":"#065F46","statusTextColorOn":"#374151","valueTextColorOn":"#065F46","unitTextColorOn":"#065F46"},"dark":{"dashboardBackgroundType":"color","dashboardBackgroundColor1":"#1A2421","cardOpacity":0.8,"panelOpacity":0.75,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#1E293B","cardBorderColorOn":"#34D399","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.15)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.05)","cardBackground":"rgba(30, 41, 59, 0.8)","cardBackgroundOn":"rgba(38, 52, 75, 0.85)","tabTextColor":"#9CA3AF","activeTabTextColor":"#A7F3D0","tabIndicatorColor":"#34D399","thermostatHandleColor":"#1A2421","thermostatDialTextColor":"#A7F3D0","thermostatDialLabelColor":"#9CA3AF","thermostatHeatingColor":"#F28C18","thermostatCoolingColor":"#0A84FF","clockTextColor":"#A7F3D0","nameTextColor":"#D1D5DB","statusTextColor":"#9CA3AF","valueTextColor":"#A7F3D0","unitTextColor":"#A7F3D0","nameTextColorOn":"#A7F3D0","statusTextColorOn":"#9CA3AF","valueTextColorOn":"#A7F3D0","unitTextColorOn":"#A7F3D0"}} },
    { id: 'futuristic', name: 'Футуристика', isCustom: false, scheme: {"light":{"dashboardBackgroundType":"gradient","dashboardBackgroundColor1":"#f5f7fa","dashboardBackgroundColor2":"#eef2f7","cardOpacity":0.8,"panelOpacity":0.7,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#D1D9E6","cardBorderColorOn":"#007A7A","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.9)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.4)","cardBackground":"rgba(255, 255, 255, 0.8)","cardBackgroundOn":"rgba(255, 255, 255, 1.0)","tabTextColor":"#5c677d","activeTabTextColor":"#007a7a","tabIndicatorColor":"#007a7a","thermostatHandleColor":"#FFFFFF","thermostatDialTextColor":"#005a5a","thermostatDialLabelColor":"#5c677d","thermostatHeatingColor":"#ff6b6b","thermostatCoolingColor":"#4d96ff","clockTextColor":"#005a5a","nameTextColor":"#333d4f","statusTextColor":"#5c677d","valueTextColor":"#005a5a","unitTextColor":"#005a5a","nameTextColorOn":"#005a5a","statusTextColorOn":"#5c677d","valueTextColorOn":"#005a5a","unitTextColorOn":"#005a5a"},"dark":{"dashboardBackgroundType":"gradient","dashboardBackgroundColor1":"#1a2a3a","dashboardBackgroundColor2":"#101a24","cardOpacity":0.8,"panelOpacity":0.7,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#2A3A4A","cardBorderColorOn":"#00DADA","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.15)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.05)","cardBackground":"rgba(20, 30, 40, 0.8)","cardBackgroundOn":"rgba(25, 35, 45, 1.0)","tabTextColor":"#9cb3cc","activeTabTextColor":"#00dada","tabIndicatorColor":"#00dada","thermostatHandleColor":"#1a2a3a","thermostatDialTextColor":"#00dada","thermostatDialLabelColor":"#9cb3cc","thermostatHeatingColor":"#ff8787","thermostatCoolingColor":"#74afff","clockTextColor":"#00dada","nameTextColor":"#c0d4e7","statusTextColor":"#9cb3cc","valueTextColor":"#00dada","unitTextColor":"#00dada","nameTextColorOn":"#00dada","statusTextColorOn":"#9cb3cc","valueTextColorOn":"#00dada","unitTextColorOn":"#00dada"}} },
    { id: 'deep-space', name: 'Глубокий космос', isCustom: false, scheme: {"light":{"dashboardBackgroundType":"gradient","dashboardBackgroundColor1":"#D4DEE7","dashboardBackgroundColor2":"#BCC8D6","cardOpacity":0.85,"panelOpacity":0.75,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#E2E8F0","cardBorderColorOn":"#3182CE","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.9)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.4)","cardBackground":"rgba(255, 255, 255, 0.7)","cardBackgroundOn":"rgba(255, 255, 255, 0.9)","tabTextColor":"#4A5568","activeTabTextColor":"#1A202C","tabIndicatorColor":"#2D3748","thermostatHandleColor":"#FFFFFF","thermostatDialTextColor":"#1A202C","thermostatDialLabelColor":"#4A5568","thermostatHeatingColor":"#DD6B20","thermostatCoolingColor":"#3182CE","clockTextColor":"#1A202C","nameTextColor":"#2D3748","statusTextColor":"#718096","valueTextColor":"#1A202C","unitTextColor":"#1A202C","nameTextColorOn":"#1A202C","statusTextColorOn":"#2D3748","valueTextColorOn":"#1A202C","unitTextColorOn":"#1A202C"},"dark":{"dashboardBackgroundType":"color","dashboardBackgroundColor1":"#0a0f14","cardOpacity":0.8,"panelOpacity":0.7,"cardBorderRadius":16,"cardBorderWidth":0,"cardBorderColor":"#2D3748","cardBorderColorOn":"#89B3F8","iconBackgroundShape":"circle","iconBackgroundColorOn":"rgba(255, 255, 255, 0.15)","iconBackgroundColorOff":"rgba(255, 255, 255, 0.05)","cardBackground":"rgba(18, 25, 35, 0.8)","cardBackgroundOn":"rgba(25, 33, 45, 0.9)","tabTextColor":"#9FB1CC","activeTabTextColor":"#EAF0F6","tabIndicatorColor":"#89B3F8","thermostatHandleColor":"#121923","thermostatDialTextColor":"#EAF0F6","thermostatDialLabelColor":"#9FB1CC","thermostatHeatingColor":"#F6AD55","thermostatCoolingColor":"#63B3ED","clockTextColor":"#EAF0F6","nameTextColor":"#CBD5E0","statusTextColor":"#A0AEC0","valueTextColor":"#EAF0F6","unitTextColor":"#EAF0F6","nameTextColorOn":"#EAF0F6","statusTextColorOn":"#CBD5E0","valueTextColorOn":"#EAF0F6","unitTextColorOn":"#EAF0F6"}} },
    {
        id: 'tron',
        name: 'Трон',
        isCustom: false,
        scheme: {
            light: {
                dashboardBackgroundType: "gradient",
                dashboardBackgroundColor1: "#F0F9FF",
                dashboardBackgroundColor2: "#CFFAFE",
                dashboardBackgroundImageBlur: 0,
                dashboardBackgroundImageBrightness: 100,
                cardOpacity: 0.9,
                panelOpacity: 0.8,
                cardBorderRadius: 6,
                cardBorderWidth: 1,
                cardBorderColor: "#0891B2",
                cardBorderColorOn: "#0891B2",
                iconBackgroundShape: "rounded-square",
                iconBackgroundColorOn: "rgba(8, 145, 178, 0.15)",
                iconBackgroundColorOff: "rgba(8, 145, 178, 0.05)",
                cardBackground: "rgba(255, 255, 255, 0.9)",
                cardBackgroundOn: "rgba(224, 242, 254, 1)",
                tabTextColor: "#64748B",
                activeTabTextColor: "#0891B2",
                tabIndicatorColor: "#0891B2",
                thermostatHandleColor: "#FFFFFF",
                thermostatDialTextColor: "#0891B2",
                thermostatDialLabelColor: "#64748B",
                thermostatHeatingColor: "#EA580C",
                thermostatCoolingColor: "#06B6D4",
                clockTextColor: "#0891B2",
                weatherIconSize: 96,
                weatherForecastIconSize: 48,
                weatherCurrentTempFontSize: 36,
                weatherCurrentDescFontSize: 14,
                weatherForecastDayFontSize: 12,
                weatherForecastMaxTempFontSize: 18,
                weatherForecastMinTempFontSize: 14,
                nameTextColor: "#334155",
                statusTextColor: "#64748B",
                valueTextColor: "#0891B2",
                unitTextColor: "#0891B2",
                nameTextColorOn: "#0C4A6E",
                statusTextColorOn: "#0369A1",
                valueTextColorOn: "#0891B2",
                unitTextColorOn: "#0891B2"
            },
            dark: {
                dashboardBackgroundType: "gradient",
                dashboardBackgroundColor1: "#020617", // Nearly black
                dashboardBackgroundColor2: "#0B1120", // Dark blue-black
                dashboardBackgroundImageBlur: 0,
                dashboardBackgroundImageBrightness: 100,
                cardOpacity: 0.85,
                panelOpacity: 0.85,
                cardBorderRadius: 6, // Tech feel
                cardBorderWidth: 1,
                cardBorderColor: "#22D3EE",
                cardBorderColorOn: "#22D3EE",
                iconBackgroundShape: "rounded-square",
                iconBackgroundColorOn: "rgba(34, 211, 238, 0.15)",
                iconBackgroundColorOff: "rgba(34, 211, 238, 0.05)",
                cardBackground: "rgba(15, 23, 42, 0.6)", // Dark Slate
                cardBackgroundOn: "rgba(6, 182, 212, 0.25)", // Cyan glow
                tabTextColor: "#475569",
                activeTabTextColor: "#22D3EE", // Cyan Neon
                tabIndicatorColor: "#22D3EE",
                thermostatHandleColor: "#0F172A",
                thermostatDialTextColor: "#22D3EE",
                thermostatDialLabelColor: "#94A3B8",
                thermostatHeatingColor: "#F97316", // Neon Orange (Clu)
                thermostatCoolingColor: "#22D3EE", // Neon Blue (Tron)
                clockTextColor: "#22D3EE",
                weatherIconSize: 96,
                weatherForecastIconSize: 48,
                weatherCurrentTempFontSize: 36,
                weatherCurrentDescFontSize: 14,
                weatherForecastDayFontSize: 12,
                weatherForecastMaxTempFontSize: 18,
                weatherForecastMinTempFontSize: 14,
                nameTextColor: "#E2E8F0",
                statusTextColor: "#64748B",
                valueTextColor: "#22D3EE",
                unitTextColor: "#22D3EE",
                nameTextColorOn: "#FFFFFF",
                statusTextColorOn: "#A5F3FC",
                valueTextColorOn: "#FFFFFF",
                unitTextColorOn: "#FFFFFF"
            }
        }
    }
];
