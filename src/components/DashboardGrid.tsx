
import React, { useState, useMemo } from 'react';
import {
  DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent,
  useDraggable, useDroppable, DragOverlay, pointerWithin,
} from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { DeviceCard } from './DeviceCard';
import { Tab, Device, GridLayoutItem, CardTemplates, DeviceCustomizations, ThemeColors } from '../types';
import { useAppStore } from '../store/appStore';
import ErrorBoundary from './ErrorBoundary';

// Workaround for TypeScript errors with motion.div props in some environments
const MotionDiv: any = motion.div;

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
  onShowHistory: (entityId: string) => void;
  onEditDevice: (device: Device) => void;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
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
  onEditDevice,
  haUrl,
  signPath,
  customizations,
  colorScheme,
  isDark,
}) => {
  const { getTemplateForDevice, checkCollision } = useAppStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const cols = tab.gridSettings.cols || 8;
  const rows = tab.gridSettings.rows || 5;

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
    
    // FIX: checkCollision expects width and height to be numbers, ensure they are provided.
    const itemToCheck = {
        ...newLayoutItem,
        width: newLayoutItem.width || 1,
        height: newLayoutItem.height || 1
    };
    
    const hasCollision = checkCollision(tab.layout, itemToCheck, tab.gridSettings, deviceId);
    
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
        className="w-full h-full overflow-hidden no-scrollbar"
      >
        <div
          className="grid gap-3 h-full"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
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
                      cardWidth={width}
                      cardHeight={height}
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
                      onEditDevice={onEditDevice}
                      haUrl={haUrl}
                      signPath={signPath}
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
                      cardWidth={tab.layout.find(item => item.deviceId === activeDevice.id)?.width || 1}
                      cardHeight={tab.layout.find(item => item.deviceId === activeDevice.id)?.height || 1}
                      allKnownDevices={allKnownDevices}
                      customizations={customizations}
                      isEditMode={false}
                      onDeviceToggle={() => {}}
                      onTemperatureChange={() => {}}
                      onBrightnessChange={() => {}}
                      onHvacModeChange={() => {}}
                      onPresetChange={() => {}}
                      onFanSpeedChange={() => {}}
                      onEditDevice={() => {}}
                      haUrl={haUrl}
                      signPath={signPath}
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
