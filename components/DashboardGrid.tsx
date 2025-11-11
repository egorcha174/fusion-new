import React, { useRef, useState, useLayoutEffect, useMemo } from 'react';
import {
  DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent,
  useDraggable, useDroppable, DragOverlay, pointerWithin,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import DeviceCard from './DeviceCard';
import { Tab, Device, DeviceType, GridLayoutItem, CardTemplates, DeviceCustomizations, CardTemplate, ColorScheme, ColorThemeSet } from '../types';

// ID шаблонов по умолчанию
const DEFAULT_SENSOR_TEMPLATE_ID = 'default-sensor';
const DEFAULT_LIGHT_TEMPLATE_ID = 'default-light';
const DEFAULT_SWITCH_TEMPLATE_ID = 'default-switch';
const DEFAULT_CLIMATE_TEMPLATE_ID = 'default-climate';

/**
 * Обертка над DeviceCard, делающая его перетаскиваемым (Draggable) и зоной для сброса (Droppable).
 * Это позволяет как перетаскивать карточку, так и сбрасывать другую карточку на нее для замены.
 */
const DraggableDevice: React.FC<{
  device: Device;
  isEditMode: boolean;
  onDeviceToggle: (id: string) => void;
  onShowHistory: (id: string) => void;
  template?: CardTemplate;
  allKnownDevices: Map<string, Device>;
  customizations: DeviceCustomizations;
  colorScheme: ColorScheme['light'];
  [key: string]: any; // Прочие пропсы для DeviceCard
}> = ({ device, isEditMode, onDeviceToggle, onShowHistory, template, allKnownDevices, customizations, colorScheme, ...cardProps }) => {
  const { attributes, listeners, setNodeRef: setDraggableNodeRef, isDragging } = useDraggable({
    id: device.id,
    disabled: !isEditMode,
  });
  
  // Делаем саму карточку зоной для сброса для реализации замены (swap)
  const { setNodeRef: setDroppableNodeRef } = useDroppable({
    id: device.id,
    data: { type: 'device' }
  });
  
  // Комбинируем ref'ы от useDraggable и useDroppable
  const setNodeRef = (node: HTMLElement | null) => {
      setDraggableNodeRef(node);
      setDroppableNodeRef(node);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isEditMode) { e.preventDefault(); e.stopPropagation(); return; }
    
    // Для сенсоров клик открывает историю
    if (device.type === DeviceType.Sensor) {
      onShowHistory(device.id);
      return;
    }

    const isCamera = device.type === DeviceType.Camera;
    const isTogglable = device.type !== DeviceType.Thermostat && device.type !== DeviceType.Climate && !isCamera;
    if (isTogglable) {
      onDeviceToggle(device.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    cardProps.onDeviceContextMenu(e, device.id, cardProps.tab.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ visibility: isDragging ? 'hidden' : 'visible' }} // Скрываем оригинал во время перетаскивания
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


/**
 * Компонент пустой ячейки сетки, которая является зоной для сброса (Droppable).
 * Отображается только в режиме редактирования.
 */
const DroppableCell: React.FC<{
  col: number;
  row: number;
  isEditMode: boolean;
  metrics: { cellSize: number; gap: number; };
}> = ({ col, row, isEditMode, metrics }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${col}-${row}`,
    data: { type: 'cell', col, row }
  });

  const baseClasses = 'absolute transition-colors duration-200 rounded-xl';
  const editModeClasses = isEditMode ? 'bg-gray-800/50 border-2 border-dashed border-gray-700/50' : '';
  const overClasses = isOver ? 'bg-blue-500/20 border-solid border-blue-400' : '';
  
  const style: React.CSSProperties = {
    width: `${metrics.cellSize}px`,
    height: `${metrics.cellSize}px`,
    left: `${col * (metrics.cellSize + metrics.gap)}px`,
    top: `${row * (metrics.cellSize + metrics.gap)}px`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${baseClasses} ${isOver ? overClasses : editModeClasses}`}
    />
  );
};

const OccupiedCellWrapper: React.FC<{
    group: GridLayoutItem[];
    children: React.ReactNode;
    isEditMode: boolean;
    activeId: string | null;
    openMenuDeviceId: string | null;
    metrics: { cellSize: number; gap: number; };
}> = ({ group, children, isEditMode, activeId, openMenuDeviceId, metrics }) => {
    const firstItem = group[0];
    const { setNodeRef, isOver } = useDroppable({
        id: `cell-${firstItem.col}-${firstItem.row}`,
        data: { type: 'cell', col: firstItem.col, row: firstItem.row }
    });

    const isStackedPair = group.length === 2 && group.every(item => item.height === 0.5 && (item.width || 1) === 1);
    
    const width = firstItem.width || 1;
    // Если это пара карточек 1x0.5, контейнер должен быть высотой в 1 ячейку.
    const containerHeight = isStackedPair ? 1 : (firstItem.height || 1);
    const groupHasOpenMenu = group.some(item => item.deviceId === openMenuDeviceId);
    const groupIsActive = group.some(item => item.deviceId === activeId);

    const overClasses = (isEditMode && isOver && !groupIsActive) ? 'bg-blue-500/20 ring-2 ring-blue-400' : '';
    
    const style: React.CSSProperties = {
        position: 'absolute',
        width: `${width * metrics.cellSize + (Math.ceil(width) - 1) * metrics.gap}px`,
        height: `${containerHeight * metrics.cellSize + (Math.ceil(containerHeight) - 1) * metrics.gap}px`,
        left: `${firstItem.col * (metrics.cellSize + metrics.gap)}px`,
        top: `${firstItem.row * (metrics.cellSize + metrics.gap)}px`,
        zIndex: groupHasOpenMenu ? 40 : (groupIsActive ? 0 : 1),
        transition: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1)',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative rounded-xl transition-colors duration-200 ${overClasses}`}
        >
            {children}
        </div>
    );
};


