import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ClockSettings, Device, ClockSize, CameraSettings, ColorScheme } from '../types';
import { CameraStreamContent } from './CameraStreamContent';
import ContextMenu from './ContextMenu';
import WeatherWidget from './WeatherWidget';
import { useAppStore } from '../store/appStore';
import { useHAStore } from '../store/haStore';
import { Icon } from '@iconify/react';
import SepticTimerCard from './SepticTimerCard';

interface ClockProps {
    settings: ClockSettings;
    sidebarWidth: number;
    color: string;
}

/**
 * Компонент, отображающий текущее время с учетом настроек.
 */
const Clock: React.FC<ClockProps> = React.memo(({ settings, sidebarWidth, color }) => {
    const [time, setTime] = useState(new Date());

    // Обновляем время каждую секунду.
    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: settings.format === '12h',
    };

    if (settings.showSeconds) {
        options.second = '2-digit';
    }

    /**
     * Рассчитывает адаптивный размер шрифта в зависимости от ширины боковой панели,
     * количества символов и выбранного размера в настройках.
     * @returns {number} - Размер шрифта в пикселях.
     */
    const getAdaptiveFontSize = () => {
        const sizeMultiplier: Record<ClockSize, number> = { sm: 0.85, md: 1.0, lg: 1.15 };
        const characterCount = settings.showSeconds ? 8 : 5;
        // Базовый размер примерно равен ширине панели, деленной на количество символов.
        const baseFontSize = (sidebarWidth / characterCount) * 1.7;
        const finalSize = baseFontSize * sizeMultiplier[settings.size];
        
        // Ограничиваем размер, чтобы избежать слишком больших или маленьких значений.
        return Math.max(24, Math.min(finalSize, 128));
    };

    const finalStyle = {
        fontSize: `${getAdaptiveFontSize()}px`,
        color: color,
    };

    return (
        <div 
            className="font-mono font-bold tracking-tighter whitespace-nowrap"
            style={finalStyle}
        >
            {time.toLocaleTimeString('ru-RU', options)}
        </div>
    );
});

interface CameraWidgetProps {
    cameras: Device[];
    haUrl: string;
    signPath: (path: string) => Promise<{ path: string }>;
    getCameraStreamUrl: (entityId: string) => Promise<{ url: string }>;
}

/**
 * Виджет для отображения видео с камеры.
 * Позволяет выбирать камеру для отображения через контекстное меню (правый клик).
 */
const CameraWidget: React.FC<CameraWidgetProps> = React.memo(({ cameras, haUrl, signPath, getCameraStreamUrl }) => {
    const { cameraSettings, setCameraSettings, setFloatingCamera } = useAppStore();
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
    const selectedCamera = useMemo(() => cameras.find(c => c.id === cameraSettings.selectedEntityId), [cameras, cameraSettings.selectedEntityId]);

    const handleSelectCamera = (entityId: string | null) => {
        setCameraSettings({ selectedEntityId: entityId });
        setContextMenu(null);
    };

    const handleCameraClick = () => {
        if (selectedCamera) {
            setFloatingCamera(selectedCamera);
        }
    };
    
    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({ x: event.clientX, y: event.clientY });
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    return (
        <div>
            <div
                className="relative aspect-video bg-gray-200 dark:bg-gray-800 rounded-lg text-white overflow-hidden flex items-center justify-center group"
                onClick={handleCameraClick}
                onContextMenu={handleContextMenu}
            >
                {selectedCamera ? (
                    <>
                        <CameraStreamContent
                            entityId={cameraSettings.selectedEntityId}
                            haUrl={haUrl}
                            signPath={signPath}
                            getCameraStreamUrl={getCameraStreamUrl}
                            altText={selectedCamera.name}
                        />
                         <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5zM5 5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V11a1 1 0 10-2 0v6H5V7h6a1 1 0 000-2H5z" /></svg>
                        </div>
                    </>
                ) : (
                    <div className="text-gray-500 dark:text-gray-500 text-center p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55a2 2 0 01.95 1.664V16a2 2 0 01-2 2H5a2 2 0 01-2 2v-2.336a2 2 0 01.95-1.664L8 10l3 3 4-3z" /></svg>
                        <p className="mt-2 text-sm">{cameras.length > 0 ? 'Выберите камеру (ПКМ)' : 'Камеры не найдены'}</p>
                    </div>
                )}
            </div>

            {contextMenu && cameras.length > 0 && (
                <ContextMenu x={contextMenu.x} y={contextMenu.y} isOpen={!!contextMenu} onClose={handleCloseContextMenu}>
                    {cameras.map(camera => (
                        <div key={camera.id} onClick={() => handleSelectCamera(camera.id)} className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer text-sm">
                            {camera.name}
                        </div>
                    ))}
                </ContextMenu>
            )}
        </div>
    );
});


