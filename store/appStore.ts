import { create } from 'zustand';
import {
  Page, Device, Tab, DeviceCustomizations, CardTemplates, ClockSettings,
  CameraSettings, ColorScheme, CardTemplate, DeviceType, GridLayoutItem, DeviceCustomization,
  CardElementId
} from '../types';
import { nanoid } from 'nanoid';
import { getIconNameForDeviceType } from '../components/DeviceIcon';
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
    DEFAULT_SENSOR_TEMPLATE_ID,
    DEFAULT_LIGHT_TEMPLATE_ID,
    DEFAULT_SWITCH_TEMPLATE_ID,
    DEFAULT_CLIMATE_TEMPLATE_ID,
    DEFAULT_HUMIDIFIER_TEMPLATE_ID
} from '../config/defaults';


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
    setWeatherProvider: (provider: AppState['weatherProvider']) => void;
    setOpenWeatherMapKey: (key: string) => void;
    setYandexWeatherKey: (key: string) => void;
    setForecaApiKey: (key: string) => void;
    setLowBatteryThreshold: (threshold: number) => void;

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

    handleSaveCustomization: (originalDevice: Device, newValues: Omit<DeviceCustomization, 'name' | 'type' | 'icon' | 'isHidden'> & { name: string; type: DeviceType; icon: string; isHidden: boolean; }) => void;
    handleToggleVisibility: (device: Device, isHidden: boolean) => void;
    handleSaveTemplate: (template: CardTemplate) => void;
    handleDeleteTemplate: (templateId: string) => void;
    createNewBlankTemplate: (deviceType: DeviceType) => CardTemplate;
    _triggerSave: (category: keyof typeof categorySelectors) => void;
}


