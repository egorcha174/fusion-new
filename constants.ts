/**
 * Константы для ключей, используемых в localStorage.
 * Это позволяет избежать "магических строк" и обеспечивает единый источник истины
 * для всего, что сохраняется в локальном хранилище браузера.
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
  CAMERA_SETTINGS: 'ha-camera-settings',
// FIX: Renamed 'THEME' to 'THEME_MODE' and added 'THEMES' and 'ACTIVE_THEME_ID' to support the new multi-theme architecture. Removed obsolete 'COLOR_SCHEME' key.
  THEME_MODE: 'ha-theme-mode', // For storing current mode (auto, day, night, schedule)
  THEMES: 'ha-themes', // For storing all theme definitions
  ACTIVE_THEME_ID: 'ha-active-theme-id', // For storing the ID of the currently active theme
  SCHEDULE_START_TIME: 'ha-schedule-start-time',
  SCHEDULE_END_TIME: 'ha-schedule-end-time',
  SIDEBAR_VISIBLE: 'ha-sidebar-visible',
  LOW_BATTERY_THRESHOLD: 'ha-low-battery-threshold',
  WEATHER_PROVIDER: 'ha-weather-provider',
  OPENWEATHERMAP_KEY: 'ha-openweathermap-key',
  YANDEX_WEATHER_KEY: 'ha-yandex-weather-key',
  FORECA_KEY: 'ha-foreca-key',
  WEATHER_SETTINGS: 'ha-weather-settings',
  WEATHER_ENTITY_ID: 'ha-weather-entity-id', // NEW: Added key for HA weather entity
  // FIX: Replaced `CUSTOM_WIDGETS` with `EVENT_TIMER_WIDGETS` to better reflect the feature and resolve naming conflicts.
  EVENT_TIMER_WIDGETS: 'ha-event-timer-widgets',
  CUSTOM_CARD_WIDGETS: 'ha-custom-card-widgets',
  CHRISTMAS_THEME_ENABLED: 'ha-christmas-theme-enabled',
} as const;