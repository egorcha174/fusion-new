



import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Settings from './components/Settings';
import LoadingSpinner from './components/LoadingSpinner';
import InfoPanel from './components/InfoPanel';
import DashboardHeader from './components/DashboardHeader';
import AllDevicesPage from './components/AllDevicesPage';
import TabContent from './components/TabContent';
import DeviceSettingsModal from './components/DeviceSettingsModal';
import TabSettingsModal from './components/TabSettingsModal';
import ContextMenu from './components/ContextMenu';
import FloatingCameraWindow from './components/FloatingCameraWindow';
import TemplateEditorModal from './components/TemplateEditorModal';
import useHomeAssistant from './hooks/useHomeAssistant';
import { useLocalStorage } from './hooks/useLocalStorage';
import { mapEntitiesToRooms } from './utils/ha-data-mapper';
import { Device, DeviceCustomization, DeviceCustomizations, Page, Tab, Room, ClockSettings, DeviceType, CameraSettings, GridLayoutItem, CardTemplates, CardTemplate } from './types';
import { nanoid } from 'nanoid';
import { getIconNameForDeviceType } from './components/DeviceIcon';

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
      styles: {},
    },
    { id: 'status', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
    { id: 'slider', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
    { id: 'temperature', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
    { id: 'target-temperature', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
    { id: 'hvac-modes', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
    { id: 'button-plus', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
    { id: 'button-minus', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
  ],
};

const defaultLightTemplate: CardTemplate = {
    id: DEFAULT_LIGHT_TEMPLATE_ID,
    name: 'Стандартный светильник',
    deviceType: 'light',
    styles: {
      backgroundColor: 'rgb(55 65 81 / 0.8)', // bg-gray-600/80 for off state
      onBackgroundColor: 'rgb(229 231 235 / 1)', // bg-gray-200/100
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
      // Hidden elements for type completeness
      { id: 'value', visible: false, position: {x:0, y:0}, size: {width:0, height:0}, zIndex: 0, styles: {} },
      { id: 'unit', visible: false, position: {x:0, y:0}, size: {width:0, height:0}, zIndex: 0, styles: {} },
      { id: 'chart', visible: false, position: {x:0, y:0}, size: {width:0, height:0}, zIndex: 0, styles: {} },
      { id: 'temperature', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
      { id: 'target-temperature', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
      { id: 'hvac-modes', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
      { id: 'button-plus', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
      { id: 'button-minus', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
    ],
};

const defaultSwitchTemplate: CardTemplate = {
    id: DEFAULT_SWITCH_TEMPLATE_ID,
    name: 'Стандартный переключатель',
    deviceType: 'switch',
    styles: {
      backgroundColor: 'rgb(55 65 81 / 0.8)', // bg-gray-600/80 for off state
      onBackgroundColor: 'rgb(229 231 235 / 1)', // bg-gray-200/100
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
      // Hidden elements for type completeness
      { id: 'slider', visible: false, position: {x:0, y:0}, size: {width:0, height:0}, zIndex: 0, styles: {} },
      { id: 'value', visible: false, position: {x:0, y:0}, size: {width:0, height:0}, zIndex: 0, styles: {} },
      { id: 'unit', visible: false, position: {x:0, y:0}, size: {width:0, height:0}, zIndex: 0, styles: {} },
      { id: 'chart', visible: false, position: {x:0, y:0}, size: {width:0, height:0}, zIndex: 0, styles: {} },
      { id: 'temperature', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
      { id: 'target-temperature', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
      { id: 'hvac-modes', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
      { id: 'button-plus', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
      { id: 'button-minus', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
    ],
};

const defaultClimateTemplate: CardTemplate = {
  id: DEFAULT_CLIMATE_TEMPLATE_ID,
  name: 'Стандартный климат',
  deviceType: 'climate',
  styles: {
    backgroundColor: 'rgb(23 23 23 / 0.5)', // bg-neutral-900/50
  },
  elements: [
    { // Center dial
      id: 'target-temperature',
      visible: true,
      position: { x: 25, y: 0 },
      size: { width: 50, height: 100 },
      zIndex: 1,
      styles: {},
    },
    { // "76°" (large)
      id: 'temperature',
      visible: true,
      position: { x: 2, y: 20 },
      size: { width: 23, height: 15 },
      zIndex: 2,
      styles: { textAlign: 'left', fontSize: 40 },
    },
    { // "Living Room"
      id: 'name',
      visible: true,
      position: { x: 2, y: 35 },
      size: { width: 23, height: 12 },
      zIndex: 2,
      styles: { textAlign: 'left', fontSize: 22 },
    },
    { // "Current 76° · Humidity 54%"
      id: 'status',
      visible: true,
      position: { x: 2, y: 48 },
      size: { width: 23, height: 10 },
      zIndex: 2,
      styles: { textAlign: 'left', fontSize: 14 },
    },
    { // Right-side modes
      id: 'hvac-modes',
      visible: true,
      position: { x: 77, y: 20 },
      size: { width: 21, height: 60 },
      zIndex: 2,
      styles: { fontSize: 18 },
    },
    // Hidden elements for type completeness
    { id: 'value', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
    { id: 'unit', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
    { id: 'chart', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
    { id: 'slider', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
    { id: 'icon', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
    { id: 'button-plus', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
    { id: 'button-minus', visible: false, position: { x: 0, y: 0}, size: { width: 0, height: 0 }, zIndex: 0, styles: {} },
  ],
};


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
  } = useHomeAssistant();

  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editingTab, setEditingTab] = useState<Tab | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<CardTemplate | 'new' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, deviceId: string, tabId: string } | null>(null);
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
  const [haUrl] = useLocalStorage('ha-url', '');
  const [openWeatherMapKey, setOpenWeatherMapKey] = useLocalStorage<string>('ha-openweathermap-key', '');

  const brightnessTimeoutRef = useRef<number | null>(null);
  const isLg = useIsLg();

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


  // --- Context Menu Handlers ---
  const handleDeviceContextMenu = (event: React.MouseEvent, deviceId: string, tabId: string) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, deviceId, tabId });
  };
  
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };


  // --- Tab Management Handlers ---
  const handleAddTab = () => {
    const newTabName = `Вкладка ${tabs.length + 1}`;
    const newTab: Tab = { id: nanoid(), name: newTabName, layout: [], gridSettings: { cols: 8, rows: 5 } };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

    const handleUpdateTabSettings = (tabId: string, settings: { name: string; gridSettings: { cols: number, rows: number } }) => {
        setTabs(tabs.map(tab => (tab.id === tabId) ? { ...tab, ...settings } : tab));
        setEditingTab(null);
    };

  const handleDeleteTab = (tabId: string) => {
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs.length > 0 ? newTabs[0].id : null);
    }
    setEditingTab(null);
  };

  const handleTabOrderChange = (newTabs: Tab[]) => {
    setTabs(newTabs);
  };


  // --- Device Management on Tabs ---
  const handleDeviceAddToTab = (deviceId: string, tabId: string) => {
    setTabs(tabs.map(tab => {
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
  };

  const handleDeviceRemoveFromTab = (deviceId: string, tabId: string) => {
     setTabs(tabs.map(tab => {
        if (tab.id === tabId) {
            return { 
                ...tab, 
                layout: tab.layout.filter(item => item.deviceId !== deviceId)
            };
        }
        return tab;
     }));
  };
  
  const handleDeviceMoveToTab = (deviceId: string, fromTabId: string, toTabId: string) => {
    if (fromTabId === toTabId) return;
    handleDeviceAddToTab(deviceId, toTabId);
    handleDeviceRemoveFromTab(deviceId, fromTabId);
};

  const handleDeviceLayoutChangeOnTab = (tabId: string, newLayout: GridLayoutItem[]) => {
      setTabs(tabs.map(tab => {
          if (tab.id === tabId) {
              return { ...tab, layout: newLayout };
          }
          return tab;
      }));
  };
  
  const handleDeviceResizeOnTab = (tabId: string, deviceId: string, newWidth: number, newHeight: number) => {
    setTabs(tabs => tabs.map(tab => {
      if (tab.id !== tabId) return tab;

      const currentLayout = tab.layout;
      const deviceItem = currentLayout.find(item => item.deviceId === deviceId);
      if (!deviceItem) return tab;

      const { col, row } = deviceItem;

      // Boundary check
      if (col + newWidth > tab.gridSettings.cols || row + newHeight > tab.gridSettings.rows) {
          console.warn('Cannot resize: Exceeds grid boundaries.');
          // You might want to show a user-facing error here
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
            // You might want to show a user-facing error here
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
  };



  // --- Core Device Interaction ---
  const handleDeviceToggle = (deviceId: string) => {
    const entity = entities[deviceId];
    if (!entity) return;
    const service = entity.state === 'on' ? 'turn_off' : 'turn_on';
    const [domain] = entity.entity_id.split('.');
    callService(domain, service, { entity_id: entity.entity_id });
  };
  
  const handleTemperatureChange = (deviceId: string, temperature: number, isDelta: boolean = false) => {
      const entity = entities[deviceId];
      if (!entity) return;
      
      const newTemp = isDelta 
        ? (entity.attributes.temperature || 0) + temperature 
        : temperature;
      
      callService('climate', 'set_temperature', { entity_id: entity.entity_id, temperature: newTemp });
  };

  const handleHvacModeChange = (deviceId: string, mode: string) => {
    const entity = entities[deviceId];
    if (!entity) return;
    callService('climate', 'set_hvac_mode', { entity_id: entity.entity_id, hvac_mode: mode });
  };

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

  const handlePresetChange = (deviceId: string, preset: string) => {
    callService('climate', 'set_preset_mode', { entity_id: deviceId, preset_mode: preset });
  };

  const handleCameraCardClick = (device: Device) => {
    setFloatingCamera(device);
  };


  // --- Customization ---
  const handleSaveCustomization = (deviceId: string, newValues: { name: string; type: DeviceType; icon: string; isHidden: boolean; templateId?: string; iconAnimation?: 'none' | 'spin' | 'pulse' | 'glow'; }) => {
    const originalDevice = allKnownDevices.get(deviceId);
    if (!originalDevice) return;
    
    setCustomizations(prev => {
        const newCustomizations = { ...prev };
        const currentCustomization: Partial<DeviceCustomization> = { ...newCustomizations[deviceId] };

        // 1. Handle Name
        if (newValues.name && newValues.name !== originalDevice.name) {
            currentCustomization.name = newValues.name;
        } else {
            delete currentCustomization.name;
        }

        // 2. Handle Type
        if (newValues.type !== originalDevice.type) {
            currentCustomization.type = newValues.type;
        } else {
            delete currentCustomization.type;
        }

        // 3. Handle Icon (string)
        const defaultIconForNewType = getIconNameForDeviceType(newValues.type, false);
        if (newValues.icon !== defaultIconForNewType) {
            currentCustomization.icon = newValues.icon;
        } else {
            delete currentCustomization.icon;
        }

        // 4. Handle isHidden
        if (newValues.isHidden) {
            currentCustomization.isHidden = true;
        } else {
            delete currentCustomization.isHidden;
        }

        // 5. Handle templateId
        if (newValues.templateId) {
            currentCustomization.templateId = newValues.templateId;
        } else {
            delete currentCustomization.templateId;
        }
        
        // 6. Handle iconAnimation
        if (newValues.iconAnimation && newValues.iconAnimation !== 'none') {
            currentCustomization.iconAnimation = newValues.iconAnimation;
        } else {
            delete currentCustomization.iconAnimation;
        }


        // 7. Finalize
        if (Object.keys(currentCustomization).length === 0) {
            delete newCustomizations[deviceId];
        } else {
            newCustomizations[deviceId] = currentCustomization;
        }
        
        return newCustomizations;
    });
    setEditingDevice(null);
  };
  
   const handleToggleVisibility = (deviceId: string, isHidden: boolean) => {
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
    });
  };

  // --- Template Management ---
  const handleSaveTemplate = (template: CardTemplate) => {
    setTemplates(prev => ({
        ...prev,
        [template.id]: template,
    }));
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    // Prevent deleting the last template
    if (Object.keys(templates).length <= 1) {
        alert("Нельзя удалить последний шаблон.");
        return;
    }

    setTemplates(prev => {
        const newTemplates = { ...prev };
        delete newTemplates[templateId];
        return newTemplates;
    });

    // Also remove this templateId from any device that was using it
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
  };

  const createNewBlankTemplate = (deviceType: 'sensor' | 'light' | 'switch' | 'climate'): CardTemplate => {
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
  };


  // --- RENDER LOGIC ---

  if (connectionStatus !== 'connected') {
    return <Settings onConnect={connect} connectionStatus={connectionStatus} error={error} />;
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
            isEditMode={isEditMode}
            onEditDevice={setEditingDevice}
            onDeviceContextMenu={handleDeviceContextMenu}
            haUrl={haUrl}
            signPath={signPath}
            getCameraStreamUrl={getCameraStreamUrl}
            templates={templates}
            customizations={customizations}
          />
        ) : (
          <div className="text-center text-gray-500">Выберите или создайте вкладку</div>
        );
    }
  };

  const otherTabs = tabs.filter(t => t.id !== contextMenu?.tabId);

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-200">
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
      />
      <div className="flex flex-col flex-1" style={{ marginLeft: isLg ? `${sidebarWidth}px` : '0px' }}>
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
        />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto h-full">
            <div key={currentPage + (activeTab?.id || '')} className="fade-in h-full">
              {renderPage()}
            </div>
          </div>
        </main>
      </div>
      
      {editingDevice && (
        <DeviceSettingsModal 
          device={editingDevice} 
          customization={customizations[editingDevice.id] || {}} 
          onSave={handleSaveCustomization} 
          onClose={() => setEditingDevice(null)}
          templates={templates}
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
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isOpen={!!contextMenu}
          onClose={handleCloseContextMenu}
        >
            <div 
              onClick={() => { 
                const deviceToEdit = allKnownDevices.get(contextMenu.deviceId);
                if (deviceToEdit) setEditingDevice(deviceToEdit);
                handleCloseContextMenu(); 
              }} 
              className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer"
            >
                Редактировать
            </div>

            {isTemplateable && currentTemplate && (
              <div 
                  onClick={() => { 
                      setEditingTemplate(currentTemplate);
                      handleCloseContextMenu(); 
                  }} 
                  className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer"
              >
                  Редактировать шаблон
              </div>
            )}


            {otherTabs.length > 0 && <div className="h-px bg-gray-600/50 my-1" />}

            {otherTabs.length > 0 && (
                <>
                    <div className="relative group/menu">
                        <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-default flex justify-between items-center">
                            Копировать в... <span className="text-xs ml-4">▶</span>
                        </div>
                        <div className="absolute left-full top-[-5px] z-10 hidden group-hover/menu:block bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/10 p-1 min-w-[150px]">
                            {otherTabs.map(tab => (
                                <div key={tab.id} onClick={() => { handleDeviceAddToTab(contextMenu.deviceId, tab.id); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer">{tab.name}</div>
                            ))}
                        </div>
                    </div>

                    <div className="relative group/menu">
                        <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-default flex justify-between items-center">
                            Переместить в... <span className="text-xs ml-4">▶</span>
                        </div>
                        <div className="absolute left-full top-[-5px] z-10 hidden group-hover/menu:block bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/10 p-1 min-w-[150px]">
                             {otherTabs.map(tab => (
                                <div key={tab.id} onClick={() => { handleDeviceMoveToTab(contextMenu.deviceId, contextMenu.tabId, tab.id); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer">{tab.name}</div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <div className="h-px bg-gray-600/50 my-1" />
            
            <div className="relative group/menu">
                <div className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-default flex justify-between items-center">
                    Размер <span className="text-xs ml-4">▶</span>
                </div>
                <div className="absolute left-full top-[-5px] z-10 hidden group-hover/menu:block bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/10 p-1 min-w-[120px]">
                    {[
                        {w: 1, h: 1}, {w: 2, h: 1}, {w: 1, h: 2},
                        {w: 2, h: 2}, 
                        {w: 3, h: 2}, {w: 2, h: 3},
                        {w: 3, h: 3}
                    ].map(size => (
                        <div 
                            key={`${size.w}x${size.h}`} 
                            onClick={() => { 
                                handleDeviceResizeOnTab(contextMenu.tabId, contextMenu.deviceId, size.w, size.h); 
                                handleCloseContextMenu(); 
                            }} 
                            className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer"
                        >
                            {`${size.w} x ${size.h}`}
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-px bg-gray-600/50 my-1" />

             <div 
                onClick={() => { handleDeviceRemoveFromTab(contextMenu.deviceId, contextMenu.tabId); handleCloseContextMenu(); }} 
                className="px-3 py-1.5 rounded-md text-red-400 hover:bg-red-500/20 hover:text-red-300 cursor-pointer"
            >
                Удалить с вкладки
            </div>

        </ContextMenu>
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

    </div>
  );
};

export default App;