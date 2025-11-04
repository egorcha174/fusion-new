import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ClockSettings, Device, ClockSize, CameraSettings } from '../types';
import { CameraStreamContent } from './DeviceCard';
import ContextMenu from './ContextMenu';
import WeatherWidget from './WeatherWidget';

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

interface CameraWidgetProps {
    cameras: Device[];
    settings: CameraSettings;
    onSettingsChange: (settings: CameraSettings) => void;
    onCameraWidgetClick: (device: Device) => void;
    haUrl: string;
    signPath: (path: string) => Promise<{ path: string }>;
    getCameraStreamUrl: (entityId: string) => Promise<string>;
}

const CameraWidget: React.FC<CameraWidgetProps> = ({ cameras, settings, onSettingsChange, onCameraWidgetClick, haUrl, signPath, getCameraStreamUrl }) => {
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
    const selectedCamera = useMemo(() => cameras.find(c => c.id === settings.selectedEntityId), [cameras, settings.selectedEntityId]);

    const handleSelectCamera = (entityId: string | null) => {
        onSettingsChange({ selectedEntityId: entityId });
        setContextMenu(null);
    };

    const handleCameraClick = () => {
        if (selectedCamera) {
            onCameraWidgetClick(selectedCamera);
        }
    };
    
    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY });
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    return (
        <div>
            <div
                className="relative aspect-video bg-gray-800 rounded-lg text-white overflow-hidden flex items-center justify-center group"
                onClick={handleCameraClick}
                onContextMenu={handleContextMenu}
            >
                {selectedCamera ? (
                    <>
                        <CameraStreamContent
                            entityId={settings.selectedEntityId}
                            haUrl={haUrl}
                            signPath={signPath}
                            getCameraStreamUrl={getCameraStreamUrl}
                            altText={selectedCamera.name}
                        />
                         <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5zM5 5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V11a1 1 0 10-2 0v6H5V7h6a1 1 0 000-2H5z" />
                            </svg>
                        </div>
                    </>
                ) : (
                    <div className="text-gray-500 text-center p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55a2 2 0 01.95 1.664V16a2 2 0 01-2 2H5a2 2 0 01-2 2v-2.336a2 2 0 01.95-1.664L8 10l3 3 4-3z" />
                        </svg>
                        <p className="mt-2 text-sm">{cameras.length > 0 ? 'Выберите камеру (ПКМ)' : 'Камеры не найдены'}</p>
                    </div>
                )}
            </div>

            {contextMenu && cameras.length > 0 && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    isOpen={!!contextMenu}
                    onClose={handleCloseContextMenu}
                >
                    {cameras.map(camera => (
                        <div
                            key={camera.id}
                            onClick={() => handleSelectCamera(camera.id)}
                            className="px-3 py-1.5 rounded-md hover:bg-gray-700/80 cursor-pointer text-sm"
                        >
                            {camera.name}
                        </div>
                    ))}
                </ContextMenu>
            )}
        </div>
    );
};


interface InfoPanelProps {
    clockSettings: ClockSettings;
    sidebarWidth: number;
    setSidebarWidth: (width: number) => void;
    cameras: Device[];
    cameraSettings: CameraSettings;
    onCameraSettingsChange: (settings: CameraSettings) => void;
    onCameraWidgetClick: (device: Device) => void;
    haUrl: string;
    signPath: (path: string) => Promise<{ path: string }>;
    getCameraStreamUrl: (entityId: string) => Promise<string>;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ clockSettings, sidebarWidth, setSidebarWidth, cameras, cameraSettings, onCameraSettingsChange, onCameraWidgetClick, haUrl, signPath, getCameraStreamUrl }) => {
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

            <div className="mt-4 space-y-4">
                 <CameraWidget
                    cameras={cameras}
                    settings={cameraSettings}
                    onSettingsChange={onCameraSettingsChange}
                    onCameraWidgetClick={onCameraWidgetClick}
                    haUrl={haUrl}
                    signPath={signPath}
                    getCameraStreamUrl={getCameraStreamUrl}
                />
            
                <WeatherWidget />
            </div>

            <div
                onMouseDown={handleMouseDown}
                className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none z-50"
            />
        </aside>
    );
};

export default InfoPanel;