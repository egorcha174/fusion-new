import React, { useMemo, useState, useEffect } from 'react';
import Settings from './components/Settings';
import LoadingSpinner from './components/LoadingSpinner';
import InfoPanel from './components/InfoPanel';
import DashboardHeader from './components/DashboardHeader';
import AllDevicesPage from './components/AllDevicesPage';
import TabContent from './components/TabContent';
import DeviceSettingsModal from './components/DeviceSettingsModal';
import TabSettingsModal from './components/TabSettingsModal';
import ContextMenu from './components/ContextMenu';
import useHomeAssistant from './hooks/useHomeAssistant';
import { useLocalStorage } from './hooks/useLocalStorage';
import { mapEntitiesToRooms } from './utils/ha-data-mapper';
import { Device, DeviceCustomization, DeviceCustomizations, Page, Tab, Room, ClockSettings, DeviceType, CardSize, CameraSettings } from './types';
import { nanoid } from 'nanoid'; // A small library for unique IDs

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
  } = useHomeAssistant();

  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editingTab, setEditingTab] = useState<Tab | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, deviceId: string, tabId: string } | null>(null);


  // --- New Tab-based State Management ---
  const [tabs, setTabs] = useLocalStorage<Tab[]>('ha-tabs', []);
  const [activeTabId, setActiveTabId] = useLocalStorage<string | null>('ha-active-tab', null);
  const [customizations, setCustomizations] = useLocalStorage<DeviceCustomizations>('ha-device-customizations', {});
  const [clockSettings, setClockSettings] = useLocalStorage<ClockSettings>('ha-clock-settings', {
    format: '24h',
    showSeconds: true,
    size: 'md',
  });
  const [cameraSettings, setCameraSettings] = useLocalStorage<CameraSettings>('ha-camera-settings', {
    selectedEntityId: null,
  });
  const [cardSize, setCardSize] = useLocalStorage<CardSize>('ha-card-size', 'md');
  const [sidebarWidth, setSidebarWidth] = useLocalStorage<number>('ha-sidebar-width', 320);
  const [haUrl] = useLocalStorage('ha-url', '');


  const isLg = useIsLg();


  // Ensure there's always at least one tab and an active tab is set
  useEffect(() => {
    if (connectionStatus === 'connected' && !isLoading) {
      if (tabs.length === 0) {
        const newTab: Tab = { id: nanoid(), name: 'Главная', deviceIds: [], orderedDeviceIds: [] };
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

  const weatherDevice = useMemo(() => {
    // Find the first available weather entity to display in the info panel
    return Array.from(allKnownDevices.values()).find((d: Device) => d.type === DeviceType.Weather);
  }, [allKnownDevices]);
  
  const allCameras = useMemo(() => {
    return Array.from(allKnownDevices.values()).filter((d: Device) => d.haDomain === 'camera');
  }, [allKnownDevices]);

  const filteredDevicesForTab = useMemo(() => {
    if (!activeTab) return [];
    
    const activeTabDevices = activeTab.deviceIds
      .map(id => allKnownDevices.get(id))
      .filter((d): d is Device => !!d);

    if (!searchTerm) return activeTabDevices;
    
    const lowercasedFilter = searchTerm.toLowerCase();
    return activeTabDevices.filter(device =>
        device.name.toLowerCase().includes(lowercasedFilter) ||
        device.id.toLowerCase().includes(lowercasedFilter)
    );
  }, [searchTerm, activeTab, allKnownDevices]);
  
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
    const newTab: Tab = { id: nanoid(), name: newTabName, deviceIds: [], orderedDeviceIds: [] };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleUpdateTab = (tabId: string, newName: string) => {
    setTabs(tabs.map(t => (t.id === tabId ? { ...t, name: newName } : t)));
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
      if (tab.id === tabId && !tab.deviceIds.includes(deviceId)) {
        return { ...tab, deviceIds: [...tab.deviceIds, deviceId] };
      }
      return tab;
    }));
  };

  const handleDeviceRemoveFromTab = (deviceId: string, tabId: string) => {
     setTabs(tabs.map(tab => {
        if (tab.id === tabId) {
            const newDeviceIds = tab.deviceIds.filter(id => id !== deviceId);
            const newOrderedDeviceIds = (tab.orderedDeviceIds || []).filter(id => id !== deviceId);
            return { ...tab, deviceIds: newDeviceIds, orderedDeviceIds: newOrderedDeviceIds };
        }
        return tab;
     }));
  };
  
  const handleDeviceMoveToTab = (deviceId: string, fromTabId: string, toTabId: string) => {
    if (fromTabId === toTabId) return;

    setTabs(currentTabs => currentTabs.map(tab => {
        // Add to the destination tab
        if (tab.id === toTabId) {
            if (tab.deviceIds.includes(deviceId)) {
                return tab; // Already exists, do nothing
            }
            return { ...tab, deviceIds: [...tab.deviceIds, deviceId] };
        }
        // Remove from the source tab
        if (tab.id === fromTabId) {
            const newDeviceIds = tab.deviceIds.filter(id => id !== deviceId);
            const newOrderedDeviceIds = (tab.orderedDeviceIds || []).filter(id => id !== deviceId);
            return { ...tab, deviceIds: newDeviceIds, orderedDeviceIds: newOrderedDeviceIds };
        }
        return tab;
    }));
};

  const handleDeviceOrderChangeOnTab = (tabId: string, orderedDevices: Device[]) => {
      setTabs(tabs.map(tab => {
          if (tab.id === tabId) {
              return { ...tab, orderedDeviceIds: orderedDevices.map(d => d.id) };
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

  const handleBrightnessChange = (deviceId: string, brightness: number) => {
    const entity = entities[deviceId];
    if (!entity) return;
    callService('light', 'turn_on', {
      entity_id: entity.entity_id,
      brightness_pct: brightness,
    });
  };

  const handlePresetChange = (deviceId: string, preset: string) => {
    callService('climate', 'set_preset_mode', { entity_id: deviceId, preset_mode: preset });
  };


  // --- Customization ---
  const handleSaveCustomization = (deviceId: string, newValues: { name: string; type: DeviceType; icon: DeviceType; isHidden: boolean }) => {
    const originalDevice = allKnownDevices.get(deviceId);
    if (!originalDevice) return;

    // Start with a clean slate for this device's customization.
    const newCustomization: DeviceCustomization = {};

    // 1. Save name if it differs from the original HA name.
    if (newValues.name !== originalDevice.name) {
        newCustomization.name = newValues.name;
    }

    // 2. Save type if it differs from the original auto-detected type.
    if (newValues.type !== originalDevice.type) {
        newCustomization.type = newValues.type;
    }

    // 3. Save icon ONLY if it's different from the selected type.
    //    If icon === type, it means "use the default icon for this type".
    if (newValues.icon !== newValues.type) {
        newCustomization.icon = newValues.icon;
    }

    // 4. Save visibility if it's set to hidden.
    if (newValues.isHidden) {
        newCustomization.isHidden = true;
    }
    
    setCustomizations(prev => {
        const newCustomizations = { ...prev };
        // If the resulting customization object is empty, it means all settings
        // are default. We should remove the entry for this device to keep storage clean.
        if (Object.keys(newCustomization).length === 0) {
            delete newCustomizations[deviceId];
        } else {
            // Otherwise, save the new, complete customization object.
            newCustomizations[deviceId] = newCustomization;
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
      isHidden: isHidden
    });
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
        return <div className="flex justify-center items-start pt-10"><Settings onConnect={connect} connectionStatus={connectionStatus} error={error} onDisconnect={disconnect} clockSettings={clockSettings} onClockSettingsChange={setClockSettings} cardSize={cardSize} onCardSizeChange={setCardSize} /></div>;
      case 'all-devices':
        return <AllDevicesPage rooms={filteredRoomsForDevicePage} customizations={customizations} onToggleVisibility={handleToggleVisibility} tabs={tabs} onDeviceAddToTab={handleDeviceAddToTab} />;
      case 'dashboard':
      default:
        return activeTab ? (
          <TabContent
            key={activeTab.id}
            tab={activeTab}
            devices={filteredDevicesForTab}
            onDeviceOrderChange={handleDeviceOrderChangeOnTab}
            onDeviceRemoveFromTab={handleDeviceRemoveFromTab}
            onDeviceToggle={handleDeviceToggle}
            onTemperatureChange={handleTemperatureChange}
            onBrightnessChange={handleBrightnessChange}
            onPresetChange={handlePresetChange}
            isEditMode={isEditMode}
            onEditDevice={setEditingDevice}
            onDeviceContextMenu={handleDeviceContextMenu}
            cardSize={cardSize}
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
        weatherDevice={weatherDevice} 
        sidebarWidth={sidebarWidth} 
        setSidebarWidth={setSidebarWidth}
        cameras={allCameras}
        cameraSettings={cameraSettings}
        onCameraSettingsChange={setCameraSettings}
        haUrl={haUrl}
        signPath={signPath}
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
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-hidden">
          <div className="container mx-auto">
            <div key={currentPage + (activeTab?.id || '')} className="fade-in">
              {renderPage()}
            </div>
          </div>
        </main>
      </div>
      
      {editingDevice && (
        <DeviceSettingsModal device={editingDevice} customization={customizations[editingDevice.id] || {}} onSave={handleSaveCustomization} onClose={() => setEditingDevice(null)} />
      )}
      {editingTab && (
        <TabSettingsModal tab={editingTab} onSave={handleUpdateTab} onDelete={handleDeleteTab} onClose={() => setEditingTab(null)} />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isOpen={!!contextMenu}
          onClose={handleCloseContextMenu}
        >
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
                    <div className="h-px bg-gray-600/50 my-1" />
                </>
            )}
             <div onClick={() => { handleDeviceRemoveFromTab(contextMenu.deviceId, contextMenu.tabId); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer">
                Скрыть на этой вкладке
            </div>

        </ContextMenu>
      )}

    </div>
  );
};

export default App;