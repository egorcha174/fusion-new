
import React, { useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import DraggableDeviceCard from './DraggableDeviceCard';
import { Tab, Device, CardSize } from '../types';

interface TabContentProps {
  tab: Tab;
  devices: Device[];
  onDeviceOrderChange: (tabId: string, newDevices: Device[]) => void;
  onDeviceRemoveFromTab: (deviceId: string, tabId: string) => void;
  onDeviceToggle: (deviceId: string) => void;
  onTemperatureChange: (deviceId: string, change: number) => void;
  onBrightnessChange: (deviceId: string, brightness: number) => void;
  onPresetChange: (deviceId: string, preset: string) => void;
  isEditMode: boolean;
  onEditDevice: (device: Device) => void;
  onDeviceContextMenu: (event: React.MouseEvent, deviceId: string, tabId: string) => void;
  cardSize: CardSize;
}

const TabContent: React.FC<TabContentProps> = ({
  tab,
  devices,
  onDeviceOrderChange,
  onDeviceRemoveFromTab,
  onDeviceToggle,
  onTemperatureChange,
  onBrightnessChange,
  onPresetChange,
  isEditMode,
  onEditDevice,
  onDeviceContextMenu,
  cardSize,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const sortedDevices = useMemo(() => {
    const order = tab.orderedDeviceIds || [];
    if (order.length === 0) {
      return devices;
    }
    const deviceMap = new Map(devices.map(d => [d.id, d]));
    const ordered = order.map(id => deviceMap.get(id)).filter((d): d is Device => !!d);
    const unordered = devices.filter(d => !order.includes(d.id));
    return [...ordered, ...unordered];
  }, [devices, tab.orderedDeviceIds]);


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
  
  const getGridClasses = (size: CardSize): string => {
    switch (size) {
        case 'sm':
            return 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-3';
        case 'lg':
            return 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5';
        case 'md':
        default:
            return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4';
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
          <div className={getGridClasses(cardSize)}>
            {sortedDevices.map((device) => (
              <DraggableDeviceCard
                key={device.id}
                device={device}
                onToggle={() => onDeviceToggle(device.id)}
                onTemperatureChange={(change) => onTemperatureChange(device.id, change)}
                onBrightnessChange={(brightness) => onBrightnessChange(device.id, brightness)}
                onPresetChange={(preset) => onPresetChange(device.id, preset)}
                isEditMode={isEditMode}
                onEditDevice={onEditDevice}
                onRemoveFromTab={() => onDeviceRemoveFromTab(device.id, tab.id)}
                onContextMenu={(event) => onDeviceContextMenu(event, device.id, tab.id)}
                cardSize={cardSize}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
};

export default TabContent;