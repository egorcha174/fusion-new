import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ClockSettings, Device, ClockSize, CameraSettings } from '../types';

interface ClockProps {
    settings: ClockSettings;
    sidebarWidth: number;
}

const Clock: React.FC<ClockProps> = ({ settings, sidebarWidth }) => {
    const [time, setTime] = useState(new Date());

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

    const getAdaptiveFontSize = () => {
        const sizeMultiplier: Record<ClockSize, number> = {
            sm: 0.85,
            md: 1.0,
            lg: 1.15,
        };
        const characterCount = settings.showSeconds ? 8 : 5;
        // Base size is roughly panel width / characters, with a scaling factor for aesthetics
        const baseFontSize = (sidebarWidth / characterCount) * 1.7;
        const finalSize = baseFontSize * sizeMultiplier[settings.size];
        
        // Clamp font size to avoid extreme values
        return Math.max(24, Math.min(finalSize, 128));
    };

    const fontSizeStyle = {
        fontSize: `${getAdaptiveFontSize()}px`,
    };

    return (
        <div 
            className="font-mono font-bold text-gray-100 tracking-tighter whitespace-nowrap"
            style={fontSizeStyle}
        >
            {time.toLocaleTimeString('ru-RU', options)}
        </div>
    );
};

const getWeatherIcon = (condition?: string): string => {
    if (!condition) return '❔';
    const iconMap: Record<string, string> = {
        'clear-night': '🌙',
        'cloudy': '☁️',
        'exceptional': '⚠️',
        'fog': '🌫️',
        'hail': '🌨️',
        'lightning': '⚡',
        'lightning-rainy': '⛈️',
        'partlycloudy': '⛅',
        'pouring': '🌧️',
        'rainy': '🌦️',
        'snowy': '❄️',
        'snowy-rainy': '🌨️',
        'sunny': '☀️',
        'windy': '🌬️',
        'windy-variant': '🌬️',
    };
    return iconMap[condition.toLowerCase()] || '❔';
};


