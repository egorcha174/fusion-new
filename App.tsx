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

const defaultSensorTemplate: CardTemplate = {
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
      styles: {},
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
    {
      id: 'status', // Not displayed for sensor, but keep for type completeness
      visible: false,
      position: { x: 0, y: 0},
      size: { width: 0, height: 0 },
      zIndex: 0,
      styles: {}
    }
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
  const [editingTemplateType, setEditingTemplateType] = useState<DeviceType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, deviceId: string, tabId: string } | null>(null);
  const [floatingCamera, setFloatingCamera] = useState<Device | null>(null);

  const [tabs, setTabs] = useLocalStorage<Tab[]>('ha-tabs', []);
  const [activeTabId, setActiveTabId] = useLocalStorage<string | null>('ha-active-tab', null);
  const [customizations, setCustomizations] = useLocalStorage<DeviceCustomizations>('ha-device-customizations', {});
  const [templates, setTemplates] = useLocalStorage<CardTemplates>('ha-card-templates', {
    sensor: defaultSensorTemplate,
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

  const sensorTemplate = useMemo(() => templates.sensor || defaultSensorTemplate, [templates]);

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
                const newLayoutItem = { deviceId, col: emptyCell.col, row: emptyCell.row };
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


  // --- Core Device Interaction ---
  const handleDeviceToggle = (deviceId: string) => {
    const entity = entities[deviceId];
    if (!entity) return;
    const service = entity.state === 'on' ? 'turn_off' : 'turn_on';
    const [domain] = entity.entity_id.split('.');
    callService(domain, service, { entity_id: entity.entity_id });
  };
  
  const handleTemperatureChange = (deviceId: string, change: number) => {
      const entity = entities[deviceId];
      if (!entity || entity.attributes.temperature === undefined) return;
      const newTemp = (entity.attributes.temperature || 0) + change;
      callService('climate', 'set_temperature', { entity_id: entity.entity_id, temperature: newTemp });
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
  const handleSaveCustomization = (deviceId: string, newValues: { name: string; type: DeviceType; icon: DeviceType; isHidden: boolean; }) => {
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

        // 3. Handle Icon
        // The "default" icon is whatever the type is set to.
        // We only store an icon override if it's different from the type.
        if (newValues.icon !== newValues.type) {
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

        // 5. Finalize
        // If the customization object is now empty, remove it entirely.
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

    handleSaveCustomization(deviceId, {
      name: currentCustomization.name || originalDevice.name,
      type: currentCustomization.type || originalDevice.type,
      icon: currentCustomization.icon || currentCustomization.type || originalDevice.type,
      isHidden: isHidden,
    });
  };

  const handleSaveSensorTemplate = (newTemplate: CardTemplate) => {
    setTemplates(prev => ({ ...prev, sensor: newTemplate }));
    setEditingTemplateType(null);
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

  const renderPage = () => {
    switch (currentPage) {
      case 'settings':
        return <div className="flex justify-center items-start pt-10"><Settings onConnect={connect} connectionStatus={connectionStatus} error={error} onDisconnect={disconnect} clockSettings={clockSettings} onClockSettingsChange={setClockSettings} openWeatherMapKey={openWeatherMapKey} onOpenWeatherMapKeyChange={setOpenWeatherMapKey} /></div>;
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
            onPresetChange={handlePresetChange}
            onCameraCardClick={handleCameraCardClick}
            isEditMode={isEditMode}
            onEditDevice={setEditingDevice}
            onDeviceContextMenu={handleDeviceContextMenu}
            haUrl={haUrl}
            signPath={signPath}
            getCameraStreamUrl={getCameraStreamUrl}
            sensorTemplate={sensorTemplate}
          />
        ) : (
          <div className="text-center text-gray-500">Выберите или создайте вкладку</div>
        );
    }
  };

  const otherTabs = tabs.filter(t => t.id !== contextMenu?.tabId);
  const contextMenuDevice = contextMenu ? allKnownDevices.get(contextMenu.deviceId) : null;

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
        <DeviceSettingsModal device={editingDevice} customization={customizations[editingDevice.id] || {}} onSave={handleSaveCustomization} onClose={() => setEditingDevice(null)} />
      )}
      {editingTab && (
        <TabSettingsModal 
          tab={editingTab} 
          onSave={handleUpdateTabSettings} 
          onDelete={handleDeleteTab} 
          onClose={() => setEditingTab(null)}
        />
      )}
      {editingTemplateType === DeviceType.Sensor && (
        <TemplateEditorModal
            template={sensorTemplate}
            onSave={handleSaveSensorTemplate}
            onClose={() => setEditingTemplateType(null)}
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

            {contextMenuDevice?.type === DeviceType.Sensor && (
              <div 
                  onClick={() => { 
                      setEditingTemplateType(DeviceType.Sensor);
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