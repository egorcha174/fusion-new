






import React from 'react';
import DashboardGrid from './DashboardGrid';
import { Tab, Device, GridLayoutItem, CardTemplates, DeviceCustomizations, ColorScheme } from '../types';

interface TabContentProps {
  tab: Tab;
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
  isEditMode: boolean;
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

const TabContent: React.FC<TabContentProps> = (props) => {
  const { tab } = props;

  if (tab.layout.length === 0) {
      return (
          <div className="text-center py-20 text-gray-500">
              <h3 className="text-xl">Эта вкладка пуста</h3>
              <p className="mt-2">Перейдите в "Все устройства" или включите режим редактирования, чтобы добавить их.</p>
          </div>
      )
  }
  
  return <DashboardGrid {...props} />;
};

export default React.memo(TabContent);