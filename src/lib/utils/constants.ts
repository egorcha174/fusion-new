
/**
 * Constants for keys used in localStorage.
 */
export const LOCAL_STORAGE_KEYS = {
  SERVERS: 'ha-servers',
  ACTIVE_SERVER_ID: 'ha-active-server-id',
  TABS: 'ha-tabs',
  ACTIVE_TAB: 'ha-active-tab',
  CUSTOMIZATIONS: 'ha-device-customizations',
  CLOCK_SETTINGS: 'ha-clock-settings',
  CARD_TEMPLATES: 'ha-card-templates',
  SIDEBAR_WIDTH: 'ha-sidebar-width',
  THEME_MODE: 'ha-theme-mode',
  // LEGACY KEY: 'ha-themes' contains mixed built-in and custom themes. Used for migration.
  THEMES_LEGACY: 'ha-themes',
  // NEW KEY: Stores ONLY custom user themes.
  CUSTOM_THEMES: 'ha-custom-themes',
  ACTIVE_THEME_ID: 'ha-active-theme-id',
  SCHEDULE_START_TIME: 'ha-schedule-start-time',
  SCHEDULE_END_TIME: 'ha-schedule-end-time',
  SIDEBAR_VISIBLE: 'ha-sidebar-visible',
  LOW_BATTERY_THRESHOLD: 'ha-low-battery-threshold',
  WEATHER_PROVIDER: 'ha-weather-provider',
  WEATHER_ENTITY_ID: 'ha-weather-entity-id',
  OPENWEATHERMAP_KEY: 'ha-openweathermap-key',
  YANDEX_WEATHER_KEY: 'ha-yandex-weather-key',
  FORECA_KEY: 'ha-foreca-key',
  WEATHER_SETTINGS: 'ha-weather-settings',
  EVENT_TIMER_WIDGETS: 'ha-event-timer-widgets',
  CUSTOM_CARD_WIDGETS: 'ha-custom-card-widgets',
  BACKGROUND_EFFECT: 'ha-background-effect',
  AURORA_SETTINGS: 'ha-aurora-settings',
} as const;
