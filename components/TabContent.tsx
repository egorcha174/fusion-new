import React, { useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DraggableDeviceCard from './DraggableDeviceCard';
import GroupContainer from './GroupContainer';
import { Tab, Device, CardSize, DeviceCustomizations, Group } from '../types';
import { getGridClasses } from '../utils/grid-calculations';

interface TabContentProps {
  tab: Tab;
  devices: Device[];
  customizations: DeviceCustomizations;
  onDeviceOrderChange: (tabId: string, newDevices: Device[], groupId?: string | null) => void;
  onGroupOrderChange: (tabId: string, newOrderedGroupIds: string[]) => void;
  onDeviceRemoveFromTab: (deviceId: string, tabId: string) => void;
  onDeviceToggle: (deviceId: string) => void;
  onTemperatureChange: (deviceId: string, change: number) => void;
  onBrightnessChange: (deviceId: string, brightness: number) => void;
  onPresetChange: (deviceId: string, preset: string) => void;
  onCameraCardClick: (device: Device) => void;
  isEditMode: boolean;
  onEditDevice: (device: Device) => void;
  onDeviceContextMenu: (event: React.MouseEvent, deviceId: string, tabId: string) => void;
  onEditGroup: (group: Group) => void;
  cardSize: CardSize;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
}

const UNGROUPED_DEVICES_ID = '---ungrouped-devices---';

interface SortableGridItemProps {
    id: string;
    isEditMode: boolean;
    children: (dragHandleProps: any) => React.ReactNode;
    style?: React.CSSProperties;
}

const SortableGridItem: React.FC<SortableGridItemProps> = ({ id, isEditMode, children, style: gridStyle }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
        disabled: !isEditMode,
    });
    const style: React.CSSProperties = {
        ...gridStyle,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        alignSelf: 'start', // Prevents items from stretching to fill the grid row height
    };

    return <div ref={setNodeRef} style={style} {...attributes}>{children(listeners)}</div>;
};


const TabContent: React.FC<TabContentProps> = ({
  tab,
  devices,
  customizations,
  onDeviceOrderChange,
  onGroupOrderChange,
  ...props
}) => {
  const { groups = [] } = tab;

  const { groupedDevices, sortedUngroupedDevices } = useMemo(() => {
    const grouped = new Map<string, Device[]>();
    const ungrouped: Device[] = [];

    groups.forEach(g => grouped.set(g.id, []));

    for (const device of devices) {
        const groupId = customizations[device.id]?.groupId;
        if (groupId && grouped.has(groupId)) {
            grouped.get(groupId)!.push(device);
        } else {
            ungrouped.push(device);
        }
    }
    
    const order = tab.orderedDeviceIds || [];
    let sortedUngrouped: Device[];
    if (order.length === 0) {
      sortedUngrouped = ungrouped;
    } else {
      const deviceMap = new Map(ungrouped.map(d => [d.id, d]));
      const ordered = order.map(id => deviceMap.get(id)).filter((d): d is Device => !!d);
      const unordered = ungrouped.filter(d => !order.includes(d.id));
      sortedUngrouped = [...ordered, ...unordered];
    }
    
    return { groupedDevices: grouped, sortedUngroupedDevices: sortedUngrouped };
  }, [devices, customizations, groups, tab.orderedDeviceIds]);

  const sortableItems = useMemo(() => {
    const groupMap = new Map(groups.map(g => [g.id, g]));
    const hasUngrouped = sortedUngroupedDevices.length > 0;
    const defaultOrder = [...groups.map(g => g.id), ...(hasUngrouped ? [UNGROUPED_DEVICES_ID] : [])];
    const orderedIds = tab.orderedGroupIds || defaultOrder;
  
    return orderedIds
      .map(id => {
        if (id === UNGROUPED_DEVICES_ID) {
          return hasUngrouped ? { id: UNGROUPED_DEVICES_ID, isUngrouped: true } : null;
        }
        return groupMap.get(id);
      })
      .filter(item => !!item);
  }, [tab.orderedGroupIds, groups, sortedUngroupedDevices.length]);

  const sortableItemIds = useMemo(() => sortableItems.map(item => item!.id), [sortableItems]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const oldIndex = sortableItemIds.indexOf(active.id as string);
        const newIndex = sortableItemIds.indexOf(over.id as string);
        onGroupOrderChange(tab.id, arrayMove(sortableItemIds, oldIndex, newIndex));
    }
  };
  
  const mainGridClasses = getGridClasses(props.cardSize);

  if (devices.length === 0) {
      return (
          <div className="text-center py-20 text-gray-500">
              <h3 className="text-xl">Эта вкладка пуста</h3>
              <p className="mt-2">Перейдите на вкладку "Все устройства" или в режим редактирования, чтобы добавить их.</p>
          </div>
      )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortableItemIds} strategy={rectSortingStrategy}>
        <div className={mainGridClasses}>
            {sortableItems.map(item => {
              const id = item!.id;
              if ('isUngrouped' in item!) {
                return (
                  <SortableGridItem key={id} id={id} isEditMode={props.isEditMode} style={{ gridColumn: '1 / -1' }}>
                    {(dragHandleProps) => (
                      <UngroupedDevicesContainer
                        tabId={tab.id}
                        devices={sortedUngroupedDevices}
                        onDeviceOrderChange={(ordered) => onDeviceOrderChange(tab.id, ordered, null)}
                        dragHandleProps={dragHandleProps}
                        customizations={customizations}
                        {...props}
                      />
                    )}
                  </SortableGridItem>
                );
              }
              const group = item as Group;
              return (
                <SortableGridItem key={id} id={id} isEditMode={props.isEditMode} style={{ gridColumn: `span ${Math.min(group.width || 4, 4)}` }}>
                  {(dragHandleProps) => (
                    <GroupContainer
                      tabId={tab.id}
                      group={group}
                      devices={groupedDevices.get(group.id) || []}
                      onDeviceOrderChange={onDeviceOrderChange}
                      dragHandleProps={dragHandleProps}
                      {...props}
                    />
                  )}
                </SortableGridItem>
              );
            })}
        </div>
      </SortableContext>
    </DndContext>
  );
};

