import React, { useRef, useState, useLayoutEffect, useMemo, useCallback } from 'react';
import {
  DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent,
  useDraggable, useDroppable, DragOverlay, pointerWithin,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import DeviceCard from './DeviceCard';
import { Tab, Device, DeviceType, GridLayoutItem, CardTemplates, DeviceCustomizations, CardTemplate, ColorScheme, ColorThemeSet } from '../types';
import { useAppStore } from '../store/appStore';
import LoadingSpinner from './LoadingSpinner';

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
}> = React.memo(({ device, isEditMode, onDeviceToggle, onShowHistory, template, allKnownDevices, customizations, colorScheme, ...cardProps }) => {
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

  const handleClick = useCallback((e: React.MouseEvent) => {
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
  }, [isEditMode, device.type, device.id, onShowHistory, onDeviceToggle]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    cardProps.onDeviceContextMenu(e, device.id, cardProps.tab.id);
  }, [cardProps.onDeviceContextMenu, device.id, cardProps.tab.id]);

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
        onFanSpeedChange={(deviceId, percentage) => cardProps.onFanSpeedChange(deviceId, percentage)}
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
});


/**
 * Компонент пустой ячейки сетки, которая является зоной для сброса (Droppable).
 * Отображается только в режиме редактирования.
 */
const DroppableCell: React.FC<{
  col: number;
  row: number;
  isEditMode: boolean;
  metrics: { cellSize: number; gap: number; };
}> = React.memo(({ col, row, isEditMode, metrics }) => {
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
});

