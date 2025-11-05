import React from 'react';
import FlowTabLayout from './FlowTabLayout';
import GridTabLayout from './GridTabLayout';
import { Tab, Device, CardSize, DeviceCustomizations, Group, LayoutMode, LayoutItem } from '../types';

interface TabContentProps {
  tab: Tab;
  devices: Device[]; // Filtered devices for the current tab
  allDevices: Map<string, Device>; // All known devices for lookups
  customizations: DeviceCustomizations;
  onDeviceOrderChange: (tabId: string, newDevices: Device[], groupId?: string | null) => void;
  onGroupOrderChange: (tabId: string, newOrderedGroupIds: string[]) => void;
  onGridLayoutChange: (tabId: string, newLayout: LayoutItem[]) => void;
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

const TabContent: React.FC<TabContentProps> = (props) => {
  const { tab, devices } = props;

  if (devices.length === 0) {
      return (
          <div className="text-center py-20 text-gray-500">
              <h3 className="text-xl">Эта вкладка пуста</h3>
              <p className="mt-2">Перейдите на вкладку "Все устройства" или в режим редактирования, чтобы добавить их.</p>
          </div>
      )
  }

  // Ensure layoutMode exists, default to Flow for backward compatibility
  const layoutMode = tab.layoutMode ?? LayoutMode.Flow;

  if (layoutMode === LayoutMode.Grid) {
    return <GridTabLayout {...props} />;
  }
  
  return <FlowTabLayout {...props} />;
};

export default TabContent;