





import React, { useMemo, useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import useHomeAssistant from './hooks/useHomeAssistant';
import { useLocalStorage } from './hooks/useLocalStorage';
import { mapEntitiesToRooms } from './utils/ha-data-mapper';
import { Device, DeviceCustomization, DeviceCustomizations, Page, Tab, Room, ClockSettings, DeviceType, CameraSettings, GridLayoutItem, CardTemplates, CardTemplate, DeviceBinding, ThresholdRule, ColorScheme, ColorPickerContextData, CardElementId, CardElement } from './types';
import { nanoid } from 'nanoid';
import { getIconNameForDeviceType } from './components/DeviceIcon';
import { set } from './utils/obj-path';


// Lazy load components for code splitting and better performance
const Settings = lazy(() => import('./components/Settings'));
const InfoPanel = lazy(() => import('./components/InfoPanel'));
const DashboardHeader = lazy(() => import('./components/DashboardHeader'));
const AllDevicesPage = lazy(() => import('./components/AllDevicesPage'));
const TabContent = lazy(() => import('./components/TabContent'));
const DeviceSettingsModal = lazy(() => import('./components/DeviceSettingsModal'));
const TabSettingsModal = lazy(() => import('./components/TabSettingsModal'));
const ContextMenu = lazy(() => import('./components/ContextMenu'));
const FloatingCameraWindow = lazy(() => import('./components/FloatingCameraWindow'));
const TemplateEditorModal = lazy(() => import('./components/TemplateEditorModal'));
const ColorPickerContextMenu = lazy(() => import('./components/ColorPickerContextMenu'));
const HistoryModal = lazy(() => import('./components/HistoryModal'));


// Hook to check for large screens to conditionally apply margin
const useIsLg = () => {
  const [isLg, setIsLg] = useState(window.innerWidth >= 1024);
  useEffect(() => {
      const handleResize = () => setIsLg(window.innerWidth >= 1024);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isLg;
}

const DEFAULT_SENSOR_TEMPLATE_ID = 'default-sensor';
const DEFAULT_LIGHT_TEMPLATE_ID = 'default-light';
const DEFAULT_SWITCH_TEMPLATE_ID = 'default-switch';
const DEFAULT_CLIMATE_TEMPLATE_ID = 'default-climate';


const defaultSensorTemplate: CardTemplate = {
  id: DEFAULT_SENSOR_TEMPLATE_ID,
  name: 'Стандартный сенсор',
  deviceType: 'sensor',
  styles: {
    backgroundColor: 'rgb(31 41 55 / 0.8)', // bg-gray-800/80
    lightBackgroundColor: 'rgb(243 244 246 / 0.9)', // bg-gray-100/90
  },
  elements: [
    {
      id: 'name',
      visible: true,
      position: { x: 8, y: 7 },
      size: { width: 65, height: 22 },
      zIndex: 2,
      styles: {},
    },
    {
      id: 'icon',
      visible: true,
      position: { x: 80, y: 7 },
      size: { width: 15, height: 15 },
      zIndex: 2,
      styles: {},
    },
    {
      id: 'value',
      visible: true,
      position: { x: 8, y: 35 },
      size: { width: 70, height: 40 },
      zIndex: 2,
      styles: {
        decimalPlaces: 1,
      },
    },
    {
      id: 'unit',
      visible: true,
      position: { x: 70, y: 40 },
      size: { width: 25, height: 25 },
      zIndex: 2,
      styles: {},
    },
    {
      id: 'chart',
      visible: true,
      position: { x: 0, y: 82 },
      size: { width: 100, height: 18 },
      zIndex: 1,
      styles: {
        chartTimeRange: 24,
        chartTimeRangeUnit: 'hours',
        chartType: 'gradient',
      },
    },
    { 
      id: 'status', 
      visible: false, 
      position: { x: 0, y: 0}, 
      size: { width: 0, height: 0 }, 
      zIndex: 0, 
      styles: {} 
    },
  ],
};

const defaultLightTemplate: CardTemplate = {
    id: DEFAULT_LIGHT_TEMPLATE_ID,
    name: 'Стандартный светильник',
    deviceType: 'light',
    styles: {
      backgroundColor: 'rgb(55 65 81 / 0.8)', // bg-gray-600/80 for off state
      lightBackgroundColor: 'rgb(229 231 235 / 0.9)', // bg-gray-200/90
      onBackgroundColor: 'rgb(75 85 99 / 0.9)', // bg-gray-600/90
      lightOnBackgroundColor: 'rgb(255 255 255 / 1)', // bg-white
    },
    elements: [
      {
        id: 'icon',
        visible: true,
        position: { x: 8, y: 8 },
        size: { width: 20, height: 20 },
        zIndex: 2,
        styles: {
            onColor: 'rgb(59 130 246 / 1)', // text-blue-500
        },
      },
      {
        id: 'name',
        visible: true,
        position: { x: 8, y: 35 },
        size: { width: 84, height: 22 },
        zIndex: 2,
        styles: {},
      },
      {
        id: 'status',
        visible: true,
        position: { x: 8, y: 58 },
        size: { width: 84, height: 12 },
        zIndex: 2,
        styles: {},
      },
      {
        id: 'slider',
        visible: true,
        position: { x: 8, y: 78 },
        size: { width: 84, height: 14 },
        zIndex: 2,
        styles: {},
      },
    ],
};

const defaultSwitchTemplate: CardTemplate = {
    id: DEFAULT_SWITCH_TEMPLATE_ID,
    name: 'Стандартный переключатель',
    deviceType: 'switch',
    styles: {
      backgroundColor: 'rgb(55 65 81 / 0.8)', // bg-gray-600/80 for off state
      lightBackgroundColor: 'rgb(229 231 235 / 0.9)', // bg-gray-200/90
      onBackgroundColor: 'rgb(75 85 99 / 0.9)', // bg-gray-600/90
      lightOnBackgroundColor: 'rgb(255 255 255 / 1)', // bg-white
    },
    elements: [
      {
        id: 'icon',
        visible: true,
        position: { x: 8, y: 8 },
        size: { width: 20, height: 20 },
        zIndex: 2,
        styles: {
            onColor: 'rgb(59 130 246 / 1)', // text-blue-500
        },
      },
      {
        id: 'name',
        visible: true,
        position: { x: 8, y: 35 },
        size: { width: 84, height: 22 },
        zIndex: 2,
        styles: {},
      },
      {
        id: 'status',
        visible: true,
        position: { x: 8, y: 58 },
        size: { width: 84, height: 12 },
        zIndex: 2,
        styles: {},
      },
    ],
};

const defaultClimateTemplate: CardTemplate = {
  id: DEFAULT_CLIMATE_TEMPLATE_ID,
  name: 'Стандартный климат',
  deviceType: 'climate',
  styles: {
    backgroundColor: 'rgba(30, 30, 30, 0.5)', // A dark, blurred background look
    lightBackgroundColor: 'rgba(240, 240, 240, 0.8)',
  },
  elements: [
    {
      id: 'temperature',
      visible: true,
      position: { x: 8, y: 15 },
      size: { width: 40, height: 15 },
      zIndex: 2,
      styles: { fontSize: 32, decimalPlaces: 0 },
    },
    {
      id: 'name',
      visible: true,
      position: { x: 8, y: 32 },
      size: { width: 40, height: 10 },
      zIndex: 2,
      styles: { fontSize: 18 },
    },
    {
      id: 'status',
      visible: true,
      position: { x: 8, y: 44 },
      size: { width: 40, height: 8 },
      zIndex: 2,
      styles: { fontSize: 12 },
    },
    {
      id: 'target-temperature', // This will render the dial
      visible: true,
      position: { x: 25, y: 5 },
      size: { width: 90, height: 90 },
      zIndex: 1,
      styles: {},
    },
    {
      id: 'hvac-modes', // This will now intelligently show presets or hvac modes
      visible: true,
      position: { x: 80, y: 25 },
      size: { width: 15, height: 50 },
      zIndex: 2,
      styles: {},
    },
    {
      id: 'linked-entity',
      visible: false,
      position: { x: 8, y: 8 },
      size: { width: 10, height: 10 },
      zIndex: 2,
      styles: { linkedEntityId: '', showValue: false },
    },
  ],
};

const DEFAULT_COLOR_SCHEME: ColorScheme = {
  light: {
    dashboardBackground: '#e5e7eb', // gray-200
    sidebarBackground: 'rgba(255, 255, 255, 0.7)',
    cardBackground: 'rgba(255, 255, 255, 0.8)',
    cardBackgroundOn: '#f3f4f6', // gray-100
    headerBackground: 'rgba(255, 255, 255, 0.7)',
    tabTextColor: '#6b7280', // gray-500
    activeTabTextColor: '#111827', // gray-900
    tabIndicatorColor: '#111827', // gray-900
    thermostatHandleColor: '#1f2937', // gray-800
    thermostatDialTextColor: '#111827', // gray-900
    thermostatDialLabelColor: '#6b7280', // gray-500
    thermostatHeatingColor: '#f97316', // orange-500
    thermostatCoolingColor: '#3b82f6', // blue-500
    clockTextColor: '#111827', // gray-900
    
    // Text Colors - Off State
    nameTextColor: '#1f2937', // gray-800
    statusTextColor: '#6b7280', // gray-500
    valueTextColor: '#111827', // gray-900
    unitTextColor: '#6b7280', // gray-500
    // Text Colors - On State
    nameTextColorOn: '#111827', // gray-900
    statusTextColorOn: '#4b5563', // gray-600
    valueTextColorOn: '#111827', // gray-900
    unitTextColorOn: '#4b5563', // gray-600
  },
  dark: {
    dashboardBackground: '#111827', // gray-900
    sidebarBackground: 'rgba(17, 24, 39, 0.75)',
    cardBackground: 'rgba(31, 41, 55, 0.8)', // gray-800/80
    cardBackgroundOn: '#374151', // gray-700
    headerBackground: 'rgba(17, 24, 39, 0.75)',
    tabTextColor: '#9ca3af', // gray-400
    activeTabTextColor: '#f9fafb', // gray-50
    tabIndicatorColor: '#f9fafb', // gray-50
    thermostatHandleColor: '#f9fafb', // gray-50
    thermostatDialTextColor: '#f9fafb', // gray-50
    thermostatDialLabelColor: '#9ca3af', // gray-400
    thermostatHeatingColor: '#fb923c', // orange-400
    thermostatCoolingColor: '#60a5fa', // blue-400
    clockTextColor: '#f9fafb', // gray-50

    // Text Colors - Off State
    nameTextColor: '#d1d5db', // gray-300
    statusTextColor: '#9ca3af', // gray-400
    valueTextColor: '#f9fafb', // gray-50
    unitTextColor: '#9ca3af', // gray-400
    // Text Colors - On State
    nameTextColorOn: '#f9fafb', // gray-50
    statusTextColorOn: '#d1d5db', // gray-300
    valueTextColorOn: '#f9fafb', // gray-50
    unitTextColorOn: '#d1d5db', // gray-300
  },
};

interface StyleUpdateInfo {
    origin: 'scheme' | 'template';
    baseKey: string;
    theme: 'light' | 'dark';
    isOn: boolean;
    templateId?: string;
    elementId?: CardElementId;
    styleProperty?: string;
}

const App: React.FC = () => {
  const {
    connectionStatus,
    isLoading,
    error,
    entities,
    areas,
    devices: haDevices,
    entityRegistry,
    connect,
    disconnect,
    callService,
    signPath,
    getCameraStreamUrl,
    getConfig,
    getHistory,
  } = useHomeAssistant();

  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [historyModalEntityId, setHistoryModalEntityId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editingTab, setEditingTab] = useState<Tab | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<CardTemplate | 'new' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, deviceId: string, tabId: string } | null>(null);
  const [colorPickerMenu, setColorPickerMenu] = useState<ColorPickerContextData | null>(null);
  const [floatingCamera, setFloatingCamera] = useState<Device | null>(null);

  const [tabs, setTabs] = useLocalStorage<Tab[]>('ha-tabs', []);
  const [activeTabId, setActiveTabId] = useLocalStorage<string | null>('ha-active-tab', null);
  const [customizations, setCustomizations] = useLocalStorage<DeviceCustomizations>('ha-device-customizations', {});
  const [templates, setTemplates] = useLocalStorage<CardTemplates>('ha-card-templates', {
    [DEFAULT_SENSOR_TEMPLATE_ID]: defaultSensorTemplate,
    [DEFAULT_LIGHT_TEMPLATE_ID]: defaultLightTemplate,
    [DEFAULT_SWITCH_TEMPLATE_ID]: defaultSwitchTemplate,
    [DEFAULT_CLIMATE_TEMPLATE_ID]: defaultClimateTemplate,
  });
  const [clockSettings, setClockSettings] = useLocalStorage<ClockSettings>('ha-clock-settings', {
    format: '24h',
    showSeconds: true,
    size: 'md',
  });
  const [cameraSettings, setCameraSettings] = useLocalStorage<CameraSettings>('ha-camera-settings', {
    selectedEntityId: null,
  });
  const [sidebarWidth, setSidebarWidth] = useLocalStorage<number>('ha-sidebar-width', 320);
  const [isSidebarVisible, setIsSidebarVisible] = useLocalStorage<boolean>('ha-sidebar-visible', true);
  const [haUrl] = useLocalStorage('ha-url', '');
  const [openWeatherMapKey, setOpenWeatherMapKey] = useLocalStorage<string>('ha-openweathermap-key', '');
  const [theme, setTheme] = useLocalStorage<'day' | 'night' | 'auto'>('ha-theme', 'auto');
  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>('ha-color-scheme', DEFAULT_COLOR_SCHEME);


  const brightnessTimeoutRef = useRef<number | null>(null);
  const isLg = useIsLg();

  // Theme management
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = () => {
      const isDark =
        theme === 'night' ||
        (theme === 'auto' && mediaQuery.matches);
      root.classList.toggle('dark', isDark);
    };

    updateTheme();

    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [theme]);


  // Cleanup for brightness debounce timer on component unmount
  useEffect(() => {
    return () => {
        if (brightnessTimeoutRef.current) {
            clearTimeout(brightnessTimeoutRef.current);
        }
    };
  }, []);


  // Ensure there's always at least one tab and an active tab is set
  useEffect(() => {
    if (connectionStatus === 'connected' && !isLoading) {
      if (tabs.length === 0) {
        const newTab: Tab = { id: nanoid(), name: 'Главная', layout: [], gridSettings: { cols: 8, rows: 5 } };
        setTabs([newTab]);
        setActiveTabId(newTab.id);
      } else if (!activeTabId || !tabs.some(t => t.id === activeTabId)) {
        setActiveTabId(tabs[0].id);
      }
    }
  }, [tabs, activeTabId, connectionStatus, isLoading, setTabs, setActiveTabId]);

  const allKnownDevices = useMemo(() => {
    if (connectionStatus !== 'connected') return new Map<string, Device>();
    const rooms = mapEntitiesToRooms(Object.values(entities), areas, haDevices, entityRegistry, customizations, true);
    const deviceMap = new Map<string, Device>();
    rooms.forEach(room => {
      room.devices.forEach(device => {
        deviceMap.set(device.id, device);
      });
    });
    return deviceMap;
  }, [connectionStatus, entities, areas, haDevices, entityRegistry, customizations]);

  const allRoomsForDevicePage = useMemo(() => {
     if (connectionStatus !== 'connected') return [];
     return mapEntitiesToRooms(Object.values(entities), areas, haDevices, entityRegistry, customizations, true);
  }, [connectionStatus, entities, areas, haDevices, entityRegistry, customizations]);

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);

  const allCameras = useMemo(() => {
    return Array.from(allKnownDevices.values()).filter((d: Device) => d.haDomain === 'camera');
  }, [allKnownDevices]);
  
  const filteredRoomsForDevicePage = useMemo(() => {
    if (!searchTerm) return allRoomsForDevicePage;
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredRooms: Room[] = [];

    allRoomsForDevicePage.forEach(room => {
        const filteredDevices = room.devices.filter(device =>
            device.name.toLowerCase().includes(lowercasedFilter) ||
            device.id.toLowerCase().includes(lowercasedFilter)
        );

        if (filteredDevices.length > 0) {
            filteredRooms.push({ ...room, devices: filteredDevices });
        }
    });

    return filteredRooms;
  }, [searchTerm, allRoomsForDevicePage]);

    const isSystemDark = useMemo(() => window.matchMedia('(prefers-color-scheme: dark)').matches, []);
    const isDark = useMemo(() => theme === 'night' || (theme === 'auto' && isSystemDark), [theme, isSystemDark]);
    const currentColorScheme = useMemo(() => isDark ? colorScheme.dark : colorScheme.light, [isDark, colorScheme]);


  // --- Context Menu Handlers ---
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);
  
