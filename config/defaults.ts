import {
    CardTemplates,
    ColorScheme,
    CardTemplate,
    DeviceType,
    ClockSettings,
    CameraSettings
} from '../types';
import { nanoid } from 'nanoid';

// --- Default Template IDs ---
export const DEFAULT_SENSOR_TEMPLATE_ID = 'default-sensor';
export const DEFAULT_LIGHT_TEMPLATE_ID = 'default-light';
export const DEFAULT_SWITCH_TEMPLATE_ID = 'default-switch';
export const DEFAULT_CLIMATE_TEMPLATE_ID = 'default-climate';
export const DEFAULT_HUMIDIFIER_TEMPLATE_ID = 'humidifier-card';

// --- Default Font Family ---
export const DEFAULT_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// --- Default Templates ---
const defaultSensorTemplate: CardTemplate = {
  id: DEFAULT_SENSOR_TEMPLATE_ID, name: 'Стандартный сенсор', deviceType: 'sensor',
  styles: { },
  elements: [
    { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 7 }, size: { width: 65, height: 22 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 } },
    { id: 'icon', uniqueId: nanoid(), visible: true, position: { x: 80, y: 7 }, size: { width: 15, height: 15 }, zIndex: 2, styles: {} },
    { id: 'value', uniqueId: nanoid(), visible: true, position: { x: 8, y: 35 }, size: { width: 70, height: 40 }, zIndex: 2, styles: { decimalPlaces: 1, fontFamily: DEFAULT_FONT_FAMILY, fontSize: 52 } },
    { id: 'unit', uniqueId: nanoid(), visible: true, position: { x: 70, y: 40 }, size: { width: 25, height: 25 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 24 } },
    { id: 'chart', uniqueId: nanoid(), visible: true, position: { x: 0, y: 82 }, size: { width: 100, height: 18 }, zIndex: 1, styles: { chartTimeRange: 24, chartTimeRangeUnit: 'hours', chartType: 'gradient' } },
    { id: 'status', uniqueId: nanoid(), visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
  ],
};

const defaultLightTemplate: CardTemplate = {
    id: DEFAULT_LIGHT_TEMPLATE_ID, name: 'Стандартный светильник', deviceType: 'light',
    styles: { },
    elements: [
      { id: 'icon', uniqueId: nanoid(), visible: true, position: { x: 8, y: 8 }, size: { width: 20, height: 20 }, zIndex: 2, styles: { onColor: 'rgb(59 130 246 / 1)' } },
      { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 35 }, size: { width: 84, height: 22 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 } },
      { id: 'status', uniqueId: nanoid(), visible: true, position: { x: 8, y: 58 }, size: { width: 84, height: 12 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 14 } },
      { id: 'slider', uniqueId: nanoid(), visible: true, position: { x: 8, y: 78 }, size: { width: 84, height: 14 }, zIndex: 2, styles: {} },
    ],
};

const defaultSwitchTemplate: CardTemplate = {
    id: DEFAULT_SWITCH_TEMPLATE_ID, name: 'Стандартный переключатель', deviceType: 'switch',
    styles: { },
    elements: [
      { id: 'icon', uniqueId: nanoid(), visible: true, position: { x: 8, y: 8 }, size: { width: 20, height: 20 }, zIndex: 2, styles: { onColor: 'rgb(59 130 246 / 1)' } },
      { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 35 }, size: { width: 84, height: 22 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 } },
      { id: 'status', uniqueId: nanoid(), visible: true, position: { x: 8, y: 58 }, size: { width: 84, height: 12 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 14 } },
    ],
};

const defaultClimateTemplate: CardTemplate = {
  id: DEFAULT_CLIMATE_TEMPLATE_ID, name: 'Стандартный климат', deviceType: 'climate',
  styles: { },
  elements: [
    { id: 'temperature', uniqueId: nanoid(), visible: true, position: { x: 8, y: 15 }, size: { width: 40, height: 15 }, zIndex: 2, styles: { decimalPlaces: 0, fontFamily: DEFAULT_FONT_FAMILY, fontSize: 24 } },
    { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 32 }, size: { width: 40, height: 10 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 } },
    { id: 'status', uniqueId: nanoid(), visible: true, position: { x: 8, y: 44 }, size: { width: 40, height: 8 }, zIndex: 2, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 14 } },
    { id: 'target-temperature', uniqueId: nanoid(), visible: true, position: { x: 25, y: 5 }, size: { width: 90, height: 90 }, zIndex: 1, styles: {} },
    { id: 'hvac-modes', uniqueId: nanoid(), visible: true, position: { x: 80, y: 25 }, size: { width: 15, height: 50 }, zIndex: 2, styles: {} },
    { id: 'linked-entity', uniqueId: nanoid(), visible: false, position: { x: 8, y: 8 }, size: { width: 10, height: 10 }, zIndex: 2, styles: { linkedEntityId: '', showValue: false } },
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
    { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 5, y: 5 }, size: { width: 90, height: 8 }, zIndex: 2, styles: { textAlign: 'center', fontSize: 16 } },
    { id: 'status', uniqueId: nanoid(), visible: true, position: { x: 5, y: 14 }, size: { width: 90, height: 7 }, zIndex: 2, styles: { textAlign: 'center', fontSize: 12 } },
    { id: 'temperature', uniqueId: nanoid(), visible: true, position: { x: 5, y: 22 }, size: { width: 90, height: 7 }, zIndex: 2, styles: { textAlign: 'center', fontSize: 12 } },
    { id: 'target-temperature', uniqueId: nanoid(), visible: true, position: { x: 20, y: 30 }, size: { width: 60, height: 60 }, zIndex: 1, styles: {} },
    { id: 'fan-speed-control', uniqueId: nanoid(), visible: true, position: { x: 5, y: 85 }, size: { width: 90, height: 12 }, zIndex: 3, styles: { linkedFanEntityId: '' } }
  ],
};

