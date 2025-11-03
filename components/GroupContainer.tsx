import React, { useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import DraggableDeviceCard from './DraggableDeviceCard';
import { Group, Device, CardSize } from '../types';

interface GroupContainerProps {
  tabId: string;
  group: Group;
  devices: Device[];
  onDeviceOrderChange: (tabId: string, newDevices: Device[], groupId: string) => void;
  onDeviceRemoveFromTab: (deviceId: string, tabId: string) => void;
  onDeviceToggle: (deviceId: string) => void;
  onTemperatureChange: (deviceId: string, change: number) => void;
  onBrightnessChange: (deviceId: string, brightness: number) => void;
  onPresetChange: (deviceId: string, preset: string) => void;
  onCameraCardClick: (device: Device) => void;
  isEditMode: boolean;
  onEditDevice: (device: Device) => void;
  onDeviceContextMenu: (event: React.MouseEvent, deviceId: string, tabId: string) => void;
  onEditGroup: (group: Group) => void;
  onToggleCollapse: (groupId: string) => void;
  cardSize: CardSize;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
  debugLightOn: boolean;
}

const GroupContainer: React.FC<GroupContainerProps> = ({
  tabId,
  group,
  devices,
  onDeviceOrderChange,
  ...props
}) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const sortedDevices = useMemo(() => {
    const order = group.orderedDeviceIds || [];
    if (order.length === 0) {
      return devices;
    }
    const deviceMap = new Map(devices.map(d => [d.id, d]));
    const ordered = order.map(id => deviceMap.get(id)).filter((d): d is Device => !!d);
    const unordered = devices.filter(d => !order.includes(d.id));
    return [...ordered, ...unordered];
  }, [devices, group.orderedDeviceIds]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (props.isEditMode) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedDevices.findIndex((d) => d.id === active.id);
      const newIndex = sortedDevices.findIndex((d) => d.id === over.id);
      onDeviceOrderChange(tabId, arrayMove(sortedDevices, oldIndex, newIndex), group.id);
    }
  };

  const getGridClasses = (size: CardSize): string => {
    switch (size) {
      case 'sm': return 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-3';
      case 'lg': return 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5';
      case 'md': default: return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4';
    }
  };
  
  const isCollapsed = group.isCollapsed && !props.isEditMode;

  return (
    <div>
        <div className="flex items-center mb-4">
            <button onClick={() => props.onToggleCollapse(group.id)} className="p-1 -ml-1 text-gray-500 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            <h2 className="text-xl font-bold">{group.name}</h2>
            {props.isEditMode && (
                <button onClick={() => props.onEditGroup(group)} className="ml-2 p-1 text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                </button>
            )}
        </div>
      {!isCollapsed && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedDevices.map(d => d.id)} strategy={rectSortingStrategy}>
            <div className={getGridClasses(props.cardSize)}>
                {sortedDevices.map((device) => (
                <DraggableDeviceCard
                    key={device.id}
                    device={device}
                    onToggle={() => props.onDeviceToggle(device.id)}
                    onTemperatureChange={(change) => props.onTemperatureChange(device.id, change)}
                    onBrightnessChange={(brightness) => props.onBrightnessChange(device.id, brightness)}
                    onPresetChange={(preset) => props.onPresetChange(device.id, preset)}
                    onCameraCardClick={props.onCameraCardClick}
                    isEditMode={props.isEditMode}
                    onEditDevice={props.onEditDevice}
                    onRemoveFromTab={() => props.onDeviceRemoveFromTab(device.id, tabId)}
                    onContextMenu={(event) => props.onDeviceContextMenu(event, device.id, tabId)}
                    cardSize={props.cardSize}
                    haUrl={props.haUrl}
                    signPath={props.signPath}
                    getCameraStreamUrl={props.getCameraStreamUrl}
                    debugLightOn={props.debugLightOn}
                />
                ))}
            </div>
            </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default GroupContainer;