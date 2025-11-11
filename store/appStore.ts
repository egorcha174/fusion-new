
import { create } from 'zustand';
import {
  Page, Device, Tab, DeviceCustomizations, CardTemplates, ClockSettings,
  CameraSettings, ColorScheme, CardTemplate, DeviceType, GridLayoutItem, DeviceCustomization,
  CardElementId
} from '../types';
import { nanoid } from 'nanoid';
import { getIconNameForDeviceType } from '../components/DeviceIcon';
import { loadAndMigrate } from '../utils/localStorage';

// --- Default Templates ---
const DEFAULT_SENSOR_TEMPLATE_ID = 'default-sensor';
const DEFAULT_LIGHT_TEMPLATE_ID = 'default-light';
const DEFAULT_SWITCH_TEMPLATE_ID = 'default-switch';
const DEFAULT_CLIMATE_TEMPLATE_ID = 'default-climate';

const defaultSensorTemplate: CardTemplate = {
  id: DEFAULT_SENSOR_TEMPLATE_ID, name: 'Стандартный сенсор', deviceType: 'sensor',
  styles: { backgroundColor: 'rgb(31 41 55 / 0.8)', lightBackgroundColor: 'rgb(243 244 246 / 0.9)' },
  elements: [
    { id: 'name', visible: true, position: { x: 8, y: 7 }, size: { width: 65, height: 22 }, zIndex: 2, styles: {} },
    { id: 'icon', visible: true, position: { x: 80, y: 7 }, size: { width: 15, height: 15 }, zIndex: 2, styles: {} },
    { id: 'value', visible: true, position: { x: 8, y: 35 }, size: { width: 70, height: 40 }, zIndex: 2, styles: { decimalPlaces: 1 } },
    { id: 'unit', visible: true, position: { x: 70, y: 40 }, size: { width: 25, height: 25 }, zIndex: 2, styles: {} },
    { id: 'chart', visible: true, position: { x: 0, y: 82 }, size: { width: 100, height: 18 }, zIndex: 1, styles: { chartTimeRange: 24, chartTimeRangeUnit: 'hours', chartType: 'gradient' } },
    { id: 'status', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
  ],
};
const defaultLightTemplate: CardTemplate = {
    id: DEFAULT_LIGHT_TEMPLATE_ID, name: 'Стандартный светильник', deviceType: 'light',
    styles: { backgroundColor: 'rgb(55 65 81 / 0.8)', lightBackgroundColor: 'rgb(229 231 235 / 0.9)', onBackgroundColor: 'rgb(75 85 99 / 0.9)', lightOnBackgroundColor: 'rgb(255 255 255 / 1)' },
    elements: [
      { id: 'icon', visible: true, position: { x: 8, y: 8 }, size: { width: 20, height: 20 }, zIndex: 2, styles: { onColor: 'rgb(59 130 246 / 1)' } },
      { id: 'name', visible: true, position: { x: 8, y: 35 }, size: { width: 84, height: 22 }, zIndex: 2, styles: {} },
      { id: 'status', visible: true, position: { x: 8, y: 58 }, size: { width: 84, height: 12 }, zIndex: 2, styles: {} },
      { id: 'slider', visible: true, position: { x: 8, y: 78 }, size: { width: 84, height: 14 }, zIndex: 2, styles: {} },
    ],
};
const defaultSwitchTemplate: CardTemplate = {
    id: DEFAULT_SWITCH_TEMPLATE_ID, name: 'Стандартный переключатель', deviceType: 'switch',
    styles: { backgroundColor: 'rgb(55 65 81 / 0.8)', lightBackgroundColor: 'rgb(229 231 235 / 0.9)', onBackgroundColor: 'rgb(75 85 99 / 0.9)', lightOnBackgroundColor: 'rgb(255 255 255 / 1)' },
    elements: [
      { id: 'icon', visible: true, position: { x: 8, y: 8 }, size: { width: 20, height: 20 }, zIndex: 2, styles: { onColor: 'rgb(59 130 246 / 1)' } },
      { id: 'name', visible: true, position: { x: 8, y: 35 }, size: { width: 84, height: 22 }, zIndex: 2, styles: {} },
      { id: 'status', visible: true, position: { x: 8, y: 58 }, size: { width: 84, height: 12 }, zIndex: 2, styles: {} },
    ],
};
const defaultClimateTemplate: CardTemplate = {
  id: DEFAULT_CLIMATE_TEMPLATE_ID, name: 'Стандартный климат', deviceType: 'climate',
  styles: { backgroundColor: 'rgba(30, 30, 30, 0.5)', lightBackgroundColor: 'rgba(240, 240, 240, 0.8)' },
  elements: [
    { id: 'temperature', visible: true, position: { x: 8, y: 15 }, size: { width: 40, height: 15 }, zIndex: 2, styles: { fontSize: 32, decimalPlaces: 0 } },
    { id: 'name', visible: true, position: { x: 8, y: 32 }, size: { width: 40, height: 10 }, zIndex: 2, styles: { fontSize: 18 } },
    { id: 'status', visible: true, position: { x: 8, y: 44 }, size: { width: 40, height: 8 }, zIndex: 2, styles: { fontSize: 12 } },
    { id: 'target-temperature', visible: true, position: { x: 25, y: 5 }, size: { width: 90, height: 90 }, zIndex: 1, styles: {} },
    { id: 'hvac-modes', visible: true, position: { x: 80, y: 25 }, size: { width: 15, height: 50 }, zIndex: 2, styles: {} },
    { id: 'linked-entity', visible: false, position: { x: 8, y: 8 }, size: { width: 10, height: 10 }, zIndex: 2, styles: { linkedEntityId: '', showValue: false } },
  ],
};

// --- Default Color Scheme ---
const DEFAULT_COLOR_SCHEME: ColorScheme = {
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
    theme: 'day' | 'night' | 'auto';
    colorScheme: ColorScheme;
    openWeatherMapKey: string;
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
    setColorScheme: (scheme: ColorScheme) => void;
    setOpenWeatherMapKey: (key: string) => void;

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
    
    tabs: loadAndMigrate<Tab[]>('ha-tabs', []),
    activeTabId: loadAndMigrate<string | null>('ha-active-tab', null),
    customizations: loadAndMigrate<DeviceCustomizations>('ha-device-customizations', {}),
    templates: loadAndMigrate<CardTemplates>('ha-card-templates', {
        [DEFAULT_SENSOR_TEMPLATE_ID]: defaultSensorTemplate,
        [DEFAULT_LIGHT_TEMPLATE_ID]: defaultLightTemplate,
        [DEFAULT_SWITCH_TEMPLATE_ID]: defaultSwitchTemplate,
        [DEFAULT_CLIMATE_TEMPLATE_ID]: defaultClimateTemplate,
    }),
    clockSettings: loadAndMigrate<ClockSettings>('ha-clock-settings', { format: '24h', showSeconds: true, size: 'md' }),
    cameraSettings: loadAndMigrate<CameraSettings>('ha-camera-settings', { selectedEntityId: null }),
    sidebarWidth: loadAndMigrate<number>('ha-sidebar-width', 320),
    isSidebarVisible: loadAndMigrate<boolean>('ha-sidebar-visible', true),
    theme: loadAndMigrate<'day' | 'night' | 'auto'>('ha-theme', 'auto'),
    colorScheme: loadAndMigrate<ColorScheme>('ha-color-scheme', DEFAULT_COLOR_SCHEME),
    openWeatherMapKey: loadAndMigrate<string>('ha-openweathermap-key', ''),
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

    // --- Actions with Persistence ---
    setTabs: (tabs) => {
        set({ tabs });
        localStorage.setItem('ha-tabs', JSON.stringify(tabs));
    },
    setActiveTabId: (id) => {
        set({ activeTabId: id });
        localStorage.setItem('ha-active-tab', JSON.stringify(id));
    },
    setCustomizations: (customizations) => {
        set({ customizations });
        localStorage.setItem('ha-device-customizations', JSON.stringify(customizations));
    },
    setTemplates: (templates) => {
        set({ templates });
        localStorage.setItem('ha-card-templates', JSON.stringify(templates));
    },
    setClockSettings: (settings) => {
        set({ clockSettings: settings });
        localStorage.setItem('ha-clock-settings', JSON.stringify(settings));
    },
    setCameraSettings: (settings) => {
        set({ cameraSettings: settings });
        localStorage.setItem('ha-camera-settings', JSON.stringify(settings));
    },
    setSidebarWidth: (width) => {
        set({ sidebarWidth: width });
        localStorage.setItem('ha-sidebar-width', JSON.stringify(width));
    },
    setIsSidebarVisible: (isVisible) => {
        set({ isSidebarVisible: isVisible });
        localStorage.setItem('ha-sidebar-visible', JSON.stringify(isVisible));
    },
    setTheme: (theme) => {
        set({ theme });
        localStorage.setItem('ha-theme', theme);
    },
    setColorScheme: (scheme) => {
        set({ colorScheme: scheme });
        localStorage.setItem('ha-color-scheme', JSON.stringify(scheme));
    },
    setOpenWeatherMapKey: (key) => {
        set({ openWeatherMapKey: key });
        localStorage.setItem('ha-openweathermap-key', key);
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
        if (!templateId) {
            if (device.type === DeviceType.Sensor) templateId = DEFAULT_SENSOR_TEMPLATE_ID;
            else if (device.type === DeviceType.Light || device.type === DeviceType.DimmableLight) templateId = DEFAULT_LIGHT_TEMPLATE_ID;
            else if (device.type === DeviceType.Switch) templateId = DEFAULT_SWITCH_TEMPLATE_ID;
            else if (device.type === DeviceType.Thermostat) templateId = DEFAULT_CLIMATE_TEMPLATE_ID;
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
        if (col < 0 || row < 0 || col + Math.ceil(width) > gridSettings.cols || row + Math.ceil(height) > gridSettings.rows) {
            return true;
        }

        for (const existingItem of layout) {
            if (existingItem.deviceId === ignoreDeviceId) {
                continue;
            }

            const existingWidth = existingItem.width || 1;
            const existingHeight = existingItem.height || 1;
            
            // Standard BBox check for overlap
            const isOverlapping = (
                col < existingItem.col + existingWidth &&
                col + width > existingItem.col &&
                row < existingItem.row + existingHeight &&
                row + height > existingItem.row
            );

            if (isOverlapping) {
                // It's an overlap. Now, check if it's a valid stacking exception.
                const isPlacingStackable = width === 1 && height === 0.5;
                const isExistingStackable = existingWidth === 1 && existingHeight === 0.5;
                const isAtSameOrigin = col === existingItem.col && row === existingItem.row;

                if (isPlacingStackable && isExistingStackable && isAtSameOrigin) {
                    // We are placing a 1x0.5 on another 1x0.5 at the same origin.
                    // This is allowed only if there's currently only one item there.
                    const itemsAtOrigin = layout.filter(item => 
                        item.col === col && 
                        item.row === row &&
                        item.deviceId !== ignoreDeviceId // Exclude the item being manipulated from the count
                    );
                    
                    // If there's already one item, placing another is OK (creates a stack of 2).
                    // If there are 2 or more, it's a collision.
                    if (itemsAtOrigin.length < 2) {
                        continue; // This is a valid stack formation, not a collision. Continue checking against other items.
                    }
                }
                
                // If it's an overlap but not an allowed exception, it's a collision.
                return true;
            }
        }
        return false; // No collisions found
    },
    handleDeviceLayoutChange: (tabId, newLayout) => {
        const newTabs = get().tabs.map(tab => (tab.id === tabId) ? { ...tab, layout: newLayout } : tab);
        get().setTabs(newTabs);
    },
    handleDeviceResizeOnTab: (tabId, deviceId, newWidth, newHeight) => {
        const newTabs = get().tabs.map(tab => {
            if (tab.id !== tabId) return tab;
            const deviceItem = tab.layout.find(item => item.deviceId === deviceId);
            if (!deviceItem) return tab;
            const newItemLayout = { ...deviceItem, width: newWidth, height: newHeight };
            if (get().checkCollision(tab.layout, newItemLayout, tab.gridSettings, deviceId)) {
                return tab;
            }
            return { ...tab, layout: tab.layout.map(item => item.deviceId === deviceId ? newItemLayout : item) };
        });
        get().setTabs(newTabs);
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
    createNewBlankTemplate: (deviceType) => {
        const baseMap = {
            [DeviceType.Sensor]: defaultSensorTemplate,
            [DeviceType.Light]: defaultLightTemplate,
            [DeviceType.DimmableLight]: defaultLightTemplate,
            [DeviceType.Switch]: defaultSwitchTemplate,
            [DeviceType.Thermostat]: defaultClimateTemplate
        };
        const typeNameMap = {
            [DeviceType.Sensor]: 'сенсор', [DeviceType.Light]: 'светильник', [DeviceType.DimmableLight]: 'светильник',
            [DeviceType.Switch]: 'переключатель', [DeviceType.Thermostat]: 'климат'
        };
        const baseTemplate = baseMap[deviceType] || defaultSensorTemplate;
        const newTemplate = JSON.parse(JSON.stringify(baseTemplate));
        newTemplate.id = nanoid();
        newTemplate.name = `Новый ${typeNameMap[deviceType] || 'шаблон'}`;
        return newTemplate;
    },
}));