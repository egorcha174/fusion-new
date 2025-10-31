
import React, { useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import DraggableDeviceCard from './DraggableDeviceCard';
import { Tab, Device } from '../types';

interface TabContentProps {
  tab: Tab;
  devices: Device[];
  onDeviceOrderChange: (tabId: string, newDevices: Device[]) => void;
  onDeviceRemoveFromTab: (deviceId: string, tabId: string) => void;
  onDeviceToggle: (deviceId: string) => void;
  onTemperatureChange: (deviceId: string, change: number) => void;
  isEditMode: boolean;
  onEditDevice: (device: Device) => void;
  onDeviceContextMenu: (event: React.MouseEvent, deviceId: string, tabId: string) => void;
}

const TabContent: React.FC<TabContentProps> = ({
  tab,
  devices,
  onDeviceOrderChange,
  onDeviceRemoveFromTab,
  onDeviceToggle,
  onTemperatureChange,
  isEditMode,
  onEditDevice,
  onDeviceContextMenu
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const sortedDevices = useMemo(() => {
    const order = tab.deviceOrder[tab.id] || [];
    if (order.length === 0) {
      return devices;
    }
    const deviceMap = new Map(devices.map(d => [d.id, d]));
    const ordered = order.map(id => deviceMap.get(id)).filter((d): d is Device => !!d);
    const unordered = devices.filter(d => !order.includes(d.id));
    return [...ordered, ...unordered];
  }, [devices, tab.deviceOrder, tab.id]);


  const handleDragEnd = (event: DragEndEvent) => {
    if (isEditMode) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedDevices.findIndex((d) => d.id === active.id);
      const newIndex = sortedDevices.findIndex((d) => d.id === over.id);
      const newOrderedDevices = arrayMove(sortedDevices, oldIndex, newIndex);
      onDeviceOrderChange(tab.id, newOrderedDevices);
    }
  };

  if (devices.length === 0) {
      return (
          <div className="text-center py-20 text-gray-500">
              <h3 className="text-xl">Эта вкладка пуста</h3>
              <p className="mt-2">Перейдите в режим редактирования, чтобы добавить устройства.</p>
          </div>
      )
  }

  return (
    <section>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortedDevices.map(d => d.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {sortedDevices.map((device) => (
              <DraggableDeviceCard
                key={device.id}
                device={device}
                onToggle={() => onDeviceToggle(device.id)}
                onTemperatureChange={(change) => onTemperatureChange(device.id, change)}
                isEditMode={isEditMode}
                onEditDevice={onEditDevice}
                onRemoveFromTab={() => onDeviceRemoveFromTab(device.id, tab.id)}
                onContextMenu={(event) => onDeviceContextMenu(event, device.id, tab.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
};

export default TabContent;
