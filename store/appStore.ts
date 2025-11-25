import { create } from 'zustand';
import {
  Page, Device, Tab, DeviceCustomizations, CardTemplates, ClockSettings,
  CameraSettings, ColorScheme, CardTemplate, DeviceType, GridLayoutItem, DeviceCustomization,
  CardElementId, EventTimerWidget, CustomCardWidget, PhysicalDevice, CardElement, WeatherSettings,
  ServerConfig, ThemeDefinition, ThemePackage, AuroraSettings
} from '../types';
import { nanoid } from 'nanoid';
import { getIconNameForDeviceType } from '../components/DeviceIcon';
import { loadAndMigrate } from '../utils/localStorage';
import { LOCAL_STORAGE_KEYS } from '../constants';
import {
    defaultTemplates,
    DEFAULT_COLOR_SCHEME,
    defaultClockSettings,
    defaultCameraSettings,
    DEFAULT_SIDEBAR_WIDTH,
    DEFAULT_SIDEBAR_VISIBLE,
    DEFAULT_THEME_MODE,
    DEFAULT_WEATHER_PROVIDER,
    DEFAULT_WEATHER_SETTINGS,
    DEFAULT_LOW_BATTERY_THRESHOLD,
    DEFAULT_FONT_FAMILY,
    DEFAULT_SENSOR_TEMPLATE_ID,
    DEFAULT_LIGHT_TEMPLATE_ID,
    DEFAULT_SWITCH_TEMPLATE_ID,
    DEFAULT_CLIMATE_TEMPLATE_ID,
    DEFAULT_HUMIDIFIER_TEMPLATE_ID,
    DEFAULT_CAMERA_TEMPLATE_ID,
    DEFAULT_THEMES,
    DEFAULT_AURORA_SETTINGS
} from '../config/defaults';
import { set as setAtPath } from '../utils/obj-path';

export type BackgroundEffectType = 'none' | 'snow' | 'rain' | 'leaves' | 'river' | 'aurora' | 'strong-cloudy' | 'rain-clouds' | 'snow-rain' | 'weather' | 'thunderstorm' | 'sun-glare' | 'sun-clouds';

// --- State and Actions Interfaces ---
interface AppState {
    currentPage: Page;
    isEditMode: boolean;
    editingDevice: Device | null;
    editingTab: Tab | null;
    editingTemplate: CardTemplate | 'new' | null;
    searchTerm: string;
    contextMenu: { x: number, y: number, deviceId: string, tabId: string } | null;
    floatingCamera: Device | null;
    historyModalEntityId: string | null;
    editingEventTimerId: string | null;
    isSettingsOpen: boolean;

    servers: ServerConfig[];
    activeServerId: string | null;

    tabs: Tab[];
    activeTabId: string | null;
    customizations: DeviceCustomizations;
    templates: CardTemplates;
    clockSettings: ClockSettings;
    cameraSettings: CameraSettings;
    sidebarWidth: number;
    isSidebarVisible: boolean;
    themeMode: 'day' | 'night' | 'auto' | 'schedule';
    scheduleStartTime: string;
    scheduleEndTime: string;
    
    // Theme Management
    themes: ThemeDefinition[];
    activeThemeId: string;
    colorScheme: ColorScheme;

    weatherProvider: 'openweathermap' | 'yandex' | 'foreca' | 'homeassistant';
    weatherEntityId: string;
    openWeatherMapKey: string;
    yandexWeatherKey: string;
    forecaApiKey: string;
    weatherSettings: WeatherSettings;
    lowBatteryThreshold: number;
    eventTimerWidgets: EventTimerWidget[];
    customCardWidgets: CustomCardWidget[];
    backgroundEffect: BackgroundEffectType;
    auroraSettings: AuroraSettings;
    DEFAULT_COLOR_SCHEME: ColorScheme;
    weatherData: any;
}

interface AppActions {
    setCurrentPage: (page: Page) => void;
    setIsEditMode: (isEdit: boolean) => void;
    setEditingDevice: (device: Device | null) => void;
    setEditingTab: (tab: Tab | null) => void;
    setEditingTemplate: (template: CardTemplate | 'new' | null) => void;
    setSearchTerm: (term: string) => void;
    setContextMenu: (menu: AppState['contextMenu']) => void;
    setFloatingCamera: (device: Device | null) => void;
    setHistoryModalEntityId: (id: string | null) => void;
    setEditingEventTimerId: (id: string | null) => void;
    setSettingsOpen: (isOpen: boolean) => void;

    // Server Management
    setServers: (servers: ServerConfig[]) => void;
    setActiveServerId: (id: string | null) => void;
    addServer: (serverData: Omit<ServerConfig, 'id'>) => ServerConfig;
    updateServer: (serverData: ServerConfig) => void;
    deleteServer: (serverId: string) => void;


    setTabs: (tabs: Tab[]) => void;
    setActiveTabId: (id: string | null) => void;
    setCustomizations: (customizations: DeviceCustomizations) => void;
    setTemplates: (templates: CardTemplates) => void;
    setClockSettings: (settings: ClockSettings) => void;
    setCameraSettings: (settings: CameraSettings) => void;
    setSidebarWidth: (width: number) => void;
    setIsSidebarVisible: (isVisible: boolean) => void;
    setThemeMode: (theme: AppState['themeMode']) => void;
    setScheduleStartTime: (time: string) => void;
    setScheduleEndTime: (time: string) => void;
    
    // Theme Management Actions
    setThemes: (themes: ThemeDefinition[]) => void;
    selectTheme: (themeId: string) => void;
    saveTheme: (themeToSave: ThemeDefinition) => void;
    deleteTheme: (themeId: string) => void;
    onResetColorScheme: () => void;
    importThemePackage: (pkg: ThemePackage) => void;

    setWeatherProvider: (provider: AppState['weatherProvider']) => void;
    setWeatherEntityId: (entityId: string) => void;
    setOpenWeatherMapKey: (key: string) => void;
    setYandexWeatherKey: (key: string) => void;
    setForecaApiKey: (key: string) => void;
    setWeatherSettings: (settings: WeatherSettings) => void;
    setWeatherData: (data: any) => void;
    setLowBatteryThreshold: (threshold: number) => void;
    
    setEventTimerWidgets: (widgets: EventTimerWidget[]) => void;
    addCustomWidget: () => void;
    updateCustomWidget: (widgetId: string, updates: Partial<Omit<EventTimerWidget, 'id'>>) => void;
    resetCustomWidgetTimer: (widgetId: string) => void;
    deleteCustomWidget: (widgetId: string) => void;
    setBackgroundEffect: (effect: BackgroundEffectType) => void;
    setAuroraSettings: (settings: AuroraSettings) => void;

    // Actions for Custom Cards
    setCustomCardWidgets: (widgets: CustomCardWidget[]) => void;
    addCustomCard: () => void;
    // FIX: Add missing