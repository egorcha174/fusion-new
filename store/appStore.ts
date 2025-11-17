import { create } from 'zustand';
import {
  Page, Device, Tab, DeviceCustomizations, CardTemplates, ClockSettings,
  CameraSettings, ColorScheme, CardTemplate, DeviceType, GridLayoutItem, DeviceCustomization,
  CardElementId, EventTimerWidget, CustomCardWidget, PhysicalDevice, CardElement
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
    DEFAULT_THEME,
    DEFAULT_WEATHER_PROVIDER,
    DEFAULT_LOW_BATTERY_THRESHOLD,
    DEFAULT_FONT_FAMILY,
    DEFAULT_SENSOR_TEMPLATE_ID,
    DEFAULT_LIGHT_TEMPLATE_ID,
    DEFAULT_SWITCH_TEMPLATE_ID,
    DEFAULT_CLIMATE_TEMPLATE_ID,
    DEFAULT_HUMIDIFIER_TEMPLATE_ID
} from '../config/defaults';
import { set as setAtPath } from '../utils/obj-path';


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
    // FIX: Add editingEventTimerId to state for managing the event timer settings modal.
    editingEventTimerId: string | null;

    tabs: Tab[];
    activeTabId: string | null;
    customizations: DeviceCustomizations;
    templates: CardTemplates;
    clockSettings: ClockSettings;
    cameraSettings: CameraSettings;
    sidebarWidth: number;
    isSidebarVisible: boolean;
    theme: 'day' | 'night' | 'auto' | 'schedule';
    scheduleStartTime: string;
    scheduleEndTime: string;
    colorScheme: ColorScheme;
    weatherProvider: 'openweathermap' | 'yandex' | 'foreca';
    openWeatherMapKey: string;
    yandexWeatherKey: string;
    forecaApiKey: string;
    lowBatteryThreshold: number;
    // FIX: Replaced single septic tank settings with a more generic array of event timer widgets to support multiple custom timers.
    eventTimerWidgets: EventTimerWidget[];
    customCardWidgets: CustomCardWidget[];
    isChristmasThemeEnabled: boolean;
    DEFAULT_COLOR_SCHEME: ColorScheme;
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
    // FIX: Add setEditingEventTimerId to actions for managing the event timer settings modal.
    setEditingEventTimerId: (id: string | null) => void;

    setTabs: (tabs: Tab[]) => void;
    setActiveTabId: (id: string | null) => void;
    setCustomizations: (customizations: DeviceCustomizations) => void;
    setTemplates: (templates: CardTemplates) => void;
    setClockSettings: (settings: ClockSettings) => void;
    setCameraSettings: (settings: CameraSettings) => void;
    setSidebarWidth: (width: number) => void;
    setIsSidebarVisible: (isVisible: boolean) => void;
    setTheme: (theme: AppState['theme']) => void;
    setScheduleStartTime: (time: string) => void;
    setScheduleEndTime: (time: string) => void;
    setColorScheme: (scheme: ColorScheme) => void;
    updateColorSchemeValue: (path: string, value: any) => void;
    setWeatherProvider: (provider: AppState['weatherProvider']) => void;
    setOpenWeatherMapKey: (key: string) => void;
    setYandexWeatherKey: (key: string) => void;
    setForecaApiKey: (key: string) => void;
    setLowBatteryThreshold: (threshold: number) => void;
    
    // FIX: Added actions to manage multiple event timer widgets, replacing the old single-widget logic.
    setEventTimerWidgets: (widgets: EventTimerWidget[]) => void;
    addCustomWidget: () => void;
    updateCustomWidget: (widgetId: string, updates: Partial<Omit<EventTimerWidget, 'id'>>) => void;
    resetCustomWidgetTimer: (widgetId: string) => void;
    deleteCustomWidget: (widgetId: string) => void;
    setIsChristmasThemeEnabled: (enabled: boolean) => void;

    // Actions for Custom Cards
    setCustomCardWidgets: (widgets: CustomCardWidget[]) => void;
    addCustomCard: () => void;
    updateCustomCard: (widgetId: string, updates: Partial<Omit<CustomCardWidget, 'id'>>) => void;
    deleteCustomCard: (widgetId: string) => void;


    onResetColorScheme: () => void;
    handleTabOrderChange: (newTabs: Tab[]) => void;
    handleAddTab: () => void;
    handleUpdateTabSettings: (tabId: string, settings: { name: string; gridSettings: { cols: number; rows: number } }) => void;
    handleDeleteTab: (tabId: string) => void;
    
    getTemplateForDevice: (device: Device | null) => CardTemplate | null;
    handleDeviceAddToTab: (device: Device, tabId: string) => void;
    handleDeviceRemoveFromTab: (deviceId: string, tabId: string) => void;
    handleDeviceMoveToTab: (device: Device, fromTabId: string, toTabId: string) => void;
    checkCollision: (layout: GridLayoutItem[], itemToPlace: { col: number; row: number; width: number; height: number; }, gridSettings: { cols: number; rows: number; }, ignoreDeviceId: string) => boolean;
    handleDeviceLayoutChange: (tabId: string, newLayout: GridLayoutItem[]) => void;
    handleDeviceResizeOnTab: (tabId: string, deviceId: string, newWidth: number, newHeight: number) => void;
    // FIX: Add missing 'handleAddPhysicalDeviceAsCustomCard' action to enable adding physical devices as custom cards.
    handleAddPhysicalDeviceAsCustomCard: (physicalDevice: PhysicalDevice, tabId: string) => void;

    handleSaveCustomization: (originalDevice: Device, newValues: Omit<DeviceCustomization, 'name' | 'type' | 'icon' | 'isHidden'> & { name: string; type: DeviceType; icon: string; isHidden: boolean; }) => void;
    handleToggleVisibility: (device: Device, isHidden: boolean) => void;
    handleSaveTemplate: (template: CardTemplate) => void;
    handleDeleteTemplate: (templateId: string) => void;
    createNewBlankTemplate: (deviceType: DeviceType | 'custom') => CardTemplate;
}


