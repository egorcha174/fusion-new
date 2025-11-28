import {
    ColorScheme,
    ClockSettings,
    WeatherSettings,
    ThemeDefinition,
    CardTemplates,
    AuroraSettings
} from '../types';
import { DEFAULT_THEMES } from '../themes';
import { defaultTemplates } from '../templates';

// --- Default Template IDs ---
export const DEFAULT_SENSOR_TEMPLATE_ID = 'default-sensor';
export const DEFAULT_LIGHT_TEMPLATE_ID = 'default-light';
export const DEFAULT_SWITCH_TEMPLATE_ID = 'default-switch';
export const DEFAULT_CLIMATE_TEMPLATE_ID = 'default-climate';
export const DEFAULT_HUMIDIFIER_TEMPLATE_ID = 'humidifier-card';

// --- Default Font Family ---
export const DEFAULT_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// --- Default Color Scheme ---
// The 'apple-default' theme is now the source of truth for the default color scheme.
export const DEFAULT_COLOR_SCHEME: ColorScheme = DEFAULT_THEMES[0].scheme;

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

// Re-exporting the modular imports for consumers of this file
export { DEFAULT_THEMES, defaultTemplates };
