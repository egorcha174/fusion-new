
import React, { useMemo, useState, useEffect } from 'react';
import Settings from './components/Settings';
import LoadingSpinner from './components/LoadingSpinner';
import InfoPanel from './components/InfoPanel';
import DashboardHeader from './components/DashboardHeader';
import AllDevicesPage from './components/AllDevicesPage';
import TabContent from './components/TabContent';
import DeviceSettingsModal from './components/DeviceSettingsModal';
import TabSettingsModal from './components/TabSettingsModal';
import useHomeAssistant from './hooks/useHomeAssistant';
import { useLocalStorage } from './hooks/useLocalStorage';
import { mapEntitiesToRooms } from './utils/ha-data-mapper';
import { Device, DeviceCustomization, DeviceCustomizations, Page, Tab, Room } from './types';
import { nanoid } from 'nanoid'; // A small library for unique IDs

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
  } = useHomeAssistant();

  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editingTab, setEditingTab] = useState<Tab | null>(null);

  // --- New Tab-based State Management ---
  const [tabs, setTabs] = useLocalStorage<Tab[]>('ha-tabs', []);
  const [activeTabId, setActiveTabId] = useLocalStorage<string | null>('ha-active-tab', null);
  const [customizations, setCustomizations] = useLocalStorage<DeviceCustomizations>('ha-device-customizations', {});

  // Ensure there's always at least one tab and an active tab is set
  useEffect(() => {
    if (connectionStatus === 'connected' && !isLoading) {
      if (tabs.length === 0) {
        const newTab: Tab = { id: nanoid(), name: 'Главная', deviceIds: [], deviceOrder: {} };
        setTabs([newTab]);
        setActiveTabId(newTab.id);
      } else if (!activeTabId || !tabs.some(t => t.id === activeTabId)) {
        setActiveTabId(tabs[0].id);
      }
    }
  }, [tabs, setTabs, activeTabId, setActiveTabId, connectionStatus, isLoading]);

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


  // --- Tab Management Handlers ---
  const handleAddTab = () => {
    const newTabName = `Вкладка ${tabs.length + 1}`;
    const newTab: Tab = { id: nanoid(), name: newTabName, deviceIds: [], deviceOrder: {} };
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
            const newDeviceOrder = { ...tab.deviceOrder };
            if (newDeviceOrder[tab.id]) {
              newDeviceOrder[tab.id] = newDeviceOrder[tab.id].filter(id => id !== deviceId);
            }
            return { ...tab, deviceIds: newDeviceIds, deviceOrder: newDeviceOrder };
        }
        return tab;
     }));
  };
  
  const handleDeviceOrderChangeOnTab = (tabId: string, orderedDevices: Device[]) => {
      setTabs(tabs.map(tab => {
          if (tab.id === tabId) {
              const newOrder = { ...tab.deviceOrder, [tabId]: orderedDevices.map(d => d.id) };
              return { ...tab, deviceOrder: newOrder };
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


  // --- Customization ---
  const handleSaveCustomization = (deviceId: string, customization: DeviceCustomization) => {
    setCustomizations(prev => {
      const newCustomizations = { ...prev };
      const current = newCustomizations[deviceId] || {};
      const updated = { ...current, ...customization };
      // Clean up undefined properties
      Object.keys(updated).forEach(key => {
        if (updated[key as keyof DeviceCustomization] === undefined) {
          delete updated[key as keyof DeviceCustomization];
        }
      });
      if (Object.keys(updated).length === 0) {
        delete newCustomizations[deviceId];
      } else {
        newCustomizations[deviceId] = updated;
      }
      return newCustomizations;
    });
    setEditingDevice(null);
  };
  
   const handleToggleVisibility = (deviceId: string, isHidden: boolean) => {
    handleSaveCustomization(deviceId, { isHidden });
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

  const activeTab = tabs.find(t => t.id === activeTabId);

  const renderPage = () => {
    switch (currentPage) {
      case 'settings':
        return <div className="flex justify-center items-start pt-10"><Settings onConnect={connect} connectionStatus={connectionStatus} error={error} onDisconnect={disconnect} /></div>;
      case 'all-devices':
        return <AllDevicesPage rooms={allRoomsForDevicePage} customizations={customizations} onToggleVisibility={handleToggleVisibility} tabs={tabs} onDeviceAddToTab={handleDeviceAddToTab} />;
      case 'dashboard':
      default:
        return activeTab ? (
          <TabContent
            key={activeTab.id}
            tab={activeTab}
            devices={activeTab.deviceIds.map(id => allKnownDevices.get(id)).filter((d): d is Device => !!d)}
            onDeviceOrderChange={handleDeviceOrderChangeOnTab}
            onDeviceRemoveFromTab={handleDeviceRemoveFromTab}
            onDeviceToggle={handleDeviceToggle}
            onTemperatureChange={handleTemperatureChange}
            isEditMode={isEditMode}
            onEditDevice={setEditingDevice}
          />
        ) : (
          <div className="text-center text-gray-500">Выберите или создайте вкладку</div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-200">
      <InfoPanel />
      <div className="flex flex-col flex-1 lg:ml-80">
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
        />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="container mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
      
      {editingDevice && (
        <DeviceSettingsModal device={editingDevice} customization={customizations[editingDevice.id] || {}} onSave={handleSaveCustomization} onClose={() => setEditingDevice(null)} />
      )}
      {editingTab && (
        <TabSettingsModal tab={editingTab} onSave={handleUpdateTab} onDelete={handleDeleteTab} onClose={() => setEditingTab(null)} />
      )}
    </div>
  );
};

export default App;
