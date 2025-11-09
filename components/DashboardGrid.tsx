










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
import { Tab, Device, DeviceType, GridLayoutItem, CardTemplates, DeviceCustomizations, CardTemplate, ColorScheme } from '../types';

const DEFAULT_SENSOR_TEMPLATE_ID = 'default-sensor';
const DEFAULT_LIGHT_TEMPLATE_ID = 'default-light';
const DEFAULT_SWITCH_TEMPLATE_ID = 'default-switch';
const DEFAULT_CLIMATE_TEMPLATE_ID = 'default-climate';

// --- Draggable Item ---
const DraggableDevice: React.FC<{
  device: Device;
  isEditMode: boolean;
  onDeviceToggle: (id: string) => void;
  template?: CardTemplate;
  allKnownDevices: Map<string, Device>;
  customizations: DeviceCustomizations;
  colorScheme: ColorScheme['light'];
  // Pass all other props down to DeviceCard
  [key: string]: any;
}> = ({ device, isEditMode, onDeviceToggle, template, allKnownDevices, customizations, colorScheme, ...cardProps }) => {
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

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const styleTarget = target.closest('[data-style-key]');
    
    if (styleTarget) {
        const baseKey = styleTarget.getAttribute('data-style-key')!;
        const targetName = styleTarget.getAttribute('data-style-name')!;
        const isText = styleTarget.getAttribute('data-is-text') === 'true';
        const isOn = device.state === 'on';
        cardProps.onOpenColorPicker(e, baseKey, targetName, isText, isOn);
    } else {
        // Fallback to regular context menu if no specific style key is found
        cardProps.onDeviceContextMenu(e, device.id, cardProps.tab.id);
    }
};

  return (
    <div
      ref={setNodeRef}
      style={{ visibility: isDragging ? 'hidden' : 'visible' }}
      className={`w-full h-full relative ${isEditMode ? 'cursor-move' : ''}`}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <DeviceCard
        device={device}
        template={template}
        allKnownDevices={allKnownDevices}
        customizations={customizations}
        onDeviceToggle={onDeviceToggle}
        onTemperatureChange={(temp, isDelta) => cardProps.onTemperatureChange(device.id, temp, isDelta)}
        onBrightnessChange={(brightness) => cardProps.onBrightnessChange(device.id, brightness)}
        onHvacModeChange={(mode) => cardProps.onHvacModeChange(device.id, mode)}
        onPresetChange={(preset) => cardProps.onPresetChange(device.id, preset)}
        onCameraCardClick={cardProps.onCameraCardClick}
        isEditMode={isEditMode}
        onEditDevice={() => cardProps.onEditDevice(device)}
        haUrl={cardProps.haUrl}
        signPath={cardProps.signPath}
        getCameraStreamUrl={cardProps.getCameraStreamUrl}
        openMenuDeviceId={cardProps.openMenuDeviceId}
        setOpenMenuDeviceId={cardProps.setOpenMenuDeviceId}
        colorScheme={colorScheme}
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
    onTemperatureChange: (deviceId: string, temperature: number, isDelta?: boolean) => void;
    onBrightnessChange: (deviceId: string, brightness: number) => void;
    onHvacModeChange: (deviceId: string, mode: string) => void;
    onPresetChange: (deviceId: string, preset: string) => void;
    onCameraCardClick: (device: Device) => void;
    onEditDevice: (device: Device) => void;
    onDeviceContextMenu: (event: React.MouseEvent, deviceId: string, tabId: string) => void;
    onOpenColorPicker: (event: React.MouseEvent, baseKey: string, targetName: string, isTextElement: boolean, isOn: boolean) => void;
    haUrl: string;
    signPath: (path: string) => Promise<{ path: string }>;
    getCameraStreamUrl: (entityId: string) => Promise<string>;
    templates: CardTemplates;
    customizations: DeviceCustomizations;
    colorScheme: ColorScheme['light'];
}

