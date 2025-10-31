
import React, { useMemo, useState } from 'react';
import RoomComponent from './components/Room';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import useHomeAssistant from './hooks/useHomeAssistant';
import { mapEntitiesToRooms } from './utils/ha-data-mapper';

type Page = 'dashboard' | 'settings';

const App: React.FC = () => {
  const {
    connectionStatus,
    error,
    entities,
    areas,
    devices: haDevices,
    connect,
    disconnect,
    callService,
  } = useHomeAssistant();
  
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const rooms = useMemo(() => {
    if (connectionStatus !== 'connected') return [];
    return mapEntitiesToRooms(Object.values(entities), areas, haDevices);
  }, [connectionStatus, entities, areas, haDevices]);

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

  const handleDeviceOrderChange = () => {
      console.log("Device order change is visual only in this version.");
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
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!isSidebarCollapsed)}
        rooms={rooms}
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />
      <main
        className={`flex-1 transition-all duration-300 ease-in-out p-4 sm:p-6 md:p-8 ${
          isSidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
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
    </div>
  );
};

export default App;