interface InfoPanelProps {
    sidebarWidth: number;
    setSidebarWidth: (width: number) => void;
    cameras: Device[];
    haUrl: string;
    signPath: (path: string) => Promise<{ path: string }>;
    getCameraStreamUrl: (entityId: string) => Promise<{ url: string }>;
    getConfig: () => Promise<any>;
    colorScheme: ColorScheme['light'];
    isDark: boolean;
}

/**
 * Боковая информационная панель, содержащая часы, виджет камеры и виджет погоды.
 * Поддерживает изменение ширины путем перетаскивания правого края.
 */
const InfoPanel: React.FC<InfoPanelProps> = ({ sidebarWidth, setSidebarWidth, cameras, haUrl, signPath, getCameraStreamUrl, getConfig, colorScheme, isDark }) => {
    const [isResizing, setIsResizing] = useState(false);
    const { clockSettings, weatherProvider, openWeatherMapKey, yandexWeatherKey, forecaApiKey } = useAppStore();

    // Обработчик начала перетаскивания для изменения размера
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };
    
    // Обработчик движения мыши во время изменения размера
    const handleMouseMove = useCallback((e: MouseEvent) => {
        const newWidth = Math.max(280, Math.min(e.clientX, 500)); // Ограничиваем ширину
        setSidebarWidth(newWidth);
    }, [setSidebarWidth]);

    // Обработчик отпускания кнопки мыши
    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    // Добавляем и удаляем глобальные слушатели событий мыши при изменении состояния isResizing.
    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);
    
    const sidebarBackgroundColor = isDark 
    ? `rgba(28, 28, 30, ${colorScheme.panelOpacity ?? 0.75})` 
    : `rgba(240, 245, 255, ${colorScheme.panelOpacity ?? 0.7})`;

    return (
        <aside
            className="fixed top-0 left-0 h-full backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5 hidden lg:flex flex-col p-8"
            style={{ width: `${sidebarWidth}px`, backgroundColor: sidebarBackgroundColor }}
        >
            <div className="flex-shrink-0 flex justify-center">
                <Clock settings={clockSettings} sidebarWidth={sidebarWidth} color={colorScheme.clockTextColor} />
            </div>

            <div className="flex-1 mt-4 space-y-4 overflow-y-auto no-scrollbar min-h-0">
                 <CameraWidget
                    cameras={cameras}
                    haUrl={haUrl}
                    signPath={signPath}
                    getCameraStreamUrl={getCameraStreamUrl}
                />
            
                <WeatherWidget 
                    weatherProvider={weatherProvider}
                    openWeatherMapKey={openWeatherMapKey}
                    yandexWeatherKey={yandexWeatherKey}
                    forecaApiKey={forecaApiKey}
                    getConfig={getConfig} 
                    colorScheme={colorScheme}
                />
            </div>

                             <SepticTimerCard colorScheme={colorScheme} />

            {/* Невидимый элемент для захвата мыши при изменении размера */}
            <div
                onMouseDown={handleMouseDown}
                className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none z-50"
            />
        </aside>
    );
};

export default React.memo(InfoPanel);
