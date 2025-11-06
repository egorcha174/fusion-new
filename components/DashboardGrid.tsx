import React, { useRef, useState, useLayoutEffect, useMemo } from 'react';
import { 
  DndContext, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent, 
  DragStartEvent,
  DragMoveEvent,
  useDndMonitor,
  useDraggable, 
  useDroppable,
  DragOverlay
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
    const [overlayTransform, setOverlayTransform] = useState<string>('');

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

    useDndMonitor({
        onDragMove: (event: DragMoveEvent) => {
            setOverlayTransform(`translate3d(${event.delta.x}px, ${event.delta.y}px, 0)`);
        },
        onDragEnd: () => {
            setOverlayTransform('');
        },
        onDragCancel: () => {
            setOverlayTransform('');
        },
    });

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
      if (!over || !isEditMode) return;

      const draggedDeviceId = active.id as string;
      const targetData = over.data.current;
      const currentLayout = tab.layout;
      let newLayout = [...currentLayout];
      const draggedItemIndex = newLayout.findIndex(item => item.deviceId === draggedDeviceId);

      if (draggedItemIndex === -1) return;

      // Case 1: Dropped onto an empty cell
      if (targetData?.type === 'cell') {
        newLayout[draggedItemIndex] = { ...newLayout[draggedItemIndex], col: targetData.col, row: targetData.row };
      }
      
      // Case 2: Dropped onto another device (swap)
      const targetDeviceId = over.id as string;
      const targetItemIndex = newLayout.findIndex(item => item.deviceId === targetDeviceId);
      if (targetItemIndex !== -1 && targetItemIndex !== draggedItemIndex) {
          const originalDraggedPosition = { col: currentLayout[draggedItemIndex].col, row: currentLayout[draggedItemIndex].row };
          const originalTargetPosition = { col: currentLayout[targetItemIndex].col, row: currentLayout[targetItemIndex].row };
          
          newLayout[draggedItemIndex] = { ...newLayout[draggedItemIndex], ...originalTargetPosition };
          // FIX: Corrected a typo from `originalPosition` to `originalDraggedPosition`.
          newLayout[targetItemIndex] = { ...newLayout[targetItemIndex], ...originalDraggedPosition };
      }
      
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
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                            transform: overlayTransform,
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