const customCardTemplate: CardTemplate = {
    id: 'custom-template', name: 'Стандартная кастомная', deviceType: 'custom',
    styles: { },
    width: 2,
    height: 2,
    elements: [
      { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 8, y: 8 }, size: { width: 84, height: 15 }, zIndex: 1, styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 } },
    ],
};

export const defaultTemplates: CardTemplates = {
    [DEFAULT_SENSOR_TEMPLATE_ID]: defaultSensorTemplate,
    [DEFAULT_LIGHT_TEMPLATE_ID]: defaultLightTemplate,
    [DEFAULT_SWITCH_TEMPLATE_ID]: defaultSwitchTemplate,
    [DEFAULT_CLIMATE_TEMPLATE_ID]: defaultClimateTemplate,
    'humidifier-card': humidifierTemplate,
    'custom-template': customCardTemplate,
};

// --- Default Color Scheme ---
export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  light: {
    dashboardBackgroundType: 'color',
    dashboardBackgroundColor1: '#E9EEF6',
    dashboardBackgroundColor2: '#DDE6F1',
    dashboardBackgroundImageBlur: 0,
    dashboardBackgroundImageBrightness: 100,
    cardOpacity: 0.8,
    panelOpacity: 0.7,
    cardBackground: 'rgba(255, 255, 255, 0.7)',
    cardBackgroundOn: 'rgba(255, 255, 255, 0.7)',
    tabTextColor: '#6A6A6A',
    activeTabTextColor: '#212121',
    tabIndicatorColor: '#212121',
    nameTextColor: '#4A4A4A',
    statusTextColor: '#6A6A6A',
    valueTextColor: '#212121',
    unitTextColor: '#212121',
    nameTextColorOn: '#4A4A4A',
    statusTextColorOn: '#6A6A6A',
    valueTextColorOn: '#212121',
    unitTextColorOn: '#212121',
    thermostatHandleColor: '#FFFFFF',
    thermostatDialTextColor: '#212121',
    thermostatDialLabelColor: '#6A6A6A',
    thermostatHeatingColor: '#F97316',
    thermostatCoolingColor: '#3b82f6',
    clockTextColor: '#212121',
  },
  dark: {
    dashboardBackgroundType: 'color',
    dashboardBackgroundColor1: '#111827',
    dashboardBackgroundColor2: '#1F2937',
    dashboardBackgroundImageBlur: 0,
    dashboardBackgroundImageBrightness: 100,
    cardOpacity: 0.8,
    panelOpacity: 0.75,
    nameTextColor: '#d1d5db', statusTextColor: '#9ca3af', valueTextColor: '#f9fafb', unitTextColor: '#9ca3af',
    cardBackground: 'rgba(31, 41, 55, 0.8)', cardBackgroundOn: '#374151',
    tabTextColor: '#9ca3af', activeTabTextColor: '#f9fafb', tabIndicatorColor: '#f9fafb', thermostatHandleColor: '#f9fafb', thermostatDialTextColor: '#f9fafb',
    thermostatDialLabelColor: '#9ca3af', thermostatHeatingColor: '#fb923c', thermostatCoolingColor: '#60a5fa', clockTextColor: '#f9fafb',
    nameTextColorOn: '#f9fafb', statusTextColorOn: '#d1d5db', valueTextColorOn: '#f9fafb', unitTextColorOn: '#d1d5db',
  },
};

// --- Other Default Settings ---
export const defaultClockSettings: ClockSettings = { format: '24h', showSeconds: true, size: 'md' };
export const defaultCameraSettings: CameraSettings = { selectedEntityId: null };
export const DEFAULT_SIDEBAR_WIDTH = 320;
export const DEFAULT_SIDEBAR_VISIBLE = true;
// FIX: The `theme` type in the store is `'day' | 'night' | 'auto' | 'schedule'`. The type here was `... | 'sun'`, which caused a type mismatch. Corrected to `'schedule'`.
export const DEFAULT_THEME: 'day' | 'night' | 'auto' | 'schedule' = 'auto';
export const DEFAULT_WEATHER_PROVIDER: 'openweathermap' | 'yandex' | 'foreca' = 'openweathermap';
export const DEFAULT_LOW_BATTERY_THRESHOLD = 20;