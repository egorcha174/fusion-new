import React from '../vendor/react.js';
// FIX: Use direct named imports for dnd-kit members.
import { useSortable } from '../vendor/dnd-kit-sortable.js';
import { CSS } from '../vendor/dnd-kit-utilities.js';
import DeviceCard from './DeviceCard';
import { Device, CardSize } from '../types';

interface DraggableDeviceCardProps {
  device: Device;
  onToggle: () => void;
  onTemperatureChange: (change: number) => void;
  onBrightnessChange: (brightness: number) => void;
  onPresetChange: (preset: string) => void;
  isEditMode: boolean;
  onEditDevice: (device: Device) => void;
  onRemoveFromTab: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  cardSize: CardSize;
}

const DraggableDeviceCard: React.FC<DraggableDeviceCardProps> = ({ device, onToggle, onTemperatureChange, onBrightnessChange, onPresetChange, isEditMode, onEditDevice, onRemoveFromTab, onContextMenu, cardSize }) => {
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
        isEditMode={isEditMode}
        onEditDevice={onEditDevice}
        onRemoveFromTab={onRemoveFromTab}
        onContextMenu={onContextMenu}
        cardSize={cardSize}
      />
    </div>
  );
};

export default DraggableDeviceCard;