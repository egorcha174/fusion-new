

import React, { useMemo } from 'react';
import DashboardGrid from './DashboardGrid';
import { Tab, Device, GridLayoutItem, CardTemplates, DeviceCustomizations, ColorScheme, ColorThemeSet, ThemeColors } from '../types';
import { useHAStore } from '../store/haStore';
import { useAppStore } from '../store/appStore';

interface TabContentProps {
  tab: Tab;
  isEditMode: boolean;
  currentColorScheme: ThemeColors;
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
  const { allKnownDevices, haUrl, signPath, handleDeviceToggle, handleTemperatureChange, handleBrightnessChange, handleHvacModeChange, handlePresetChange, handleFanSpeedChange } = useHAStore();
  const { searchTerm, handleDeviceLayoutChange, setHistoryModalEntityId, setEditingDevice, templates, customizations } = useAppStore();

  // Если на вкладке нет устройств, показываем заглушку.
  if (tab.layout.length === 0) {
      return (
          <div className="flex h-full w-full items-center justify-center text-center text-gray-500 dark:text-gray-400">
              <div>
                  <h3 className="text-3xl font-semibold text-gray-400 dark:text-gray-600">Добро пожаловать</h3>
                  <p className="mt-2">Щелкните правой кнопкой мыши, чтобы войти в режим редактирования и добавить карточки.</p>
              </div>
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
            onShowHistory={setHistoryModalEntityId}
            onEditDevice={setEditingDevice}
            haUrl={haUrl}
            signPath={signPath}
            templates={templates}
            customizations={customizations}
            colorScheme={currentColorScheme}
        />;
};

export default React.memo(TabContent);