const Weather: React.FC<{ weather: Device }> = ({ weather }) => {
    const { temperature, unit, status, forecast, condition } = weather;
    
    const todayForecast = forecast?.[0];

    const getDayAbbreviation = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase();
    }

    return (
        <div>
            <div className="flex items-center">
                 <div className="text-5xl">{getWeatherIcon(condition)}</div>
                 <div className="ml-4">
                    <p className="text-3xl font-bold">{Math.round(temperature || 0)}{unit}</p>
                    <p className="text-gray-400">{status}</p>
                 </div>
                 {todayForecast && (
                     <div className="ml-auto text-right">
                        <p className="text-lg font-medium text-white">{Math.round(todayForecast.temperature)}°</p>
                        <p className="text-lg font-medium text-gray-400">{Math.round(todayForecast.templow)}°</p>
                     </div>
                 )}
            </div>
             {forecast && forecast.length > 1 && (
                 <div className="mt-6 grid grid-cols-5 gap-2 text-center text-gray-400">
                    {forecast.slice(0, 5).map((day, index) => (
                        <div key={index}>
                            <p>{getDayAbbreviation(day.datetime)}</p>
                            <p className="text-2xl mt-1">{getWeatherIcon(day.condition)}</p>
                            <p className="font-semibold text-white mt-1">{Math.round(day.temperature)}°</p>
                            <p className="text-gray-500">{Math.round(day.templow)}°</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

interface CameraWidgetProps {
    cameras: Device[];
    settings: CameraSettings;
    onSettingsChange: (settings: CameraSettings) => void;
    haUrl: string;
    signPath: (path: string) => Promise<{ path: string }>;
}

const CameraWidget: React.FC<CameraWidgetProps> = ({ cameras, settings, onSettingsChange, haUrl, signPath }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const selectedCamera = cameras.find(c => c.id === settings.selectedEntityId);

    const [signedStreamUrl, setSignedStreamUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const streamUrl = settings.directStreamUrl || signedStreamUrl;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (settings.directStreamUrl) {
             setError(null); // Clear previous errors when a new direct URL is set
             setSignedStreamUrl(null);
             return;
        }
        
        if (!selectedCamera || !signPath || !haUrl) {
            setSignedStreamUrl(null);
            setError(null);
            return;
        }

        let isMounted = true;
        const getSignedUrl = async () => {
            setIsLoading(true);
            setError(null);
            setSignedStreamUrl(null);
            try {
                const result = await signPath(`/api/camera_proxy_stream/${selectedCamera.id}`);
                if (isMounted) {
                    const protocol = haUrl.startsWith('https') ? 'https://' : 'http://';
                    const cleanUrl = haUrl.replace(/^(https?):\/\//, '');
                    setSignedStreamUrl(`${protocol}${cleanUrl}${result.path}`);
                }
            } catch (err) {
                console.error("Failed to get signed URL for camera:", err);
                if (isMounted) {
                    setError("Ошибка авторизации видео.");
                }
            } finally {
                if(isMounted) setIsLoading(false);
            }
        };

        getSignedUrl();

        return () => { isMounted = false; };
    }, [selectedCamera, signPath, haUrl, settings.directStreamUrl]);


    const handleSelectCamera = (entityId: string | null) => {
        onSettingsChange({ ...settings, selectedEntityId: entityId });
        setIsMenuOpen(false);
    };

    const handleSetDirectUrl = () => {
        const newUrl = window.prompt("Введите прямой URL видеопотока:", settings.directStreamUrl || '');
        if (newUrl !== null) { // User didn't cancel
            onSettingsChange({ ...settings, directStreamUrl: newUrl || undefined });
        }
        setIsMenuOpen(false);
    };

    const handleResetDirectUrl = () => {
        onSettingsChange({ ...settings, directStreamUrl: undefined });
        setIsMenuOpen(false);
    };

    const renderContent = () => {
        if (isLoading && !settings.directStreamUrl) {
            return (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-gray-400"></div>
                </div>
            );
        }
        if (error) {
             return (
                <div className="w-full h-full flex flex-col items-center justify-center text-red-400 p-4 text-center">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                     </svg>
                     <p className="text-sm font-semibold">{error}</p>
                     <p className="text-xs text-gray-500 mt-1">Возможные причины: неверный URL, проблема с CORS, смешанный контент (HTTP/HTTPS).</p>
                </div>
            );
        }
        if (streamUrl) {
            return <img src={streamUrl} crossOrigin="anonymous" className="w-full h-full object-cover rounded-lg bg-black" alt={selectedCamera?.name || 'Прямая трансляция'} onError={() => setError("Не удалось загрузить видео.")}/>;
        }
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-4 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="mt-2 text-sm">{cameras.length > 0 ? 'Камера не выбрана' : 'Камеры не найдены'}</p>
                {cameras.length > 0 && (
                     <button onClick={() => setIsMenuOpen(true)} className="mt-2 px-3 py-1 bg-gray-700 text-white rounded-md text-xs hover:bg-gray-600 transition-colors">Выбрать камеру</button>
                )}
            </div>
        );
    }

    return (
        <div className="relative aspect-video bg-gray-800 rounded-lg group text-white">
            {renderContent()}
            <div className="absolute top-2 right-2" ref={menuRef}>
                <button 
                    onClick={() => setIsMenuOpen(p => !p)} 
                    className="p-1.5 bg-black/40 backdrop-blur-sm rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 hover:bg-black/60"
                    aria-label="Настройки камеры"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                </button>
                {isMenuOpen && (
                    <div className="absolute top-full right-0 mt-1 w-56 bg-gray-800/90 backdrop-blur-sm rounded-md shadow-lg z-20 ring-1 ring-black/20 p-1 fade-in">
                        {cameras.length > 0 && (
                             <div className="max-h-40 overflow-y-auto">
                                {cameras.map(camera => (
                                    <button key={camera.id} onClick={() => handleSelectCamera(camera.id)} className="block w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 rounded-md">
                                        {camera.name}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="h-px bg-gray-600/50 my-1" />
                        <button onClick={handleSetDirectUrl} className="block w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 rounded-md">
                            Указать URL потока
                        </button>
                        {settings.directStreamUrl && (
                             <button onClick={handleResetDirectUrl} className="block w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 rounded-md">
                                Сбросить URL
                            </button>
                        )}
                        {selectedCamera && (
                            <>
                                <div className="h-px bg-gray-600/50 my-1" />
                                <button onClick={() => handleSelectCamera(null)} className="block w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-md">
                                    Отключить камеру
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};


interface InfoPanelProps {
    clockSettings: ClockSettings;
    weatherDevice?: Device | null;
    sidebarWidth: number;
    setSidebarWidth: (width: number) => void;
    cameras: Device[];
    cameraSettings: CameraSettings;
    onCameraSettingsChange: (settings: CameraSettings) => void;
    haUrl: string;
    signPath: (path: string) => Promise<{ path: string }>;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ clockSettings, weatherDevice, sidebarWidth, setSidebarWidth, cameras, cameraSettings, onCameraSettingsChange, haUrl, signPath }) => {
    const [isResizing, setIsResizing] = useState(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };
    
    const handleMouseMove = useCallback((e: MouseEvent) => {
        const newWidth = Math.max(280, Math.min(e.clientX, 500)); // Min 280px, Max 500px
        setSidebarWidth(newWidth);
    }, [setSidebarWidth]);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

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

    return (
        <aside
            className="fixed top-0 left-0 h-full bg-gray-900 ring-1 ring-white/5 text-white hidden lg:flex flex-col p-8"
            style={{ width: `${sidebarWidth}px` }}
        >
            <div className="flex justify-center">
                <Clock settings={clockSettings} sidebarWidth={sidebarWidth} />
            </div>

            <div className="mt-8 space-y-8">
                 <CameraWidget
                    cameras={cameras}
                    settings={cameraSettings}
                    // FIX: Renamed prop `onCameraSettingsChange` to `onSettingsChange` to match the `CameraWidgetProps` interface.
                    onSettingsChange={onCameraSettingsChange}
                    haUrl={haUrl}
                    signPath={signPath}
                />
            
                {weatherDevice ? (
                    <Weather weather={weatherDevice} />
                ) : (
                    <div className="opacity-50">
                         <div className="flex items-center">
                             <div className="text-5xl">❔</div>
                             <div className="ml-4">
                                <p className="text-3xl font-bold">--°</p>
                                <p className="text-gray-400">Нет данных о погоде</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div
                onMouseDown={handleMouseDown}
                className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none z-50"
            />
        </aside>
    );
};

export default InfoPanel;