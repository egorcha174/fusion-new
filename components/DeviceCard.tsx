import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Device, DeviceType, CardSize } from '../types';
import DeviceIcon from './DeviceIcon';
import SparklineChart from './SparklineChart';
import Hls from 'hls.js';
import { constructHaUrl } from '../utils/url';

// --- Auto-fitting Text Component ---
const AutoFitText: React.FC<{
  text: string;
  baseFontSize: number;
  className: string;
  containerRef: React.RefObject<HTMLDivElement>;
}> = ({ text, baseFontSize, className, containerRef }) => {
  const pRef = React.useRef<HTMLParagraphElement>(null);

  React.useLayoutEffect(() => {
    const p = pRef.current;
    const container = containerRef.current;
    if (!p || !container) return;

    const fitText = () => {
      // Reset to base size for accurate measurement
      p.style.fontSize = `${baseFontSize}px`;
      let currentSize = baseFontSize;
      
      // Reduce font size until the container no longer overflows
      // A small tolerance is added to prevent shrinking for minor pixel overflows
      while (container.scrollHeight > container.clientHeight + 1 && currentSize > 9) {
        currentSize -= 1;
        p.style.fontSize = `${currentSize}px`;
      }
    };

    // Observe the container, not the text element itself
    const resizeObserver = new ResizeObserver(fitText);
    resizeObserver.observe(container);
    fitText(); // Initial fit

    return () => resizeObserver.disconnect();
  }, [text, baseFontSize, containerRef]);

  return (
    <p ref={pRef} className={className} style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}>
      {text}
    </p>
  );
};


