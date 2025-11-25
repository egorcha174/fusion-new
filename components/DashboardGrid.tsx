
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent,
  useDraggable, useDroppable, DragOverlay, pointerWithin,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { motion } from 'framer-motion';
import DeviceCard from './DeviceCard';
import { Tab, Device, GridLayoutItem, CardTemplates, DeviceCustomizations, ThemeColors, CardTemplate } from '../types';
import { useAppStore } from '../store/appStore';
import ErrorBoundary from './ErrorBoundary';

// Workaround for TypeScript errors with motion.div props in some environments
const MotionDiv = motion.div as any;

interface DashboardGridProps {
  tab: Tab;
  isEditMode: boolean;
  allKnownDevices: Map<string, Device>;
  searchTerm: string;
  onDeviceLayoutChange: (tabId: string, newLayout: GridLayoutItem[]) => void;
  onDeviceToggle: (deviceId: string) => void;
  onTemperatureChange: (deviceId: string, temperature: number, isDelta?: boolean) => void;
  onBrightnessChange: (deviceId: string, brightness: number) => void;
  onHvacModeChange: (deviceId: string, mode: string) => void;
  onPresetChange: (deviceId: string, preset: string) => void;
  onFanSpeedChange: (deviceId: string, value: number | string) => void;
  onCameraCardClick: (device: Device) => void;
  onShowHistory: (entityId: string) => void;
  onEditDevice: (device: Device) => void;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<{ url: string }>;
  templates: CardTemplates;
  customizations: DeviceCustomizations;
  colorScheme: ThemeColors;
  isDark: boolean;
}

const DraggableDevice: React.FC<{
  device: Device;
  isEditMode: boolean;
  children: React.ReactNode;
  [key: string]: any;
}> = ({ device, isEditMode, children, ...props }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: device.id,
    disabled: !isEditMode,
    data: { device },
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.3 : 1,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    height: '100%',
    width: '100%',
    cursor: isEditMode ? 'grab' : 'default',
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} {...props}>
      {children}
    </div>
  );
};

const DroppableCell: React.FC<{
  col: number;
  row: number;
  children?: React.ReactNode;
  isEditMode: boolean;
}> = ({ col, row, children, isEditMode }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${col}-${row}`,
    data: { col, row },
    disabled: !isEditMode,
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-full h-full rounded-xl transition-colors duration-200 ${
        isOver && isEditMode ? 'bg-blue-500/30 ring-2 ring-blue-500' : ''
      }`}
    >
      {children}
    </div>
  );
};

