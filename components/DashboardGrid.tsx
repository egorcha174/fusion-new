import React, { useRef, useState, useLayoutEffect, useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDraggable,
  useDroppable,
  DragOverlay,
  pointerWithin, // <-- Implemented pointerWithin for precise collision detection
} from '@dnd-kit/core';
import DeviceCard from './DeviceCard';
import { Tab, Device, DeviceType, GridLayoutItem } from '../types';

// --- Draggable Item ---
const DraggableDevice: React.FC<{
  device: Device;
  isEditMode: boolean;
  onDeviceToggle: (id: string) => void;
  // Pass all other props down to DeviceCard
  [key: string]: any;
}> = ({ device, isEditMode, onDeviceToggle, ...cardProps }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: device.id,
    disabled: !isEditMode,
  });

  const handleClick = (e: React.MouseEvent) => {
    if (isEditMode) {
      e.preventDefault(); e.stopPropagation(); return;
    }
    const isCamera = device.type === DeviceType.Camera;
    const isTogglable = device.type !== DeviceType.Thermostat && device.type !== DeviceType.Climate && device.type !== DeviceType.Sensor && !isCamera;
    if (isTogglable) onDeviceToggle(device.id);
  };

  return (
    <div
      ref={setNodeRef}
      className={`w-full h-full relative ${isEditMode ? 'cursor-move' : ''} ${isDragging ? 'opacity-30' : ''}`}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onContextMenu={(e) => cardProps.onDeviceContextMenu(e, device.id, cardProps.tab.id)}
    >
      <DeviceCard
        device={device}
        onTemperatureChange={(change) => cardProps.onTemperatureChange(device.id, change)}
        onBrightnessChange={(brightness) => cardProps.onBrightnessChange(device.id, brightness)}
        onPresetChange={(preset) => cardProps.onPresetChange(device.id, preset)}
        onCameraCardClick={cardProps.onCameraCardClick}
        isEditMode={isEditMode}
        onEditDevice={() => cardProps.onEditDevice(device)}
        haUrl={cardProps.haUrl}
        signPath={cardProps.signPath}
        getCameraStreamUrl={cardProps.getCameraStreamUrl}
      />
    </div>
  );
};