const OccupiedCellWrapper: React.FC<{
    group: GridLayoutItem[];
    children: React.ReactNode;
    isEditMode: boolean;
    activeId: string | null;
    openMenuDeviceId: string | null;
    metrics: { cellSize: number; gap: number; };
}> = React.memo(({ group, children, isEditMode, activeId, openMenuDeviceId, metrics }) => {
    const firstItem = group[0];
    const { setNodeRef, isOver } = useDroppable({
        id: `cell-${firstItem.col}-${firstItem.row}`,
        data: { type: 'cell', col: firstItem.col, row: firstItem.row }
    });
    
    // Определяем, является ли группа одиночной карточкой 1x0.5, чтобы сделать ее контейнер 1x1 для drop-зоны.
    const isSingleStackable = group.length === 1 && firstItem.height === 0.5 && (firstItem.width || 1) === 1;
    const isStackedPair = group.length === 2 && group.every(item => item.height === 0.5 && (item.width || 1) === 1);
    
    const width = firstItem.width || 1;
    // Если это одиночная карточка 1x0.5 или уже стопка, контейнер должен быть высотой в 1 ячейку.
    const containerHeight = (isSingleStackable || isStackedPair) ? 1 : (firstItem.height || 1);
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
});


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
  onFanSpeedChange: (deviceId: string, percentage: number) => void;
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
        const rect = event.active.rect.current.initial;
        if (rect) {
            setActiveDragItemRect({ width: rect.width, height: rect.height });
        } else {
            // Резервный вариант, если dnd-kit не смог измерить элемент
            const layoutItem = tab.layout.find(item => item.deviceId === event.active.id);
            if (layoutItem && gridMetrics.cellSize > 0) {
                const width = (layoutItem.width || 1) * gridMetrics.cellSize + (Math.ceil(layoutItem.width || 1) - 1) * gridMetrics.gap;
                const height = (layoutItem.height || 1) * gridMetrics.cellSize + (Math.ceil(layoutItem.height || 1) - 1) * gridMetrics.gap;
                setActiveDragItemRect({ width, height });
            }
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
    
        let targetCol: number | undefined;
        let targetRow: number | undefined;
        let overItem: GridLayoutItem | undefined;
    
        // 1. Определяем целевые координаты (col, row).
        if (over.data.current?.type === 'cell') {
            targetCol = over.data.current.col;
            targetRow = over.data.current.row;
        } else if (over.data.current?.type === 'device') {
            overItem = currentLayout.find(item => item.deviceId === over.id);
            if (!overItem) return;
            targetCol = overItem.col;
            targetRow = overItem.row;
        } else {
            return; // Неизвестная цель.
        }
    
        if (targetCol === undefined || targetRow === undefined) return;
    
        const draggedWidth = draggedItem.width || 1;
        const draggedHeight = draggedItem.height || 1;
        const newPositionItem = { col: targetCol, row: targetRow, width: draggedWidth, height: draggedHeight };

        // 2. Используем централизованную функцию checkCollision, которая умеет обрабатывать стопки.
        const hasCollision = useAppStore.getState().checkCollision(currentLayout, newPositionItem, tab.gridSettings, draggedDeviceId);
        
        if (!hasCollision) {
            // Перемещение разрешено (в пустую ячейку или для создания стопки).
            newLayout[draggedItemIndex] = { ...draggedItem, col: targetCol, row: targetRow };
            onDeviceLayoutChange(tab.id, newLayout);
            return;
        }
        
        // 3. Если есть коллизия, проверяем, не является ли это случаем для обмена (swap).
        if (overItem) {
            const overItemIndex = currentLayout.findIndex(i => i.deviceId === overItem.deviceId);
            const overWidth = overItem.width || 1;
            const overHeight = overItem.height || 1;
            
            // Обмен возможен только для карточек одинакового размера.
            if (draggedWidth === overWidth && draggedHeight === overHeight) {
                // Проверяем, не вызовет ли обмен новую коллизию для перемещаемой карточки.
                const overItemNewPos = { col: draggedItem.col, row: draggedItem.row, width: overWidth, height: overHeight };
                const swapHasCollision = useAppStore.getState().checkCollision(currentLayout, overItemNewPos, tab.gridSettings, overItem.deviceId);

                if (!swapHasCollision) {
                    newLayout[draggedItemIndex] = { ...draggedItem, col: overItem.col, row: overItem.row };
                    newLayout[overItemIndex] = { ...overItem, col: draggedItem.col, row: draggedItem.row };
                    onDeviceLayoutChange(tab.id, newLayout);
                }
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

    // Не рендерим сетку, пока ее размеры не будут вычислены, чтобы избежать "схлопывания" в углу.
    if (gridMetrics.cellSize <= 0) {
        return (
            <div ref={viewportRef} className="w-full h-full flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

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
                                    const isSingleStackableItem = group.length === 1 && item.height === 0.5 && (item.width || 1) === 1;

                                    const wrapperStyle: React.CSSProperties = {
                                        position: 'absolute',
                                        zIndex: group.length - index,
                                    };

                                    if (isStackedPair) {
                                        // Пара карточек 1x0.5. Позиционируем их сверху и снизу.
                                        wrapperStyle.height = `calc(50% - ${gridMetrics.gap / 2}px)`;
                                        wrapperStyle.left = '0';
                                        wrapperStyle.right = '0';
                                        if (index === 0) { // Стабильная сортировка гарантирует, что первый элемент всегда будет одним и тем же
                                            wrapperStyle.top = '0';
                                        } else {
                                            wrapperStyle.bottom = '0';
                                        }
                                    } else if (isSingleStackableItem) {
                                        // Одиночная карточка 1x0.5. Ее контейнер 1x1. Размещаем ее вверху.
                                        wrapperStyle.height = `calc(50% - ${gridMetrics.gap / 2}px)`;
                                        wrapperStyle.top = '0';
                                        wrapperStyle.left = '0';
                                        wrapperStyle.right = '0';
                                    } else {
                                        // Обычная, не "стопочная" карточка. Заполняет свой контейнер.
                                        wrapperStyle.inset = 0;
                                    }

                                    return (
                                        <div key={item.deviceId} style={wrapperStyle}>
                                            <DraggableDevice device={device} template={templateToUse} {...props} openMenuDeviceId={openMenuDeviceId} setOpenMenuDeviceId={setOpenMenuDeviceId} />
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
                          onFanSpeedChange={() => {}}
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