


import React, { useMemo } from 'react';
import DashboardGrid from './DashboardGrid';
import { Tab, Device, GridLayoutItem, CardTemplates, DeviceCustomizations, ColorScheme, ColorThemeSet } from '../types';
import { useHAStore } from '../store/haStore';
import { useAppStore } from '../store/appStore';

interface TabContentProps {
  tab: Tab;
  isEditMode: boolean;
  onDeviceContextMenu: (event: React.MouseEvent, deviceId: string, tabId: string) => void;
  currentColorScheme: ColorThemeSet;
  isDark: boolean;
}

/**
 * Компонент-контейнер для содержимого активной вкладки.
 * Его основная задача - получить все необходимые данные из хранилищ (Zustand)
 * и передать их в компонент `DashboardGrid`, который отвечает за рендеринг сетки.
 * Это позволяет `DashboardGrid` быть более "чистым" компонентом, не зависящим напрямую от хранилищ.
 */
const TabContent: React.FC<TabContentProps> = (props) => {
  const { tab, currentColorScheme } = props;
  const { allKnownDevices, haUrl, signPath, getCameraStreamUrl, handleDeviceToggle, handleTemperatureChange, handleBrightnessChange, handleHvacModeChange, handlePresetChange, handleFanSpeedChange } = useHAStore();
  const { searchTerm, handleDeviceLayoutChange, setFloatingCamera, setHistoryModalEntityId, setEditingDevice, templates, customizations } = useAppStore();

  // Если на вкладке нет устройств, показываем заглушку.
  if (tab.layout.length === 0) {
      return (
          <div className="text-center py-20 text-gray-500">
              <h3 className="text-xl">Эта вкладка пуста</h3>
              <p className="mt-2">Перейдите в "Все устройства" или включите режим редактирования, чтобы добавить их.</p>
          </div>
      )
  }
  
  // Рендерим сетку, передавая ей все необходимые пропсы.
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
            onFanSpeedChange={handleFanSpeedChange}
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