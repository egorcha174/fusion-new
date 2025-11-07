import React, { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { Device, DeviceType, CardTemplate, CardElement } from '../types';
import DeviceIcon from './DeviceIcon';
import SparklineChart from './SparklineChart';
import ThermostatDial from './ThermostatDial';
import Hls from 'hls.js';
import { constructHaUrl } from '../utils/url';
import { Icon } from '@iconify/react';

// --- Auto-fitting Text Component (New and Improved) ---
const AutoFitText: React.FC<{
  text: string;
  className?: string;
  pClassName?: string;
  maxFontSize?: number;
  mode?: 'single-line' | 'multi-line';
  maxLines?: number;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
}> = ({ text, className, pClassName, maxFontSize = 48, mode = 'multi-line', maxLines = 2, fontSize, textAlign }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pRef = React.useRef<HTMLParagraphElement>(null);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    const p = pRef.current;
    if (!container || !p) return;

    // --- New Logic: Apply fixed font size if provided ---
    if (fontSize) {
      p.style.fontSize = `${fontSize}px`;
      p.style.whiteSpace = mode === 'multi-line' ? 'normal' : 'nowrap';
      // We don't need to run the auto-fit logic
      const resizeObserver = new ResizeObserver(() => {});
      if (container) resizeObserver.observe(container);
      return () => { if (container) resizeObserver.unobserve(container); };
    }

    const fitText = () => {
      let currentSize = maxFontSize;
      const tolerance = 1; // Add a small tolerance to prevent jitter

      p.style.fontSize = `${currentSize}px`;
      p.style.whiteSpace = mode === 'multi-line' ? 'normal' : 'nowrap';
      
      while (
        currentSize > 8 &&
        (p.scrollWidth > container.clientWidth + tolerance || p.scrollHeight > container.clientHeight + tolerance)
      ) {
        currentSize -= 1;
        p.style.fontSize = `${currentSize}px`;
      }
    };

    const resizeObserver = new ResizeObserver(fitText);
    if (container) {
        resizeObserver.observe(container);
    }
    fitText(); // Initial fit

    return () => {
        if(container) {
            resizeObserver.unobserve(container);
        }
    };
  }, [text, maxFontSize, mode, fontSize]);

  const multiLineStyles: React.CSSProperties = mode === 'multi-line' ? {
      display: '-webkit-box',
      WebkitLineClamp: maxLines,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
  } : {};
  
  const textAlignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[textAlign || 'left'];


  return (
    <div ref={containerRef} className={`${className} flex items-center ${textAlignClass}`}>
      <p ref={pRef} className={pClassName} style={{ lineHeight: 1.15, wordBreak: 'break-word', ...multiLineStyles }}>
        {text}
      </p>
    </div>
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

      <div className="absolute inset-0" />

      <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-md text-white text-xs font-bold tracking-wider fade-in">
        RTC
      </div>
      
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


interface DeviceCardProps {
  device: Device;
  onTemperatureChange: (temperature: number, isDelta?: boolean) => void;
  onBrightnessChange: (brightness: number) => void;
  onHvacModeChange: (mode: string) => void;
  onPresetChange: (preset: string) => void;
  onCameraCardClick: (device: Device) => void;
  isEditMode: boolean;
  onEditDevice: (device: Device) => void;
  onRemoveFromTab?: () => void;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
  template?: CardTemplate;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onTemperatureChange, onBrightnessChange, onHvacModeChange, onPresetChange, onCameraCardClick, isEditMode, onEditDevice, onRemoveFromTab, haUrl, signPath, getCameraStreamUrl, template }) => {
  const isOn = device.status.toLowerCase() === 'включено';
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);

  const mockHistory = useMemo(() => {
    if (device.type !== DeviceType.Sensor) return [];
    const value = parseFloat(device.status) || 20;
    return Array.from({ length: 20 }, (_, i) => 
        value + (Math.sin(i / 3) * (value * 0.05)) + (Math.random() - 0.5) * (value * 0.05)
    );
  }, [device.type, device.status]);

   const styles = {
      padding: 'p-[8%]',
      nameText: 'font-semibold leading-tight',
      statusText: 'text-sm',
      sensorStatusText: 'font-bold',
      sensorUnitText: 'font-medium',
      thermostatTempText: 'font-bold text-lg',
      thermostatTargetText: 'text-sm font-medium',
      thermostatButton: 'w-8 h-8 text-lg font-semibold',
      thermostatPresetButton: 'w-8 h-8',
      thermostatPresetIcon: 'h-5 w-5',
      brightnessCircle: 'w-10 h-10',
      brightnessText: 'text-xs font-semibold',
    };

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

  // --- Universal Template Renderer ---
  if (template) {
    const renderElement = (element: CardElement) => {
      if (!element.visible) return null;

      const style: React.CSSProperties = {
        position: 'absolute',
        left: `${element.position.x}%`,
        top: `${element.position.y}%`,
        width: `${element.size.width}%`,
        height: `${element.size.height}%`,
        zIndex: element.zIndex,
      };

      switch(element.id) {
        case 'name':
          return (
            <div key={element.id} style={style}>
              <AutoFitText text={device.name} className="w-full h-full" pClassName={`font-medium ${isOn ? 'text-gray-900' : 'text-gray-300'} leading-tight`} maxFontSize={100} mode="multi-line" maxLines={2} fontSize={element.styles.fontSize} textAlign={element.styles.textAlign} />
            </div>
          );
        case 'icon':
          const iconColor = isOn
              ? (element.styles.onColor || 'rgb(59 130 246)') // default blue
              : (element.styles.offColor || 'rgb(156 163 175)'); // default gray-400
          return (
            <div key={element.id} style={{ ...style, color: iconColor }}>
              <DeviceIcon icon={device.icon ?? device.type} isOn={isOn} className="!w-full !h-full" iconAnimation={device.iconAnimation} />
            </div>
          );
        case 'status':
          return (
            <div key={element.id} style={style}>
              <AutoFitText text={device.status} className="w-full h-full" pClassName={`text-sm ${isOn ? 'text-gray-800' : 'text-gray-400'}`} maxFontSize={100} mode="single-line" fontSize={element.styles.fontSize} textAlign={element.styles.textAlign} />
            </div>
          );
        case 'value': {
          const { decimalPlaces } = element.styles;
          let valueText = device.status;
          const numericStatus = parseFloat(device.status);
          if (!isNaN(numericStatus) && typeof decimalPlaces === 'number' && decimalPlaces >= 0) {
            valueText = numericStatus.toFixed(decimalPlaces);
          }
          return (
            <div key={element.id} style={style} className="flex items-center">
              <AutoFitText text={valueText} className="w-full h-full" pClassName="font-semibold text-gray-100" maxFontSize={100} mode="single-line" fontSize={element.styles.fontSize} textAlign={element.styles.textAlign} />
            </div>
          );
        }
        case 'unit': {
          const isNumericStatus = !isNaN(parseFloat(device.status));
          if (!device.unit || !isNumericStatus) return null;
          return (
            <div key={element.id} style={style}>
              <AutoFitText text={device.unit} className="w-full h-full" pClassName="font-medium text-gray-400" maxFontSize={100} mode="single-line" fontSize={element.styles.fontSize} textAlign={element.styles.textAlign} />
            </div>
          );
        }
        case 'chart':
          return (
            <div key={element.id} style={style}>
              <SparklineChart data={device.history || mockHistory} strokeColor="#E5E7EB" />
            </div>
          );
        case 'slider': {
           if (!isOn || device.brightness === undefined) return null;
           return (
              <div key={element.id} style={style} onClick={(e) => e.stopPropagation()}>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={device.brightness}
                  onInput={(e) => onBrightnessChange(parseInt(e.currentTarget.value))}
                  className="w-full h-full bg-gray-700/50 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
           );
        }
        case 'temperature':
           return (
             <div key={element.id} style={style} className="pointer-events-none">
               <AutoFitText text={`${device.temperature?.toFixed(0) ?? ''}°`} className="w-full h-full" pClassName="font-bold text-gray-100" maxFontSize={100} mode="single-line" fontSize={element.styles.fontSize} textAlign={element.styles.textAlign} />
             </div>
           );
        case 'target-temperature':
          return (
            <div key={element.id} style={style} onClick={e => e.stopPropagation()}>
              <ThermostatDial 
                min={device.minTemp ?? 10}
                max={device.maxTemp ?? 35}
                value={device.targetTemperature ?? 21}
                current={device.temperature ?? 21}
                onChange={value => onTemperatureChange(value)}
                hvacAction={device.hvacAction ?? 'idle'}
              />
            </div>
          );
        case 'hvac-modes': {
            const [isDropdownOpen, setIsDropdownOpen] = useState(false);
            const dropdownRef = useRef<HTMLDivElement>(null);
        
            useEffect(() => {
                const handleClickOutside = (event: MouseEvent) => {
                    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                        setIsDropdownOpen(false);
                    }
                };
                if (isDropdownOpen) {
                    document.addEventListener('mousedown', handleClickOutside);
                }
                return () => {
                    document.removeEventListener('mousedown', handleClickOutside);
                };
            }, [isDropdownOpen]);
        
            const isPresetMode = device.presetModes && device.presetModes.length > 0;
            const modes = isPresetMode ? device.presetModes! : (device.hvacModes || []);
            const activeMode = isPresetMode ? device.presetMode : device.state;
            if (modes.length === 0) return null;
        
            const hvacModeConfig: { [key: string]: { icon: string, label: string } } = {
                'off': { icon: 'mdi:power-off', label: 'Выкл' },
                'cool': { icon: 'mdi:snowflake', label: 'Холод' },
                'heat': { icon: 'mdi:fire', label: 'Нагрев' },
                'auto': { icon: 'mdi:autorenew', label: 'Авто' },
                'fan_only': { icon: 'mdi:fan', label: 'Вент.' },
                'dry': { icon: 'mdi:water-percent', label: 'Осуш.' },
                'heat_cool': { icon: 'mdi:thermostat-auto', label: 'Авто' }
            };
        
            const presetModeConfig: { [key: string]: { icon: string, label: string } } = {
                'none': { icon: 'mdi:cancel', label: translatePreset('none') },
                'away': { icon: 'mdi:airplane-takeoff', label: translatePreset('away') },
                'comfort': { icon: 'mdi:sofa-outline', label: translatePreset('comfort') },
                'eco': { icon: 'mdi:leaf', label: translatePreset('eco') },
                'home': { icon: 'mdi:home-variant-outline', label: translatePreset('home') },
                'sleep': { icon: 'mdi:power-sleep', label: translatePreset('sleep') },
                'activity': { icon: 'mdi:run', label: translatePreset('activity') },
                'boost': { icon: 'mdi:rocket-launch-outline', label: translatePreset('boost') },
            };
        
            const getConfig = (mode: string) => {
                if (isPresetMode) {
                    return presetModeConfig[mode.toLowerCase()] || { icon: 'mdi:circle-medium', label: translatePreset(mode) };
                }
                return hvacModeConfig[mode.toLowerCase()] || { icon: 'mdi:circle-medium', label: mode };
            };
        
            const handleClick = (mode: string) => {
                if (isPresetMode) {
                    onPresetChange(mode);
                } else {
                    onHvacModeChange(mode);
                }
                setIsDropdownOpen(false);
            };
        
            const activeConfig = getConfig(activeMode?.toLowerCase() || (isPresetMode ? 'none' : 'off'));
        
            return (
                <div key={element.id} style={style} onClick={e => e.stopPropagation()} ref={dropdownRef}>
                    <div className="relative w-full h-full flex items-center justify-center">
                        <button
                            onClick={() => setIsDropdownOpen(prev => !prev)}
                            className="w-full h-full flex flex-col items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-colors p-1"
                        >
                            <Icon icon={activeConfig.icon} className="w-auto h-1/2 max-h-[60%] text-white" />
                            <span className="text-[10px] font-bold text-white mt-1 leading-tight text-center">{activeConfig.label}</span>
                        </button>
        
                        {isDropdownOpen && (
                            <div className="absolute bottom-full right-0 mb-2 min-w-full w-max bg-gray-800/80 backdrop-blur-md rounded-lg shadow-lg ring-1 ring-white/10 p-1 z-20">
                                {modes.map(mode => {
                                    const config = getConfig(mode);
                                    return (
                                        <button
                                            key={mode}
                                            onClick={() => handleClick(mode)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-md transition-colors ${activeMode?.toLowerCase() === mode.toLowerCase() ? 'bg-blue-600/50 text-white' : 'text-gray-200 hover:bg-white/10'}`}
                                        >
                                            <Icon icon={config.icon} className="w-5 h-5 flex-shrink-0" />
                                            <span>{config.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        default:
          return null;
      }
    };
    
    return (
      <div
        className="w-full h-full relative rounded-2xl"
        style={{ backgroundColor: isOn ? (template.styles.onBackgroundColor || '#E5E7EB') : template.styles.backgroundColor }}
      >
        {template.elements.map(renderElement)}
      </div>
    );
  }

  // --- Legacy/Default Render Logic ---
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
              <div className={isOn ? 'text-blue-500' : 'text-gray-400'}>
                 <DeviceIcon icon={device.icon ?? device.type} isOn={isOn} iconAnimation={device.iconAnimation} />
              </div>
              {isOn && device.brightness !== undefined && (
                <div className={`${styles.brightnessCircle} rounded-full border-2 ${isOn ? 'border-gray-400/50' : 'border-gray-500'} flex items-center justify-center`}>
                  <span className={`${styles.brightnessText} ${isOn ? textOnClasses : textOffClasses}`}>{device.brightness}%</span>
                </div>
              )}
            </div>
            <div className="flex-grow text-left overflow-hidden flex flex-col justify-end min-h-0">
                <div className="flex-grow flex items-end min-h-0">
                    <AutoFitText
                        text={device.name}
                        className="w-full h-full"
                        pClassName={styles.nameText}
                        maxFontSize={18}
                        mode="multi-line"
                    />
                </div>
              <p className={`${styles.statusText} ${isOn ? textOnClasses : textOffClasses} transition-colors flex-shrink-0`}>{device.status}</p>
               {isOn && (
                <div className="mt-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
            <div className="flex justify-between items-start flex-shrink-0">
                <div className="text-gray-400">
                    <DeviceIcon icon={device.icon ?? device.type} isOn={false} iconAnimation={device.iconAnimation} />
                </div>

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
            
            <div className="flex-grow flex flex-col justify-end overflow-hidden min-h-0">
                 <div className="flex-grow flex items-end min-h-0">
                    <AutoFitText
                        text={device.name}
                        className="w-full h-full"
                        pClassName={styles.nameText}
                        maxFontSize={18}
                        mode="multi-line"
                    />
                </div>
                <p className={`${styles.thermostatTempText} text-white flex-shrink-0`}>{device.temperature}{device.unit}</p>
                <div className="flex items-center justify-between mt-1 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); onTemperatureChange(-0.5, true); }} className={`${styles.thermostatButton} rounded-full bg-black/20 text-white flex items-center justify-center font-light text-2xl leading-none pb-1`}>-</button>
                    <span className={`${styles.thermostatTargetText} text-gray-300`}>Цель: {device.targetTemperature}{device.unit}</span>
                    <button onClick={(e) => { e.stopPropagation(); onTemperatureChange(0.5, true); }} className={`${styles.thermostatButton} rounded-full bg-black/20 text-white flex items-center justify-center font-light text-2xl leading-none pb-1`}>+</button>
                </div>
            </div>
          </div>
        );
      case DeviceType.Sensor: {
        return <div>Sensor should be rendered by template.</div>
      }
      default:
        return (
          <div className="flex flex-col h-full">
            <div className={`flex-shrink-0 ${isOn ? 'text-blue-500' : 'text-gray-400'}`}>
               <DeviceIcon icon={device.icon ?? device.type} isOn={isOn} iconAnimation={device.iconAnimation} />
            </div>
            <div className="flex-grow text-left overflow-hidden flex flex-col justify-end min-h-0">
              <div className="flex-grow flex items-end min-h-0">
                <AutoFitText
                    text={device.name}
                    className="w-full h-full"
                    pClassName={styles.nameText}
                    maxFontSize={18}
                    mode="multi-line"
                />
              </div>
              <p className={`${styles.statusText} ${isOn ? textOnClasses : textOffClasses} transition-colors flex-shrink-0`}>{device.status}</p>
            </div>
          </div>
        );
    }
  };

  const getCardClasses = () => {
    const baseClasses = "w-full h-full rounded-2xl flex flex-col transition-all duration-200 ease-in-out select-none relative";
    
    if (template) {
        return baseClasses; // Background is controlled by template
    }
      
    const onStateClasses = "bg-gray-200 text-gray-900";
    const offStateClasses = "bg-gray-800/80 hover:bg-gray-700/80";
    
    let finalClasses = `${baseClasses} `;

    if (isCamera) {
      finalClasses += `p-0 overflow-hidden ${offStateClasses}`;
    } else if (device.type === DeviceType.Thermostat) {
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
       {renderContent()}
    </div>
  );
};

export default DeviceCard;