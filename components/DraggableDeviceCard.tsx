
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DeviceCard from './DeviceCard';
import { Device } from '../types';

interface DraggableDeviceCardProps {
  device: Device;
  onToggle: () => void;
  onTemperatureChange: (change: number) => void;
}

const DraggableDeviceCard: React.FC<DraggableDeviceCardProps> = ({ device, onToggle, onTemperatureChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: device.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DeviceCard device={device} onToggle={onToggle} onTemperatureChange={onTemperatureChange} />
    </div>
  );
};

export default DraggableDeviceCard;