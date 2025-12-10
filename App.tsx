import React, { useMemo, useEffect, useRef, useCallback, lazy, Suspense, useState } from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import { Device, Tab, RoomWithPhysicalDevices, GridLayoutItem, EventTimerWidget } from './types';
import { nanoid } from 'nanoid';
import { useAppStore, BackgroundEffectType } from './store/appStore';
import { useHAStore } from './store/haStore';
import ErrorBoundary from './components/ErrorBoundary';
import ThemeInjector from './components/ThemeInjector';
import { useWeather } from './hooks/useWeather';
import { Icon } from '@iconify/react';
import SubMenuItem from './components/SubMenuItem';
import { useIsLg } from './hooks/useIsLg';
import { DeviceType } from './types';

const Settings = lazy(() => import('./components/Settings'));
const InfoPanel = lazy(() => import('./components/InfoPanel'));
const DashboardHeader = lazy(() => import('./components/DashboardHeader'));
const HelpersPage = lazy(() => import('./components/HelpersPage'));
const AllDevicesPage = lazy(() => import('./components/AllDevicesPage'));
const TabContent = lazy(() => import('./components/TabContent'));
const DeviceSettingsModal = lazy(() => import('./components/DeviceSettingsModal'));
const TabSettingsModal = lazy(() => import('./components/TabSettingsModal'));
const ContextMenu = lazy(() => import('./components/ContextMenu'));
const TemplateEditorModal = lazy(() => import('./components/TemplateEditorModal'));
const HistoryModal = lazy(() => import('./components/HistoryModal'));
const EventTimerSettingsModal = lazy(() => import('./components/EventTimerSettingsModal'));
const ConfirmDialog = lazy(() => import('./components/ConfirmDialog'));
const BackgroundEffects = lazy(() => import('./components/BackgroundEffects'));
const TemplateGallery = lazy(() => import('./components/templateGallery/TemplateGallery'));