// --- Droppable Cell ---
const DroppableCell: React.FC<{
  col: number;
  row: number;
  isOver: boolean;
}> = ({ col, row, isOver }) => {
  const { setNodeRef } = useDroppable({
    id: `cell-${col}-${row}`,
    data: { type: 'cell', col, row }
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-full h-full transition-colors ${isOver ? 'bg-white/5' : ''}`}
    />
  );
};

// --- Main Grid Component ---
interface DashboardGridProps {
    tab: Tab;
    allKnownDevices: Map<string, Device>;
    searchTerm: string;
    isEditMode: boolean;
    onDeviceLayoutChange: (tabId: string, newLayout: GridLayoutItem[]) => void;
    onDeviceToggle: (deviceId: string) => void;
    onTemperatureChange: (deviceId: string, change: number) => void;
    onBrightnessChange: (deviceId: string, brightness: number) => void;
    onPresetChange: (deviceId: string, preset: string) => void;
    onCameraCardClick: (device: Device) => void;
    onEditDevice: (device: Device) => void;
    onDeviceContextMenu: (event: React.MouseEvent, deviceId: string, tabId: string) => void;
    haUrl: string;
    signPath: (path: string) => Promise<{ path: string }>;
    getCameraStreamUrl: (entityId: string) => Promise<string>;
}

const DashboardGrid: React.FC<DashboardGridProps> = (props) => {
    const { tab, allKnownDevices, isEditMode, onDeviceLayoutChange, searchTerm } = props;
    const viewportRef = useRef<HTMLDivElement>(null);
    const [gridStyle, setGridStyle] = useState<React.CSSProperties>({});
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeDragItemRect, setActiveDragItemRect] = useState<{ width: number; height: number } | null>(null);

    useLayoutEffect(() => {
        const calculateGrid = () => {
            if (!viewportRef.current) return;
            const { width, height } = viewportRef.current.getBoundingClientRect();
            const { cols, rows } = tab.gridSettings;
            const gap = 16;
            const cellWidth = (width - (cols + 1) * gap) / cols;
            const cellHeight = (height - (rows + 1) * gap) / rows;
            const cellSize = Math.floor(Math.min(cellWidth, cellHeight));
            if (cellSize <= 0) return;
            
            const newStyle: any = {
                gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
                gap: `${gap}px`,
            };
            setGridStyle(newStyle);
        };
        const resizeObserver = new ResizeObserver(calculateGrid);
        if (viewportRef.current) resizeObserver.observe(viewportRef.current);
        calculateGrid();
        return () => resizeObserver.disconnect();
    }, [tab.gridSettings, isEditMode]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        if (event.active.rect.current.initial) {
            const { width, height } = event.active.rect.current.initial;
            setActiveDragItemRect({ width, height });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
      setActiveId(null);
      setActiveDragItemRect(null);
      const { active, over } = event;

      if (!over || !isEditMode || active.id === over.id) {
          return;
      }

      const draggedDeviceId = active.id as string;
      const currentLayout = tab.layout;

      const draggedItem = currentLayout.find(item => item.deviceId === draggedDeviceId);
      if (!draggedItem) return;

      let targetCol: number;
      let targetRow: number;

      // Determine target coordinates from either a droppable cell or a droppable device
      if (over.data.current?.type === 'cell') {
          targetCol = over.data.current.col;
          targetRow = over.data.current.row;
      } else {
          const overItem = currentLayout.find(item => item.deviceId === over.id);
          if (!overItem) return; // Should not happen if 'over' is a device on the grid
          targetCol = overItem.col;
          targetRow = overItem.row;
      }
      
      // Create a mutable copy of the layout to work with
      const newLayout = currentLayout.map(item => ({ ...item }));

      const draggedItemInNewLayout = newLayout.find(item => item.deviceId === draggedDeviceId)!;
      const targetItemInNewLayout = newLayout.find(item => item.col === targetCol && item.row === targetRow);
      
      // If the target cell is occupied by a different item, perform a swap.
      if (targetItemInNewLayout && targetItemInNewLayout.deviceId !== draggedDeviceId) {
          // Move the item at the target location to the dragged item's original spot
          targetItemInNewLayout.col = draggedItemInNewLayout.col;
          targetItemInNewLayout.row = draggedItemInNewLayout.row;
      }

      // Move the dragged item to the target location
      draggedItemInNewLayout.col = targetCol;
      draggedItemInNewLayout.row = targetRow;
      
      onDeviceLayoutChange(tab.id, newLayout);
    };

    const layoutMap = useMemo(() => {
        const map = new Map<string, string>(); // "col,row" -> deviceId
        tab.layout.forEach(item => {
            const device = allKnownDevices.get(item.deviceId);
            if (!device) return;

            if (searchTerm) {
                const lowercasedFilter = searchTerm.toLowerCase();
                if (!device.name.toLowerCase().includes(lowercasedFilter) && !device.id.toLowerCase().includes(lowercasedFilter)) {
                    return; // Skip if it doesn't match search
                }
            }
            map.set(`${item.col},${item.row}`, item.deviceId);
        });
        return map;
    }, [tab.layout, allKnownDevices, searchTerm]);

    const activeDevice = activeId ? allKnownDevices.get(activeId) : null;

    return (
        <div ref={viewportRef} className="w-full h-full flex items-start justify-start p-4">
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
                <div 
                    className={`grid relative ${isEditMode ? 'bg-black/10' : ''}`}
                    style={gridStyle}
                >
                    {Array.from({ length: tab.gridSettings.cols * tab.gridSettings.rows }).map((_, index) => {
                        const col = index % tab.gridSettings.cols;
                        const row = Math.floor(index / tab.gridSettings.cols);
                        const deviceId = layoutMap.get(`${col},${row}`);
                        const device = deviceId ? allKnownDevices.get(deviceId) : null;

                        return (
                            <div key={`${col}-${row}`} className="w-full h-full relative">
                                {device ? (
                                    <DraggableDevice device={device} {...props} />
                                ) : (
                                    <DroppableCell col={col} row={row} isOver={false} />
                                )}
                            </div>
                        );
                    })}
                </div>
                 <DragOverlay dropAnimation={null}>
                    {activeDevice && activeDragItemRect ? (
                      <div 
                        className="opacity-80 backdrop-blur-sm scale-105 shadow-2xl rounded-2xl"
                        style={{
                            width: activeDragItemRect.width,
                            height: activeDragItemRect.height,
                        }}
                      >
                        <DeviceCard
                           device={activeDevice}
                           isEditMode={true}
                           onTemperatureChange={() => {}}
                           onBrightnessChange={() => {}}
                           onPresetChange={() => {}}
                           onCameraCardClick={() => {}}
                           onEditDevice={() => {}}
                           haUrl={props.haUrl}
                           signPath={props.signPath}
                           getCameraStreamUrl={props.getCameraStreamUrl}
                        />
                      </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
};

export default DashboardGrid;