// --- Video Player Component ---
interface VideoPlayerProps {
  src: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const setupHls = useCallback(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: Hls;

    if (Hls.isSupported()) {
      hls = new Hls({
          lowLatencyMode: true,
          backBufferLength: 90,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.warn("Autoplay was prevented.", e));
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('HLS fatal network error encountered, trying to recover');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('HLS fatal media error encountered, trying to recover');
              hls.recoverMediaError();
              break;
            default:
              console.error('HLS fatal error, cannot recover');
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.warn("Autoplay was prevented.", e));
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  useEffect(setupHls, [setupHls]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center group">
      <video ref={videoRef} className="w-full h-full object-contain" muted autoPlay playsInline />

      {/* This overlay captures clicks on the video area and lets them bubble up, while controls sit on top with a higher z-index */}
      <div className="absolute inset-0" />

      <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-md text-white text-xs font-bold tracking-wider fade-in">
        RTC
      </div>
      
      {/* Controls are placed on a higher z-index to be clickable */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto z-10">
        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="text-white flex-shrink-0 p-1">
            {isPlaying ? (
              <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V8z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          
          <div className="w-full h-1.5 bg-gray-500/50 rounded-full flex items-center">
            <div className="w-full h-full bg-gray-400/80 rounded-full"></div>
          </div>
          
        </div>
      </div>
    </div>
  );
};


// --- Universal Camera Stream Component ---
interface CameraStreamContentProps {
  entityId?: string | null;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
  altText?: string;
}

export const CameraStreamContent: React.FC<CameraStreamContentProps> = ({
  entityId,
  haUrl,
  signPath,
  getCameraStreamUrl,
  altText = 'Прямая трансляция',
}) => {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [streamType, setStreamType] = useState<'hls' | 'mjpeg' | 'none'>('none');
  
  useEffect(() => {
    let isMounted = true;
    
    const setupStream = async () => {
      if (!isMounted) return;

      setStreamUrl(null);
      setError(null);
      setLoadState('loading');
      setStreamType('none');
      
      if (!entityId || !haUrl) {
          setLoadState('idle');
          return;
      }
      
      try {
        if (getCameraStreamUrl) {
          const hlsUrlPath = await getCameraStreamUrl(entityId);
          if (isMounted) {
            const finalUrl = constructHaUrl(haUrl, hlsUrlPath, 'http');
            setStreamUrl(finalUrl);
            setStreamType('hls');
            setLoadState('loaded');
            return;
          }
        }
      } catch (err) {
        console.warn(`Failed to get HLS stream for ${entityId}, falling back to MJPEG. Error:`, err);
      }

      try {
        const result = await signPath(`/api/camera_proxy_stream/${entityId}`);
        if (isMounted) {
          const finalUrl = constructHaUrl(haUrl, result.path, 'http');
          setStreamUrl(finalUrl);
          setStreamType('mjpeg');
          setLoadState('loaded');
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Failed to get signed MJPEG URL for ${entityId}:`, err);
          setError("Не удалось получить URL для камеры от Home Assistant.");
          setLoadState('error');
        }
      }
    };

    setupStream();

    return () => { isMounted = false; };
  }, [entityId, haUrl, signPath, getCameraStreamUrl]);
  
  const renderStream = () => {
    if (!streamUrl) return null;

    switch (streamType) {
      case 'hls':
        return <VideoPlayer src={streamUrl} />;
      case 'mjpeg':
        return (
          <div className="relative w-full h-full">
            <img
              src={streamUrl}
              className="w-full h-full border-0 bg-black object-contain"
              alt={altText}
            />
          </div>
        );
      default:
        return null;
    }
  };


  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {loadState === 'loaded' && renderStream()}

      {loadState === 'loading' && (
         <div className="absolute inset-0 flex items-center justify-center">
           <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-gray-400"></div>
         </div>
      )}

      {loadState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-2 text-center bg-gray-800/80">
          <p className="text-sm font-semibold">Ошибка</p>
          <p className="text-xs text-gray-400 mt-1">{error}</p>
        </div>
      )}

      {loadState === 'idle' && (
        <div className="text-gray-500 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55a2 2 0 01.95 1.664V16a2 2 0 01-2 2H5a2 2 0 01-2 2v-2.336a2 2 0 01.95-1.664L8 10l3 3 4-3z" />
            </svg>
            <p className="mt-2 text-sm">Камера не выбрана</p>
        </div>
      )}
    </div>
  );
};


// --- Device Card Component ---
interface DeviceCardProps {
  device: Device;
  onTemperatureChange: (change: number) => void;
  onBrightnessChange: (brightness: number) => void;
  onPresetChange: (preset: string) => void;
  onCameraCardClick: (device: Device) => void;
  isEditMode: boolean;
  onEditDevice: (device: Device) => void;
  onRemoveFromTab?: () => void;
  cardSize: CardSize;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onTemperatureChange, onBrightnessChange, onPresetChange, onCameraCardClick, isEditMode, onEditDevice, onRemoveFromTab, cardSize, haUrl, signPath, getCameraStreamUrl }) => {
  const isOn = device.status.toLowerCase() === 'включено';
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  const sizeMap: Record<CardSize, number> = {
    'xs': 12, 'sm': 14, 'md': 16, 'lg': 18, 'xl': 20
  };
  
  const cardStyles = {
    xs: {
      padding: 'p-2',
      nameText: 'text-xs font-semibold leading-tight',
      statusText: 'text-[11px]',
      sensorStatusText: 'text-xl font-bold',
      sensorUnitText: 'text-xs font-medium',
      thermostatTempText: 'font-bold text-sm',
      thermostatTargetText: 'text-[11px] font-medium',
      thermostatButton: 'w-6 h-6 text-sm font-semibold',
      thermostatPresetButton: 'w-6 h-6',
      thermostatPresetIcon: 'h-3 w-3',
      brightnessCircle: 'w-8 h-8',
      brightnessText: 'text-[10px] font-semibold',
    },
    sm: {
      padding: 'p-2.5',
      nameText: 'text-sm font-semibold leading-tight',
      statusText: 'text-xs',
      sensorStatusText: 'text-2xl font-bold',
      sensorUnitText: 'text-sm font-medium',
      thermostatTempText: 'font-bold text-base',
      thermostatTargetText: 'text-xs font-medium',
      thermostatButton: 'w-7 h-7 text-base font-semibold',
      thermostatPresetButton: 'w-7 h-7',
      thermostatPresetIcon: 'h-4 w-4',
      brightnessCircle: 'w-9 h-9',
      brightnessText: 'text-[11px] font-semibold',
    },
    md: {
      padding: 'p-3',
      nameText: 'text-base font-semibold leading-tight',
      statusText: 'text-sm',
      sensorStatusText: 'text-3xl font-bold',
      sensorUnitText: 'text-base font-medium',
      thermostatTempText: 'font-bold text-lg',
      thermostatTargetText: 'text-sm font-medium',
      thermostatButton: 'w-8 h-8 text-lg font-semibold',
      thermostatPresetButton: 'w-8 h-8',
      thermostatPresetIcon: 'h-5 w-5',
      brightnessCircle: 'w-10 h-10',
      brightnessText: 'text-xs font-semibold',
    },
    lg: {
      padding: 'p-4',
      nameText: 'text-lg font-semibold leading-tight',
      statusText: 'text-base',
      sensorStatusText: 'text-4xl font-bold',
      sensorUnitText: 'text-lg font-medium',
      thermostatTempText: 'font-bold text-xl',
      thermostatTargetText: 'text-base font-medium',
      thermostatButton: 'w-9 h-9 text-xl font-semibold',
      thermostatPresetButton: 'w-9 h-9',
      thermostatPresetIcon: 'h-6 w-6',
      brightnessCircle: 'w-11 h-11',
      brightnessText: 'text-sm font-semibold',
    },
    xl: {
      padding: 'p-5',
      nameText: 'text-xl font-semibold leading-tight',
      statusText: 'text-lg',
      sensorStatusText: 'text-5xl font-bold',
      sensorUnitText: 'text-xl font-medium',
      thermostatTempText: 'font-bold text-2xl',
      thermostatTargetText: 'text-lg font-medium',
      thermostatButton: 'w-10 h-10 text-2xl font-semibold',
      thermostatPresetButton: 'w-10 h-10',
      thermostatPresetIcon: 'h-7 w-7',
      brightnessCircle: 'w-12 h-12',
      brightnessText: 'text-base font-semibold',
    }
  };
  const styles = cardStyles[cardSize];


  // --- Translation for presets ---
  const presetTranslations: { [key: string]: string } = {
    'none': 'Нет',
    'away': 'Не дома',
    'comfort': 'Комфорт',
    'eco': 'Эко',
    'home': 'Дома',
    'sleep': 'Сон',
    'activity': 'Активность',
    'boost': 'Усиленный',
  };

  const translatePreset = (preset: string | undefined): string => {
      if (!preset) return presetTranslations['none'];
      const lowerPreset = preset.toLowerCase();
      return presetTranslations[lowerPreset] || preset.charAt(0).toUpperCase() + preset.slice(1);
  };


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (presetMenuRef.current && !presetMenuRef.current.contains(event.target as Node)) {
            setIsPresetMenuOpen(false);
        }
    };
    if (isPresetMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPresetMenuOpen]);

  
  const textOnClasses = "text-gray-800";
  const textOffClasses = "text-gray-400";
  
  const isCamera = device.type === DeviceType.Camera;
  const isTogglable = device.type !== DeviceType.Thermostat && device.type !== DeviceType.Climate && device.type !== DeviceType.Sensor && !isCamera;

  const renderContent = () => {
    switch (device.type) {
      case DeviceType.Camera:
        if (!haUrl || !signPath || !getCameraStreamUrl) {
            return <div>Ошибка: Требуется haUrl, signPath и getCameraStreamUrl для камеры.</div>
        }
        return (
            <div 
              className="w-full h-full bg-black group relative"
              onClick={(e) => { 
                  if (isEditMode) return;
                  e.stopPropagation(); 
                  onCameraCardClick(device); 
              }}
            >
                <CameraStreamContent 
                    entityId={device.id}
                    haUrl={haUrl}
                    signPath={signPath}
                    getCameraStreamUrl={getCameraStreamUrl}
                    altText={device.name}
                />
                {!isEditMode && (
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5zM5 5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V11a1 1 0 10-2 0v6H5V7h6a1 1 0 000-2H5z" />
                    </svg>
                  </div>
                )}
            </div>
        )
      case DeviceType.DimmableLight:
        return (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-start flex-shrink-0">
              <DeviceIcon type={device.icon ?? device.type} isOn={isOn} cardSize={cardSize} />
              {isOn && device.brightness !== undefined && (
                <div className={`${styles.brightnessCircle} rounded-full border-2 ${isOn ? 'border-gray-400/50' : 'border-gray-500'} flex items-center justify-center`}>
                  <span className={`${styles.brightnessText} ${isOn ? textOnClasses : textOffClasses}`}>{device.brightness}%</span>
                </div>
              )}
            </div>
            <div ref={textContainerRef} className="flex-grow text-left overflow-hidden flex flex-col justify-end">
                <AutoFitText
                    text={device.name}
                    baseFontSize={sizeMap[cardSize]}
                    className={styles.nameText}
                    containerRef={textContainerRef}
                />
              <p className={`${styles.statusText} ${isOn ? textOnClasses : textOffClasses} transition-colors`}>{device.status}</p>
               {isOn && (
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="range"
                        min="1"
                        max="100"
                        value={device.brightness}
                        onInput={(e) => onBrightnessChange(parseInt(e.currentTarget.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>
            )}
            </div>
          </div>
        );
      case DeviceType.Thermostat:
        return (
          <div className="flex flex-col h-full text-left">
            {/* Top row */}
            <div className="flex justify-between items-start">
                <DeviceIcon type={device.icon ?? device.type} isOn={false} cardSize={cardSize} />

                {device.presetModes && device.presetModes.length > 0 && (
                    <div className="relative z-10" ref={presetMenuRef}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsPresetMenuOpen(prev => !prev); }}
                            className={`${styles.thermostatPresetButton} rounded-full bg-black/20 text-white flex items-center justify-center hover:bg-black/40`}
                            aria-label="Открыть предустановки"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className={styles.thermostatPresetIcon} viewBox="0 0 20 20" fill="currentColor">
                             <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                           </svg>
                        </button>
                        {isPresetMenuOpen && (
                            <div className="absolute top-full right-0 mt-1 w-40 bg-gray-700 rounded-md shadow-lg z-20 ring-1 ring-black ring-opacity-5 p-1 max-h-48 overflow-y-auto fade-in">
                                {device.presetModes.map(preset => (
                                    <button
                                        key={preset}
                                        onClick={() => { onPresetChange(preset); setIsPresetMenuOpen(false); }}
                                        className="block w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-600 rounded-md"
                                    >
                                        {translatePreset(preset)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <div className="flex-grow"></div>

            {/* Bottom part */}
            <div className="flex-shrink-0">
              <p className={`${styles.nameText}`}>{device.name}</p>
              <p className={`${styles.thermostatTempText} text-white`}>{device.temperature}{device.unit}</p>
              <div className="flex items-center justify-between mt-1">
                <button onClick={(e) => { e.stopPropagation(); onTemperatureChange(-0.5); }} className={`${styles.thermostatButton} rounded-full bg-black/20 text-white flex items-center justify-center font-light text-2xl leading-none pb-1`}>-</button>
                <span className={`${styles.thermostatTargetText} text-gray-300`}>Цель: {device.targetTemperature}{device.unit}</span>
                <button onClick={(e) => { e.stopPropagation(); onTemperatureChange(0.5); }} className={`${styles.thermostatButton} rounded-full bg-black/20 text-white flex items-center justify-center font-light text-2xl leading-none pb-1`}>+</button>
              </div>
            </div>
          </div>
        );
      case DeviceType.Sensor:
        const mockHistory = useMemo(() => {
            const value = parseFloat(device.status) || 20;
            return Array.from({ length: 20 }, (_, i) => 
                value + (Math.sin(i / 3) * (value * 0.05)) + (Math.random() - 0.5) * (value * 0.05)
            );
        }, [device.status]);

        const isNumericStatus = !isNaN(parseFloat(device.status));

        return (
          <div className="flex flex-col h-full text-left">
            <div>
              <DeviceIcon type={device.icon ?? device.type} isOn={false} cardSize={cardSize} />
              <p className={`${styles.nameText} mt-2`}>{device.name}</p>
            </div>
             <div className="flex-grow flex items-center w-full my-1 min-h-0">
              <SparklineChart data={device.history || mockHistory} />
            </div>
            <div className="flex items-baseline mt-auto flex-shrink-0">
              <p className={`${isNumericStatus ? styles.sensorStatusText : 'text-lg font-semibold break-words'}`}>{device.status}</p>
              {device.unit && isNumericStatus && <p className={`${styles.sensorUnitText} text-gray-400 ml-1`}>{device.unit}</p>}
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0">
               <DeviceIcon type={device.icon ?? device.type} isOn={isOn} cardSize={cardSize} />
            </div>
            <div ref={textContainerRef} className="flex-grow text-left overflow-hidden flex flex-col justify-end">
                <AutoFitText
                    text={device.name}
                    baseFontSize={sizeMap[cardSize]}
                    className={styles.nameText}
                    containerRef={textContainerRef}
                />
              <p className={`${styles.statusText} ${isOn ? textOnClasses : textOffClasses} transition-colors`}>{device.status}</p>
            </div>
          </div>
        );
    }
  };

  const getCardClasses = () => {
    const baseClasses = "aspect-square rounded-2xl flex flex-col transition-all duration-200 ease-in-out select-none relative";
    const onStateClasses = "bg-gray-200 text-gray-900";
    const offStateClasses = "bg-gray-800/80 hover:bg-gray-700/80";
    
    let finalClasses = `${baseClasses} `;

    if (isCamera) {
      finalClasses += `p-0 overflow-hidden ${offStateClasses}`;
    } else if (device.type === DeviceType.Sensor || device.type === DeviceType.Thermostat) {
        finalClasses += `${styles.padding} ${offStateClasses}`;
    } else {
        finalClasses += `${styles.padding} ${isOn ? onStateClasses : offStateClasses}`;
    }
  
    if ((isTogglable || isCamera) && !isEditMode) {
        finalClasses += ' cursor-pointer';
    }
    return finalClasses;
  }

  return (
    <div className={getCardClasses()}>
        {isEditMode && (
         <div className="absolute -top-2 -right-2 z-20 flex flex-col gap-2">
           {onRemoveFromTab && (
             <button
               onClick={(e) => { e.stopPropagation(); onRemoveFromTab(); }}
               className="p-2 bg-red-600/80 backdrop-blur-sm rounded-full text-white hover:bg-red-500 transition-colors"
               aria-label={`Удалить ${device.name} с вкладки`}
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
               </svg>
             </button>
           )}
           <button
             onClick={(e) => { e.stopPropagation(); onEditDevice(device); }}
             className="p-2 bg-blue-600/80 backdrop-blur-sm rounded-full text-white hover:bg-blue-500 transition-colors"
             aria-label={`Редактировать ${device.name}`}
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
               <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
               <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
             </svg>
           </button>
         </div>
       )}
       {renderContent()}
    </div>
  );
};

export default DeviceCard;