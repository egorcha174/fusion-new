
import React, { useMemo } from 'react';
import DashboardGrid from './DashboardGrid';
import { Tab, Device, GridLayoutItem, CardTemplates, DeviceCustomizations, ColorScheme } from '../types';
import { useHAStore } from '../store/haStore';
import { useAppStore } from '../store/appStore';

interface TabContentProps {
  tab: Tab;
  isEditMode: boolean;
  onDeviceContextMenu: (event: React.MouseEvent, deviceId: string, tabId: string) => void;
  onOpenColorPicker: (event: React.MouseEvent, baseKey: string, targetName: string, isTextElement: boolean, isOn: boolean) => void;
}

const TabContent: React.FC<TabContentProps> = (props) => {
  const { tab } = props;
  const { allKnownDevices, haUrl, signPath, getCameraStreamUrl, handleDeviceToggle, handleTemperatureChange, handleBrightnessChange, handleHvacModeChange, handlePresetChange } = useHAStore();
  const { searchTerm, handleDeviceLayoutChange, setFloatingCamera, setHistoryModalEntityId, setEditingDevice, templates, customizations, colorScheme, theme } = useAppStore();

  // FIX: Derive the correct color theme (light/dark) from the full color scheme object.
  const isSystemDark = useMemo(() => window.matchMedia('(prefers-color-scheme: dark)').matches, []);
  const isDark = useMemo(() => theme === 'night' || (theme === 'auto' && isSystemDark), [theme, isSystemDark]);
  const currentColorScheme = useMemo(() => isDark ? colorScheme.dark : colorScheme.light, [isDark, colorScheme]);

  if (tab.layout.length === 0) {
      return (
          <div className="text-center py-20 text-gray-500">
              <h3 className="text-xl">Эта вкладка пуста</h3>
              <p className="mt-2">Перейдите в "Все устройства" или включите режим редактирования, чтобы добавить их.</p>
          </div>
      )
  }
  
  return <DashboardGrid 
            {...props}
            allKnownDevices={allKnownDevices}
            searchTerm={searchTerm}
            onDeviceLayoutChange={handleDeviceLayoutChange}
            onDeviceToggle={handleDeviceToggle}
            onTemperatureChange={handleTemperatureChange}
            onBrightnessChange={handleBrightnessChange}
            onHvacModeChange={handleHvacModeChange}
            onPresetChange={handlePresetChange}
            onCameraCardClick={setFloatingCamera}
            onShowHistory={setHistoryModalEntityId}
            onEditDevice={setEditingDevice}
            haUrl={haUrl}
            signPath={signPath}
            getCameraStreamUrl={getCameraStreamUrl}
            templates={templates}
            customizations={customizations}
            colorScheme={currentColorScheme}
        />;
};

export default React.memo(TabContent);