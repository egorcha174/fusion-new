
import React, { useMemo, useState } from 'react';
import RoomComponent from './components/Room';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import DeviceSettingsModal from './components/DeviceSettingsModal';
import useHomeAssistant from './hooks/useHomeAssistant';
import { useLocalStorage } from './hooks/useLocalStorage';
import { mapEntitiesToRooms } from './utils/ha-data-mapper';
import { Device, DeviceCustomization, DeviceCustomizations, Room } from './types';

type Page = 'dashboard' | 'settings';
type DeviceOrderMap = Record<string, string[]>; // { [roomId]: deviceId[] }

const App: React.FC = () => {
  const {
    connectionStatus,
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
  const [deviceOrder, setDeviceOrder] = useLocalStorage<DeviceOrderMap>('ha-device-order', {});
  const [customizations, setCustomizations] = useLocalStorage<DeviceCustomizations>('ha-device-customizations', {});
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  const rooms = useMemo(() => {
    if (connectionStatus !== 'connected') return [];
    const mappedRooms = mapEntitiesToRooms(
        Object.values(entities), 
        areas, 
        haDevices, 
        entityRegistry, 
        customizations
    );

    // Apply the custom sort order
    return mappedRooms.map(room => {
      const order = deviceOrder[room.id];
      if (!order) {
        return room; // No custom order for this room
      }

      const deviceMap = new Map(room.devices.map(d => [d.id, d]));
      const sortedDevices = order
        .map(deviceId => deviceMap.get(deviceId))
        .filter((d): d is Device => !!d);
      
      const orderedDeviceIds = new Set(order);
      const newDevices = room.devices.filter(d => !orderedDeviceIds.has(d.id));

      return { ...room, devices: [...sortedDevices, ...newDevices] };
    });
  }, [connectionStatus, entities, areas, haDevices, entityRegistry, deviceOrder, customizations]);

  const handleDeviceToggle = (roomId: string, deviceId: string) => {
    const entity = Object.values(entities).find(e => e.entity_id === deviceId);
    if (!entity) return;

    const service = entity.state === 'on' ? 'turn_off' : 'turn_on';
    const [domain] = entity.entity_id.split('.');
    
    callService(domain, service, { entity_id: entity.entity_id });
  };

  const handleTemperatureChange = (roomId: string, deviceId: string, change: number) => {
    const entity = Object.values(entities).find(e => e.entity_id === deviceId);
    if (!entity || entity.attributes.temperature === undefined) return;
    
    const currentTemp = entity.attributes.temperature;
    const newTemp = currentTemp + change;

    callService('climate', 'set_temperature', {
      entity_id: entity.entity_id,
      temperature: newTemp,
    });
  };

  const handleDeviceOrderChange = (roomId: string, newDevices: Device[]) => {
      setDeviceOrder(prevOrder => ({
        ...prevOrder,
        [roomId]: newDevices.map(d => d.id),
    }));
  };
  
  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
  };

  const handleSaveCustomization = (deviceId: string, customization: DeviceCustomization) => {
    setCustomizations(prev => {
        const newCustomizations = { ...prev };
        const current = newCustomizations[deviceId] || {};
        const updated = { ...current, ...customization };

        // Clean up undefined keys and empty objects
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

  const handleNavigate = (page: Page, sectionId?: string) => {
    setCurrentPage(page);
    if (page === 'dashboard' && sectionId) {
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        element?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
    }
  };

  if (connectionStatus !== 'connected') {
    return <Settings onConnect={connect} connectionStatus={connectionStatus} error={error} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-200">
      <Sidebar
        rooms={rooms}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
      />
      <main className="flex-1 transition-all duration-300 ease-in-out p-4 sm:p-6 md:p-8 ml-64">
        {currentPage === 'dashboard' && (
          <div className="container mx-auto">
            <div className="space-y-12">
              {rooms.map(room => (
                <RoomComponent
                  key={room.id}
                  room={room}
                  onDeviceToggle={handleDeviceToggle}
                  onDeviceOrderChange={handleDeviceOrderChange}
                  onTemperatureChange={handleTemperatureChange}
                  isEditMode={isEditMode}
                  onEditDevice={handleEditDevice}
                />
              ))}
            </div>
          </div>
        )}
        {currentPage === 'settings' && (
           <div className="flex justify-center items-start pt-10">
              <Settings onConnect={connect} connectionStatus={connectionStatus} error={error} onDisconnect={disconnect} />
           </div>
        )}
      </main>
      {editingDevice && (
        <DeviceSettingsModal
          device={editingDevice}
          customization={customizations[editingDevice.id] || {}}
          onSave={handleSaveCustomization}
          onClose={() => setEditingDevice(null)}
        />
      )}
    </div>
  );
};

export default App;
