import React, { useRef, useState, useLayoutEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DeviceCard from './DeviceCard';
import { Tab, Device, DeviceType } from '../types';

interface SortableDeviceCardProps {
  device: Device;
  tabId: string;
  isEditMode: boolean;
  onDeviceToggle: (deviceId: string) => void;
  onTemperatureChange: (deviceId: string, change: number) => void;
  onBrightnessChange: (deviceId: string, brightness: number) => void;
  onPresetChange: (deviceId: string, preset: string) => void;
  onCameraCardClick: (device: Device) => void;
  onEditDevice: (device: Device) => void;
  onDeviceRemoveFromTab: (deviceId: string, tabId: string) => void;
  onDeviceContextMenu: (event: React.MouseEvent, deviceId: string, tabId: string) => void;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
}

// Sortable wrapper for DeviceCard
const SortableDeviceCard: React.FC<SortableDeviceCardProps> = ({ device, ...props }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: device.id, disabled: !props.isEditMode });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.7 : 1,
    aspectRatio: '1 / 1', // Enforce squareness of the cell content
    position: 'relative',
  };
  
  const handleClick = (e: React.MouseEvent) => {
    if (props.isEditMode) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    const isCamera = device.type === DeviceType.Camera;
    const isTogglable = device.type !== DeviceType.Thermostat && device.type !== DeviceType.Climate && device.type !== DeviceType.Sensor && !isCamera;

    if (isTogglable) {
      props.onDeviceToggle(device.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onContextMenu={(e) => props.onDeviceContextMenu(e, device.id, props.tabId)}
    >
      <DeviceCard
        device={device}
        onTemperatureChange={(change) => props.onTemperatureChange(device.id, change)}
        onBrightnessChange={(brightness) => props.onBrightnessChange(device.id, brightness)}
        onPresetChange={(preset) => props.onPresetChange(device.id, preset)}
        onCameraCardClick={props.onCameraCardClick}
        isEditMode={props.isEditMode}
        onEditDevice={() => props.onEditDevice(device)}
        onRemoveFromTab={() => props.onDeviceRemoveFromTab(device.id, props.tabId)}
        haUrl={props.haUrl}
        signPath={props.signPath}
        getCameraStreamUrl={props.getCameraStreamUrl}
      />
    </div>
  );
};

// Main Grid Component
interface DashboardGridProps extends Omit<SortableDeviceCardProps, 'device' | 'tabId'> {
    tab: Tab;
    devices: Device[];
    onDeviceOrderChange: (tabId: string, newOrderedIds: string[]) => void;
}

const DashboardGrid: React.FC<DashboardGridProps> = (props) => {
    const { tab, devices, onDeviceOrderChange, isEditMode } = props;
    const viewportRef = useRef<HTMLDivElement>(null);
    const [gridStyle, setGridStyle] = useState<React.CSSProperties>({});

    useLayoutEffect(() => {
        const calculateGrid = () => {
            if (!viewportRef.current) return;
            const { width: viewportWidth, height: viewportHeight } = viewportRef.current.getBoundingClientRect();
            const { cols, rows } = tab.gridSettings;
            const gap = 16;

            // Calculate cell size based on container constraints, maintaining square aspect ratio
            const cellWidthBasedOnViewport = (viewportWidth - (cols + 1) * gap) / cols;
            const cellHeightBasedOnViewport = (viewportHeight - (rows + 1) * gap) / rows;
            const cellSize = Math.floor(Math.min(cellWidthBasedOnViewport, cellHeightBasedOnViewport));
            
            if (cellSize <= 0) return;

            const gridWidth = cols * cellSize + (cols - 1) * gap;
            const gridHeight = rows * cellSize + (rows - 1) * gap;

            // FIX: Changed type to `any` to allow for CSS custom properties in the object literal.
            // This prevents TypeScript errors when using properties like '--cols'.
            const newStyle: any = {
                '--cols': cols,
                '--gap': `${gap}px`,
                width: `${gridWidth}px`,
                height: `${gridHeight}px`,
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridAutoRows: '1fr',
                gap: `${gap}px`,
            };
            
            if (isEditMode) {
                const cellSizeWithGap = cellSize + gap;
                newStyle['--grid-line-color'] = 'rgba(255, 255, 255, 0.05)';
                newStyle['--bg-size'] = `${cellSizeWithGap}px ${cellSizeWithGap}px`;
                newStyle['--bg-pos'] = `${-gap / 2}px ${-gap / 2}px`;
            }

            setGridStyle(newStyle);
        };

        const resizeObserver = new ResizeObserver(calculateGrid);
        if (viewportRef.current) {
            resizeObserver.observe(viewportRef.current);
        }
        calculateGrid(); // Initial calculation

        return () => resizeObserver.disconnect();
    }, [tab.gridSettings, isEditMode]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = devices.findIndex((d) => d.id === active.id);
            const newIndex = devices.findIndex((d) => d.id === over.id);
            const newOrderedDevices = arrayMove(devices, oldIndex, newIndex);
            onDeviceOrderChange(tab.id, newOrderedDevices.map(d => d.id));
        }
    };

    return (
        <div ref={viewportRef} className="w-full h-full flex items-center justify-center">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={devices.map(d => d.id)} strategy={rectSortingStrategy}>
                    <div 
                        className={`grid relative ${isEditMode ? 'edit-mode-grid' : ''}`}
                        style={gridStyle}
                    >
                        {devices.map(device => (
                            <SortableDeviceCard key={device.id} device={device} tabId={tab.id} {...props} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
            <style>{`
                .edit-mode-grid::before {
                    content: '';
                    position: absolute;
                    top: calc(var(--gap) / -2);
                    left: calc(var(--gap) / -2);
                    right: calc(var(--gap) / -2);
                    bottom: calc(var(--gap) / -2);
                    background-image:
                        linear-gradient(to right, var(--grid-line-color) 1px, transparent 1px),
                        linear-gradient(to bottom, var(--grid-line-color) 1px, transparent 1px);
                    background-size: var(--bg-size);
                    pointer-events: none;
                    z-index: 0;
                }
            `}</style>
        </div>
    );
};

export default DashboardGrid;