import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DeviceCard from './DeviceCard';
import { Device, CardSize } from '../types';

interface DraggableDeviceCardProps {
  device: Device;
  onToggle: () => void;
  onTemperatureChange: (change: number) => void;
  onBrightnessChange: (brightness: number) => void;
  onPresetChange: (preset: string) => void;
  onCameraCardClick: (device: Device) => void;
  isEditMode: boolean;
  onEditDevice: (device: Device) => void;
  onRemoveFromTab: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  cardSize: CardSize;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
}

const DraggableDeviceCard: React.FC<DraggableDeviceCardProps> = ({ device, onToggle, onTemperatureChange, onBrightnessChange, onPresetChange, onCameraCardClick, isEditMode, onEditDevice, onRemoveFromTab, onContextMenu, cardSize, haUrl, signPath, getCameraStreamUrl }) => {
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
        onBrightnessChange={onBrightnessChange}
        onPresetChange={onPresetChange}
        onCameraCardClick={onCameraCardClick}
        isEditMode={isEditMode}
        onEditDevice={onEditDevice}
        onRemoveFromTab={onRemoveFromTab}
        onContextMenu={onContextMenu}
        cardSize={cardSize}
        haUrl={haUrl}
        signPath={signPath}
        getCameraStreamUrl={getCameraStreamUrl}
      />
    </div>
  );
};

export default DraggableDeviceCard;