const handleStyleUpdate = useCallback((updateInfo: StyleUpdateInfo, value: any) => {
    const { origin, theme: themeKey, baseKey, isOn, templateId, elementId, styleProperty } = updateInfo;

    if (origin === 'scheme') {
        const onSuffix = isOn ? 'On' : '';
        const key = `${themeKey}.${baseKey}${onSuffix}`;
        setColorScheme(prev => {
            const newScheme = JSON.parse(JSON.stringify(prev));
            if (value === undefined || value === '') {
                // Delete the key to reset to default css
                const pathParts = key.split('.');
                const lastKey = pathParts.pop()!;
                let parent = newScheme;
                for (const part of pathParts) {
                    if (!parent || typeof parent !== 'object') break;
                    parent = parent[part];
                }
                if (parent && typeof parent === 'object' && lastKey in parent) {
                    delete parent[lastKey];
                }
            } else {
                set(newScheme, key, value);
            }
            return newScheme;
        });
    } else if (origin === 'template') {
        if (!templateId || !elementId || !styleProperty) return;

        setTemplates(prev => {
            const newTemplates = JSON.parse(JSON.stringify(prev));
            const template = newTemplates[templateId];
            if (!template) return prev;

            const elementIndex = template.elements.findIndex((el: CardElement) => el.id === elementId);
            if (elementIndex === -1) return prev;
            
            const styles = template.elements[elementIndex].styles as Record<string, any>;
            if (value === undefined || value === '') {
                delete styles[styleProperty];
            } else {
                styles[styleProperty] = value;
            }
            
            return newTemplates;
        });
    }
}, [setColorScheme, setTemplates]);