export const useAppStore = create<AppState & AppActions>((set, get) => ({
    // --- State Initialization from LocalStorage ---
    currentPage: 'dashboard',
    isEditMode: false,
    editingDevice: null,
    editingTab: null,
    editingTemplate: null,
    searchTerm: '',
    contextMenu: null,
    floatingCamera: null,
    historyModalEntityId: null,
    editingEventTimerId: null,
    
    tabs: loadAndMigrate<Tab[]>(LOCAL_STORAGE_KEYS.TABS, []),
    activeTabId: loadAndMigrate<string | null>(LOCAL_STORAGE_KEYS.ACTIVE_TAB, null),
    customizations: loadAndMigrate<DeviceCustomizations>(LOCAL_STORAGE_KEYS.CUSTOMIZATIONS, {}),
    templates: loadAndMigrate<CardTemplates>(LOCAL_STORAGE_KEYS.CARD_TEMPLATES, defaultTemplates),
    clockSettings: loadAndMigrate<ClockSettings>(LOCAL_STORAGE_KEYS.CLOCK_SETTINGS, defaultClockSettings),
    cameraSettings: loadAndMigrate<CameraSettings>(LOCAL_STORAGE_KEYS.CAMERA_SETTINGS, defaultCameraSettings),
    sidebarWidth: loadAndMigrate<number>(LOCAL_STORAGE_KEYS.SIDEBAR_WIDTH, DEFAULT_SIDEBAR_WIDTH),
    isSidebarVisible: loadAndMigrate<boolean>(LOCAL_STORAGE_KEYS.SIDEBAR_VISIBLE, DEFAULT_SIDEBAR_VISIBLE),
    theme: loadAndMigrate<'day' | 'night' | 'auto' | 'schedule'>(LOCAL_STORAGE_KEYS.THEME, DEFAULT_THEME),
    scheduleStartTime: loadAndMigrate<string>(LOCAL_STORAGE_KEYS.SCHEDULE_START_TIME, '22:00'),
    scheduleEndTime: loadAndMigrate<string>(LOCAL_STORAGE_KEYS.SCHEDULE_END_TIME, '07:00'),
    colorScheme: loadAndMigrate<ColorScheme>(LOCAL_STORAGE_KEYS.COLOR_SCHEME, DEFAULT_COLOR_SCHEME),
    weatherProvider: loadAndMigrate<'openweathermap' | 'yandex' | 'foreca'>(LOCAL_STORAGE_KEYS.WEATHER_PROVIDER, DEFAULT_WEATHER_PROVIDER),
    openWeatherMapKey: loadAndMigrate<string>(LOCAL_STORAGE_KEYS.OPENWEATHERMAP_KEY, ''),
    yandexWeatherKey: loadAndMigrate<string>(LOCAL_STORAGE_KEYS.YANDEX_WEATHER_KEY, ''),
    forecaApiKey: loadAndMigrate<string>(LOCAL_STORAGE_KEYS.FORECA_KEY, ''),
    lowBatteryThreshold: loadAndMigrate<number>(LOCAL_STORAGE_KEYS.LOW_BATTERY_THRESHOLD, DEFAULT_LOW_BATTERY_THRESHOLD),
    // FIX: Replaced septicTankSettings with eventTimerWidgets and corrected the local storage key.
    eventTimerWidgets: loadAndMigrate<EventTimerWidget[]>(LOCAL_STORAGE_KEYS.EVENT_TIMER_WIDGETS, []),
    customCardWidgets: loadAndMigrate<CustomCardWidget[]>(LOCAL_STORAGE_KEYS.CUSTOM_CARD_WIDGETS, []),
    isChristmasThemeEnabled: loadAndMigrate<boolean>(LOCAL_STORAGE_KEYS.CHRISTMAS_THEME_ENABLED, false),
    DEFAULT_COLOR_SCHEME: DEFAULT_COLOR_SCHEME,
    
    // --- Actions ---
    setCurrentPage: (page) => set({ currentPage: page }),
    setIsEditMode: (isEdit) => set({ isEditMode: isEdit }),
    setEditingDevice: (device) => set({ editingDevice: device }),
    setEditingTab: (tab) => set({ editingTab: tab }),
    setEditingTemplate: (template) => set({ editingTemplate: template }),
    setSearchTerm: (term) => set({ searchTerm: term }),
    setContextMenu: (menu) => set({ contextMenu: menu }),
    setFloatingCamera: (device) => set({ floatingCamera: device }),
    setHistoryModalEntityId: (id) => set({ historyModalEntityId: id }),
    setEditingEventTimerId: (id) => set({ editingEventTimerId: id }),

    // --- Actions with Persistence ---
    setTabs: (tabs) => {
        set({ tabs });
        localStorage.setItem(LOCAL_STORAGE_KEYS.TABS, JSON.stringify(tabs));
    },
    setActiveTabId: (id) => {
        set({ activeTabId: id });
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_TAB, JSON.stringify(id));
    },
    setCustomizations: (customizations) => {
        set({ customizations });
        localStorage.setItem(LOCAL_STORAGE_KEYS.CUSTOMIZATIONS, JSON.stringify(customizations));
    },
    setTemplates: (templates) => {
        set({ templates });
        localStorage.setItem(LOCAL_STORAGE_KEYS.CARD_TEMPLATES, JSON.stringify(templates));
    },
    setClockSettings: (settings) => {
        set({ clockSettings: settings });
        localStorage.setItem(LOCAL_STORAGE_KEYS.CLOCK_SETTINGS, JSON.stringify(settings));
    },
    setCameraSettings: (settings) => {
        set({ cameraSettings: settings });
        localStorage.setItem(LOCAL_STORAGE_KEYS.CAMERA_SETTINGS, JSON.stringify(settings));
    },
    setSidebarWidth: (width) => {
        set({ sidebarWidth: width });
        localStorage.setItem(LOCAL_STORAGE_KEYS.SIDEBAR_WIDTH, JSON.stringify(width));
    },
    setIsSidebarVisible: (isVisible) => {
        set({ isSidebarVisible: isVisible });
        localStorage.setItem(LOCAL_STORAGE_KEYS.SIDEBAR_VISIBLE, JSON.stringify(isVisible));
    },
    setTheme: (theme) => {
        set({ theme });
        localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, theme);
    },
    setScheduleStartTime: (time) => {
        set({ scheduleStartTime: time });
        localStorage.setItem(LOCAL_STORAGE_KEYS.SCHEDULE_START_TIME, time);
    },
    setScheduleEndTime: (time) => {
        set({ scheduleEndTime: time });
        localStorage.setItem(LOCAL_STORAGE_KEYS.SCHEDULE_END_TIME, time);
    },
    setColorScheme: (scheme) => {
        set({ colorScheme: scheme });
        localStorage.setItem(LOCAL_STORAGE_KEYS.COLOR_SCHEME, JSON.stringify(scheme));
    },
    updateColorSchemeValue: (path, value) => {
        // Deep clone to avoid mutation issues
        const newScheme = JSON.parse(JSON.stringify(get().colorScheme));
        setAtPath(newScheme, path, value);
        get().setColorScheme(newScheme);
    },
    setWeatherProvider: (provider) => {
        set({ weatherProvider: provider });
        localStorage.setItem(LOCAL_STORAGE_KEYS.WEATHER_PROVIDER, provider);
    },
    setOpenWeatherMapKey: (key) => {
        set({ openWeatherMapKey: key });
        localStorage.setItem(LOCAL_STORAGE_KEYS.OPENWEATHERMAP_KEY, key);
    },
    setYandexWeatherKey: (key) => {
        set({ yandexWeatherKey: key });
        localStorage.setItem(LOCAL_STORAGE_KEYS.YANDEX_WEATHER_KEY, key);
    },
    setForecaApiKey: (key) => {
        set({ forecaApiKey: key });
        localStorage.setItem(LOCAL_STORAGE_KEYS.FORECA_KEY, key);
    },
    setLowBatteryThreshold: (threshold) => {
        set({ lowBatteryThreshold: threshold });
        localStorage.setItem(LOCAL_STORAGE_KEYS.LOW_BATTERY_THRESHOLD, JSON.stringify(threshold));
    },
    setIsChristmasThemeEnabled: (enabled) => {
        set({ isChristmasThemeEnabled: enabled });
        localStorage.setItem(LOCAL_STORAGE_KEYS.CHRISTMAS_THEME_ENABLED, JSON.stringify(enabled));
    },
    // FIX: Implement actions for managing multiple event timer widgets.
    setEventTimerWidgets: (widgets) => {
        set({ eventTimerWidgets: widgets });
        localStorage.setItem(LOCAL_STORAGE_KEYS.EVENT_TIMER_WIDGETS, JSON.stringify(widgets));
    },
    addCustomWidget: () => {
        const newWidget: EventTimerWidget = {
            id: nanoid(),
            name: `Таймер ${get().eventTimerWidgets.length + 1}`,
            cycleDays: 14,
            lastResetDate: null,
            animation: 'smooth',
            fillDirection: 'bottom-to-top',
        };
        get().setEventTimerWidgets([...get().eventTimerWidgets, newWidget]);
    },
    updateCustomWidget: (widgetId, updates) => {
        const newWidgets = get().eventTimerWidgets.map(w => w.id === widgetId ? { ...w, ...updates } : w);
        get().setEventTimerWidgets(newWidgets);
    },
    resetCustomWidgetTimer: (widgetId) => {
        const newWidgets = get().eventTimerWidgets.map(w => w.id === widgetId ? { ...w, lastResetDate: new Date().toISOString() } : w);
        get().setEventTimerWidgets(newWidgets);
    },
    deleteCustomWidget: (widgetId) => {
        const deviceIdToDelete = `internal::event-timer_${widgetId}`;
        
        // Remove from widgets list
        const newWidgets = get().eventTimerWidgets.filter(w => w.id !== widgetId);
        get().setEventTimerWidgets(newWidgets);
        
        // Remove from all tabs to prevent ghost items
        const newTabs = get().tabs.map(tab => ({
            ...tab,
            layout: tab.layout.filter(item => item.deviceId !== deviceIdToDelete)
        }));
        get().setTabs(newTabs);
    },
    
    // --- Custom Card Actions ---
    setCustomCardWidgets: (widgets) => {
        set({ customCardWidgets: widgets });
        localStorage.setItem(LOCAL_STORAGE_KEYS.CUSTOM_CARD_WIDGETS, JSON.stringify(widgets));
    },
    addCustomCard: () => {
        const newWidget: CustomCardWidget = {
            id: nanoid(),
            name: `Кастомная карточка ${get().customCardWidgets.length + 1}`,
        };

        // 1. Создаем уникальный шаблон для этой новой карточки
        const newTemplate = get().createNewBlankTemplate('custom');
        newTemplate.id = `custom-card-template-${newWidget.id}`; // Уникальный, предсказуемый ID
        newTemplate.name = newWidget.name; // Изначально имя шаблона совпадает с именем виджета

        // 2. Добавляем новый шаблон в состояние шаблонов
        const newTemplates = { ...get().templates, [newTemplate.id]: newTemplate };
        
        // 3. Создаем кастомизацию для связи устройства с этим шаблоном
        const deviceId = `internal::custom-card_${newWidget.id}`;
        const newCustomization: DeviceCustomization = {
            ...get().customizations[deviceId], // сохраняем существующую кастомизацию (маловероятно, но безопасно)
            templateId: newTemplate.id,
        };
        const newCustomizations = { ...get().customizations, [deviceId]: newCustomization };

        // 4. Обновляем состояние
        get().setTemplates(newTemplates);
        get().setCustomizations(newCustomizations);
        get().setCustomCardWidgets([...get().customCardWidgets, newWidget]);
    },
    updateCustomCard: (widgetId, updates) => {
        const newWidgets = get().customCardWidgets.map(w => w.id === widgetId ? { ...w, ...updates } : w);
        get().setCustomCardWidgets(newWidgets);
    },
    deleteCustomCard: (widgetId) => {
        const deviceIdToDelete = `internal::custom-card_${widgetId}`;
        const templateIdToDelete = `custom-card-template-${widgetId}`;

        // 1. Удаляем виджет
        const newWidgets = get().customCardWidgets.filter(w => w.id !== widgetId);
        get().setCustomCardWidgets(newWidgets);

        // 2. Удаляем с вкладок
        const newTabs = get().tabs.map(tab => ({
            ...tab,
            layout: tab.layout.filter(item => item.deviceId !== deviceIdToDelete)
        }));
        get().setTabs(newTabs);

        // 3. Удаляем связанный шаблон
        const newTemplates = { ...get().templates };
        delete newTemplates[templateIdToDelete];
        get().setTemplates(newTemplates);

        // 4. Удаляем кастомизацию
        const newCustomizations = { ...get().customizations };
        delete newCustomizations[deviceIdToDelete];
        get().setCustomizations(newCustomizations);
    },


    // --- Complex Actions ---
    onResetColorScheme: () => get().setColorScheme(DEFAULT_COLOR_SCHEME),
    handleTabOrderChange: (newTabs) => get().setTabs(newTabs),
    handleAddTab: () => {
        const newTabName = `Вкладка ${get().tabs.length + 1}`;
        const newTab: Tab = { id: nanoid(), name: newTabName, layout: [], gridSettings: { cols: 8, rows: 5 } };
        const newTabs = [...get().tabs, newTab];
        get().setTabs(newTabs);
        get().setActiveTabId(newTab.id);
    },
    handleUpdateTabSettings: (tabId, settings) => {
        const newTabs = get().tabs.map(tab => (tab.id === tabId) ? { ...tab, ...settings } : tab);
        get().setTabs(newTabs);
    },
    handleDeleteTab: (tabId) => {
        const newTabs = get().tabs.filter(t => t.id !== tabId);
        if (get().activeTabId === tabId) {
            get().setActiveTabId(newTabs.length > 0 ? newTabs[0].id : null);
        }
        get().setTabs(newTabs);
    },
    
    getTemplateForDevice: (device) => {
        if (!device) return null;
        const custom = get().customizations[device.id];
        let templateId = custom?.templateId;

        if (templateId === '') return null; // Explicitly no template

        if (!templateId) {
            const defaultMap: { [key in DeviceType]?: string } = {
                [DeviceType.Sensor]: DEFAULT_SENSOR_TEMPLATE_ID,
                [DeviceType.Light]: DEFAULT_LIGHT_TEMPLATE_ID,
                [DeviceType.DimmableLight]: DEFAULT_LIGHT_TEMPLATE_ID,
                [DeviceType.Switch]: DEFAULT_SWITCH_TEMPLATE_ID,
                [DeviceType.Thermostat]: DEFAULT_CLIMATE_TEMPLATE_ID,
                [DeviceType.Humidifier]: DEFAULT_HUMIDIFIER_TEMPLATE_ID,
            };
            templateId = defaultMap[device.type];
        }
        return templateId ? get().templates[templateId] : null;
    },
    handleDeviceAddToTab: (device, tabId) => {
        const getTemplateForDevice = get().getTemplateForDevice;
        const newTabs = get().tabs.map(tab => {
            if (tab.id !== tabId || tab.layout.some(item => item.deviceId === device.id)) return tab;
            
            const template = getTemplateForDevice(device);
            const templateWidth = template?.width || 1;
            const templateHeight = template?.height || 1;
            
            const { cols, rows } = tab.gridSettings;
            let emptyCell: { col: number, row: number } | null = null;
            const occupiedCells = new Set<string>();
            tab.layout.forEach(item => {
                const w = Math.ceil(item.width || 1);
                const h = Math.ceil(item.height || 1);
                for (let r_offset = 0; r_offset < h; r_offset++) {
                    for (let c_offset = 0; c_offset < w; c_offset++) {
                        occupiedCells.add(`${item.col + c_offset},${item.row + r_offset}`);
                    }
                }
            });

            const requiredWidth = Math.ceil(templateWidth);
            const requiredHeight = Math.ceil(templateHeight);

            for (let r = 0; r <= rows - requiredHeight; r++) {
                for (let c = 0; c <= cols - requiredWidth; c++) {
                    let isBlockFree = true;
                    for (let r_offset = 0; r_offset < requiredHeight; r_offset++) {
                        for (let c_offset = 0; c_offset < requiredWidth; c_offset++) {
                            if (occupiedCells.has(`${c + c_offset},${r + r_offset}`)) { isBlockFree = false; break; }
                        }
                        if (!isBlockFree) break;
                    }
                    if (isBlockFree) { emptyCell = { col: c, row: r }; break; }
                }
                if (emptyCell) break;
            }

            if (emptyCell) {
                const newLayoutItem: GridLayoutItem = { deviceId: device.id, col: emptyCell.col, row: emptyCell.row, width: templateWidth, height: templateHeight };
                return { ...tab, layout: [...tab.layout, newLayoutItem] };
            }
            return tab;
        });
        get().setTabs(newTabs);
    },
    handleDeviceRemoveFromTab: (deviceId, tabId) => {
        const newTabs = get().tabs.map(tab => (tab.id === tabId) ? { ...tab, layout: tab.layout.filter(item => item.deviceId !== deviceId) } : tab);
        get().setTabs(newTabs);
    },
    handleDeviceMoveToTab: (device, fromTabId, toTabId) => {
        if (fromTabId === toTabId) return;
        get().handleDeviceAddToTab(device, toTabId);
        get().handleDeviceRemoveFromTab(device.id, fromTabId);
    },
    checkCollision: (layout, itemToPlace, gridSettings, ignoreDeviceId) => {
        const { col, row, width, height } = itemToPlace;
    
        // 1. Boundary check
        if (col < 0 || row < 0 || col + Math.ceil(width) > gridSettings.cols || row + Math.ceil(height) > gridSettings.rows) {
            return true;
        }
    
        // 2. Overlap check with other items
        for (const existingItem of layout) {
            if (existingItem.deviceId === ignoreDeviceId) {
                continue;
            }
    
            const existingWidth = existingItem.width || 1;
            const existingHeight = existingItem.height || 1;
    
            const isOverlapping = (
                col < existingItem.col + existingWidth &&
                col + width > existingItem.col &&
                row < existingItem.row + existingHeight &&
                row + height > existingItem.row
            );
    
            if (!isOverlapping) {
                continue; // No collision with this item
            }
    
            // --- Overlap detected, check for allowed stacking exception ---
            const isPlacingStackable = width === 1 && height === 0.5;
            const isExistingStackable = existingWidth === 1 && existingHeight === 0.5;
            const isAtSameOrigin = col === existingItem.col && row === existingItem.row;
    
            if (isPlacingStackable && isExistingStackable && isAtSameOrigin) {
                // This is a potential stack. We need to count how many items are ALREADY at this origin.
                const itemsAtOrigin = layout.filter(item => 
                    item.col === col && 
                    item.row === row &&
                    item.deviceId !== ignoreDeviceId 
                );
                
                // A stack of two is the maximum. If there's already one item, placing another is allowed.
                if (itemsAtOrigin.length < 2) {
                    continue; // This overlap is an allowed exception.
                }
            }
            
            // If the overlap was not an allowed exception, it's a real collision.
            return true;
        }
    
        return false; // No collisions found
    },
    handleDeviceLayoutChange: (tabId, newLayout) => {
        const newTabs = get().tabs.map(tab => (tab.id === tabId) ? { ...tab, layout: newLayout } : tab);
        get().setTabs(newTabs);
    },
    handleDeviceResizeOnTab: (tabId, deviceId, newWidth, newHeight) => {
        set(state => {
            const tabIndex = state.tabs.findIndex(t => t.id === tabId);
            if (tabIndex === -1) return state;
    
            const tab = state.tabs[tabIndex];
            const itemIndex = tab.layout.findIndex(item => item.deviceId === deviceId);
            if (itemIndex === -1) return state;
    
            const itemToResize = tab.layout[itemIndex];
            const newItem = { ...itemToResize, width: newWidth, height: newHeight };
    
            // Use the most up-to-date 'get' for the collision check inside the updater function
            if (get().checkCollision(tab.layout, newItem, tab.gridSettings, deviceId)) {
                return state; // Collision detected, do not update state
            }
    
            const newLayout = [...tab.layout];
            newLayout[itemIndex] = newItem;
            const newTabs = [...state.tabs];
            newTabs[tabIndex] = { ...tab, layout: newLayout };
            
            localStorage.setItem(LOCAL_STORAGE_KEYS.TABS, JSON.stringify(newTabs));
            return { tabs: newTabs };
        });
    },
    handleAddPhysicalDeviceAsCustomCard: (physicalDevice, tabId) => {
        const { customCardWidgets, templates, customizations, setCustomCardWidgets, setTemplates, setCustomizations, handleDeviceAddToTab, createNewBlankTemplate } = get();

        const widgetId = `physdev-${physicalDevice.id}`;
        const deviceId = `internal::custom-card_${widgetId}`;
        const templateId = `custom-card-template-${widgetId}`;

        let widget = customCardWidgets.find(w => w.id === widgetId);
        let template = templates[templateId];

        // Step 1: Create widget if it doesn't exist. This will trigger haStore to create the device.
        if (!widget) {
            widget = {
                id: widgetId,
                name: physicalDevice.name,
            };
            setCustomCardWidgets([...customCardWidgets, widget]);
        }

        // Step 2: Create template if it doesn't exist
        if (!template) {
            template = createNewBlankTemplate('custom');
            template.id = templateId;
            template.name = physicalDevice.name;
            template.interactionType = 'passive'; // It's just a container

            // Sensible defaults for a physical device card
            template.width = 2;
            const entityRows = Math.ceil(physicalDevice.entities.length / 2);
            template.height = Math.max(2, 1 + entityRows); // Minimum height of 2

            const nameElementHeight = 15; // %
            template.elements = [
                { id: 'name', uniqueId: nanoid(), visible: true, position: { x: 5, y: 5 }, size: { width: 90, height: nameElementHeight - 5 }, zIndex: 1, styles: { fontSize: 16 } },
            ];

            // Layout entities in a 2-column grid inside the card
            const entitiesPerRow = 2;
            const startY = nameElementHeight; // Start below the name
            const availableHeight = 100 - startY - 5; // 5% bottom margin
            const rowHeight = availableHeight / entityRows;
            const colWidth = 45;
            const startX = 2.5;
            const colGap = 5;

            physicalDevice.entities.forEach((entity, index) => {
                const row = Math.floor(index / entitiesPerRow);
                const col = index % entitiesPerRow;

                template!.elements.push({
                    id: 'linked-entity',
                    uniqueId: nanoid(),
                    visible: true,
                    position: {
                        x: startX + col * (colWidth + colGap),
                        y: startY + row * rowHeight,
                    },
                    size: {
                        width: colWidth,
                        height: rowHeight * 0.9, // 90% of row height for margin
                    },
                    zIndex: 2,
                    styles: {
                        linkedEntityId: entity.id,
                        showValue: true,
                    }
                });
            });

            setTemplates({ ...get().templates, [templateId]: template });

            // Create customization to link device to template
            const newCustomization: DeviceCustomization = {
                ...customizations[deviceId],
                templateId: templateId,
            };
            setCustomizations({ ...get().customizations, [deviceId]: newCustomization });
        }

        // Step 3: Add device to tab.
        // Create a temporary device object to add to the tab, as the real one might not exist yet in haStore's state
        const deviceToAdd: Device = {
            id: deviceId,
            name: physicalDevice.name,
            status: `${physicalDevice.entities.length} сущ.`,
            type: DeviceType.Custom,
            haDomain: 'internal',
            state: 'active',
            widgetId: widgetId,
        };
        handleDeviceAddToTab(deviceToAdd, tabId);
    },
    handleSaveCustomization: (originalDevice, newValues) => {
        const deviceId = originalDevice.id;
        const oldCustomization = get().customizations[deviceId] || {};

        const newCustoms = {
            ...get().customizations,
            [deviceId]: {
                ...get().customizations[deviceId],
                name: newValues.name !== originalDevice.name ? newValues.name : undefined,
                type: newValues.type !== originalDevice.type ? newValues.type : undefined,
                icon: newValues.icon !== getIconNameForDeviceType(newValues.type, false) ? newValues.icon : undefined,
                isHidden: newValues.isHidden ? true : undefined,
                templateId: newValues.templateId || undefined,
                iconAnimation: newValues.iconAnimation !== 'none' ? newValues.iconAnimation : undefined,
                deviceBindings: newValues.deviceBindings?.length ? newValues.deviceBindings : undefined,
                thresholds: newValues.thresholds?.length ? newValues.thresholds : undefined,
            }
        };
        get().setCustomizations(newCustoms);

        if (newValues.templateId !== oldCustomization.templateId) {
            const template = get().templates[newValues.templateId || ''];
            if (template && (template.width !== undefined || template.height !== undefined)) {
                get().handleDeviceResizeOnTab(get().activeTabId!, deviceId, template.width ?? 1, template.height ?? 1);
            }
        }
    },
    handleToggleVisibility: (device, isHidden) => {
        const currentCustomization = get().customizations[device.id] || {};
        
        get().handleSaveCustomization(device, {
            name: currentCustomization.name || device.name,
            type: currentCustomization.type || device.type,
            icon: currentCustomization.icon || getIconNameForDeviceType(currentCustomization.type || device.type, false),
            isHidden,
            templateId: currentCustomization.templateId,
            iconAnimation: currentCustomization.iconAnimation,
            deviceBindings: currentCustomization.deviceBindings,
            thresholds: currentCustomization.thresholds,
        });
    },
    handleSaveTemplate: (template) => {
        const newTemplates = { ...get().templates, [template.id]: template };
        get().setTemplates(newTemplates);
        set({ editingTemplate: null });
    },
    handleDeleteTemplate: (templateId) => {
        const newTemplates = { ...get().templates };
        delete newTemplates[templateId];
        get().setTemplates(newTemplates);
        
        const newCustomizations = { ...get().customizations };
        Object.keys(newCustomizations).forEach(deviceId => {
            if (newCustomizations[deviceId].templateId === templateId) {
                delete newCustomizations[deviceId].templateId;
            }
        });
        get().setCustomizations(newCustomizations);
    },
    createNewBlankTemplate: (deviceType: DeviceType | 'custom') => {
        if (deviceType === 'custom') {
            return {
                id: nanoid(),
                name: 'Новая кастомная карточка',
                deviceType: 'custom',
                elements: [{
                    id: 'name',
                    uniqueId: nanoid(),
                    visible: true,
                    position: { x: 8, y: 8 },
                    size: { width: 84, height: 15 },
                    zIndex: 1,
                    styles: { fontFamily: DEFAULT_FONT_FAMILY, fontSize: 16 },
                }],
                styles: {},
                width: 2,
                height: 2,
            };
        }
        const baseMap = {
            [DeviceType.Sensor]: get().templates[DEFAULT_SENSOR_TEMPLATE_ID],
            [DeviceType.Light]: get().templates[DEFAULT_LIGHT_TEMPLATE_ID],
            [DeviceType.DimmableLight]: get().templates[DEFAULT_LIGHT_TEMPLATE_ID],
            [DeviceType.Switch]: get().templates[DEFAULT_SWITCH_TEMPLATE_ID],
            [DeviceType.Thermostat]: get().templates[DEFAULT_CLIMATE_TEMPLATE_ID],
            [DeviceType.Humidifier]: get().templates[DEFAULT_HUMIDIFIER_TEMPLATE_ID],
        };
        const typeNameMap = {
            [DeviceType.Sensor]: 'сенсор', [DeviceType.Light]: 'светильник', [DeviceType.DimmableLight]: 'светильник',
            [DeviceType.Switch]: 'переключатель', [DeviceType.Thermostat]: 'климат', [DeviceType.Humidifier]: 'увлажнитель'
        };
        const baseTemplate = (baseMap as any)[deviceType] || get().templates[DEFAULT_SENSOR_TEMPLATE_ID];
        const newTemplate = JSON.parse(JSON.stringify(baseTemplate));
        newTemplate.id = nanoid();
        newTemplate.name = `Новый ${typeNameMap[deviceType] || 'шаблон'}`;
        return newTemplate;
    },
}));