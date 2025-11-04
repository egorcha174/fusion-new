import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DeviceCard from './DeviceCard';
import { Device, CardSize, DeviceType } from '../types';

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
  } = useSortable({ id: device.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click logic from firing if a child element like a button stopped propagation
    if (e.isDefaultPrevented()) return;

    if (isEditMode) return;

    const isCamera = device.type === DeviceType.Camera;
    const isTogglable = device.type !== DeviceType.Thermostat && device.type !== DeviceType.Climate && device.type !== DeviceType.Sensor && !isCamera;

    if (isCamera) {
      onCameraCardClick(device);
    } else if (isTogglable) {
      onToggle();
    }
  };


  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={handleClick}
      onContextMenu={onContextMenu}
    >
      <DeviceCard 
        device={device} 
        onTemperatureChange={onTemperatureChange}
        onBrightnessChange={onBrightnessChange}
        onPresetChange={onPresetChange}
        isEditMode={isEditMode}
        onEditDevice={onEditDevice}
        onRemoveFromTab={onRemoveFromTab}
        cardSize={cardSize}
        haUrl={haUrl}
        signPath={signPath}
        getCameraStreamUrl={getCameraStreamUrl}
      />
    </div>
  );
};

export default DraggableDeviceCard;