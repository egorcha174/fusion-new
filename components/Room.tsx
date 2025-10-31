
import React from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import DraggableDeviceCard from './DraggableDeviceCard';
import { Room as RoomType, Device } from '../types';

interface RoomProps {
  room: RoomType;
  onDeviceToggle: (roomId: string, deviceId: string) => void;
  onDeviceOrderChange: (roomId: string, newDevices: Device[]) => void;
  onTemperatureChange: (roomId: string, deviceId: string, change: number) => void;
  isEditMode: boolean;
  onEditDevice: (device: Device) => void;
}

const Room: React.FC<RoomProps> = ({ room, onDeviceToggle, onDeviceOrderChange, onTemperatureChange, isEditMode, onEditDevice }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (isEditMode) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = room.devices.findIndex((d) => d.id === active.id);
      const newIndex = room.devices.findIndex((d) => d.id === over.id);
      const newDevices = arrayMove(room.devices, oldIndex, newIndex);
      onDeviceOrderChange(room.id, newDevices);
    }
  };

  return (
    <section id={room.id}>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-4">{room.name}</h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={room.devices.map(d => d.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-4">
            {room.devices.map((device) => (
              <DraggableDeviceCard
                key={device.id}
                device={device}
                onToggle={() => onDeviceToggle(room.id, device.id)}
                onTemperatureChange={(change) => onTemperatureChange(room.id, device.id, change)}
                isEditMode={isEditMode}
                onEditDevice={onEditDevice}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
};

export default Room;
