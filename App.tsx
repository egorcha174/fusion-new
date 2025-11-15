import React, { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import { Device, Room, ClockSettings, DeviceType, Tab, RoomWithPhysicalDevices, ColorThemeSet, GridLayoutItem } from './types';
import { nanoid } from 'nanoid';
import { useAppStore } from './store/appStore';
import { useHAStore } from './store/haStore';
import ErrorBoundary from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'framer-motion';


// Ленивая загрузка (Lazy loading) компонентов для разделения кода (code splitting) и улучшения производительности.
// Компоненты будут загружены только тогда, когда они понадобятся.
const Settings = lazy(() => import('./components/Settings.tsx'));
const InfoPanel = lazy(() => import('./components/InfoPanel.tsx'));
const DashboardHeader = lazy(() => import('./components/DashboardHeader.tsx'));
const AllEntitiesPage = lazy(() => import('./components/AllEntitiesPage.tsx'));
const AllDevicesPage = lazy(() => import('./components/AllDevicesPage.tsx'));
const TabContent = lazy(() => import('./components/TabContent.tsx'));
const DeviceSettingsModal = lazy(() => import('./components/DeviceSettingsModal.tsx'));
const TabSettingsModal = lazy(() => import('./components/TabSettingsModal.tsx'));
const ContextMenu = lazy(() => import('./components/ContextMenu.tsx'));
const FloatingCameraWindow = lazy(() => import('./components/FloatingCameraWindow.tsx'));
const TemplateEditorModal = lazy(() => import('./components/TemplateEditorModal.tsx'));
const HistoryModal = lazy(() => import('./components/HistoryModal.tsx'));


/**
 * Рассчитывает время восхода и заката для указанной даты и координат.
 * @param latitude - Широта.
 * @param longitude - Долгота.
 * @param date - Дата для расчета.
 * @returns { sunrise: Date | null, sunset: Date | null } - Объекты Date для восхода/заката или null для полярного дня/ночи.
 */
function getSunriseSunset(latitude: number, longitude: number, date = new Date()) {
    const toRad = (deg: number) => deg * Math.PI / 180;
    // FIX: Corrected a recursive division by itself to division by Math.PI.
    const toDeg = (rad: number) => rad * 180 / Math.PI;

    const dayOfYear = (d: Date) => Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    
    const n = dayOfYear(date) + 1;
    const lngHour = longitude / 15;
    
    const t = n + ((6 - lngHour) / 24);
    const M = (0.9856 * t) - 3.289;
    let L = M + (1.916 * Math.sin(toRad(M))) + (0.020 * Math.sin(toRad(2 * M))) + 282.634;
    L = (L + 360) % 360;
    
    let RA = toDeg(Math.atan(0.91746 * Math.tan(toRad(L))));
    RA = (RA + 360) % 360;

    const Lquadrant = Math.floor(L / 90) * 90;
    const RAquadrant = Math.floor(RA / 90) * 90;
    RA = RA + (Lquadrant - RAquadrant);
    RA = RA / 15;

    const sinDec = 0.39782 * Math.sin(toRad(L));
    const cosDec = Math.cos(Math.asin(sinDec));
    
    const cosH = (Math.cos(toRad(90.833)) - (sinDec * Math.sin(toRad(latitude)))) / (cosDec * Math.cos(toRad(latitude)));

    if (cosH > 1) return { sunrise: null, sunset: null }; // полярная ночь
    if (cosH < -1) return { sunrise: null, sunset: null }; // полярный день

    const H = toDeg(Math.acos(cosH)) / 15;
    
    const T_sunrise = H + RA - (0.06571 * t) - 6.622;
    const T_sunset = -H + RA - (0.06571 * t) - 6.622;
    
    const UT_sunrise = (T_sunrise - lngHour + 24) % 24;
    const UT_sunset = (T_sunset - lngHour + 24) % 24;

    const toDate = (time: number) => {
        const hours = Math.floor(time);
        const minutes = Math.floor((time - hours) * 60);
        const d = new Date(date);
        d.setUTCHours(hours, minutes, 0, 0);
        return d;
    }

    return { sunrise: toDate(UT_sunrise), sunset: toDate(UT_sunset) };
}


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
        haUrl, allRoomsWithPhysicalDevices, settingsStatus
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
        scheduleStartTime, scheduleEndTime,
        colorScheme, getTemplateForDevice, createNewBlankTemplate
    } = useAppStore();

    // Получение состояний модальных окон через хуки-селекторы для обеспечения реактивности
    const editingDevice = useAppStore(state => state.editingDevice);
    const floatingCamera = useAppStore(state => state.floatingCamera);


  const isLg = useIsLg();
  const [isDarkBySchedule, setIsDarkBySchedule] = useState(false);
  const isAppLoading = isLoading || settingsStatus === 'loading';

  // Эффект для режима "По расписанию"
  useEffect(() => {
    if (theme !== 'schedule') return;

    const calculateSchedulePhase = () => {
        try {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();

            const [startHour, startMinute] = scheduleStartTime.split(':').map(Number);
            const [endHour, endMinute] = scheduleEndTime.split(':').map(Number);

            const startTime = startHour * 60 + startMinute;
            const endTime = endHour * 60 + endMinute;

            let isNight;
            if (startTime > endTime) { // Overnight schedule (e.g., 22:00 - 07:00)
                isNight = currentTime >= startTime || currentTime < endTime;
            } else { // Same-day schedule (e.g., 07:00 - 19:00, unlikely but possible)
                isNight = currentTime >= startTime && currentTime < endTime;
            }
            setIsDarkBySchedule(isNight);

        } catch (e) {
            console.error("Could not parse schedule time, falling back to system preference.", e);
            setIsDarkBySchedule(window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
    };

    calculateSchedulePhase();
    // Пересчитываем каждую минуту
    const intervalId = window.setInterval(calculateSchedulePhase, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [theme, scheduleStartTime, scheduleEndTime]);


  // Эффект для управления темой (светлая/темная).
  // Добавляет/удаляет класс 'dark' у корневого элемента <html>.
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = () => {
        let isDark = false;
        switch (theme) {
            case 'night': isDark = true; break;
            case 'day': isDark = false; break;
            case 'schedule': isDark = isDarkBySchedule; break;
            case 'auto':
            default: isDark = mediaQuery.matches; break;
        }
        root.classList.toggle('dark', isDark);
    };

    updateTheme();
    mediaQuery.addEventListener('change', updateTheme); // Следим за системными изменениями
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [theme, isDarkBySchedule]);

  // Эффект, гарантирующий наличие хотя бы одной вкладки и установку активной вкладки.
  // Запускается после успешного подключения и загрузки данных.
    useEffect(() => {
        // Выполняем только один раз после полной загрузки приложения.
        if (connectionStatus === 'connected' && !isAppLoading && settingsStatus === 'loaded') {
            if (tabs.length === 0 && allKnownDevices.size > 0) {
                const allDeviceIds = Array.from(allKnownDevices.keys());
                const newTab: Tab = {
                    id: nanoid(),
                    name: 'Главная',
                    // Автоматически размещаем все устройства на первой вкладке
                    layout: allDeviceIds.map((id: string): GridLayoutItem => ({ deviceId: id, col: 0, row: 0, width: 1, height: 1 })),
                    gridSettings: { cols: 8, rows: 5 }
                };
                setTabs([newTab]);
                setActiveTabId(newTab.id);
            } else if (!activeTabId || !tabs.some(t => t.id === activeTabId)) {
                if (tabs.length > 0) {
                    setActiveTabId(tabs[0].id);
                }
            }
        }
    }, [connectionStatus, isAppLoading, settingsStatus, tabs, activeTabId, allKnownDevices, setTabs, setActiveTabId]);

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
    const isDark = useMemo(() => {
        switch (theme) {
            case 'night': return true;
            case 'day': return false;
            case 'schedule': return isDarkBySchedule;
            case 'auto':
            default: return isSystemDark;
        }
    }, [theme, isSystemDark, isDarkBySchedule]);
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

    // --- Обработчики закрытия модальных окон ---
    const handleCloseDeviceSettings = useCallback(() => setEditingDevice(null), [setEditingDevice]);
    const handleCloseTabSettings = useCallback(() => setEditingTab(null), [setEditingTab]);
    const handleCloseTemplateEditor = useCallback(() => setEditingTemplate(null), [setEditingTemplate]);
    const handleCloseHistoryModal = useCallback(() => setHistoryModalEntityId(null), [setHistoryModalEntityId]);
    const handleCloseFloatingCamera = useCallback(() => setFloatingCamera(null), [setFloatingCamera]);

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
  if (isAppLoading) {
    return (
       <div className="flex h-screen w-screen items-center justify-center">
         <LoadingSpinner />
       </div>
    );
  }
  
  // Подготовка данных для модальных окон и контекстных меню
  const contextMenuDevice = contextMenu ? allKnownDevices.get(contextMenu.deviceId) : null;
  const isTemplateable = contextMenuDevice?.type === DeviceType.Sensor || contextMenuDevice?.type === DeviceType.DimmableLight || contextMenuDevice?.type === DeviceType.Light || contextMenuDevice?.type === DeviceType.Switch || contextMenuDevice?.type === DeviceType.Thermostat || contextMenuDevice?.type === DeviceType.Humidifier;
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
            currentColorScheme={currentColorScheme}
            isDark={isDark}
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
              <DashboardHeader 
                currentColorScheme={currentColorScheme}
                isDark={isDark}
              />
          </Suspense>
          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><LoadingSpinner /></div>}>
              <ErrorBoundary>
                <div className="container mx-auto h-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPage + (activeTab?.id || '')}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="h-full"
                    >
                        {renderPage()}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </ErrorBoundary>
            </Suspense>
          </main>
        </div>
        
        {/* Секция для модальных окон и оверлеев. Они рендерятся здесь, чтобы быть поверх всего контента. */}
        <Suspense fallback={null}>
          {editingDevice && (
            <DeviceSettingsModal 
              device={editingDevice} 
              onClose={handleCloseDeviceSettings}
            />
          )}
          {editingTab && (
            <TabSettingsModal 
              tab={editingTab} 
              onClose={handleCloseTabSettings}
            />
          )}
          {editingTemplate && (
            <TemplateEditorModal
                templateToEdit={editingTemplate === 'new' ? createNewBlankTemplate(DeviceType.Sensor) : editingTemplate}
                onClose={handleCloseTemplateEditor}
            />
          )}
          
          {historyModalEntityId && (
            <HistoryModal
              entityId={historyModalEntityId}
              onClose={handleCloseHistoryModal}
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

          {floatingCamera && haUrl && (
            <FloatingCameraWindow
              device={floatingCamera}
              onClose={handleCloseFloatingCamera}
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