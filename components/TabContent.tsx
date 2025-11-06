import React from 'react';
import DashboardGrid from './DashboardGrid';
import { Tab, Device } from '../types';

interface TabContentProps {
  tab: Tab;
  devices: Device[]; // Filtered devices for the current tab
  onDeviceOrderChange: (tabId: string, newOrderedDeviceIds: string[]) => void;
  onDeviceRemoveFromTab: (deviceId: string, tabId:string) => void;
  onDeviceToggle: (deviceId: string) => void;
  onTemperatureChange: (deviceId: string, change: number) => void;
  onBrightnessChange: (deviceId: string, brightness: number) => void;
  onPresetChange: (deviceId: string, preset: string) => void;
  onCameraCardClick: (device: Device) => void;
  isEditMode: boolean;
  onEditDevice: (device: Device) => void;
  onDeviceContextMenu: (event: React.MouseEvent, deviceId: string, tabId: string) => void;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
}

const TabContent: React.FC<TabContentProps> = (props) => {
  const { devices } = props;

  if (devices.length === 0) {
      return (
          <div className="text-center py-20 text-gray-500">
              <h3 className="text-xl">Эта вкладка пуста</h3>
              <p className="mt-2">Перейдите в "Все устройства" или включите режим редактирования, чтобы добавить их.</p>
          </div>
      )
  }
  
  return <DashboardGrid {...props} />;
};

export default TabContent;