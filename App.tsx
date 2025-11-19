
import React, { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import { Device, Room, ClockSettings, DeviceType, Tab, RoomWithPhysicalDevices, ColorThemeSet, GridLayoutItem, EventTimerWidget } from './types';
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
const HelpersPage = lazy(() => import('./components/HelpersPage.tsx'));
const AllDevicesPage = lazy(() => import('./components/AllDevicesPage.tsx'));
const TabContent = lazy(() => import('./components/TabContent.tsx'));
const DeviceSettingsModal = lazy(() => import('./components/DeviceSettingsModal.tsx'));
const TabSettingsModal = lazy(() => import('./components/TabSettingsModal.tsx'));
const ContextMenu = lazy(() => import('./components/ContextMenu.tsx'));
const FloatingCameraWindow = lazy(() => import('./components/FloatingCameraWindow.tsx'));
const TemplateEditorModal = lazy(() => import('./components/TemplateEditorModal.tsx'));
const HistoryModal = lazy(() => import('./components/HistoryModal.tsx'));
const EventTimerSettingsModal = lazy(() => import('./components/EventTimerSettingsModal.tsx'));
const ConfirmDialog = lazy(() => import('./components/ConfirmDialog.tsx'));
const ChristmasTheme = lazy(() => import('./components/ChristmasTheme.tsx'));


/**
 * Рассчитывает время восхода и заката для указанной даты и координат.
 * @param latitude - Широта.
 * @param longitude - Долгота.
 * @param date - Дата для расчета.
 * @returns { sunrise: Date | null, sunset: Date | null } - Объекты Date для восхода/заката или null для полярного дня/ночи.
 */
function getSunriseSunset(latitude: number, longitude: number, date = new Date()) {
    const toRad = (deg: number) => deg * Math.PI / 180;
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
    const initializationDone = useRef(false);
    // Получение состояний и действий из хранилища Zustand для Home Assistant.
    const {
        connectionStatus, isLoading, error, connect, allKnownDevices,
        allCameras, getCameraStreamUrl, getConfig, getHistory, signPath,
        haUrl, allRoomsWithPhysicalDevices
    } = useHAStore();

    // Получение состояний и действий из хранилища Zustand для UI приложения.
    const {
        currentPage, isEditMode, setEditingDevice,
        editingTab, setEditingTab, editingTemplate, setEditingTemplate, searchTerm,
        contextMenu, setContextMenu, setFloatingCamera,
        historyModalEntityId, setHistoryModalEntityId,
        tabs, setTabs, activeTabId, setActiveTabId,
        templates,
        sidebarWidth, setSidebarWidth, isSidebarVisible, themeMode,
        scheduleStartTime, scheduleEndTime,
        colorScheme, getTemplateForDevice, createNewBlankTemplate,
        editingEventTimerId, setEditingEventTimerId, eventTimerWidgets,
        resetCustomWidgetTimer, deleteCustomWidget, isChristmasThemeEnabled,
    } = useAppStore();

    // Получение состояний модальных окон через хуки-селекторы для обеспечения реактивности
    const editingDevice = useAppStore(state => state.editingDevice);
    const floatingCamera = useAppStore(state => state.floatingCamera);
    const [confirmingDeleteWidget, setConfirmingDeleteWidget] = useState<EventTimerWidget | null>(null);

    const cardSizes = [
        { w: 1, h: 0.5 },
        { w: 1, h: 1 },
        { w: 1, h: 2 },
        { w: 2, h: 0.5 },
        { w: 2, h: 1 },
        { w: 2, h: 2 },
        { w: 3, h: 1 },
        { w: 3, h: 2 },
    ];

  const isLg = useIsLg();
  const [isDarkBySchedule, setIsDarkBySchedule] = useState(false);

  // Эффект для режима "По расписанию"
  useEffect(() => {
    if (themeMode !== 'schedule') return;

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
  }, [themeMode, scheduleStartTime, scheduleEndTime]);


  // Эффект для управления темой (светлая/темная).
  // Добавляет/удаляет класс 'dark' у корневого элемента <html>.
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = () => {
        let isDark = false;
        switch (themeMode) {
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
  }, [themeMode, isDarkBySchedule]);

  // Эффект, гарантирующий наличие хотя бы одной вкладки и установку активной вкладки.
  // Запускается после успешного подключения и загрузки данных.
    useEffect(() => {
        if (connectionStatus === 'connected' && !isLoading && !initializationDone.current) {
            initializationDone.current = true; // Выполняем только один раз
            
            // Check if there are NO tabs, OR if the current state has 0 devices visible (sanity check)
            // We prioritize the user requirement: "First tab must automatically fill with ALL devices".
            // If tabs exist but are empty, or if we are starting fresh, we populate.
            // For now, we assume if tabs array is empty, we must initialize.
            if (tabs.length === 0 && allKnownDevices.size > 0) {
                const { getTemplateForDevice } = useAppStore.getState();
                const devices = Array.from<Device>(allKnownDevices.values()).sort((a, b) => a.name.localeCompare(b.name));
                
                const newLayout: GridLayoutItem[] = [];
                const cols = 8;
                let maxRow = 0;

                // Helper to check overlap in the current layout being built
                const checkOverlap = (l: GridLayoutItem[], x: number, y: number, w: number, h: number) => {
                    return l.some(item => {
                        const iw = item.width || 1;
                        const ih = item.height || 1;
                        return (x < item.col + iw && x + w > item.col && y < item.row + ih && y + h > item.row);
                    });
                }

                // Auto-layout algorithm to place ALL devices
                for (const device of devices) {
                    const template = getTemplateForDevice(device);
                    const w = template?.width || 1;
                    const h = template?.height || 1;
                    
                    let placed = false;
                    // Search for the first available slot starting from top-left
                    // We allow rows to grow indefinitely to accommodate all devices
                    for (let r = 0; r < 1000; r++) { 
                        for (let c = 0; c <= cols - w; c++) {
                            if (!checkOverlap(newLayout, c, r, w, h)) {
                                newLayout.push({ deviceId: device.id, col: c, row: r, width: w, height: h });
                                maxRow = Math.max(maxRow, r + h);
                                placed = true;
                                break;
                            }
                        }
                        if (placed) break;
                    }
                }

                const newTab: Tab = {
                    id: nanoid(),
                    name: 'Главная',
                    layout: newLayout,
                    gridSettings: { cols: cols, rows: Math.max(5, maxRow) }
                };

                setTabs([newTab]);
                setActiveTabId(newTab.id);
            } else if (!activeTabId || !tabs.some(t => t.id === activeTabId)) {
                if (tabs.length > 0) {
                    setActiveTabId(tabs[0].id);
                }
            }
        }
    }, [connectionStatus, isLoading, tabs, activeTabId, allKnownDevices, setTabs, setActiveTabId]);

  // Мемоизированное значение текущей активной вкладки для избежания лишних пересчетов.
  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  
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
        switch (themeMode) {
            case 'night': return true;
            case 'day': return false;
            case 'schedule': return isDarkBySchedule;
            case 'auto':
            default: return isSystemDark;
        }
    }, [themeMode, isSystemDark, isDarkBySchedule]);
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
    const handleCloseEventTimerSettings = useCallback(() => setEditingEventTimerId(null), [setEditingEventTimerId]);

  // --- Обработчики Контекстного Меню ---

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, [setContextMenu]);
  
  const handleDeviceContextMenu = useCallback((deviceId: string, tabId: string, x: number, y: number) => {
    setContextMenu({ x, y, deviceId, tabId });
  }, [setContextMenu]);
  
  /**
   * Глобальный обработчик контекстного меню (правый клик на всем приложении).
   * Открывает меню действий для карточки устройства, если включен режим редактирования.
   */