// FIX: Renamed `set` to `setState` to avoid potential naming conflicts with other utility functions named `set`.
export const useAppStore = create<AppState & AppActions>((setState, get) => ({
    // --- State Initialization with Defaults ---
    currentPage: 'dashboard',
    isEditMode: false,
    editingDevice: null,
    editingTab: null,
    editingTemplate: null,
    searchTerm: '',
    contextMenu: null,
    floatingCamera: null,
    historyModalEntityId: null,
    
    tabs: [],
    activeTabId: null,
    customizations: {},
    templates: defaultTemplates,
    clockSettings: defaultClockSettings,
    cameraSettings: defaultCameraSettings,
    sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
    isSidebarVisible: DEFAULT_SIDEBAR_VISIBLE,
    theme: DEFAULT_THEME,
    scheduleStartTime: '22:00',
    scheduleEndTime: '07:00',
    colorScheme: DEFAULT_COLOR_SCHEME,
    weatherProvider: DEFAULT_WEATHER_PROVIDER,
    openWeatherMapKey: '',
    yandexWeatherKey: '',
    forecaApiKey: '',
    lowBatteryThreshold: DEFAULT_LOW_BATTERY_THRESHOLD,
    DEFAULT_COLOR_SCHEME: DEFAULT_COLOR_SCHEME,
    
    // --- Actions ---
    setCurrentPage: (page) => setState({ currentPage: page }),
    setIsEditMode: (isEdit) => setState({ isEditMode: isEdit }),
    setEditingDevice: (device) => setState({ editingDevice: device }),
    setEditingTab: (tab) => setState({ editingTab: tab }),
    setEditingTemplate: (template) => setState({ editingTemplate: template }),
    setSearchTerm: (term) => setState({ searchTerm: term }),
    setContextMenu: (menu) => setState({ contextMenu: menu }),
    setFloatingCamera: (device) => setState({ floatingCamera: device }),
    setHistoryModalEntityId: (id) => setState({ historyModalEntityId: id }),

    // --- Setters that now only update local state ---
    setTabs: (tabs) => setState({ tabs }),
    setActiveTabId: (id) => setState({ activeTabId: id }),
    setCustomizations: (customizations) => setState({ customizations }),
    setTemplates: (templates) => setState({ templates }),
    setClockSettings: (settings) => setState({ clockSettings: settings }),
    setCameraSettings: (settings) => setState({ cameraSettings: settings }),
    setSidebarWidth: (width) => setState({ sidebarWidth: width }),
    setIsSidebarVisible: (isVisible) => setState({ isSidebarVisible: isVisible }),
    setTheme: (theme) => setState({ theme }),
    setScheduleStartTime: (time) => setState({ scheduleStartTime: time }),
    setScheduleEndTime: (time) => setState({ scheduleEndTime: time }),
    setColorScheme: (scheme) => setState({ colorScheme: scheme }),
    setWeatherProvider: (provider) => setState({ weatherProvider: provider }),
    setOpenWeatherMapKey: (key) => setState({ openWeatherMapKey: key }),
    setYandexWeatherKey: (key) => setState({ yandexWeatherKey: key }),
    setForecaApiKey: (key) => setState({ forecaApiKey: key }),
    setLowBatteryThreshold: (threshold) => setState({ lowBatteryThreshold: threshold }),

    // --- Complex Actions ---
    onResetColorScheme: () => get().setColorScheme(DEFAULT_COLOR_SCHEME),
    // FIX: Added explicit types to action implementations to ensure correct type inference by TypeScript.
    handleTabOrderChange: (newTabs: Tab[]) => get().setTabs(newTabs),
    handleAddTab: () => {
        const newTabName = `Вкладка ${get().tabs.length + 1}`;
        const newTab: Tab = { id: nanoid(), name: newTabName, layout: [], gridSettings: { cols: 8, rows: 5 } };
        const newTabs = [...get().tabs, newTab];
        get().setTabs(newTabs);
        get().setActiveTabId(newTab.id);
    },
    // FIX: Added explicit types to action implementations to ensure correct type inference by TypeScript.
    handleUpdateTabSettings: (tabId: string, settings: { name: string; gridSettings: { cols: number; rows: number } }) => {
        const newTabs = get().tabs.map(tab => (tab.id === tabId) ? { ...tab, ...settings } : tab);
        get().setTabs(newTabs);
    },
    // FIX: Added explicit types to action implementations to ensure correct type inference by TypeScript.
    handleDeleteTab: (tabId: string) => {
        const newTabs = get().tabs.filter(t => t.id !== tabId);
        if (get().activeTabId === tabId) {
            get().setActiveTabId(newTabs.length > 0 ? newTabs[0].id : null);
        }
        get().setTabs(newTabs);
    },
    
    // FIX: Added explicit types to action implementations to ensure correct type inference by TypeScript.
    getTemplateForDevice: (device: Device | null) => {
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
    // FIX: Added explicit types to action implementations to ensure correct type inference by TypeScript.
    handleDeviceAddToTab: (device: Device, tabId: string) => {
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
    // FIX: Added explicit types to action implementations to ensure correct type inference by TypeScript.
    handleDeviceRemoveFromTab: (deviceId: string, tabId: string) => {
        const newTabs = get().tabs.map(tab => (tab.id === tabId) ? { ...tab, layout: tab.layout.filter(item => item.deviceId !== deviceId) } : tab);
        get().setTabs(newTabs);
    },
    // FIX: Added explicit types to action implementations to ensure correct type inference by TypeScript.
    handleDeviceMoveToTab: (device: Device, fromTabId: string, toTabId: string) => {
        if (fromTabId === toTabId) return;
        get().handleDeviceAddToTab(device, toTabId);
        get().handleDeviceRemoveFromTab(device.id, fromTabId);
    },
    // FIX: Added explicit types to action implementations to ensure correct type inference by TypeScript.
    checkCollision: (layout: GridLayoutItem[], itemToPlace: { col: number; row: number; width: number; height: number; }, gridSettings: { cols: number; rows: number; }, ignoreDeviceId: string) => {
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
                    continue; // This overlap is an allowed stack formation.
                }
            }
            
            // If the overlap was not an allowed exception, it's a real collision.
            return true;
        }
    
        return false; // No collisions found
    },
    // FIX: Added explicit types to action implementations to ensure correct type inference by TypeScript.
    handleDeviceLayoutChange: (tabId: string, newLayout: GridLayoutItem[]) => {
        const newTabs = get().tabs.map(tab => (tab.id === tabId) ? { ...tab, layout: newLayout } : tab);
        get().setTabs(newTabs);
    },
    handleDeviceResizeOnTab: (tabId: string, deviceId: string, newWidth: number, newHeight: number) => {
        // FIX: The `set` function was potentially shadowed. Using `setState` from the `create` arguments to ensure the correct function is called.
        setState(state => {
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
            
            return { tabs: newTabs };
        });
    },
    // FIX: Added explicit types to action implementations to ensure correct type inference by TypeScript.
    handleSaveCustomization: (originalDevice: Device, newValues: Omit<DeviceCustomization, 'name' | 'type' | 'icon' | 'isHidden'> & { name: string; type: DeviceType; icon: string; isHidden: boolean; }) => {
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
    // FIX: Added explicit types to action implementations to ensure correct type inference by TypeScript.
    handleToggleVisibility: (device: Device, isHidden: boolean) => {
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
    // FIX: Added explicit types to action implementations to ensure correct type inference by TypeScript.
    handleSaveTemplate: (template: CardTemplate) => {
        const newTemplates = { ...get().templates, [template.id]: template };
        get().setTemplates(newTemplates);
        // FIX: The `set` function was potentially shadowed. Using `setState` from the `create` arguments.
        setState({ editingTemplate: null });
    },
    // FIX: Added explicit types to action implementations to ensure correct type inference by TypeScript.
    handleDeleteTemplate: (templateId: string) => {
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
    // FIX: Added explicit types to action implementations to ensure correct type inference by TypeScript.
    createNewBlankTemplate: (deviceType: DeviceType) => {
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
    // FIX: Added explicit types to action implementations to ensure correct type inference by TypeScript.
    _triggerSave: (category: keyof typeof categorySelectors) => {
        const selector = categorySelectors[category];
        if (selector) {
            const dataToSave = selector(get());
            import('./haStore').then(({ useHAStore }) => {
                useHAStore.getState().saveHASettings(category, dataToSave);
            });
        }
    },
}));

// --- Data Persistence to Home Assistant ---

const categorySelectors = {
    layout: (state: AppState) => ({ tabs: state.tabs, activeTabId: state.activeTabId }),
    customizations: (state: AppState) => ({ customizations: state.customizations }),
    templates: (state: AppState) => ({ templates: state.templates }),
    appearance: (state: AppState) => ({ colorScheme: state.colorScheme, theme: state.theme, scheduleStartTime: state.scheduleStartTime, scheduleEndTime: state.scheduleEndTime }),
    interface: (state: AppState) => ({ clockSettings: state.clockSettings, cameraSettings: state.cameraSettings, sidebarWidth: state.sidebarWidth, isSidebarVisible: state.isSidebarVisible, lowBatteryThreshold: state.lowBatteryThreshold }),
    integrations: (state: AppState) => ({ weatherProvider: state.weatherProvider, openWeatherMapKey: state.openWeatherMapKey, yandexWeatherKey: state.yandexWeatherKey, forecaApiKey: state.forecaApiKey }),
};

// Subscribe to changes in each category and save them to Home Assistant
Object.entries(categorySelectors).forEach(([category, selector]) => {
    useAppStore.subscribe(
        selector,
        (data) => {
            import('./haStore').then(({ useHAStore }) => {
                if (useHAStore.getState().settingsStatus === 'loaded') {
                    useHAStore.getState().saveHASettings(category, data);
                }
            });
        },
        { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
    );
});

// Subscribe to changes that require haStore to re-calculate its derived state
useAppStore.subscribe(
    state => ({ customizations: state.customizations, lowBatteryThreshold: state.lowBatteryThreshold }),
    () => {
        import('./haStore').then(({ useHAStore }) => {
            useHAStore.getState()._resyncDerivedState();
        });
    },
    { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
);
