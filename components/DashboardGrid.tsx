

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
  onShowHistory: (id: string) => void;
  template?: CardTemplate;
  allKnownDevices: Map<string, Device>;
  customizations: DeviceCustomizations;
  colorScheme: ColorScheme['light'];
  // Pass all other props down to DeviceCard
  [key: string]: any;
}> = ({ device, isEditMode, onDeviceToggle, onShowHistory, template, allKnownDevices, customizations, colorScheme, ...cardProps }) => {
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
    
    // For sensors, show history page
    if (device.type === DeviceType.Sensor) {
      onShowHistory(device.id);
      return;
    }

    const isCamera = device.type === DeviceType.Camera;
    const isTogglable = device.type !== DeviceType.Thermostat && device.type !== DeviceType.Climate && !isCamera;
    if (isTogglable) {
      onDeviceToggle(device.id);
    }
    // Note: Camera click is handled inside DeviceCard itself to call onCameraCardClick
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    // onDeviceContextMenu is passed down from App.tsx. It handles preventDefault.
    cardProps.onDeviceContextMenu(e, device.id, cardProps.tab.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ visibility: isDragging ? 'hidden' : 'visible' }}
      className={`w-full h-full relative ${isEditMode ? 'cursor-move' : ''}`}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      data-device-id={device.id}
      data-tab-id={cardProps.tab.id}
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
        onContextMenu={handleContextMenu}
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
    onShowHistory: (entityId: string) => void;
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
    const { tab, allKnownDevices, isEditMode, onDeviceLayoutChange, searchTerm, templates, customizations, onDeviceToggle, onShowHistory } = props;
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
        let newLayout = [...currentLayout];
    
        // Case 1: Dropped on an empty cell
        if (over.data.current?.type === 'cell') {
            const { col: targetCol, row: targetRow } = over.data.current;
            const draggedWidth = draggedItem.width || 1;
            const draggedHeight = draggedItem.height || 1;
    
            // Boundary check
            if (targetCol + draggedWidth > tab.gridSettings.cols || targetRow + draggedHeight > tab.gridSettings.rows) {
                return;
            }
    
            // Check for collision with other items in the new location
            const conflictingItems = currentLayout.filter(item => {
                if (item.deviceId === draggedDeviceId) return false;
                const itemWidth = item.width || 1;
                const itemHeight = item.height || 1;
                return (
                    targetCol < item.col + itemWidth &&
                    targetCol + draggedWidth > item.col &&
                    targetRow < item.row + itemHeight &&
                    targetRow + draggedHeight > item.row
                );
            });
    
            if (conflictingItems.length === 0) {
                newLayout[draggedItemIndex] = { ...draggedItem, col: targetCol, row: targetRow };
                onDeviceLayoutChange(tab.id, newLayout);
            }
            return;
        }
    
        // Case 2: Dropped on another device
        if (over.data.current?.type === 'device') {
            const overDeviceId = over.id as string;
            const overItemIndex = newLayout.findIndex(item => item.deviceId === overDeviceId);
            if (overItemIndex === -1) return;
    
            const overItem = newLayout[overItemIndex];
    
            const isDraggedStackable = (draggedItem.width || 1) === 1 && (draggedItem.height || 1) === 0.5;
            const isOverStackable = (overItem.width || 1) === 1 && (overItem.height || 1) === 0.5;
            
            const itemsInTargetCell = newLayout.filter(item => item.col === overItem.col && item.row === overItem.row);
    
            // STACK logic
            if (isDraggedStackable && isOverStackable && itemsInTargetCell.length === 1) {
                newLayout[draggedItemIndex] = { ...draggedItem, col: overItem.col, row: overItem.row };
                onDeviceLayoutChange(tab.id, newLayout);
                return;
            }
    
            // SWAP logic
            const draggedWidth = draggedItem.width || 1;
            const draggedHeight = draggedItem.height || 1;
            const overWidth = overItem.width || 1;
            const overHeight = overItem.height || 1;
            
            if (draggedWidth === overWidth && draggedHeight === overHeight) {
                const tempPos = { col: draggedItem.col, row: draggedItem.row };
                newLayout[draggedItemIndex] = { ...draggedItem, col: overItem.col, row: overItem.row };
                newLayout[overItemIndex] = { ...overItem, col: tempPos.col, row: tempPos.row };
                onDeviceLayoutChange(tab.id, newLayout);
            }
        }
    };
    
    const occupiedCells = useMemo(() => {
        const cells = new Set<string>();
        if (!tab.layout) return cells;
        tab.layout.forEach(item => {
            const width = item.width || 1;
            const height = item.height || 1;
            for (let r = 0; r < Math.ceil(height); r++) {
                for (let c = 0; c < Math.ceil(width); c++) {
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

    const groupedLayout = useMemo(() => {
        const groups = new Map<string, GridLayoutItem[]>();
        if (!tab.layout) return [];
        tab.layout.forEach(item => {
            const key = `${item.col},${item.row}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(item);
        });
        return Array.from(groups.values());
    }, [tab.layout]);

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

                    {groupedLayout.map((group) => {
                        const firstItem = group[0];
                        if (!firstItem) return null;

                        if (searchTerm) {
                            const groupMatches = group.some(item => {
                                const d = allKnownDevices.get(item.deviceId);
                                if (!d) return false;
                                const lowercasedFilter = searchTerm.toLowerCase();
                                return d.name.toLowerCase().includes(lowercasedFilter) || d.id.toLowerCase().includes(lowercasedFilter);
                            });
                            if (!groupMatches) return null;
                        }

                        const width = firstItem.width || 1;
                        const height = firstItem.height || 1;
                        const groupHasOpenMenu = group.some(item => item.deviceId === openMenuDeviceId);
                        const groupIsActive = group.some(item => item.deviceId === activeId);
                        
                        const isStackedPair = group.length === 2 && group.every(item => item.height === 0.5);

                        return (
                             <div
                                key={`${firstItem.col}-${firstItem.row}`}
                                style={{
                                    gridColumn: `${firstItem.col + 1} / span ${Math.ceil(width)}`,
                                    gridRow: `${firstItem.row + 1} / span ${Math.ceil(height)}`,
                                    zIndex: groupHasOpenMenu ? 40 : (groupIsActive ? 0 : 1),
                                }}
                                className="relative"
                            >
                                {group.map((item, index) => {
                                    const device = allKnownDevices.get(item.deviceId);
                                    if (!device) return null;

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
                                    
                                    const wrapperStyle: React.CSSProperties = { width: '100%' };
                                    if (isStackedPair) {
                                        wrapperStyle.position = 'absolute';
                                        wrapperStyle.left = 0;
                                        wrapperStyle.right = 0;
                                        wrapperStyle.height = '50%'; // 16px total gap -> 8px per card from the middle
                                        if (index === 0) {
                                            wrapperStyle.top = 0;
                                        } else {
                                            wrapperStyle.bottom = 0;
                                        }
                                    } else { // A single item in the cell
                                        if (item.height === 0.5) {
                                            wrapperStyle.position = 'absolute';
                                            wrapperStyle.top = 0;
                                            wrapperStyle.left = 0;
                                            wrapperStyle.right = 0;
                                            wrapperStyle.height = '50%';
                                        } else {
                                            wrapperStyle.height = '100%';
                                        }
                                    }


                                    return (
                                        <div key={item.deviceId} style={wrapperStyle}>
                                            <DraggableDevice 
                                              device={device} 
                                              template={templateToUse}
                                              allKnownDevices={allKnownDevices}
                                              customizations={customizations}
                                              onDeviceToggle={onDeviceToggle}
                                              onShowHistory={onShowHistory}
                                              {...props} 
                                              openMenuDeviceId={openMenuDeviceId}
                                              setOpenMenuDeviceId={setOpenMenuDeviceId}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )
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