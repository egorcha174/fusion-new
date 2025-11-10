



import React, { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import { Device, DeviceCustomization, DeviceCustomizations, Tab, Room, ClockSettings, DeviceType, CameraSettings, GridLayoutItem, CardTemplates, CardTemplate, DeviceBinding, ThresholdRule, ColorScheme, ColorPickerContextData, CardElementId, CardElement } from './types';
import { nanoid } from 'nanoid';
import { getIconNameForDeviceType } from './components/DeviceIcon';
import { set } from './utils/obj-path';
import { useAppStore } from './store/appStore';
import { useHAStore } from './store/haStore';


// Ленивая загрузка (Lazy loading) компонентов для разделения кода (code splitting) и улучшения производительности.
// Компоненты будут загружены только тогда, когда они понадобятся.
const Settings = lazy(() => import('./components/Settings'));
const InfoPanel = lazy(() => import('./components/InfoPanel'));
const DashboardHeader = lazy(() => import('./components/DashboardHeader'));
const AllDevicesPage = lazy(() => import('./components/AllDevicesPage'));
const TabContent = lazy(() => import('./components/TabContent'));
const DeviceSettingsModal = lazy(() => import('./components/DeviceSettingsModal'));
const TabSettingsModal = lazy(() => import('./components/TabSettingsModal'));
const ContextMenu = lazy(() => import('./components/ContextMenu'));
const FloatingCameraWindow = lazy(() => import('./components/FloatingCameraWindow'));
const TemplateEditorModal = lazy(() => import('./components/TemplateEditorModal'));
const ColorPickerContextMenu = lazy(() => import('./components/ColorPickerContextMenu'));
const HistoryModal = lazy(() => import('./components/HistoryModal'));

/**
 * Вспомогательный компонент для пунктов меню с выпадающими подменю.
 * Динамически определяет, в какую сторону открывать подменю, чтобы оно не вышло за пределы экрана.
 */
const SubMenuItem: React.FC<{
    children: React.ReactNode;
    title: string;
}> = ({ children, title }) => {
    const itemRef = useRef<HTMLDivElement>(null);
    // State to hold the dynamic classes for positioning.
    const [submenuClasses, setSubmenuClasses] = useState('left-full top-[-5px]');

    const handleMouseEnter = () => {
        if (!itemRef.current) return;
        
        // Find the main context menu container to check its boundaries
        const parentMenu = itemRef.current.closest('[role="menu"]');
        if (!parentMenu) return;
        const parentRect = parentMenu.getBoundingClientRect();
        
        // Estimate submenu width. A more precise way would be to render and measure, but this is often sufficient.
        const SUBMENU_WIDTH_ESTIMATE = 160; 
        
        const itemRect = itemRef.current.getBoundingClientRect();
        // A rough estimate for height based on number of children.
        const SUBMENU_HEIGHT_ESTIMATE = (React.Children.count(children) * 32) + 16; 

        let classes = '';

        // Horizontal positioning: if not enough space on the right, open to the left.
        if (parentRect.right + SUBMENU_WIDTH_ESTIMATE > window.innerWidth) {
            classes += 'right-full ';
        } else {
            classes += 'left-full ';
        }

        // Vertical positioning: if not enough space at the bottom, align to the bottom of the item.
        if (itemRect.top + SUBMENU_HEIGHT_ESTIMATE > window.innerHeight) {
            classes += 'bottom-0 ';
        } else {
            // Default position relative to the item.
            classes += 'top-[-5px] ';
        }

        setSubmenuClasses(classes);
    };

    return (
        <div
            ref={itemRef}
            className="relative group/menu"
            onMouseEnter={handleMouseEnter}
        >
            <div className="px-3 py-1.5 rounded-md cursor-default flex justify-between items-center hover:bg-gray-200 dark:hover:bg-gray-700/80">
                {title}
                <span className="text-xs ml-4">▶</span>
            </div>
            <div className={`absolute z-10 hidden group-hover/menu:block bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-1 min-w-[150px] ${submenuClasses}`}>
                {children}
            </div>
        </div>
    );
};


/**
 * Хук для определения, является ли экран большим (lg breakpoint в Tailwind CSS).
 * Используется для условного применения стилей, например, отступа для боковой панели.
 * @returns {boolean} - true, если ширина окна >= 1024px.
 */
const useIsLg = () => {
  const [isLg, setIsLg] = useState(window.innerWidth >= 1024);
  useEffect(() => {
      const handleResize = () => setIsLg(window.innerWidth >= 1024);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isLg;
}

/**
 * Главный компонент приложения.
 * Отвечает за общую структуру, управление состоянием и рендеринг страниц.
 */
const App: React.FC = () => {
    // Получение состояний и действий из хранилища Zustand для Home Assistant.
    const {
        connectionStatus, isLoading, error, connect, disconnect, allKnownDevices, allRoomsForDevicePage,
        allCameras, getCameraStreamUrl, getConfig, getHistory, signPath, callService,
        handleDeviceToggle, handleBrightnessChange, handleHvacModeChange,
        handlePresetChange, handleTemperatureChange, haUrl
    } = useHAStore();

    // Получение состояний и действий из хранилища Zustand для UI приложения.
    const {
        currentPage, setCurrentPage, isEditMode, setIsEditMode, editingDevice, setEditingDevice,
        editingTab, setEditingTab, editingTemplate, setEditingTemplate, searchTerm, setSearchTerm,
        contextMenu, setContextMenu, colorPickerMenu, setColorPickerMenu, floatingCamera, setFloatingCamera,
        historyModalEntityId, setHistoryModalEntityId,
        tabs, setTabs, activeTabId, setActiveTabId, customizations, setCustomizations,
        templates, setTemplates, clockSettings, setClockSettings, cameraSettings, setCameraSettings,
        sidebarWidth, setSidebarWidth, isSidebarVisible, setIsSidebarVisible, theme, setTheme,
        colorScheme, setColorScheme, DEFAULT_COLOR_SCHEME, createNewBlankTemplate, getTemplateForDevice
    } = useAppStore();

  const isLg = useIsLg();

  // Эффект для управления темой (светлая/темная).
  // Добавляет/удаляет класс 'dark' у корневого элемента <html>.
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = () => {
      const isDark =
        theme === 'night' ||
        (theme === 'auto' && mediaQuery.matches);
      root.classList.toggle('dark', isDark);
    };

    updateTheme();
    mediaQuery.addEventListener('change', updateTheme); // Следим за системными изменениями
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [theme]);

  // Эффект, гарантирующий наличие хотя бы одной вкладки и установку активной вкладки.
  // Запускается после успешного подключения и загрузки данных.
  useEffect(() => {
    if (connectionStatus === 'connected' && !isLoading) {
      if (tabs.length === 0) {
        const newTab: Tab = { id: nanoid(), name: 'Главная', layout: [], gridSettings: { cols: 8, rows: 5 } };
        setTabs([newTab]);
        setActiveTabId(newTab.id);
      } else if (!activeTabId || !tabs.some(t => t.id === activeTabId)) {
        setActiveTabId(tabs[0].id);
      }
    }
  }, [tabs, activeTabId, connectionStatus, isLoading, setTabs, setActiveTabId]);

  // Мемоизированное значение текущей активной вкладки для избежания лишних пересчетов.
  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  
  // Мемоизированный список комнат для страницы "Все устройства", отфильтрованный по поисковому запросу.
  const filteredRoomsForDevicePage = useMemo(() => {
    if (!searchTerm) return allRoomsForDevicePage;
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredRooms: Room[] = [];

    allRoomsForDevicePage.forEach(room => {
        const filteredDevices = room.devices.filter(device =>
            device.name.toLowerCase().includes(lowercasedFilter) ||
            device.id.toLowerCase().includes(lowercasedFilter)
        );

        if (filteredDevices.length > 0) {
            filteredRooms.push({ ...room, devices: filteredDevices });
        }
    });

    return filteredRooms;
  }, [searchTerm, allRoomsForDevicePage]);

    // Мемоизированные значения для определения текущей цветовой схемы.
    const isSystemDark = useMemo(() => window.matchMedia('(prefers-color-scheme: dark)').matches, []);
    const isDark = useMemo(() => theme === 'night' || (theme === 'auto' && isSystemDark), [theme, isSystemDark]);
    const currentColorScheme = useMemo(() => isDark ? colorScheme.dark : colorScheme.light, [isDark, colorScheme]);


  // --- Обработчики Контекстного Меню ---

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, [setContextMenu]);

  // Структура для передачи информации о стиле в обработчик
  interface StyleUpdateInfo {
    origin: 'scheme' | 'template'; // Откуда пришло изменение: из общей схемы или из шаблона
    baseKey: string;              // Базовый ключ стиля (например, 'nameTextColor')
    theme: 'light' | 'dark';      // Для какой темы
    isOn: boolean;                // Включено ли устройство (для стилей On/Off)
    templateId?: string;          // ID шаблона, если origin='template'
    elementId?: CardElementId;    // ID элемента в шаблоне
    styleProperty?: string;       // Конкретное свойство CSS (например, 'textColor', 'fontSize')
  }
  
  /**
   * Универсальный обработчик обновления стилей.
   * Может обновлять как глобальную цветовую схему, так и стили конкретного элемента в шаблоне.
   */
  const handleStyleUpdate = useCallback((updateInfo: StyleUpdateInfo, value: any) => {
    const { origin, theme: themeKey, baseKey, isOn, templateId, elementId, styleProperty } = updateInfo;
    const currentScheme = useAppStore.getState().colorScheme;
    const currentTemplates = useAppStore.getState().templates;

    if (origin === 'scheme') {
        const onSuffix = isOn ? 'On' : '';
        const key = `${themeKey}.${baseKey}${onSuffix}`;
        
        const newScheme = JSON.parse(JSON.stringify(currentScheme));
        if (value === undefined || value === '') {
            // Удаляем ключ, чтобы сбросить на значение по умолчанию из CSS
            const pathParts = key.split('.');
            const lastKey = pathParts.pop()!;
            let parent: any = newScheme;
            for (const part of pathParts) {
                if (!parent || typeof parent !== 'object') break;
                parent = parent[part];
            }
            if (parent && typeof parent === 'object' && lastKey in parent) {
                delete parent[lastKey];
            }
        } else {
            set(newScheme, key, value); // Используем утилиту set для установки значения по пути
        }
        setColorScheme(newScheme);
    } else if (origin === 'template') {
        if (!templateId || !elementId || !styleProperty) return;

        const newTemplates = JSON.parse(JSON.stringify(currentTemplates));
        const template = newTemplates[templateId];
        if (!template) return;

        const elementIndex = template.elements.findIndex((el: CardElement) => el.id === elementId);
        if (elementIndex === -1) return;
        
        const styles = template.elements[elementIndex].styles as Record<string, any>;
        if (value === undefined || value === '') {
            delete styles[styleProperty]; // Удаляем для сброса
        } else {
            styles[styleProperty] = value;
        }
        
        setTemplates(newTemplates);
    }
  }, [setColorScheme, setTemplates]);


/**
 * Открывает контекстное меню для выбора цвета и шрифта.
 * Собирает всю необходимую информацию о кликнутом элементе и передает в состояние.
 */
const handleOpenColorPicker = useCallback((
    event: React.MouseEvent,
    styleInfoFromClick: any 
  ) => {
    setContextMenu(null); // Закрываем обычное контекстное меню
    const { baseKey, targetName, isTextElement, isOn, origin, templateId, elementId, styleProperty } = styleInfoFromClick;
    const themeKey = isDark ? 'dark' : 'light';
    const currentScheme = useAppStore.getState().colorScheme;
    const currentTemplates = useAppStore.getState().templates;
    const scheme = isDark ? currentScheme.dark : currentScheme.light;
    const template = templateId ? currentTemplates[templateId] : null;
    const element = template ? template.elements.find((el: CardElement) => el.id === elementId) : null;
    const onSuffix = isOn ? 'On' : '';

    // Определяем начальные значения для пикера (цвет, шрифт, размер)
    let initialValue = isDark ? '#FFFFFF' : '#000000'; // Цвет по умолчанию
    if (origin === 'template' && element) {
        initialValue = (element.styles as any)[styleProperty || 'textColor'] || initialValue;
    } else if (origin === 'scheme') {
        initialValue = (scheme as any)[`${baseKey}${onSuffix}`] || initialValue;
    }

    let initialFontFamily: string | undefined;
    const fontFamilyKey = baseKey.replace('Color', 'FontFamily');
    if (origin === 'template' && element?.styles.fontFamily) {
        initialFontFamily = element.styles.fontFamily;
    } else if (origin === 'scheme') {
        initialFontFamily = (scheme as any)[`${fontFamilyKey}${onSuffix}`];
    }

    let initialFontSize: number | undefined;
    const fontSizeKey = baseKey.replace('Color', 'FontSize');
    if (origin === 'template' && element?.styles.fontSize) {
        initialFontSize = element.styles.fontSize;
    } else if (origin === 'scheme') {
        initialFontSize = (scheme as any)[`${fontSizeKey}${onSuffix}`];
    }
    
    // Функция обратного вызова для ColorPicker, которая будет обновлять стили
    const onUpdate = (property: 'color' | 'fontFamily' | 'fontSize', value: any) => {
        const baseUpdateInfo: Omit<StyleUpdateInfo, 'baseKey' | 'styleProperty'> = {
            origin, theme: themeKey, isOn, templateId, elementId,
        };
        let finalUpdateInfo: StyleUpdateInfo;

        // Определяем, какое свойство обновляется, и формируем правильный ключ
        if (property === 'color') {
            finalUpdateInfo = { ...baseUpdateInfo, baseKey, styleProperty: styleProperty || 'textColor' };
        } else if (property === 'fontFamily') {
            finalUpdateInfo = { ...baseUpdateInfo, baseKey: fontFamilyKey, styleProperty: 'fontFamily' };
        } else { // fontSize
            finalUpdateInfo = { ...baseUpdateInfo, baseKey: fontSizeKey, styleProperty: 'fontSize' };
        }
        handleStyleUpdate(finalUpdateInfo, value);
        
        // Обновляем состояние самого пикера, чтобы он тут же показал новое значение
        const prev = useAppStore.getState().colorPickerMenu;
        if (!prev) return;
        const newMenuData = { ...prev };
        if (property === 'fontSize') {
            newMenuData.initialFontSize = value;
        } else if (property === 'fontFamily') {
            newMenuData.initialFontFamily = value;
        } else if (property === 'color') {
            newMenuData.initialValue = value;
        }
        setColorPickerMenu(newMenuData);
    };
    
    // Устанавливаем состояние, чтобы открыть ColorPicker
    setColorPickerMenu({
        x: event.clientX,
        y: event.clientY,
        targetName,
        isTextElement,
        onUpdate,
        initialValue,
        initialFontFamily,
        initialFontSize,
    });
}, [isDark, handleStyleUpdate, setColorPickerMenu, setContextMenu]);
  
  const handleDeviceContextMenu = useCallback((event: React.MouseEvent, deviceId: string, tabId: string) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, deviceId, tabId });
  }, [setContextMenu]);
  
  /**
   * Глобальный обработчик контекстного меню (правый клик на всем приложении).
   * Если клик был по элементу с data-атрибутами для стилизации, открывает ColorPicker,
   * иначе просто закрывает все открытые меню.
   */
  const handleGlobalContextMenu = useCallback((event: React.MouseEvent) => {
    setContextMenu(null);
    setColorPickerMenu(null);

    const target = event.target as HTMLElement;
    const styleTarget = target.closest('[data-style-origin]') as HTMLElement | null;
    
    if (styleTarget) {
      event.preventDefault();
      
      const { 
        styleOrigin: origin, 
        styleKey: baseKey, 
        styleName: targetName,
        isText: isTextStr,
        isOn: isOnStr,
        templateId,
        templateElementId: elementId,
        styleProperty,
      } = styleTarget.dataset;

      const styleInfo = {
          origin,
          baseKey,
          targetName: targetName || 'Элемент',
          isTextElement: isTextStr === 'true',
          isOn: isOnStr === 'true',
          templateId,
          elementId,
          styleProperty,
      };

      handleOpenColorPicker(event, styleInfo);
    }
  }, [handleOpenColorPicker, setContextMenu, setColorPickerMenu]);

  // --- ЛОГИКА РЕНДЕРИНГА ---

  // Если нет подключения, показываем страницу настроек.
  if (connectionStatus !== 'connected') {
    return <Suspense fallback={<div />}><Settings onConnect={connect} connectionStatus={connectionStatus} error={error} /></Suspense>;
  }
  
  // Если идет загрузка данных, показываем спиннер.
  if (isLoading) {
    return (
       <div className="flex h-screen w-screen items-center justify-center">
         <LoadingSpinner />
       </div>
    );
  }
  
  // Подготовка данных для модальных окон и контекстных меню
  const contextMenuDevice = contextMenu ? allKnownDevices.get(contextMenu.deviceId) : null;
  const isTemplateable = contextMenuDevice?.type === DeviceType.Sensor || contextMenuDevice?.type === DeviceType.DimmableLight || contextMenuDevice?.type === DeviceType.Light || contextMenuDevice?.type === DeviceType.Switch || contextMenuDevice?.type === DeviceType.Thermostat;
  const currentTemplate = getTemplateForDevice(contextMenuDevice);
  const historyDevice = historyModalEntityId ? allKnownDevices.get(historyModalEntityId) : null;
  const historyDeviceTemplate = getTemplateForDevice(historyDevice);
  const valueElement = historyDeviceTemplate?.elements.find(el => el.id === 'value' || el.id === 'temperature');
  const historyDecimalPlaces = valueElement?.styles?.decimalPlaces;
  const otherTabs = tabs.filter(t => t.id !== contextMenu?.tabId);

  // Функция-роутер для отображения текущей страницы.
  const renderPage = () => {
    switch (currentPage) {
      case 'settings':
        return (
          <div className="flex justify-center items-start pt-10">
            <Suspense fallback={<div />}><Settings onConnect={connect} connectionStatus={connectionStatus} error={error} /></Suspense>
          </div>
        );
      case 'all-devices':
        return <AllDevicesPage rooms={filteredRoomsForDevicePage} />;
      case 'dashboard':
      default:
        return activeTab ? (
          <TabContent
            key={activeTab.id}
            tab={activeTab}
            isEditMode={isEditMode}
            onDeviceContextMenu={handleDeviceContextMenu}
            onOpenColorPicker={handleOpenColorPicker}
          />
        ) : (
          <div className="text-center text-gray-500">Выберите или создайте вкладку</div>
        );
    }
  };

  // Основная JSX-разметка приложения.
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: currentColorScheme.dashboardBackground }} onContextMenu={handleGlobalContextMenu} data-style-key="dashboardBackground" data-style-name="Фон дашборда" data-style-origin="scheme">
      {isSidebarVisible && (
      <Suspense fallback={<div className="bg-gray-900" style={{ width: `${sidebarWidth}px` }} />}>
        <InfoPanel 
          sidebarWidth={sidebarWidth} 
          setSidebarWidth={setSidebarWidth}
          cameras={allCameras}
          cameraSettings={cameraSettings}
          onCameraSettingsChange={setCameraSettings}
          onCameraWidgetClick={setFloatingCamera}
          haUrl={haUrl}
          signPath={signPath}
          getCameraStreamUrl={getCameraStreamUrl}
          getConfig={getConfig}
          colorScheme={currentColorScheme}
        />
      </Suspense>
      )}
      <div className="flex flex-col flex-1" style={{ marginLeft: isLg && isSidebarVisible ? `${sidebarWidth}px` : '0px' }}>
        <Suspense fallback={<div className="h-[73px] bg-gray-900 border-b border-gray-700/50" />}>
            <DashboardHeader />
        </Suspense>
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><LoadingSpinner /></div>}>
            <div className="container mx-auto h-full">
              <div key={currentPage + (activeTab?.id || '')} className="fade-in h-full">
                {renderPage()}
              </div>
            </div>
          </Suspense>
        </main>
      </div>
      
      {/* Секция для модальных окон и оверлеев. Они рендерятся здесь, чтобы быть поверх всего контента. */}
      <Suspense fallback={null}>
        {editingDevice && (
          <DeviceSettingsModal 
            device={editingDevice} 
            onClose={() => setEditingDevice(null)}
          />
        )}
        {editingTab && (
          <TabSettingsModal 
            tab={editingTab} 
            onClose={() => setEditingTab(null)}
          />
        )}
        {editingTemplate && (
          <TemplateEditorModal
              templateToEdit={editingTemplate === 'new' ? createNewBlankTemplate(DeviceType.Sensor) : editingTemplate}
              onClose={() => setEditingTemplate(null)}
          />
        )}
        
        {historyModalEntityId && (
          <HistoryModal
            entityId={historyModalEntityId}
            onClose={() => setHistoryModalEntityId(null)}
            getHistory={getHistory}
            allKnownDevices={allKnownDevices}
            colorScheme={currentColorScheme}
            decimalPlaces={historyDecimalPlaces}
          />
        )}

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            isOpen={!!contextMenu}
            onClose={handleCloseContextMenu}
          >
              {/* Рендеринг пунктов контекстного меню для карточки устройства */}
              {otherTabs.length > 0 && <div className="h-px bg-gray-300 dark:bg-gray-600/50 my-1" />}

              {otherTabs.length > 0 && (
                  <>
                      <SubMenuItem title="Копировать в...">
                          {otherTabs.map(tab => (
                              <div key={tab.id} onClick={() => { if (contextMenuDevice) useAppStore.getState().handleDeviceAddToTab(contextMenuDevice, tab.id); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/80">{tab.name}</div>
                          ))}
                      </SubMenuItem>

                      <SubMenuItem title="Переместить в...">
                           {otherTabs.map(tab => (
                              <div key={tab.id} onClick={() => { if (contextMenuDevice) useAppStore.getState().handleDeviceMoveToTab(contextMenuDevice, contextMenu.tabId, tab.id); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/80">{tab.name}</div>
                          ))}
                      </SubMenuItem>
                  </>
              )}

              <div className="h-px bg-gray-300 dark:bg-gray-600/50 my-1" />
              
              <SubMenuItem title="Размер">
                  {[
                      {w: 1, h: 1},
                      {w: 1, h: 0.5},
                      {w: 2, h: 1},
                      {w: 2, h: 2}, 
                      {w: 3, h: 3},
                      {w: 2, h: 3},
                      {w: 3, h: 2}
                  ].map(size => (
                      <div 
                          key={`${size.w}x${size.h}`} 
                          onClick={() => { 
                              useAppStore.getState().handleDeviceResizeOnTab(contextMenu.tabId, contextMenu.deviceId, size.w, size.h); 
                              handleCloseContextMenu(); 
                          }} 
                          className="px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/80"
                      >
                          {`${size.w} x ${String(size.h).replace('.', ',')}`}
                      </div>
                  ))}
              </SubMenuItem>

              <div className="h-px bg-gray-300 dark:bg-gray-600/50 my-1" />
              
              <div 
                onClick={() => { 
                  const deviceToEdit = allKnownDevices.get(contextMenu.deviceId);
                  if (deviceToEdit) setEditingDevice(deviceToEdit);
                  handleCloseContextMenu(); 
                }} 
                className="px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/80"
              >
                  Редактировать
              </div>

              {isTemplateable && currentTemplate && (
                <div 
                    onClick={() => { 
                        setEditingTemplate(currentTemplate);
                        handleCloseContextMenu(); 
                    }} 
                    className="px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/80"
                >
                    Редактировать шаблон
                </div>
              )}

               <div 
                  onClick={() => { useAppStore.getState().handleDeviceRemoveFromTab(contextMenu.deviceId, contextMenu.tabId); handleCloseContextMenu(); }} 
                  className="px-3 py-1.5 rounded-md text-red-500 dark:text-red-400 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 cursor-pointer"
              >
                  Удалить с вкладки
              </div>

          </ContextMenu>
        )}

        {colorPickerMenu && (
            <ColorPickerContextMenu
                data={colorPickerMenu}
                onClose={() => setColorPickerMenu(null)}
            />
        )}

        {floatingCamera && haUrl && (
          <FloatingCameraWindow
            device={floatingCamera}
            onClose={() => setFloatingCamera(null)}
            haUrl={haUrl}
            signPath={signPath}
            getCameraStreamUrl={getCameraStreamUrl}
          />
        )}
      </Suspense>

    </div>
  );
};

export default App;