const App: React.FC = () => {
    const initializationDone = useRef(false);
    const {
        connectionStatus, isLoading, error, connect, allKnownDevices,
        getConfig, getHistory, signPath,
        haUrl, allRoomsWithPhysicalDevices
    } = useHAStore();

    // Inject appStore dependency into haStore to resolve circular dependency
    useEffect(() => {
        useHAStore.getState().initAppStore(useAppStore);
    }, []);

    const {
        currentPage, setCurrentPage, isEditMode, setIsEditMode, setEditingDevice,
        editingTab, setEditingTab, editingTemplate, setEditingTemplate, searchTerm,
        contextMenu, setContextMenu,
        historyModalEntityId, setHistoryModalEntityId,
        tabs, setTabs, activeTabId, setActiveTabId,
        templates,
        sidebarWidth, setSidebarWidth, isSidebarVisible, themeMode,
        scheduleStartTime, scheduleEndTime,
        colorScheme, getTemplateForDevice, createNewBlankTemplate,
        editingEventTimerId, setEditingEventTimerId, eventTimerWidgets,
        deleteCustomWidget, backgroundEffect,
        isSettingsOpen, setSettingsOpen,
        weatherData,
        addCustomCard, addCustomWidget
    } = useAppStore();

    const editingDevice = useAppStore(state => state.editingDevice);
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

  // Invoke custom hook to manage weather data fetching and store updates
  useWeather();

  const isLg = useIsLg();
  const [isDarkBySchedule, setIsDarkBySchedule] = useState(false);

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
    const intervalId = window.setInterval(calculateSchedulePhase, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [themeMode, scheduleStartTime, scheduleEndTime]);


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
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [themeMode, isDarkBySchedule]);

    useEffect(() => {
        if (connectionStatus === 'connected' && !isLoading && !initializationDone.current) {
            initializationDone.current = true;
            
            if (tabs.length === 0 && allKnownDevices.size > 0) {
                const { getTemplateForDevice } = useAppStore.getState();
                const devices = Array.from<Device>(allKnownDevices.values()).sort((a, b) => a.name.localeCompare(b.name));
                
                const newLayout: GridLayoutItem[] = [];
                const cols = 8;
                let maxRow = 0;

                const checkOverlap = (l: GridLayoutItem[], x: number, y: number, w: number, h: number) => {
                    return l.some(item => {
                        const iw = item.width || 1;
                        const ih = item.height || 1;
                        return (x < item.col + iw && x + w > item.col && y < item.row + ih && y + h > item.row);
                    });
                }

                for (const device of devices) {
                    const template = getTemplateForDevice(device);
                    const w = template?.width || 1;
                    const h = template?.height || 1;
                    
                    let placed = false;
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

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  
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

    const backgroundStyle = useMemo((): React.CSSProperties => {
        const scheme = currentColorScheme;
        if (scheme.dashboardBackgroundType === 'gradient') {
            return {
                backgroundImage: `linear-gradient(160deg, var(--bg-dashboard-1), var(--bg-dashboard-2))`
            };
        } else if (scheme.dashboardBackgroundType === 'image') {
            return {
                backgroundImage: `url(${scheme.dashboardBackgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: `blur(${scheme.dashboardBackgroundImageBlur || 0}px) brightness(${scheme.dashboardBackgroundImageBrightness || 100}%)`
            };
        } else {
            return {
                backgroundColor: 'var(--bg-dashboard-1)'
            };
        }
    }, [currentColorScheme]);

    // Resolve effective background effect
    const effectiveBackgroundEffect = useMemo<BackgroundEffectType>(() => {
        if (backgroundEffect !== 'weather') return backgroundEffect;
        
        // If set to 'weather', derive from current weather data
        const icon = weatherData?.current?.icon;
        if (!icon) return 'none';

        // Determine effect based on OWM icon code
        if (icon.startsWith('11')) return 'thunderstorm';
        if (['09', '10'].some(c => icon.startsWith(c))) return 'rain-clouds';
        if (icon.startsWith('13')) return 'snow';
        if (['02', '03', '04', '50'].some(c => icon.startsWith(c))) return 'strong-cloudy';
        if (icon === '01n') return 'aurora';
        if (icon === '01d') return 'sun-glare';
        
        return 'none';
    }, [backgroundEffect, weatherData]);


    const handleCloseDeviceSettings = useCallback(() => setEditingDevice(null), [setEditingDevice]);
    const handleCloseTabSettings = useCallback(() => setEditingTab(null), [setEditingTab]);
    const handleCloseTemplateEditor = useCallback(() => setEditingTemplate(null), [setEditingTemplate]);
    const handleCloseHistoryModal = useCallback(() => setHistoryModalEntityId(null), [setHistoryModalEntityId]);
    const handleCloseEventTimerSettings = useCallback(() => setEditingEventTimerId(null), [setEditingEventTimerId]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, [setContextMenu]);
  
  const handleDeviceContextMenu = useCallback((deviceId: string, tabId: string, x: number, y: number) => {
    setContextMenu({ x, y, deviceId, tabId });
  }, [setContextMenu]);
  
  const handleGlobalContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const target = event.target as HTMLElement;
    
    // Check if right-clicked on interactive element
    const isInteractiveElement = target.closest('input, textarea, [contenteditable="true"], select, button, a');
    if (isInteractiveElement) {
        return; // Let default browser menu appear for inputs
    }

    const deviceTarget = target.closest('[data-device-id]') as HTMLElement | null;
    const deviceId = deviceTarget?.dataset.deviceId;
    const tabId = deviceTarget?.dataset.tabId;

    if (deviceTarget && typeof deviceId === 'string' && typeof tabId === 'string') {
        // Device Context Menu
        handleDeviceContextMenu(deviceId, tabId, event.clientX, event.clientY);
    } else {
        // Global Dashboard Context Menu (Empty space click)
        if (activeTabId) {
            setContextMenu({ 
                x: event.clientX, 
                y: event.clientY, 
                deviceId: 'dashboard-global', // Special ID for global menu
                tabId: activeTabId 
            });
        }
    }
  }, [handleDeviceContextMenu, setContextMenu, activeTabId]);

  if (connectionStatus !== 'connected') {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Suspense fallback={<div />}>
          <Settings onConnect={connect} connectionStatus={connectionStatus} error={error} variant="page" />
        </Suspense>
      </div>
    );
  }
  
  if (isLoading) {
    return (
       <div className="flex h-screen w-screen items-center justify-center">
         <LoadingSpinner />
       </div>
    );
  }
  
  const isGlobalMenu = contextMenu?.deviceId === 'dashboard-global';
  const contextMenuDevice = contextMenu && !isGlobalMenu ? allKnownDevices.get(contextMenu.deviceId) : null;
  const isTemplateable = contextMenuDevice ? [
    DeviceType.Sensor, DeviceType.DimmableLight, DeviceType.Light,
    DeviceType.Switch, DeviceType.Thermostat, DeviceType.Humidifier,
    DeviceType.Custom
  ].includes(contextMenuDevice.type) : false;
  const historyDevice = historyModalEntityId ? allKnownDevices.get(historyModalEntityId) : null;
  const historyDeviceTemplate = getTemplateForDevice(historyDevice);
  const valueElement = historyDeviceTemplate?.elements.find(el => el.id === 'value' || el.id === 'temperature');
  const historyDecimalPlaces = valueElement?.styles?.decimalPlaces;
  const otherTabs = tabs.filter(t => t.id !== contextMenu?.tabId);

  const renderPage = () => {
    switch (currentPage) {
      case 'helpers':
        return <Suspense fallback={<div />}><HelpersPage /></Suspense>;
      case 'all-devices':
        return <AllDevicesPage rooms={filteredRoomsForPhysicalDevicesPage} />;
      case 'template-gallery':
          return <Suspense fallback={<div />}><TemplateGallery /></Suspense>;
      case 'dashboard':
      default:
        return activeTab ? (
          <ErrorBoundary>
            <TabContent
              key={activeTab.id}
              tab={activeTab}
              isEditMode={isEditMode}
              currentColorScheme={currentColorScheme}
              isDark={isDark}
            />
          </ErrorBoundary>
        ) : (
          <div className="text-center text-gray-500">Выберите или создайте вкладку</div>
        );
    }
  };

  return (
    <>
      <ThemeInjector theme={currentColorScheme} />
      <div className="fixed inset-0 -z-10 transition-all duration-500" style={backgroundStyle} />
      {effectiveBackgroundEffect !== 'none' && <Suspense fallback={null}><BackgroundEffects effect={effectiveBackgroundEffect} isDark={isDark} /></Suspense>}
      <div className="flex min-h-screen relative flex-col lg:flex-row" onContextMenu={handleGlobalContextMenu}>
        {isSidebarVisible && (
        <Suspense fallback={<div className="bg-gray-900 hidden lg:block" style={{ width: `${sidebarWidth}px` }} />}>
          <InfoPanel 
            sidebarWidth={sidebarWidth} 
            setSidebarWidth={setSidebarWidth}
            haUrl={haUrl}
            signPath={signPath}
            getConfig={getConfig}
            colorScheme={currentColorScheme}
            isDark={isDark}
          />
        </Suspense>
        )}
        <div className="flex flex-col flex-1 h-screen overflow-hidden" style={{ marginLeft: isLg && isSidebarVisible ? `${sidebarWidth}px` : '0px' }}>
          <Suspense fallback={<div className="h-[73px] bg-gray-900 border-b border-gray-700/50" />}>
              <DashboardHeader 
                currentColorScheme={currentColorScheme}
                isDark={isDark}
              />
          </Suspense>
          <main className="flex-1 overflow-y-auto relative flex flex-col">
            <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><LoadingSpinner /></div>}>
              <div className="p-4 flex-grow h-full flex flex-col">{renderPage()}</div>
            </Suspense>
          </main>
        </div>
      </div>
      
      <Suspense fallback={null}>
        {isSettingsOpen && <Settings variant="drawer" isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} connectionStatus={connectionStatus} />}
        {editingDevice && <DeviceSettingsModal device={editingDevice} onClose={handleCloseDeviceSettings} />}
        {editingTab && <TabSettingsModal tab={editingTab} onClose={handleCloseTabSettings} />}
        {editingTemplate && <TemplateEditorModal templateToEdit={editingTemplate === 'new' ? createNewBlankTemplate(DeviceType.Sensor) : editingTemplate} onClose={handleCloseTemplateEditor} />}
        {historyModalEntityId && <HistoryModal entityId={historyModalEntityId} onClose={handleCloseHistoryModal} getHistory={getHistory} allKnownDevices={allKnownDevices} colorScheme={currentColorScheme} decimalPlaces={historyDecimalPlaces} />}
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

      {contextMenu && (
        <Suspense fallback={null}>
          <ContextMenu x={contextMenu.x} y={contextMenu.y} isOpen={!!contextMenu} onClose={handleCloseContextMenu}>
            {/* GLOBAL DASHBOARD CONTEXT MENU */}
            {isGlobalMenu ? (
                <>
                    <div onClick={() => { setIsEditMode(!isEditMode); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm flex items-center gap-2">
                        <Icon icon={isEditMode ? "mdi:check" : "mdi:pencil"} className="w-4 h-4" />
                        {isEditMode ? 'Завершить редактирование' : 'Режим редактирования'}
                    </div>
                    <div className="h-px bg-gray-300 dark:bg-gray-600 my-1 mx-1" />
                    <SubMenuItem title="Добавить...">
                        <div onClick={() => { addCustomCard(); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm">Карточку</div>
                        <div onClick={() => { addCustomWidget(); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm">Таймер</div>
                    </SubMenuItem>
                    <div onClick={() => { setSettingsOpen(true); handleCloseContextMenu(); }} className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm">
                        Настройки
                    </div>
                    <div onClick={() => { window.location.reload(); }} className="px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 cursor-pointer text-sm text-gray-500">
                        Обновить страницу
                    </div>
                </>
            ) : contextMenuDevice ? (
              /* DEVICE CONTEXT MENU */
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
            ) : null}
            
            {/* EVENT TIMER WIDGET MENU */}
            {!isGlobalMenu && contextMenuDevice?.type === DeviceType.EventTimer && contextMenuDevice.widgetId && (
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