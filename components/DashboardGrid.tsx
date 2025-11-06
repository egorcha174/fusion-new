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
  pointerWithin,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import DeviceCard from './DeviceCard';
// Fix: Added CardTemplate to the import list.
import { Tab, Device, DeviceType, GridLayoutItem, CardTemplates, DeviceCustomizations, CardTemplate } from '../types';

// --- Draggable Item ---
const DraggableDevice: React.FC<{
  device: Device;
  isEditMode: boolean;
  onDeviceToggle: (id: string) => void;
  template?: CardTemplate;
  // Pass all other props down to DeviceCard
  [key: string]: any;
}> = ({ device, isEditMode, onDeviceToggle, template, ...cardProps }) => {
  const { attributes, listeners, setNodeRef: setDraggableNodeRef, isDragging } = useDraggable({
    id: device.id,
    disabled: !isEditMode,
  });
  
  // Make the device card itself a droppable area for swapping
  const { setNodeRef: setDroppableNodeRef } = useDroppable({
    id: device.id, // The droppable ID is the device's own ID
    data: { type: 'device' }
  });
  
  // Combine refs for dnd-kit
  const setNodeRef = (node: HTMLElement | null) => {
      setDraggableNodeRef(node);
      setDroppableNodeRef(node);
  };

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
      style={{ visibility: isDragging ? 'hidden' : 'visible' }}
      className={`w-full h-full relative ${isEditMode ? 'cursor-move' : ''}`}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onContextMenu={(e) => cardProps.onDeviceContextMenu(e, device.id, cardProps.tab.id)}
    >
      <DeviceCard
        device={device}
        template={template}
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
  isEditMode: boolean;
}> = ({ col, row, isEditMode }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${col}-${row}`,
    data: { type: 'cell', col, row }
  });

  const baseClasses = 'w-full h-full transition-colors duration-200 rounded-xl';
  const editModeClasses = isEditMode ? 'bg-gray-800/50 border-2 border-dashed border-gray-700/50' : '';
  const overClasses = isOver ? 'bg-blue-500/20 border-solid border-blue-400' : '';

  return (
    <div
      ref={setNodeRef}
      className={`${baseClasses} ${isOver ? overClasses : editModeClasses}`}
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
    templates: CardTemplates;
    customizations: DeviceCustomizations;
}

const DashboardGrid: React.FC<DashboardGridProps> = (props) => {
    const { tab, allKnownDevices, isEditMode, onDeviceLayoutChange, searchTerm, templates, customizations } = props;
    const viewportRef = useRef<HTMLDivElement>(null);
    const [gridStyle, setGridStyle] = useState<React.CSSProperties>({});
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeDragItemRect, setActiveDragItemRect] = useState<{ width: number; height: number } | null>(null);
    
    const DEFAULT_SENSOR_TEMPLATE_ID = 'default-sensor';

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

      let targetCol: number;
      let targetRow: number;

      // Determine target coordinates from the `over` object
      if (over.data.current?.type === 'cell') {
          // Case 1: Dropped onto an empty cell
          targetCol = over.data.current.col;
          targetRow = over.data.current.row;
      } else {
          // Case 2: Dropped onto another device
          // The `over.id` is the deviceId of the target device
          const overItem = currentLayout.find(item => item.deviceId === over.id);
          if (!overItem) return; // Target device not found in layout, something is wrong
          targetCol = overItem.col;
          targetRow = overItem.row;
      }
      
      // Find the indices of the dragged item and the item at the target location
      const draggedItemIndex = currentLayout.findIndex(item => item.deviceId === draggedDeviceId);
      const targetItemIndex = currentLayout.findIndex(item => item.col === targetCol && item.row === targetRow);
      
      if (draggedItemIndex === -1) return; // Should not happen
      
      const newLayout = [...currentLayout];
      const draggedItem = newLayout[draggedItemIndex];
      
      if (targetItemIndex !== -1) {
        // --- SWAP ---
        // The target cell is occupied, so swap items.
        const targetItem = newLayout[targetItemIndex];
        
        // The target item gets the dragged item's original coordinates
        newLayout[targetItemIndex] = { ...targetItem, col: draggedItem.col, row: draggedItem.row };
        // The dragged item gets the target's coordinates
        newLayout[draggedItemIndex] = { ...draggedItem, col: targetCol, row: targetRow };

      } else {
        // --- MOVE ---
        // The target cell is empty, just move the dragged item.
        newLayout[draggedItemIndex] = { ...draggedItem, col: targetCol, row: targetRow };
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
    let activeDeviceTemplate: CardTemplate | undefined;
    if (activeDevice?.type === DeviceType.Sensor) {
        const templateId = customizations[activeDevice.id]?.templateId || DEFAULT_SENSOR_TEMPLATE_ID;
        activeDeviceTemplate = templates[templateId];
    }


    return (
        <div ref={viewportRef} className="w-full h-full flex items-start justify-start p-4">
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
                <div 
                    className="grid relative"
                    style={gridStyle}
                >
                    {Array.from({ length: tab.gridSettings.cols * tab.gridSettings.rows }).map((_, index) => {
                        const col = index % tab.gridSettings.cols;
                        const row = Math.floor(index / tab.gridSettings.cols);
                        const deviceId = layoutMap.get(`${col},${row}`);
                        const device = deviceId ? allKnownDevices.get(deviceId) : null;

                        let templateToUse: CardTemplate | undefined;
                        if (device?.type === DeviceType.Sensor) {
                            const deviceCustomization = customizations[device.id];
                            const templateId = deviceCustomization?.templateId;
                            if (templateId && templates[templateId]) {
                                templateToUse = templates[templateId];
                            } else {
                                // Fallback to the default sensor template
                                templateToUse = templates[DEFAULT_SENSOR_TEMPLATE_ID];
                            }
                        }

                        return (
                            <div key={device ? `${device.id}-${device.type}` : `${col}-${row}`} className="w-full h-full relative">
                                {device ? (
                                    <DraggableDevice 
                                      device={device} 
                                      template={templateToUse} 
                                      {...props} 
                                    />
                                ) : (
                                    <DroppableCell col={col} row={row} isEditMode={isEditMode} />
                                )}
                            </div>
                        );
                    })}
                </div>
                 <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
                    {activeDevice && activeDragItemRect ? (
                      <div 
                        className="opacity-80 shadow-2xl rounded-2xl"
                        style={{
                            width: activeDragItemRect.width,
                            height: activeDragItemRect.height,
                        }}
                      >
                        <DeviceCard
                           device={activeDevice}
                           template={activeDeviceTemplate}
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