const DashboardGrid: React.FC<DashboardGridProps> = ({
  tab,
  isEditMode,
  allKnownDevices,
  searchTerm,
  onDeviceLayoutChange,
  onDeviceToggle,
  onTemperatureChange,
  onBrightnessChange,
  onHvacModeChange,
  onPresetChange,
  onFanSpeedChange,
  onCameraCardClick,
  onEditDevice,
  haUrl,
  signPath,
  getCameraStreamUrl,
  customizations,
  colorScheme,
  isDark,
}) => {
  const { getTemplateForDevice, checkCollision } = useAppStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Dynamic Row Height Calculation
  const containerRef = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(100);
  const cols = tab.gridSettings.cols || 8;
  const rows = tab.gridSettings.rows || 5;

  useEffect(() => {
    const updateLayout = () => {
        if (!containerRef.current) return;
        
        // Получаем доступную высоту контейнера (viewport)
        const height = containerRef.current.clientHeight;
        
        // p-4 = 1rem сверху + 1rem снизу = 32px
        const verticalPadding = 32;
        // gap-4 = 1rem = 16px
        const gap = 16;

        // Рассчитываем доступное пространство для самих ячеек
        const availableHeight = height - verticalPadding;
        
        // Вычитаем пространство, занимаемое отступами между строками
        const totalGapHeight = Math.max(0, rows - 1) * gap;

        // Делим оставшееся пространство на количество строк
        const calculatedHeight = (availableHeight - totalGapHeight) / rows;
        
        // Устанавливаем минимальную высоту, чтобы интерфейс не "схлопывался" на очень маленьких экранах
        // Но в целом стараемся уместить всё в экран.
        setRowHeight(Math.max(50, calculatedHeight));
    };

    // Create observer to react to container resize (e.g. sidebar toggle or window resize)
    const observer = new ResizeObserver(updateLayout);
    if (containerRef.current) {
        observer.observe(containerRef.current);
    }
    // Initial call
    updateLayout();

    return () => observer.disconnect();
  }, [rows, cols]); // Пересчитываем, если меняются настройки сетки


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const overId = over.id as string;
    // Expecting overId to be "cell-col-row"
    if (!overId.startsWith('cell-')) return;

    const parts = overId.split('-');
    const destCol = parseInt(parts[1]);
    const destRow = parseInt(parts[2]);

    const deviceId = active.id as string;
    const currentItem = tab.layout.find((item) => item.deviceId === deviceId);

    if (!currentItem) return;
    
    const newLayoutItem = { ...currentItem, col: destCol, row: destRow };
    
    const hasCollision = checkCollision(tab.layout, newLayoutItem, tab.gridSettings, deviceId);
    
    if (!hasCollision) {
        const newLayout = tab.layout.map((item) =>
            item.deviceId === deviceId ? newLayoutItem : item
        );
        onDeviceLayoutChange(tab.id, newLayout);
    }
  };

  const activeDevice = activeId ? allKnownDevices.get(activeId) : null;
  
  const filteredLayout = useMemo(() => {
      if (!searchTerm) return tab.layout;
      return tab.layout.filter(item => {
          const dev = allKnownDevices.get(item.deviceId);
          return dev && dev.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [tab.layout, searchTerm, allKnownDevices]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div 
        ref={containerRef}
        className="w-full h-full overflow-y-auto p-4 no-scrollbar"
      >
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridAutoRows: `${rowHeight}px`,
            // minHeight: '100%', // Removed to allow precise fit
          }}
        >
          {isEditMode && Array.from({ length: cols * rows }).map((_, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            return (
              <div
                key={`cell-${col}-${row}`}
                style={{ gridColumnStart: col + 1, gridRowStart: row + 1 }}
                className="z-0 pointer-events-auto"
              >
                <DroppableCell col={col} row={row} isEditMode={isEditMode}>
                    <div className="w-full h-full border border-dashed border-gray-300 dark:border-gray-700 rounded-xl opacity-50" />
                </DroppableCell>
              </div>
            );
          })}

          {filteredLayout.map((item) => {
            const device = allKnownDevices.get(item.deviceId);
            if (!device) return null;

            const template = getTemplateForDevice(device);
            const width = item.width || template?.width || 1;
            const height = item.height || template?.height || 1;

            return (
              <MotionDiv
                key={item.deviceId}
                layout={!isEditMode}
                initial={false}
                className="z-10"
                style={{
                  gridColumn: `${item.col + 1} / span ${width}`,
                  gridRow: `${item.row + 1} / span ${height}`,
                }}
              >
                <DraggableDevice 
                    device={device} 
                    isEditMode={isEditMode}
                    data-device-id={device.id}
                    data-tab-id={tab.id}
                >
                  <ErrorBoundary isCard>
                    <DeviceCard
                      device={device}
                      template={template || undefined}
                      allKnownDevices={allKnownDevices}
                      customizations={customizations}
                      isEditMode={isEditMode}
                      onDeviceToggle={onDeviceToggle}
                      onTemperatureChange={onTemperatureChange}
                      onBrightnessChange={onBrightnessChange}
                      onHvacModeChange={onHvacModeChange}
                      onPresetChange={onPresetChange}
                      onFanSpeedChange={onFanSpeedChange}
                      onCameraCardClick={onCameraCardClick}
                      onEditDevice={onEditDevice}
                      haUrl={haUrl}
                      signPath={signPath}
                      getCameraStreamUrl={getCameraStreamUrl}
                      colorScheme={colorScheme}
                      isDark={isDark}
                    />
                  </ErrorBoundary>
                </DraggableDevice>
              </MotionDiv>
            );
          })}
        </div>
      </div>

      <DragOverlay adjustScale style={{ transformOrigin: '0 0' }} zIndex={100}>
        {activeDevice ? (
            <div className="w-full h-full opacity-90 shadow-2xl scale-105">
                 <DeviceCard
                      device={activeDevice}
                      template={getTemplateForDevice(activeDevice) || undefined}
                      allKnownDevices={allKnownDevices}
                      customizations={customizations}
                      isEditMode={false}
                      onDeviceToggle={() => {}}
                      onTemperatureChange={() => {}}
                      onBrightnessChange={() => {}}
                      onHvacModeChange={() => {}}
                      onPresetChange={() => {}}
                      onFanSpeedChange={() => {}}
                      onCameraCardClick={() => {}}
                      onEditDevice={() => {}}
                      haUrl={haUrl}
                      signPath={signPath}
                      getCameraStreamUrl={getCameraStreamUrl}
                      colorScheme={colorScheme}
                      isDark={isDark}
                      autoPlay={false}
                    />
            </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default React.memo(DashboardGrid);
