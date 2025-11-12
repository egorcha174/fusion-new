






import React, { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import { Device, Room, ClockSettings, DeviceType, Tab, RoomWithPhysicalDevices } from './types';
import { nanoid } from 'nanoid';
import { useAppStore } from './store/appStore';
import { useHAStore } from './store/haStore';


// Ленивая загрузка (Lazy loading) компонентов для разделения кода (code splitting) и улучшения производительности.
// Компоненты будут загружены только тогда, когда они понадобятся.
const Settings = lazy(() => import('./components/Settings'));
const InfoPanel = lazy(() => import('./components/InfoPanel'));
const DashboardHeader = lazy(() => import('./components/DashboardHeader'));
const AllEntitiesPage = lazy(() => import('./components/AllEntitiesPage'));
const AllDevicesPage = lazy(() => import('./components/AllDevicesPage'));
const TabContent = lazy(() => import('./components/TabContent'));
const DeviceSettingsModal = lazy(() => import('./components/DeviceSettingsModal'));
const TabSettingsModal = lazy(() => import('./components/TabSettingsModal'));
const ContextMenu = lazy(() => import('./components/ContextMenu'));
const FloatingCameraWindow = lazy(() => import('./components/FloatingCameraWindow'));
const TemplateEditorModal = lazy(() => import('./components/TemplateEditorModal'));
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
        connectionStatus, isLoading, error, connect, allKnownDevices, allRoomsForDevicePage,
        allCameras, getCameraStreamUrl, getConfig, getHistory, signPath,
        haUrl, allRoomsWithPhysicalDevices,
    } = useHAStore();

    // Получение состояний и действий из хранилища Zustand для UI приложения.
    const {
        currentPage, isEditMode, setEditingDevice,
        editingTab, setEditingTab, editingTemplate, setEditingTemplate, searchTerm,
        contextMenu, setContextMenu, setFloatingCamera,
        historyModalEntityId, setHistoryModalEntityId,
        tabs, setTabs, activeTabId, setActiveTabId,
        templates,
        sidebarWidth, setSidebarWidth, isSidebarVisible, theme,
        colorScheme, getTemplateForDevice, createNewBlankTemplate
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
  
  // Мемоизированный список комнат с сущностями для страницы "Все сущности", отфильтрованный по поисковому запросу.
  const filteredRoomsForEntitiesPage = useMemo(() => {
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

  // Мемоизированный список комнат с физическими устройствами для страницы "Все устройства", отфильтрованный по поисковому запросу.
  const filteredRoomsForPhysicalDevicesPage = useMemo(() => {
    if (!searchTerm) return allRoomsWithPhysicalDevices;
    const lowercasedFilter = searchTerm.toLowerCase();

    const filteredRooms: RoomWithPhysicalDevices[] = [];

    allRoomsWithPhysicalDevices.forEach(room => {
        const filteredPhysicalDevices = room.devices.filter(pDevice =>
            pDevice.name.toLowerCase().includes(lowercasedFilter) ||
            pDevice.entities.some(entity => 
                entity.name.toLowerCase().includes(lowercasedFilter) ||
                entity.id.toLowerCase().includes(lowercasedFilter)
            )
        );

        if (filteredPhysicalDevices.length > 0) {
            filteredRooms.push({ ...room, devices: filteredPhysicalDevices });
        }
    });

    return filteredRooms;
  }, [searchTerm, allRoomsWithPhysicalDevices]);

    // Мемоизированные значения для определения текущей цветовой схемы.
    const isSystemDark = useMemo(() => window.matchMedia('(prefers-color-scheme: dark)').matches, []);
    const isDark = useMemo(() => theme === 'night' || (theme === 'auto' && isSystemDark), [theme, isSystemDark]);
    const currentColorScheme = useMemo(() => isDark ? colorScheme.dark : colorScheme.light, [isDark, colorScheme]);

    // Мемоизированный стиль для фона дашборда
    const backgroundStyle = useMemo(() => {
        const scheme = currentColorScheme;
        const style: React.CSSProperties = {};
        switch (scheme.dashboardBackgroundType) {
            case 'gradient':
                style.backgroundImage = `linear-gradient(160deg, ${scheme.dashboardBackgroundColor1}, ${scheme.dashboardBackgroundColor2 || scheme.dashboardBackgroundColor1})`;
                break;
            case 'image':
                style.backgroundImage = `url(${scheme.dashboardBackgroundImage})`;
                style.backgroundSize = 'cover';
                style.backgroundPosition = 'center';
                style.filter = `blur(${scheme.dashboardBackgroundImageBlur || 0}px) brightness(${scheme.dashboardBackgroundImageBrightness || 100}%)`;
                break;
            case 'color':
            default:
                style.backgroundColor = scheme.dashboardBackgroundColor1;
                break;
        }
        return style;
    }, [currentColorScheme]);

  // --- Обработчики Контекстного Меню ---

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, [setContextMenu]);
  
  const handleDeviceContextMenu = useCallback((event: React.MouseEvent, deviceId: string, tabId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, deviceId, tabId });
  }, [setContextMenu]);
  
  /**
   * Глобальный обработчик контекстного меню (правый клик на всем приложении).
   * Открывает меню действий для карточки устройства, если включен режим редактирования.
   */
  const handleGlobalContextMenu = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const deviceTarget = target.closest('[data-device-id]') as HTMLElement | null;

    if (deviceTarget && isEditMode) {
        // В режиме редактирования, ПКМ на карточке открывает меню действий
        const { deviceId, tabId } = deviceTarget.dataset;
        if (deviceId && tabId) {
            handleDeviceContextMenu(event, deviceId, tabId);
        }
    } else if (!deviceTarget) {
        // Если клик был не на карточке, закрываем любое открытое меню
        setContextMenu(null);
    }
  }, [isEditMode, handleDeviceContextMenu, setContextMenu]);

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
      case 'all-entities':
        return <AllEntitiesPage rooms={filteredRoomsForEntitiesPage} />;
      case 'all-devices':
        return <AllDevicesPage rooms={filteredRoomsForPhysicalDevicesPage} />;
      case 'dashboard':
      default:
        return activeTab ? (
          <TabContent
            key={activeTab.id}
            tab={activeTab}
            isEditMode={isEditMode}
            onDeviceContextMenu={handleDeviceContextMenu}
          />
        ) : (
          <div className="text-center text-gray-500">Выберите или создайте вкладку</div>
        );
    }
  };

  // Основная JSX-разметка приложения.
  return (
    <>
      <div className="fixed inset-0 -z-10 transition-all duration-500" style={backgroundStyle} />
      <div className="flex min-h-screen relative" onContextMenu={handleGlobalContextMenu}>
        {isSidebarVisible && (
        <Suspense fallback={<div className="bg-gray-900" style={{ width: `${sidebarWidth}px` }} />}>
          <InfoPanel 
            sidebarWidth={sidebarWidth} 
            setSidebarWidth={setSidebarWidth}
            cameras={allCameras}
            haUrl={haUrl}
            signPath={signPath}
            getCameraStreamUrl={getCameraStreamUrl}
            getConfig={getConfig}
            colorScheme={currentColorScheme}
            isDark={isDark}
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
          {useAppStore.getState().editingDevice && (
            <DeviceSettingsModal 
              device={useAppStore.getState().editingDevice!} 
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

          {useAppStore.getState().floatingCamera && haUrl && (
            <FloatingCameraWindow
              device={useAppStore.getState().floatingCamera!}
              onClose={() => setFloatingCamera(null)}
              haUrl={haUrl}
              signPath={signPath}
              getCameraStreamUrl={getCameraStreamUrl}
            />
          )}
        </Suspense>

      </div>
    </>
  );
};

export default App;