// FIX: Refactored logic to be more concise and safely handle dataset properties.
  const handleGlobalContextMenu = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const isDashboard = currentPage === 'dashboard';

    // Отключаем стандартное меню на дашборде, но не на интерактивных элементах (поля ввода и т.д.).
    if (isDashboard) {
      const isInteractiveElement = target.closest('input, textarea, [contenteditable="true"], select');
      if (!isInteractiveElement) {
        event.preventDefault();
      }
    }

    const deviceTarget = target.closest('[data-device-id]') as HTMLElement | null;
    const deviceId = deviceTarget?.dataset.deviceId;
    const tabId = deviceTarget?.dataset.tabId;

    if (isEditMode && deviceTarget && typeof deviceId === 'string' && typeof tabId === 'string') {
        // Показываем кастомное меню для устройства в режиме редактирования
        handleDeviceContextMenu(deviceId, tabId, event.clientX, event.clientY);
    } else {
        // В остальных случаях (не в режиме редактирования, или клик по фону) просто закрываем меню.
        setContextMenu(null);
    }
  }, [isEditMode, handleDeviceContextMenu, setContextMenu, currentPage]);

  // --- ЛОГИКА РЕНДЕРИНГА ---

  // Если нет подключения, показываем страницу настроек.
  if (connectionStatus !== 'connected') {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Suspense fallback={<div />}>
          <Settings onConnect={connect} connectionStatus={connectionStatus} error={error} />
        </Suspense>
      </div>
    );
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
  const isTemplateable = contextMenuDevice ? [
    DeviceType.Sensor, DeviceType.DimmableLight, DeviceType.Light,
    DeviceType.Switch, DeviceType.Thermostat, DeviceType.Humidifier,
    DeviceType.Custom
  ].includes(contextMenuDevice.type) : false;
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
      case 'helpers':
        return <Suspense fallback={<div />}><HelpersPage /></Suspense>;
      case 'all-devices':
        return <AllDevicesPage rooms={filteredRoomsForPhysicalDevicesPage} />;
      case 'dashboard':
      default:
        return activeTab ? (
          <TabContent
            key={activeTab.id}
            tab={activeTab}
            isEditMode={isEditMode}
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
      {isChristmasThemeEnabled && <Suspense fallback={null}><ChristmasTheme /></Suspense>}
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
              <div className="p-4 h-full">{renderPage()}</div>
            </Suspense>
          </main>
        </div>
      </div>
      
      {/* 
        Модальные окна, вынесенные на верхний уровень для корректного z-index 
        и предотвращения проблем с контекстом рендеринга.
        Они рендерятся только тогда, когда есть соответствующие данные в стейте.
      */}
      <Suspense fallback={null}>
        {editingDevice && <DeviceSettingsModal device={editingDevice} onClose={handleCloseDeviceSettings} />}
        {editingTab && <TabSettingsModal tab={editingTab} onClose={handleCloseTabSettings} />}
        {editingTemplate && <TemplateEditorModal templateToEdit={editingTemplate === 'new' ? createNewBlankTemplate(DeviceType.Sensor) : editingTemplate} onClose={handleCloseTemplateEditor} />}
        {historyModalEntityId && <HistoryModal entityId={historyModalEntityId} onClose={handleCloseHistoryModal} getHistory={getHistory} allKnownDevices={allKnownDevices} colorScheme={currentColorScheme} decimalPlaces={historyDecimalPlaces} />}
        {floatingCamera && <FloatingCameraWindow device={floatingCamera} onClose={handleCloseFloatingCamera} haUrl={haUrl} signPath={signPath} getCameraStreamUrl={getCameraStreamUrl} />}
        {editingEventTimerId && <EventTimerSettingsModal widgetId={editingEventTimerId} onClose={handleCloseEventTimerSettings} currentColorScheme={currentColorScheme} />}
      </Suspense>
      
      {confirmingDeleteWidget && (
        <Suspense fallback={null}>
          <ConfirmDialog
            isOpen={!!confirmingDeleteWidget}
            title="Удалить виджет?"
            message={<>Вы уверены, что хотите удалить виджет <strong className="text-black dark:text-white">"{confirmingDeleteWidget.name}"</strong>? Это действие нельзя отменить.</>}
            onConfirm={() => { deleteCustomWidget(confirmingDeleteWidget.id); setConfirmingDeleteWidget(null); }}
            onCancel={() => setConfirmingDeleteWidget(null)}
          />
        </Suspense>
      )}

      {/* Контекстное меню */}
      {contextMenu && (
        <Suspense fallback={null}>
          <ContextMenu x={contextMenu.x} y={contextMenu.y} isOpen={!!contextMenu} onClose={handleCloseContextMenu}>
            {contextMenuDevice && (
              <>
                <div onClick={() => { setEditingDevice(contextMenuDevice); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm">Настроить</div>
                <div onClick={() => { setHistoryModalEntityId(contextMenuDevice.id); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm">История</div>
                {isTemplateable && (
                  <div onClick={() => {
                      const templateToEdit = getTemplateForDevice(contextMenuDevice) || createNewBlankTemplate(contextMenuDevice.type);
                      setEditingTemplate(templateToEdit);
                      handleCloseContextMenu();
                  }} className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm">Редактор шаблона</div>
                )}
                <SubMenuItem title="Размер">
                    {cardSizes.map(size => (
                        <div
                            key={`${size.w}x${size.h}`}
                            onClick={() => {
                                useAppStore.getState().handleDeviceResizeOnTab(contextMenu.tabId, contextMenu.deviceId, size.w, size.h);
                                handleCloseContextMenu();
                            }}
                            className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm"
                        >
                            {`${size.w} × ${String(size.h).replace('.', ',')}`}
                        </div>
                    ))}
                </SubMenuItem>
                <div className="h-px bg-gray-300 dark:bg-gray-600 my-1 mx-1" />
                {otherTabs.length > 0 && (
                    <SubMenuItem title="Переместить">
                         {otherTabs.map(tab => (
                            <div key={tab.id} onClick={() => { useAppStore.getState().handleDeviceMoveToTab(contextMenuDevice, contextMenu.tabId, tab.id); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm">
                                {tab.name}
                            </div>
                        ))}
                    </SubMenuItem>
                )}
                {otherTabs.length > 0 && (
                    <SubMenuItem title="Копировать">
                         {otherTabs.map(tab => (
                            <div key={tab.id} onClick={() => { useAppStore.getState().handleDeviceCopyToTab(contextMenuDevice, tab.id); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm">
                                {tab.name}
                            </div>
                        ))}
                    </SubMenuItem>
                )}
                <div onClick={() => { useAppStore.getState().handleDeviceRemoveFromTab(contextMenu.deviceId, contextMenu.tabId); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm text-red-600 dark:text-red-400">Удалить с вкладки</div>
              </>
            )}
            {/* Context menu for custom widgets */}
            {contextMenuDevice?.type === DeviceType.EventTimer && contextMenuDevice.widgetId && (
              <>
                <div onClick={() => { setEditingEventTimerId(contextMenuDevice.widgetId!); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm">Настроить виджет</div>
                <SubMenuItem title="Размер">
                    {cardSizes.map(size => (
                        <div
                            key={`${size.w}x${size.h}`}
                            onClick={() => {
                                useAppStore.getState().handleDeviceResizeOnTab(contextMenu.tabId, contextMenu.deviceId, size.w, size.h);
                                handleCloseContextMenu();
                            }}
                            className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm"
                        >
                            {`${size.w} × ${String(size.h).replace('.', ',')}`}
                        </div>
                    ))}
                </SubMenuItem>
                <div onClick={() => { 
                    const widget = eventTimerWidgets.find(w => w.id === contextMenuDevice.widgetId);
                    if (widget) setConfirmingDeleteWidget(widget);
                    handleCloseContextMenu();
                }} className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm text-red-600 dark:text-red-400">Удалить виджет</div>
                 <div className="h-px bg-gray-300 dark:bg-gray-600 my-1 mx-1" />
                <div onClick={() => { useAppStore.getState().handleDeviceRemoveFromTab(contextMenu.deviceId, contextMenu.tabId); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm">Удалить с вкладки</div>
              </>
            )}
          </ContextMenu>
        </Suspense>
      )}
    </>
  );
};
export default App;