interface UngroupedDevicesContainerProps extends Omit<TabContentProps, 'tab' | 'devices' | 'onDeviceOrderChange' | 'onGroupOrderChange' | 'onEditGroup'> {
    tabId: string;
    devices: Device[];
    onDeviceOrderChange: (newDevices: Device[]) => void;
    dragHandleProps: any;
}

const UngroupedDevicesContainer: React.FC<UngroupedDevicesContainerProps> = ({
    tabId, devices, onDeviceOrderChange, dragHandleProps, ...props
}) => {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const handleDeviceDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = devices.findIndex((d) => d.id === active.id);
            const newIndex = devices.findIndex((d) => d.id === over.id);
            onDeviceOrderChange(arrayMove(devices, oldIndex, newIndex));
        }
    };

    return (
        <div>
            <div className="flex items-center mb-4">
                 {props.isEditMode && (
                    <div {...dragHandleProps} className="p-1 -ml-1 mr-1 cursor-move text-gray-500 hover:text-white rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M5 8a1 1 0 11-2 0 1 1 0 012 0zM5 12a1 1 0 11-2 0 1 1 0 012 0zM11 8a1 1 0 100-2 1 1 0 000 2zM11 12a1 1 0 100-2 1 1 0 000 2zM15 8a1 1 0 11-2 0 1 1 0 012 0zM15 12a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                    </div>
                )}
                <h2 className="text-2xl font-bold">Несгруппированные</h2>
            </div>
             <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDeviceDragEnd}>
                <SortableContext items={devices.map(d => d.id)} strategy={rectSortingStrategy}>
                    <div className={getGridClasses(props.cardSize)}>
                        {devices.map((device) => (
                            <DraggableDeviceCard
                                key={device.id}
                                device={device}
                                onToggle={() => props.onDeviceToggle(device.id)}
                                onTemperatureChange={(change) => props.onTemperatureChange(device.id, change)}
                                onBrightnessChange={(brightness) => props.onBrightnessChange(device.id, brightness)}
                                onPresetChange={(preset) => props.onPresetChange(device.id, preset)}
                                onCameraCardClick={props.onCameraCardClick}
                                isEditMode={props.isEditMode}
                                onEditDevice={props.onEditDevice}
                                onRemoveFromTab={() => props.onDeviceRemoveFromTab(device.id, tabId)}
                                onContextMenu={(event) => props.onDeviceContextMenu(event, device.id, tabId)}
                                cardSize={props.cardSize}
                                haUrl={props.haUrl}
                                signPath={props.signPath}
                                getCameraStreamUrl={props.getCameraStreamUrl}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}


export default TabContent;