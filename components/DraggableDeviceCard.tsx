

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DeviceCard from './DeviceCard';
import { Device } from '../types';

interface DraggableDeviceCardProps {
  device: Device;
  onToggle: () => void;
  onTemperatureChange: (change: number) => void;
  onPresetChange: (preset: string) => void;
  isEditMode: boolean;
  onEditDevice: (device: Device) => void;
  onRemoveFromTab: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

const DraggableDeviceCard: React.FC<DraggableDeviceCardProps> = ({ device, onToggle, onTemperatureChange, onPresetChange, isEditMode, onEditDevice, onRemoveFromTab, onContextMenu }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: device.id, disabled: isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DeviceCard 
        device={device} 
        onToggle={onToggle} 
        onTemperatureChange={onTemperatureChange}
        onPresetChange={onPresetChange}
        isEditMode={isEditMode}
        onEditDevice={onEditDevice}
        onRemoveFromTab={onRemoveFromTab}
        onContextMenu={onContextMenu}
      />
    </div>
  );
};

export default DraggableDeviceCard;