const handleOpenColorPicker = useCallback((
    event: React.MouseEvent,
    styleInfoFromClick: any 
  ) => {
    setContextMenu(null);
    const { baseKey, targetName, isTextElement, isOn, origin, templateId, elementId, styleProperty } = styleInfoFromClick;
    const themeKey = isDark ? 'dark' : 'light';
    const scheme = isDark ? colorScheme.dark : colorScheme.light;
    const template = templateId ? templates[templateId] : null;
    const element = template ? template.elements.find((el: CardElement) => el.id === elementId) : null;
    const onSuffix = isOn ? 'On' : '';

    let initialValue = isDark ? '#FFFFFF' : '#000000';
    if (origin === 'template' && element) {
        initialValue = (element.styles as any)[styleProperty || 'textColor'] || initialValue;
    } else if (origin === 'scheme') {
        initialValue = (scheme as any)[`${baseKey}${onSuffix}`] || initialValue;
    }

    let initialFontFamily: string | undefined;
    const fontFamilyKey = baseKey.replace('Color', 'FontFamily');
    if (origin === 'template' && element?.styles.fontFamily) {
        initialFontFamily = element.styles.fontFamily;
    } else if (origin === 'scheme') {
        initialFontFamily = (scheme as any)[`${fontFamilyKey}${onSuffix}`];
    }

    let initialFontSize: number | undefined;
    const fontSizeKey = baseKey.replace('Color', 'FontSize');
    if (origin === 'template' && element?.styles.fontSize) {
        initialFontSize = element.styles.fontSize;
    } else if (origin === 'scheme') {
        initialFontSize = (scheme as any)[`${fontSizeKey}${onSuffix}`];
    }
    
    const onUpdate = (property: 'color' | 'fontFamily' | 'fontSize', value: any) => {
        const baseUpdateInfo: Omit<StyleUpdateInfo, 'baseKey' | 'styleProperty'> = {
            origin, theme: themeKey, isOn, templateId, elementId,
        };
        let finalUpdateInfo: StyleUpdateInfo;

        if (property === 'color') {
            finalUpdateInfo = { ...baseUpdateInfo, baseKey, styleProperty: styleProperty || 'textColor' };
        } else if (property === 'fontFamily') {
            finalUpdateInfo = { ...baseUpdateInfo, baseKey: fontFamilyKey, styleProperty: 'fontFamily' };
        } else { // fontSize
            finalUpdateInfo = { ...baseUpdateInfo, baseKey: fontSizeKey, styleProperty: 'fontSize' };
        }
        handleStyleUpdate(finalUpdateInfo, value);
        
        // Update the context menu's state so it re-renders with the new value.
        setColorPickerMenu(prev => {
            if (!prev) return null;
            const newMenuData = { ...prev };
            if (property === 'fontSize') {
                newMenuData.initialFontSize = value;
            } else if (property === 'fontFamily') {
                newMenuData.initialFontFamily = value;
            } else if (property === 'color') {
                newMenuData.initialValue = value;
            }
            return newMenuData;
        });
    };

    setColorPickerMenu({
        x: event.clientX,
        y: event.clientY,
        targetName,
        isTextElement,
        onUpdate,
        initialValue,
        initialFontFamily,
        initialFontSize,
    });
}, [isDark, colorScheme, templates, handleStyleUpdate, setColorPickerMenu]);
  
  const handleDeviceContextMenu = useCallback((event: React.MouseEvent, deviceId: string, tabId: string) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, deviceId, tabId });
  }, []);
  
  const handleGlobalContextMenu = useCallback((event: React.MouseEvent) => {
    setContextMenu(null);
    setColorPickerMenu(null);

    const target = event.target as HTMLElement;
    const styleTarget = target.closest('[data-style-origin]') as HTMLElement | null;
    
    if (styleTarget) {
      event.preventDefault();
      
      const { 
        styleOrigin: origin, 
        styleKey: baseKey, 
        styleName: targetName,
        isText: isTextStr,
        isOn: isOnStr,
        templateId,
        templateElementId: elementId,
        styleProperty,
      } = styleTarget.dataset;

      const styleInfo = {
          origin,
          baseKey,
          targetName: targetName || 'Элемент',
          isTextElement: isTextStr === 'true',
          isOn: isOnStr === 'true',
          templateId,
          elementId,
          styleProperty,
      };

      handleOpenColorPicker(event, styleInfo);
    }
  }, [handleOpenColorPicker]);




  // --- Tab Management Handlers ---
  const handleAddTab = useCallback(() => {
    setTabs(prevTabs => {
        const newTabName = `Вкладка ${prevTabs.length + 1}`;
        const newTab: Tab = { id: nanoid(), name: newTabName, layout: [], gridSettings: { cols: 8, rows: 5 } };
        setActiveTabId(newTab.id);
        return [...prevTabs, newTab];
    });
  }, [setTabs, setActiveTabId]);

  const handleUpdateTabSettings = useCallback((tabId: string, settings: { name: string; gridSettings: { cols: number, rows: number } }) => {
      setTabs(prevTabs => prevTabs.map(tab => (tab.id === tabId) ? { ...tab, ...settings } : tab));
      setEditingTab(null);
  }, [setTabs]);

  const handleDeleteTab = useCallback((tabId: string) => {
    setTabs(prevTabs => {
        const newTabs = prevTabs.filter(t => t.id !== tabId);
        if (activeTabId === tabId) {
            setActiveTabId(newTabs.length > 0 ? newTabs[0].id : null);
        }
        return newTabs;
    });
    setEditingTab(null);
  }, [activeTabId, setTabs, setActiveTabId]);

  const handleTabOrderChange = useCallback((newTabs: Tab[]) => {
    setTabs(newTabs);
  }, [setTabs]);


  // --- Device Management on Tabs ---
  const handleDeviceAddToTab = useCallback((deviceId: string, tabId: string) => {
    setTabs(prevTabs => prevTabs.map(tab => {
        if (tab.id === tabId && !tab.layout.some(item => item.deviceId === deviceId)) {
            // Find the first empty cell
            const { cols, rows } = tab.gridSettings;
            let emptyCell: { col: number, row: number } | null = null;
            
            const occupiedCells = new Set(tab.layout.map(item => `${item.col},${item.row}`));

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (!occupiedCells.has(`${c},${r}`)) {
                        emptyCell = { col: c, row: r };
                        break;
                    }
                }
                if (emptyCell) break;
            }
            
            if (emptyCell) {
                const newLayoutItem: GridLayoutItem = { deviceId, col: emptyCell.col, row: emptyCell.row, width: 1, height: 1 };
                return { 
                    ...tab, 
                    layout: [...tab.layout, newLayoutItem]
                };
            } else {
                console.warn(`Tab "${tab.name}" is full. Cannot add device "${deviceId}".`);
            }
        }
        return tab;
    }));
  }, [setTabs]);

  const handleDeviceRemoveFromTab = useCallback((deviceId: string, tabId: string) => {
     setTabs(prevTabs => prevTabs.map(tab => {
        if (tab.id === tabId) {
            return { 
                ...tab, 
                layout: tab.layout.filter(item => item.deviceId !== deviceId)
            };
        }
        return tab;
     }));
  }, [setTabs]);
  
  const handleDeviceMoveToTab = useCallback((deviceId: string, fromTabId: string, toTabId: string) => {
    if (fromTabId === toTabId) return;
    handleDeviceAddToTab(deviceId, toTabId);
    handleDeviceRemoveFromTab(deviceId, fromTabId);
  }, [handleDeviceAddToTab, handleDeviceRemoveFromTab]);

  const handleDeviceLayoutChangeOnTab = useCallback((tabId: string, newLayout: GridLayoutItem[]) => {
      setTabs(prevTabs => prevTabs.map(tab => {
          if (tab.id === tabId) {
              return { ...tab, layout: newLayout };
          }
          return tab;
      }));
  }, [setTabs]);
  
  const handleDeviceResizeOnTab = useCallback((tabId: string, deviceId: string, newWidth: number, newHeight: number) => {
    setTabs(prevTabs => prevTabs.map(tab => {
      if (tab.id !== tabId) return tab;

      const currentLayout = tab.layout;
      const deviceItem = currentLayout.find(item => item.deviceId === deviceId);
      if (!deviceItem) return tab;

      const { col, row } = deviceItem;

      // Boundary check
      if (col + newWidth > tab.gridSettings.cols || row + newHeight > tab.gridSettings.rows) {
          console.warn('Cannot resize: Exceeds grid boundaries.');
          return tab;
      }

      // Collision check
      for (let r = row; r < row + newHeight; r++) {
        for (let c = col; c < col + newWidth; c++) {
          const conflictingItem = currentLayout.find(item => {
            if (item.deviceId === deviceId) return false; // Don't check against self
            const itemWidth = item.width || 1;
            const itemHeight = item.height || 1;
            return c >= item.col && c < item.col + itemWidth && r >= item.row && r < item.row + itemHeight;
          });
          if (conflictingItem) {
            console.warn(`Cannot resize: Conflict with device ${conflictingItem.deviceId}`);
            return tab; // Abort resize
          }
        }
      }

      // If no collision and within boundaries, update layout
      const newLayout = currentLayout.map(item =>
        item.deviceId === deviceId ? { ...item, width: newWidth, height: newHeight } : item
      );

      return { ...tab, layout: newLayout };
    }));
  }, [setTabs]);



  // --- Core Device Interaction ---
  const handleDeviceToggle = useCallback((deviceId: string) => {
    const entity = entities[deviceId];
    if (!entity) return;
    const service = entity.state === 'on' ? 'turn_off' : 'turn_on';
    const [domain] = entity.entity_id.split('.');
    callService(domain, service, { entity_id: entity.entity_id });
  }, [entities, callService]);
  
  const handleTemperatureChange = useCallback((deviceId: string, temperature: number, isDelta: boolean = false) => {
      const entity = entities[deviceId];
      if (!entity) return;
      
      const newTemp = isDelta 
        ? (entity.attributes.temperature || 0) + temperature 
        : temperature;
      
      callService('climate', 'set_temperature', { entity_id: entity.entity_id, temperature: newTemp });
  }, [entities, callService]);

  const handleHvacModeChange = useCallback((deviceId: string, mode: string) => {
    const entity = entities[deviceId];
    if (!entity) return;
    callService('climate', 'set_hvac_mode', { entity_id: entity.entity_id, hvac_mode: mode });
  }, [entities, callService]);

  const handleBrightnessChange = useCallback((deviceId: string, brightness: number) => {
    if (brightnessTimeoutRef.current) {
        clearTimeout(brightnessTimeoutRef.current);
    }
    brightnessTimeoutRef.current = window.setTimeout(() => {
        const entity = entities[deviceId];
        if (!entity) return;
        callService('light', 'turn_on', {
          entity_id: entity.entity_id,
          brightness_pct: brightness,
        });
    }, 200); // 200ms debounce
  }, [entities, callService]);

  const handlePresetChange = useCallback((deviceId: string, preset: string) => {
    callService('climate', 'set_preset_mode', { entity_id: deviceId, preset_mode: preset });
  }, [callService]);

  const handleCameraCardClick = useCallback((device: Device) => {
    setFloatingCamera(device);
  }, []);

  const handleShowHistory = useCallback((entityId: string) => {
    setHistoryModalEntityId(entityId);
  }, []);


  // --- Customization ---
  const handleSaveCustomization = useCallback((deviceId: string, newValues: { name: string; type: DeviceType; icon: string; isHidden: boolean; templateId?: string; iconAnimation?: 'none' | 'spin' | 'pulse' | 'glow'; deviceBindings?: DeviceBinding[]; thresholds?: ThresholdRule[] }) => {
    const originalDevice = allKnownDevices.get(deviceId);
    if (!originalDevice) return;
    
    setCustomizations(prev => {
        const newCustomizations = { ...prev };
        const currentCustomization: Partial<DeviceCustomization> = { ...newCustomizations[deviceId] };

        if (newValues.name && newValues.name !== originalDevice.name) {
            currentCustomization.name = newValues.name;
        } else {
            delete currentCustomization.name;
        }
        if (newValues.type !== originalDevice.type) {
            currentCustomization.type = newValues.type;
        } else {
            delete currentCustomization.type;
        }
        const defaultIconForNewType = getIconNameForDeviceType(newValues.type, false);
        if (newValues.icon !== defaultIconForNewType) {
            currentCustomization.icon = newValues.icon;
        } else {
            delete currentCustomization.icon;
        }
        if (newValues.isHidden) {
            currentCustomization.isHidden = true;
        } else {
            delete currentCustomization.isHidden;
        }
        if (newValues.templateId) {
            currentCustomization.templateId = newValues.templateId;
        } else {
            delete currentCustomization.templateId;
        }
        if (newValues.iconAnimation && newValues.iconAnimation !== 'none') {
            currentCustomization.iconAnimation = newValues.iconAnimation;
        } else {
            delete currentCustomization.iconAnimation;
        }
        if (newValues.deviceBindings && newValues.deviceBindings.length > 0) {
            currentCustomization.deviceBindings = newValues.deviceBindings;
        } else {
            delete currentCustomization.deviceBindings;
        }
        if (newValues.thresholds && newValues.thresholds.length > 0) {
            currentCustomization.thresholds = newValues.thresholds;
        } else {
            delete currentCustomization.thresholds;
        }


        if (Object.keys(currentCustomization).length === 0) {
            delete newCustomizations[deviceId];
        } else {
            newCustomizations[deviceId] = currentCustomization;
        }
        
        return newCustomizations;
    });
    setEditingDevice(null);
  }, [allKnownDevices, setCustomizations]);
  
   const handleToggleVisibility = useCallback((deviceId: string, isHidden: boolean) => {
    const currentCustomization = customizations[deviceId] || {};
    const originalDevice = allKnownDevices.get(deviceId);
    if (!originalDevice) return;

    const currentType = currentCustomization.type || originalDevice.type;
    const defaultIcon = getIconNameForDeviceType(currentType, false);

    handleSaveCustomization(deviceId, {
      name: currentCustomization.name || originalDevice.name,
      type: currentType,
      icon: currentCustomization.icon || defaultIcon,
      isHidden: isHidden,
      templateId: currentCustomization.templateId,
      iconAnimation: currentCustomization.iconAnimation,
      deviceBindings: currentCustomization.deviceBindings,
      thresholds: currentCustomization.thresholds,
    });
  }, [customizations, allKnownDevices, handleSaveCustomization]);

  // --- Template Management ---
  const handleSaveTemplate = useCallback((template: CardTemplate) => {
    setTemplates(prev => ({
        ...prev,
        [template.id]: template,
    }));
    setEditingTemplate(null);
  }, [setTemplates]);

  const handleDeleteTemplate = useCallback((templateId: string) => {
    if (Object.keys(templates).length <= 1) {
        alert("Нельзя удалить последний шаблон.");
        return;
    }

    setTemplates(prev => {
        const newTemplates = { ...prev };
        delete newTemplates[templateId];
        return newTemplates;
    });

    setCustomizations(prev => {
        const newCustomizations = { ...prev };
        Object.keys(newCustomizations).forEach(deviceId => {
            if (newCustomizations[deviceId].templateId === templateId) {
                delete newCustomizations[deviceId].templateId;
                 if (Object.keys(newCustomizations[deviceId]).length === 0) {
                    delete newCustomizations[deviceId];
                }
            }
        });
        return newCustomizations;
    });
  }, [templates, setTemplates, setCustomizations]);

  const createNewBlankTemplate = useCallback((deviceType: 'sensor' | 'light' | 'switch' | 'climate'): CardTemplate => {
    let baseTemplate: CardTemplate;
    let typeName: string;

    switch(deviceType) {
        case 'sensor':
            baseTemplate = defaultSensorTemplate;
            typeName = 'сенсор';
            break;
        case 'light':
            baseTemplate = defaultLightTemplate;
            typeName = 'светильник';
            break;
        case 'switch':
            baseTemplate = defaultSwitchTemplate;
            typeName = 'переключатель';
            break;
        case 'climate':
            baseTemplate = defaultClimateTemplate;
            typeName = 'климат';
            break;
    }

    const newTemplate = JSON.parse(JSON.stringify(baseTemplate));
    newTemplate.id = nanoid();
    newTemplate.name = `Новый ${typeName}`;
    newTemplate.deviceType = deviceType;
    return newTemplate;
  }, []);


  // --- RENDER LOGIC ---

  if (connectionStatus !== 'connected') {
    return <Suspense fallback={<div />}><Settings onConnect={connect} connectionStatus={connectionStatus} error={error} /></Suspense>;
  }
  
  if (isLoading) {
    return (
       <div className="flex h-screen w-screen items-center justify-center">
         <LoadingSpinner />
       </div>
    );
  }
  
  const contextMenuDevice = contextMenu ? allKnownDevices.get(contextMenu.deviceId) : null;
  const isTemplateable = contextMenuDevice?.type === DeviceType.Sensor || contextMenuDevice?.type === DeviceType.DimmableLight || contextMenuDevice?.type === DeviceType.Light || contextMenuDevice?.type === DeviceType.Switch || contextMenuDevice?.type === DeviceType.Thermostat;

  const getTemplateForDevice = (device: Device | null) => {
    if (!device) return null;
    const customization = customizations[device.id];
    let templateId: string | undefined = customization?.templateId;
    if (!templateId) {
        if (device.type === DeviceType.Sensor) templateId = DEFAULT_SENSOR_TEMPLATE_ID;
        if (device.type === DeviceType.Light || device.type === DeviceType.DimmableLight) templateId = DEFAULT_LIGHT_TEMPLATE_ID;
        if (device.type === DeviceType.Switch) templateId = DEFAULT_SWITCH_TEMPLATE_ID;
        if (device.type === DeviceType.Thermostat) templateId = DEFAULT_CLIMATE_TEMPLATE_ID;
    }
    return templateId ? templates[templateId] : null;
  };

  const currentTemplate = getTemplateForDevice(contextMenuDevice);

  const renderPage = () => {
    switch (currentPage) {
      case 'settings':
        return (
          <div className="flex justify-center items-start pt-10">
            <Settings 
              onConnect={connect} 
              connectionStatus={connectionStatus} 
              error={error} 
              onDisconnect={disconnect} 
              clockSettings={clockSettings} 
              onClockSettingsChange={setClockSettings} 
              openWeatherMapKey={openWeatherMapKey} 
              onOpenWeatherMapKeyChange={setOpenWeatherMapKey}
              templates={templates}
              onEditTemplate={(template) => setEditingTemplate(template)}
              onDeleteTemplate={handleDeleteTemplate}
              onCreateTemplate={(type) => setEditingTemplate(createNewBlankTemplate(type))}
              colorScheme={colorScheme}
              onColorSchemeChange={setColorScheme}
              onResetColorScheme={() => setColorScheme(DEFAULT_COLOR_SCHEME)}
              isSidebarVisible={isSidebarVisible}
              onSidebarVisibilityChange={setIsSidebarVisible}
            />
          </div>
        );
      case 'all-devices':
        return <AllDevicesPage rooms={filteredRoomsForDevicePage} customizations={customizations} onToggleVisibility={handleToggleVisibility} tabs={tabs} onDeviceAddToTab={handleDeviceAddToTab} />;
      case 'dashboard':
      default:
        return activeTab ? (
          <TabContent
            key={activeTab.id}
            tab={activeTab}
            allKnownDevices={allKnownDevices}
            searchTerm={searchTerm}
            onDeviceLayoutChange={handleDeviceLayoutChangeOnTab}
            onDeviceToggle={handleDeviceToggle}
            onTemperatureChange={handleTemperatureChange}
            onBrightnessChange={handleBrightnessChange}
            onHvacModeChange={handleHvacModeChange}
            onPresetChange={handlePresetChange}
            onCameraCardClick={handleCameraCardClick}
            onShowHistory={handleShowHistory}
            isEditMode={isEditMode}
            onEditDevice={setEditingDevice}
            onDeviceContextMenu={handleDeviceContextMenu}
            onOpenColorPicker={handleOpenColorPicker}
            haUrl={haUrl}
            signPath={signPath}
            getCameraStreamUrl={getCameraStreamUrl}
            templates={templates}
            customizations={customizations}
            colorScheme={currentColorScheme}
          />
        ) : (
          <div className="text-center text-gray-500">Выберите или создайте вкладку</div>
        );
    }
  };

  const otherTabs = tabs.filter(t => t.id !== contextMenu?.tabId);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: currentColorScheme.dashboardBackground }} onContextMenu={handleGlobalContextMenu} data-style-key="dashboardBackground" data-style-name="Фон дашборда" data-style-origin="scheme">
      {isSidebarVisible && (
      <Suspense fallback={<div className="bg-gray-900" style={{ width: `${sidebarWidth}px` }} />}>
        <InfoPanel 
          clockSettings={clockSettings} 
          sidebarWidth={sidebarWidth} 
          setSidebarWidth={setSidebarWidth}
          cameras={allCameras}
          cameraSettings={cameraSettings}
          onCameraSettingsChange={setCameraSettings}
          onCameraWidgetClick={handleCameraCardClick}
          haUrl={haUrl}
          signPath={signPath}
          getCameraStreamUrl={getCameraStreamUrl}
          openWeatherMapKey={openWeatherMapKey}
          getConfig={getConfig}
          colorScheme={currentColorScheme}
        />
      </Suspense>
      )}
      <div className="flex flex-col flex-1" style={{ marginLeft: isLg && isSidebarVisible ? `${sidebarWidth}px` : '0px' }}>
        <Suspense fallback={<div className="h-[73px] bg-gray-900 border-b border-gray-700/50" />}>
            <DashboardHeader
                tabs={tabs}
                activeTabId={activeTabId}
                onTabChange={(tabId) => {
                  setActiveTabId(tabId);
                  setCurrentPage('dashboard');
                }}
                onTabOrderChange={handleTabOrderChange}
                isEditMode={isEditMode}
                onToggleEditMode={() => setIsEditMode(!isEditMode)}
                onNavigate={(page) => setCurrentPage(page)}
                onAddTab={handleAddTab}
                onEditTab={setEditingTab}
                currentPage={currentPage}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                theme={theme}
                onThemeChange={setTheme}
                colorScheme={currentColorScheme}
            />
        </Suspense>
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><LoadingSpinner /></div>}>
            <div className="container mx-auto h-full">
              <div key={currentPage + (activeTab?.id || '')} className="fade-in h-full">
                {renderPage()}
              </div>
            </div>
          </Suspense>
        </main>
      </div>
      
      <Suspense fallback={null}>
        {editingDevice && (
          <DeviceSettingsModal 
            device={editingDevice} 
            customization={customizations[editingDevice.id] || {}} 
            onSave={handleSaveCustomization} 
            onClose={() => setEditingDevice(null)}
            templates={templates}
            allKnownDevices={allKnownDevices}
          />
        )}
        {editingTab && (
          <TabSettingsModal 
            tab={editingTab} 
            onSave={handleUpdateTabSettings} 
            onDelete={handleDeleteTab} 
            onClose={() => setEditingTab(null)}
          />
        )}
        {editingTemplate && (
          <TemplateEditorModal
              templateToEdit={editingTemplate === 'new' ? createNewBlankTemplate('sensor') : editingTemplate}
              onSave={handleSaveTemplate}
              onClose={() => setEditingTemplate(null)}
              allKnownDevices={allKnownDevices}
              colorScheme={currentColorScheme}
          />
        )}
        
        {historyModalEntityId && (
          <HistoryModal
            entityId={historyModalEntityId}
            onClose={() => setHistoryModalEntityId(null)}
            getHistory={getHistory}
            allKnownDevices={allKnownDevices}
            colorScheme={currentColorScheme}
          />
        )}

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            isOpen={!!contextMenu}
            onClose={handleCloseContextMenu}
          >
              {otherTabs.length > 0 && <div className="h-px bg-gray-300 dark:bg-gray-600/50 my-1" />}

              {otherTabs.length > 0 && (
                  <>
                      <div className="relative group/menu">
                          <div className="px-3 py-1.5 rounded-md cursor-default flex justify-between items-center">
                              Копировать в... <span className="text-xs ml-4">▶</span>
                          </div>
                          <div className="absolute left-full top-[-5px] z-10 hidden group-hover/menu:block bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-1 min-w-[150px]">
                              {otherTabs.map(tab => (
                                  <div key={tab.id} onClick={() => { handleDeviceAddToTab(contextMenu.deviceId, tab.id); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md cursor-pointer">{tab.name}</div>
                              ))}
                          </div>
                      </div>

                      <div className="relative group/menu">
                          <div className="px-3 py-1.5 rounded-md cursor-default flex justify-between items-center">
                              Переместить в... <span className="text-xs ml-4">▶</span>
                          </div>
                          <div className="absolute left-full top-[-5px] z-10 hidden group-hover/menu:block bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-1 min-w-[150px]">
                               {otherTabs.map(tab => (
                                  <div key={tab.id} onClick={() => { handleDeviceMoveToTab(contextMenu.deviceId, contextMenu.tabId, tab.id); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md cursor-pointer">{tab.name}</div>
                              ))}
                          </div>
                      </div>
                  </>
              )}

              <div className="h-px bg-gray-300 dark:bg-gray-600/50 my-1" />
              
              <div className="relative group/menu">
                  <div className="px-3 py-1.5 rounded-md cursor-default flex justify-between items-center">
                      Размер <span className="text-xs ml-4">▶</span>
                  </div>
                  <div className="absolute left-full top-[-5px] z-10 hidden group-hover/menu:block bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-1 min-w-[120px]">
                      {[
                          {w: 1, h: 1}, 
                          {w: 2, h: 2}, 
                          {w: 3, h: 3},
                          {w: 2, h: 3},
                          {w: 3, h: 2}
                      ].map(size => (
                          <div 
                              key={`${size.w}x${size.h}`} 
                              onClick={() => { 
                                  handleDeviceResizeOnTab(contextMenu.tabId, contextMenu.deviceId, size.w, size.h); 
                                  handleCloseContextMenu(); 
                              }} 
                              className="px-3 py-1.5 rounded-md cursor-pointer"
                          >
                              {`${size.w} x ${size.h}`}
                          </div>
                      ))}
                  </div>
              </div>

              <div className="h-px bg-gray-300 dark:bg-gray-600/50 my-1" />
              
              <div 
                onClick={() => { 
                  const deviceToEdit = allKnownDevices.get(contextMenu.deviceId);
                  if (deviceToEdit) setEditingDevice(deviceToEdit);
                  handleCloseContextMenu(); 
                }} 
                className="px-3 py-1.5 rounded-md cursor-pointer"
              >
                  Редактировать
              </div>

              {isTemplateable && currentTemplate && (
                <div 
                    onClick={() => { 
                        setEditingTemplate(currentTemplate);
                        handleCloseContextMenu(); 
                    }} 
                    className="px-3 py-1.5 rounded-md cursor-pointer"
                >
                    Редактировать шаблон
                </div>
              )}

               <div 
                  onClick={() => { handleDeviceRemoveFromTab(contextMenu.deviceId, contextMenu.tabId); handleCloseContextMenu(); }} 
                  className="px-3 py-1.5 rounded-md text-red-500 dark:text-red-400 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 cursor-pointer"
              >
                  Удалить с вкладки
              </div>

          </ContextMenu>
        )}

        {colorPickerMenu && (
            <ColorPickerContextMenu
                data={colorPickerMenu}
                onClose={() => setColorPickerMenu(null)}
            />
        )}

        {floatingCamera && haUrl && (
          <FloatingCameraWindow
            device={floatingCamera}
            onClose={() => setFloatingCamera(null)}
            haUrl={haUrl}
            signPath={signPath}
            getCameraStreamUrl={getCameraStreamUrl}
          />
        )}
      </Suspense>

    </div>
  );
};

export default App;