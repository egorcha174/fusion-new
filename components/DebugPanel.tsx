import React from 'react';
import { HassEntity, HassArea, HassDevice, HassEntityRegistryEntry } from '../types';

interface DebugPanelProps {
  entities: { [key: string]: HassEntity };
  areas: HassArea[];
  devices: HassDevice[];
  entityRegistry: HassEntityRegistryEntry[];
}

const DebugPanel: React.FC<DebugPanelProps> = ({ entities, areas, devices, entityRegistry }) => {
  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg max-w-md max-h-64 overflow-auto text-xs">
      <h3 className="font-bold mb-2">Debug Info:</h3>
      <div>Entities: {Object.keys(entities).length}</div>
      <div>Areas: {areas.length}</div>
      <div>Devices: {devices.length}</div>
      <div>Entity Registry: {entityRegistry.length}</div>
      
      {Object.keys(entities).length > 0 && (
        <div className="mt-2">
          <h4 className="font-semibold">Sample Entities:</h4>
          {Object.values(entities).slice(0, 3).map(entity => (
            <div key={entity.entity_id} className="truncate">
              {entity.entity_id}: {entity.state}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DebugPanel;