interface DashboardGridProps {
  tab: Tab;
  isEditMode: boolean;
  onDeviceContextMenu: (event: React.MouseEvent, deviceId: string, tabId: string) => void;
  allKnownDevices: Map<string, Device>;
  searchTerm: string;
  onDeviceLayoutChange: (tabId: string, newLayout: GridLayoutItem[]) => void;
  onDeviceToggle: (deviceId: string) => void;
  onTemperatureChange: (deviceId: string, temperature: number, isDelta?: boolean) => void;
  onBrightnessChange: (deviceId: string, brightness: number) => void;
  onHvacModeChange: (deviceId: string, mode: string) => void;
  onPresetChange: (deviceId: string, preset: string) => void;
  onCameraCardClick: (device: Device) => void;
  onShowHistory: (entityId: string) => void;
  onEditDevice: (device: Device) => void;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<{ url: string }>;
  templates: CardTemplates;
  customizations: DeviceCustomizations;
  colorScheme: ColorScheme['light'];
}

/**
 * Основной компонент сетки дашборда.
 * Отвечает за рендеринг сетки, обработку Drag-and-Drop и позиционирование карточек.
 */
const DashboardGrid: React.FC<DashboardGridProps> = (props) => {
    const { tab, allKnownDevices, isEditMode, onDeviceLayoutChange, searchTerm, templates, customizations, onDeviceToggle, onShowHistory } = props;
    const viewportRef = useRef<HTMLDivElement>(null);
    const [gridMetrics, setGridMetrics] = useState({ containerWidth: 0, containerHeight: 0, cellSize: 0, gap: 16 });
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeDragItemRect, setActiveDragItemRect] = useState<{ width: number; height: number } | null>(null);
    const [openMenuDeviceId, setOpenMenuDeviceId] = useState<string | null>(null);

    // useLayoutEffect для синхронного расчета размеров сетки после рендера, до отрисовки браузером.
    useLayoutEffect(() => {
        const calculateGrid = () => {
            if (!viewportRef.current) return;
            const { width, height } = viewportRef.current.getBoundingClientRect();
            const { cols, rows } = tab.gridSettings;
            const gap = 16;
            // Рассчитываем размер ячейки, чтобы сетка вписалась в контейнер
            const cellWidth = (width - (cols + 1) * gap) / cols;
            const cellHeight = (height - (rows + 1) * gap) / rows;
            const cellSize = Math.floor(Math.min(cellWidth, cellHeight));
            if (cellSize <= 0) return;
            
            setGridMetrics({
                containerWidth: cols * cellSize + (cols - 1) * gap,
                containerHeight: rows * cellSize + (rows - 1) * gap,
                cellSize: cellSize,
                gap: gap
            });
        };
        const resizeObserver = new ResizeObserver(calculateGrid);
        if (viewportRef.current) resizeObserver.observe(viewportRef.current);
        calculateGrid();
        return () => resizeObserver.disconnect();
    }, [tab.gridSettings]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        if (event.active.rect.current.initial) {
            const { width, height } = event.active.rect.current.initial;
            setActiveDragItemRect({ width, height }); // Сохраняем размеры для DragOverlay
        }
    };

    /**
     * Основная логика обработки завершения перетаскивания.
     * Определяет, куда была сброшена карточка (на пустую ячейку или на другую карточку)
     * и выполняет соответствующее действие (перемещение, замена, объединение в стопку).
     */
    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        setActiveDragItemRect(null);
        const { active, over } = event;
    
        if (!over || !isEditMode || active.id === over.id) return;
    
        const currentLayout = tab.layout;
        const draggedDeviceId = active.id as string;
        const draggedItemIndex = currentLayout.findIndex(item => item.deviceId === draggedDeviceId);
        if (draggedItemIndex === -1) return;
    
        const draggedItem = currentLayout[draggedItemIndex];
        let newLayout = [...currentLayout];
    
        // Случай 1: Сброс на ячейку (пустую или занятую)
        if (over.data.current?.type === 'cell') {
            const { col: targetCol, row: targetRow } = over.data.current;
            const draggedWidth = draggedItem.width || 1;
            const draggedHeight = draggedItem.height || 1;
            
            if (targetCol + Math.ceil(draggedWidth) > tab.gridSettings.cols || targetRow + Math.ceil(draggedHeight) > tab.gridSettings.rows) return;
            
            const isDraggedStackable = draggedWidth === 1 && draggedHeight === 0.5;
            const itemsInTargetCell = currentLayout.filter(item => item.deviceId !== draggedDeviceId && item.col === targetCol && item.row === targetRow);
            
            // A: Ячейка пуста. Проверяем коллизии с многоячеичными элементами.
            if (itemsInTargetCell.length === 0) {
                const multiCellConflicts = currentLayout.filter(item => {
                    if (item.deviceId === draggedDeviceId) return false;
                    const itemWidth = item.width || 1;
                    const itemHeight = item.height || 1;
                    return (targetCol < item.col + itemWidth && targetCol + draggedWidth > item.col && targetRow < item.row + itemHeight && targetRow + draggedHeight > item.row);
                });
                if (multiCellConflicts.length === 0) {
                    newLayout[draggedItemIndex] = { ...draggedItem, col: targetCol, row: targetRow };
                    onDeviceLayoutChange(tab.id, newLayout);
                }
                return;
            }
            
            // B: В ячейке уже есть один элемент, проверяем, можно ли объединить в стопку.
            if (itemsInTargetCell.length === 1 && isDraggedStackable) {
                const existingItem = itemsInTargetCell[0];
                const isExistingStackable = (existingItem.width || 1) === 1 && (existingItem.height || 1) === 0.5;
                if (isExistingStackable) {
                    newLayout[draggedItemIndex] = { ...draggedItem, col: targetCol, row: targetRow };
                    onDeviceLayoutChange(tab.id, newLayout);
                }
                return;
            }
    
            return; // Коллизия
        }
    
        // Случай 2: Сброс прямо на другую карточку
        if (over.data.current?.type === 'device') {
            const overDeviceId = over.id as string;
            const overItemIndex = newLayout.findIndex(item => item.deviceId === overDeviceId);
            if (overItemIndex === -1) return;
    
            const overItem = newLayout[overItemIndex];
            const isDraggedStackable = (draggedItem.width || 1) === 1 && (draggedItem.height || 1) === 0.5;
            const isOverStackable = (overItem.width || 1) === 1 && (overItem.height || 1) === 0.5;
            const itemsInTargetCell = newLayout.filter(item => item.col === overItem.col && item.row === overItem.row);
    
            // Логика объединения в стопку
            if (isDraggedStackable && isOverStackable && itemsInTargetCell.length === 1) {
                newLayout[draggedItemIndex] = { ...draggedItem, col: overItem.col, row: overItem.row };
                onDeviceLayoutChange(tab.id, newLayout);
                return;
            }
    
            // Логика замены (swap)
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
      tab.layout.forEach(item => {
        const w = Math.ceil(item.width || 1);
        const h = Math.ceil(item.height || 1);
        for (let r_offset = 0; r_offset < h; r_offset++) {
          for (let c_offset = 0; c_offset < w; c_offset++) {
            cells.add(`${item.col + c_offset},${item.row + r_offset}`);
          }
        }
      });
      return cells;
    }, [tab.layout]);

    const activeDevice = activeId ? allKnownDevices.get(activeId) : null;
    let activeDeviceTemplate: CardTemplate | undefined;
    if (activeDevice) {
        const custom = customizations[activeDevice.id];
        let templateId = custom?.templateId;
        if (!templateId) {
            if (activeDevice.type === DeviceType.Sensor) templateId = DEFAULT_SENSOR_TEMPLATE_ID;
            else if (activeDevice.type === DeviceType.Light || activeDevice.type === DeviceType.DimmableLight) templateId = DEFAULT_LIGHT_TEMPLATE_ID;
            else if (activeDevice.type === DeviceType.Switch) templateId = DEFAULT_SWITCH_TEMPLATE_ID;
            else if (activeDevice.type === DeviceType.Thermostat) templateId = DEFAULT_CLIMATE_TEMPLATE_ID;
        }
        activeDeviceTemplate = templateId ? templates[templateId] : undefined;
    }

    // Группируем элементы layout по координатам, чтобы рендерить стопки (stacked) карточек.
    const groupedLayout = useMemo(() => {
        const groups = new Map<string, GridLayoutItem[]>();
        if (!tab.layout) return [];
        tab.layout.forEach(item => {
            const key = `${item.col},${item.row}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(item);
        });
        // Сортируем каждую группу, чтобы обеспечить стабильный порядок рендеринга для стеков
        groups.forEach(group => group.sort((a, b) => a.deviceId.localeCompare(b.deviceId)));
        return Array.from(groups.values());
    }, [tab.layout]);

    return (
        <div ref={viewportRef} className="w-full h-full flex items-center justify-center p-4">
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
                <div className="relative" style={{ width: gridMetrics.containerWidth, height: gridMetrics.containerHeight }}>
                    {isEditMode && Array.from({ length: tab.gridSettings.cols * tab.gridSettings.rows }).map((_, index) => {
                        const col = index % tab.gridSettings.cols;
                        const row = Math.floor(index / tab.gridSettings.cols);
                        const isOccupied = occupiedCells.has(`${col},${row}`);
                        if (isOccupied) return null;
                        return <DroppableCell key={`cell-${col}-${row}`} col={col} row={row} isEditMode={isEditMode} metrics={gridMetrics} />;
                    })}

                    {groupedLayout.map((group) => {
                        const firstItem = group[0];
                        if (!firstItem) return null;
                        
                        return (
                             <OccupiedCellWrapper key={`${firstItem.col}-${firstItem.row}`} group={group} isEditMode={isEditMode} activeId={activeId} openMenuDeviceId={openMenuDeviceId} metrics={gridMetrics}>
                                {group.map((item, index) => {
                                    const device = allKnownDevices.get(item.deviceId);
                                    if (!device) return null;

                                    const custom = customizations[device.id];
                                    let templateId = custom?.templateId;

                                    if (!templateId) {
                                        if (device.type === DeviceType.Sensor) templateId = DEFAULT_SENSOR_TEMPLATE_ID;
                                        else if (device.type === DeviceType.Light || device.type === DeviceType.DimmableLight) templateId = DEFAULT_LIGHT_TEMPLATE_ID;
                                        else if (device.type === DeviceType.Switch) templateId = DEFAULT_SWITCH_TEMPLATE_ID;
                                        else if (device.type === DeviceType.Thermostat) templateId = DEFAULT_CLIMATE_TEMPLATE_ID;
                                    }
                                    const templateToUse = templateId ? templates[templateId] : undefined;
                                    
                                    const isStackedPair = group.length === 2 && group.every(i => i.height === 0.5 && (i.width || 1) === 1);

                                    const wrapperStyle: React.CSSProperties = {
                                        position: 'absolute',
                                        zIndex: group.length - index,
                                    };

                                    if (isStackedPair) {
                                        wrapperStyle.height = `calc(50% - ${gridMetrics.gap / 2}px)`;
                                        wrapperStyle.left = '0';
                                        wrapperStyle.right = '0';
                                        if (index === 0) {
                                            wrapperStyle.top = '0';
                                        } else {
                                            wrapperStyle.bottom = '0';
                                        }
                                    } else {
                                        wrapperStyle.inset = 0;
                                    }

                                    return (
                                        <div key={item.deviceId} style={wrapperStyle}>
                                            <DraggableDevice device={device} template={templateToUse} {...props} />
                                        </div>
                                    );
                                })}
                            </OccupiedCellWrapper>
                        )
                    })}
                </div>
                {/* DragOverlay показывает "призрачный" элемент во время перетаскивания для лучшего UX. */}
                 <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
                    {activeDevice && activeDragItemRect ? (
                      <div 
                        className="rounded-2xl" 
                        style={{ 
                          width: activeDragItemRect.width, 
                          height: activeDragItemRect.height,
                          transform: 'scale(1.05)',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
                        }}
                      >
                        <DeviceCard
                          device={activeDevice}
                          template={activeDeviceTemplate}
                          allKnownDevices={props.allKnownDevices}
                          customizations={props.customizations}
                          colorScheme={props.colorScheme}
                          haUrl={props.haUrl}
                          signPath={props.signPath}
                          getCameraStreamUrl={props.getCameraStreamUrl}
                          isEditMode={true}
                          isPreview={true}
                          onDeviceToggle={() => {}}
                          onTemperatureChange={() => {}}
                          onBrightnessChange={() => {}}
                          onHvacModeChange={() => {}}
                          onPresetChange={() => {}}
                          onCameraCardClick={() => {}}
                          onEditDevice={() => {}}
                          onContextMenu={() => {}}
                        />
                      </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
};

export default React.memo(DashboardGrid);