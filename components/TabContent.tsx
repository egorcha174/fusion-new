import React, { useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import DraggableDeviceCard from './DraggableDeviceCard';
import GroupContainer from './GroupContainer';
import { Tab, Device, CardSize, DeviceCustomizations, Group } from '../types';

interface TabContentProps {
  tab: Tab;
  devices: Device[];
  customizations: DeviceCustomizations;
  onDeviceOrderChange: (tabId: string, newDevices: Device[], groupId?: string | null) => void;
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
  onToggleGroupCollapse: (groupId: string) => void;
  cardSize: CardSize;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
}

const TabContent: React.FC<TabContentProps> = ({
  tab,
  devices,
  customizations,
  onDeviceOrderChange,
  onDeviceRemoveFromTab,
  onDeviceToggle,
  onTemperatureChange,
  onBrightnessChange,
  onPresetChange,
  onCameraCardClick,
  isEditMode,
  onEditDevice,
  onDeviceContextMenu,
  onEditGroup,
  onToggleGroupCollapse,
  cardSize,
  haUrl,
  signPath,
  getCameraStreamUrl,
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


  if (devices.length === 0) {
      return (
          <div className="text-center py-20 text-gray-500">
              <h3 className="text-xl">Эта вкладка пуста</h3>
              <p className="mt-2">Перейдите на вкладку "Все устройства" или в режим редактирования, чтобы добавить их.</p>
          </div>
      )
  }

  return (
    <section className="space-y-8">
        {groups.map(group => (
            <GroupContainer
                key={group.id}
                tabId={tab.id}
                group={group}
                devices={groupedDevices.get(group.id) || []}
                onDeviceOrderChange={onDeviceOrderChange}
                onDeviceRemoveFromTab={onDeviceRemoveFromTab}
                onDeviceToggle={onDeviceToggle}
                onTemperatureChange={onTemperatureChange}
                onBrightnessChange={onBrightnessChange}
                onPresetChange={onPresetChange}
                onCameraCardClick={onCameraCardClick}
                isEditMode={isEditMode}
                onEditDevice={onEditDevice}
                onDeviceContextMenu={onDeviceContextMenu}
                onEditGroup={onEditGroup}
                onToggleCollapse={onToggleGroupCollapse}
                cardSize={cardSize}
                haUrl={haUrl}
                signPath={signPath}
                getCameraStreamUrl={getCameraStreamUrl}
            />
        ))}

        {sortedUngroupedDevices.length > 0 && (
            <UngroupedDevicesContainer
                tabId={tab.id}
                devices={sortedUngroupedDevices}
                onDeviceOrderChange={(ordered) => onDeviceOrderChange(tab.id, ordered, null)}
                {...{onDeviceRemoveFromTab, onDeviceToggle, onTemperatureChange, onBrightnessChange, onPresetChange, onCameraCardClick, isEditMode, onEditDevice, onDeviceContextMenu, cardSize, haUrl, signPath, getCameraStreamUrl }}
            />
        )}
    </section>
  );
};


// A separate component for the ungrouped devices to encapsulate their DND context
interface UngroupedDevicesContainerProps extends Omit<TabContentProps, 'tab' | 'devices' | 'customizations' | 'onDeviceOrderChange' | 'onEditGroup' | 'onToggleGroupCollapse'> {
    tabId: string;
    devices: Device[];
    onDeviceOrderChange: (newDevices: Device[]) => void;
}

const UngroupedDevicesContainer: React.FC<UngroupedDevicesContainerProps> = ({
    tabId, devices, onDeviceOrderChange, ...props
}) => {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const handleDragEnd = (event: DragEndEvent) => {
        if (props.isEditMode) return;
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = devices.findIndex((d) => d.id === active.id);
            const newIndex = devices.findIndex((d) => d.id === over.id);
            onDeviceOrderChange(arrayMove(devices, oldIndex, newIndex));
        }
    };

    const getGridClasses = (size: CardSize): string => {
        switch (size) {
            case 'sm': return 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-3';
            case 'lg': return 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5';
            case 'md': default: return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4';
        }
    };

    return (
        <div>
            <h2 className="text-xs font-bold uppercase text-gray-500 mb-4">Несгруппированные</h2>
             <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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