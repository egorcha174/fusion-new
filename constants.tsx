

/**
 * Константы для ключей, используемых в localStorage.
 * Это позволяет избежать "магических строк" и обеспечивает единый источник истины
 * для всего, что сохраняется в локальном хранилище браузера.
 */
export const LOCAL_STORAGE_KEYS = {
  URL: 'ha-url',
  TOKEN: 'ha-token',
  TABS: 'ha-tabs',
  ACTIVE_TAB: 'ha-active-tab',
  CUSTOMIZATIONS: 'ha-device-customizations',
  CLOCK_SETTINGS: 'ha-clock-settings',
  CARD_TEMPLATES: 'ha-card-templates',
  SIDEBAR_WIDTH: 'ha-sidebar-width',
  CAMERA_SETTINGS: 'ha-camera-settings',
  THEME: 'ha-theme',
  SCHEDULE_START_TIME: 'ha-schedule-start-time',
  SCHEDULE_END_TIME: 'ha-schedule-end-time',
  COLOR_SCHEME: 'ha-color-scheme',
  SIDEBAR_VISIBLE: 'ha-sidebar-visible',
  LOW_BATTERY_THRESHOLD: 'ha-low-battery-threshold',
  WEATHER_PROVIDER: 'ha-weather-provider',
  OPENWEATHERMAP_KEY: 'ha-openweathermap-key',
  YANDEX_WEATHER_KEY: 'ha-yandex-weather-key',
  FORECA_KEY: 'ha-foreca-key',
  SEPTIC_TANK_SETTINGS: 'ha-septic-tank-settings',
} as const;