const DashboardGrid: React.FC<DashboardGridProps> = (props) => {
    const { tab, allKnownDevices, isEditMode, onDeviceLayoutChange, searchTerm, templates, customizations, onDeviceToggle } = props;
    const viewportRef = useRef<HTMLDivElement>(null);
    const [gridStyle, setGridStyle] = useState<React.CSSProperties>({});
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeDragItemRect, setActiveDragItemRect] = useState<{ width: number; height: number } | null>(null);
    const [openMenuDeviceId, setOpenMenuDeviceId] = useState<string | null>(null);

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

      const currentLayout = tab.layout;
      const draggedDeviceId = active.id as string;
      const draggedItemIndex = currentLayout.findIndex(item => item.deviceId === draggedDeviceId);
      if (draggedItemIndex === -1) return;

      const draggedItem = currentLayout[draggedItemIndex];
      const draggedWidth = draggedItem.width || 1;
      const draggedHeight = draggedItem.height || 1;

      let targetCol: number;
      let targetRow: number;
      let overDeviceId: string | null = null;

      if (over.data.current?.type === 'cell') {
          targetCol = over.data.current.col;
          targetRow = over.data.current.row;
      } else { // Dropped on another device
          overDeviceId = over.id as string;
          const overItem = currentLayout.find(item => item.deviceId === overDeviceId);
          if (!overItem) return;
          targetCol = overItem.col;
          targetRow = overItem.row;
      }
      
      // Boundary check
      if (targetCol + draggedWidth > tab.gridSettings.cols || targetRow + draggedHeight > tab.gridSettings.rows) {
          return; // Prevents moving item out of bounds
      }

      // Find all items that conflict with the new position
      const conflictingItems = currentLayout.filter(item => {
          if (item.deviceId === draggedDeviceId) return false; // Don't check against self

          const itemWidth = item.width || 1;
          const itemHeight = item.height || 1;

          // Check for rectangle intersection
          return (
              targetCol < item.col + itemWidth &&
              targetCol + draggedWidth > item.col &&
              targetRow < item.row + itemHeight &&
              targetRow + draggedHeight > item.row
          );
      });

      let newLayout = [...currentLayout];

      if (conflictingItems.length === 1) {
          // Potential SWAP
          const targetItem = conflictingItems[0];
          const targetWidth = targetItem.width || 1;
          const targetHeight = targetItem.height || 1;

          // Only swap if sizes are identical
          if (draggedWidth === targetWidth && draggedHeight === targetHeight) {
              const targetItemIndex = newLayout.findIndex(item => item.deviceId === targetItem.deviceId);
              
              // Swap positions
              newLayout[draggedItemIndex] = { ...draggedItem, col: targetItem.col, row: targetItem.row };
              newLayout[targetItemIndex] = { ...targetItem, col: draggedItem.col, row: draggedItem.row };
              
              onDeviceLayoutChange(tab.id, newLayout);
          }
          // If sizes are different, do nothing (cancel drag)
          return;

      } else if (conflictingItems.length === 0) {
          // MOVE to empty space
          newLayout[draggedItemIndex] = { ...draggedItem, col: targetCol, row: targetRow };
          onDeviceLayoutChange(tab.id, newLayout);
      } 
      // If more than one conflict, do nothing (cancel drag)
    };
    
    const occupiedCells = useMemo(() => {
        const cells = new Set<string>();
        if (!tab.layout) return cells;
        tab.layout.forEach(item => {
            const width = item.width || 1;
            const height = item.height || 1;
            for (let r = 0; r < height; r++) {
                for (let c = 0; c < width; c++) {
                    cells.add(`${item.col + c},${item.row + r}`);
                }
            }
        });
        return cells;
    }, [tab.layout]);

    const activeDevice = activeId ? allKnownDevices.get(activeId) : null;
    let activeDeviceTemplate: CardTemplate | undefined;
    if (activeDevice) {
        const templateId = customizations[activeDevice.id]?.templateId;
        if (templateId) {
             activeDeviceTemplate = templates[templateId];
        } else if (activeDevice.type === DeviceType.Sensor) {
            activeDeviceTemplate = templates[DEFAULT_SENSOR_TEMPLATE_ID];
        } else if (activeDevice.type === DeviceType.Light || activeDevice.type === DeviceType.DimmableLight) {
            activeDeviceTemplate = templates[DEFAULT_LIGHT_TEMPLATE_ID];
        } else if (activeDevice.type === DeviceType.Switch) {
            activeDeviceTemplate = templates[DEFAULT_SWITCH_TEMPLATE_ID];
        } else if (activeDevice.type === DeviceType.Thermostat) {
            activeDeviceTemplate = templates[DEFAULT_CLIMATE_TEMPLATE_ID];
        }
    }


    return (
        <div ref={viewportRef} className="w-full h-full flex items-start justify-start p-4">
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
                <div 
                    className="grid relative"
                    style={gridStyle}
                >
                    {isEditMode && Array.from({ length: tab.gridSettings.cols * tab.gridSettings.rows }).map((_, index) => {
                        const col = index % tab.gridSettings.cols;
                        const row = Math.floor(index / tab.gridSettings.cols);
                        if (!occupiedCells.has(`${col},${row}`)) {
                            return (
                                <div key={`cell-${col}-${row}`} style={{ gridColumn: col + 1, gridRow: row + 1 }}>
                                    <DroppableCell col={col} row={row} isEditMode={isEditMode} />
                                </div>
                            );
                        }
                        return null;
                    })}

                    {tab.layout.map(item => {
                        const device = allKnownDevices.get(item.deviceId);
                        if (!device) return null;

                        if (searchTerm) {
                            const lowercasedFilter = searchTerm.toLowerCase();
                            if (!device.name.toLowerCase().includes(lowercasedFilter) && !device.id.toLowerCase().includes(lowercasedFilter)) {
                                return null;
                            }
                        }
                        
                        const width = item.width || 1;
                        const height = item.height || 1;

                        let templateToUse: CardTemplate | undefined;
                        const deviceCustomization = customizations[device.id];
                        const templateId = deviceCustomization?.templateId;
                        if (templateId && templates[templateId]) {
                            templateToUse = templates[templateId];
                        } else if (device.type === DeviceType.Sensor) {
                            templateToUse = templates[DEFAULT_SENSOR_TEMPLATE_ID];
                        } else if (device.type === DeviceType.Light || device.type === DeviceType.DimmableLight) {
                            templateToUse = templates[DEFAULT_LIGHT_TEMPLATE_ID];
                        } else if (device.type === DeviceType.Switch) {
                            templateToUse = templates[DEFAULT_SWITCH_TEMPLATE_ID];
                        } else if (device.type === DeviceType.Thermostat) {
                            templateToUse = templates[DEFAULT_CLIMATE_TEMPLATE_ID];
                        }

                        return (
                            <div
                                key={item.deviceId}
                                style={{
                                    gridColumn: `${item.col + 1} / span ${width}`,
                                    gridRow: `${item.row + 1} / span ${height}`,
                                    zIndex: openMenuDeviceId === item.deviceId ? 40 : (activeId === item.deviceId ? 0 : 1),
                                }}
                            >
                                <DraggableDevice 
                                  device={device} 
                                  template={templateToUse}
                                  allKnownDevices={allKnownDevices}
                                  customizations={customizations}
                                  onDeviceToggle={onDeviceToggle}
                                  {...props} 
                                  openMenuDeviceId={openMenuDeviceId}
                                  setOpenMenuDeviceId={setOpenMenuDeviceId}
                                />
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
                           allKnownDevices={allKnownDevices}
                           customizations={customizations}
                           onDeviceToggle={onDeviceToggle}
                           onTemperatureChange={() => {}}
                           onBrightnessChange={() => {}}
                           onHvacModeChange={() => {}}
                           onPresetChange={() => {}}
                           onCameraCardClick={() => {}}
                           onEditDevice={() => {}}
                           haUrl={props.haUrl}
                           signPath={props.signPath}
                           getCameraStreamUrl={props.getCameraStreamUrl}
                           colorScheme={props.colorScheme}
                        />
                      </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
};

export default React.memo(DashboardGrid);