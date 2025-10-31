
import React, { useMemo } from 'react';
import Room from './components/Room';
import Settings from './components/Settings';
import useHomeAssistant from './hooks/useHomeAssistant';
import { mapEntitiesToRooms } from './utils/ha-data-mapper';

const App: React.FC = () => {
  const {
    connectionStatus,
    error,
    entities,
    areas,
    devices: haDevices,
    connect,
    callService,
  } = useHomeAssistant();

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

  if (connectionStatus !== 'connected') {
    return <Settings onConnect={connect} connectionStatus={connectionStatus} error={error} />;
  }

  return (
    <div className="min-h-screen text-gray-200 p-4 sm:p-6 md:p-8">
      <div className="container mx-auto">
        <div className="space-y-12">
          {rooms.map(room => (
            <Room 
              key={room.id} 
              room={room} 
              onDeviceToggle={handleDeviceToggle}
              onDeviceOrderChange={handleDeviceOrderChange}
              onTemperatureChange={handleTemperatureChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
