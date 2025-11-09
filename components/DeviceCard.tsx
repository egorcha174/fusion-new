
import React, { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { Device, DeviceType, CardTemplate, CardElement, DeviceCustomizations, ColorScheme } from '../types';
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
  pStyle?: React.CSSProperties;
  dataAttrs?: { [key: string]: string | undefined };
}> = ({ text, className, pClassName, maxFontSize = 48, mode = 'multi-line', maxLines = 2, fontSize, textAlign, pStyle, dataAttrs }) => {
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
      return;
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
  }, [text, maxFontSize, mode, fontSize, pStyle]); // Rerun effect if pStyle changes font

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
    <div ref={containerRef} className={`${className} flex items-center ${textAlignClass}`} {...dataAttrs}>
      <p ref={pRef} className={pClassName} style={{ lineHeight: 1.15, wordBreak: 'break-word', ...multiLineStyles, ...pStyle }}>
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
  allKnownDevices: Map<string, Device>;
  customizations: DeviceCustomizations;
  onDeviceToggle: (deviceId: string) => void;
  onTemperatureChange: (temperature: number, isDelta?: boolean) => void;
  onBrightnessChange: (brightness: number) => void;
  onHvacModeChange: (mode: string) => void;
  onPresetChange: (preset: string) => void;
  onCameraCardClick: (device: Device) => void;
  isEditMode: boolean;
  isPreview?: boolean;
  onEditDevice: (device: Device) => void;
  onRemoveFromTab?: () => void;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
  template?: CardTemplate;
  openMenuDeviceId?: string | null;
  setOpenMenuDeviceId?: (id: string | null) => void;
  colorScheme: ColorScheme['light'];
  onContextMenu?: (event: React.MouseEvent) => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, allKnownDevices, customizations, onDeviceToggle, onTemperatureChange, onBrightnessChange, onHvacModeChange, onPresetChange, onCameraCardClick, isEditMode, isPreview = false, onEditDevice, onRemoveFromTab, haUrl, signPath, getCameraStreamUrl, template, openMenuDeviceId, setOpenMenuDeviceId, colorScheme, onContextMenu }) => {
  const isOn = device.status.toLowerCase() === 'включено' || device.state === 'on';
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

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
      statusText: 'text-sm opacity-70',
      sensorStatusText: 'font-bold',
      sensorUnitText: 'font-medium opacity-70',
      thermostatTempText: 'font-bold text-lg',
      thermostatTargetText: 'text-sm font-medium opacity-80',
      thermostatButton: 'w-8 h-8 text-lg font-semibold bg-black/5 dark:bg-white/5',
      thermostatPresetButton: 'w-8 h-8 bg-black/5 dark:bg-white/5',
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

  const handleIndicatorClick = (e: React.MouseEvent, entityId: string) => {
    if (isPreview) return;
    e.stopPropagation();
    onDeviceToggle(entityId);
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

  
  const isCamera = device.type === DeviceType.Camera;
  const isTogglable = device.type !== DeviceType.Thermostat && device.type !== DeviceType.Climate && device.type !== DeviceType.Sensor && !isCamera;

  const deviceBindings = customizations[device.id]?.deviceBindings;

  // --- Universal Template Renderer ---
  if (template) {
     const getStyleProps = (element: CardElement, baseKey: string, name: string) => {
        const onSuffix = isOn ? 'On' : '';
        const colorProp = `${baseKey}Color${onSuffix}`;
        const familyProp = `${baseKey}FontFamily${onSuffix}`;
        const sizeProp = `${baseKey}FontSize${onSuffix}`;
    
        const colorInfo = {
            value: element.styles.textColor || (colorScheme as any)[colorProp],
            origin: element.styles.textColor ? 'template' : 'scheme',
            prop: 'textColor',
        };
        
        const fontFamilyInfo = {
            value: element.styles.fontFamily || (colorScheme as any)[familyProp],
            origin: element.styles.fontFamily ? 'template' : 'scheme',
            prop: 'fontFamily',
        };
        
        const fontSizeInfo = {
            value: element.styles.fontSize || (colorScheme as any)[sizeProp],
            origin: element.styles.fontSize ? 'template' : 'scheme',
            prop: 'fontSize',
        };
    
        const dataAttrs = {
            'data-style-key': `${baseKey}Color`,
            'data-style-name': name,
            'data-is-text': 'true',
            'data-is-on': String(isOn),
            'data-style-origin': colorInfo.origin,
            'data-template-id': template.id,
            'data-template-element-id': element.id,
        };
    
        return {
            style: { 
                color: colorInfo.value, 
                fontFamily: fontFamilyInfo.value, 
                fontSize: fontSizeInfo.value ? `${fontSizeInfo.value}px` : undefined 
            },
            fontSize: fontSizeInfo.value, // Pass fontSize separately for AutoFitText
            dataAttrs,
        };
    };

    let dynamicBackgroundColor = isOn ? colorScheme.cardBackgroundOn : colorScheme.cardBackground;
    let dynamicValueColor: string | undefined = undefined;

    const deviceCustomization = customizations[device.id];
    if (device.type === DeviceType.Sensor && deviceCustomization?.thresholds && deviceCustomization.thresholds.length > 0) {
        const numericValue = parseFloat(device.status);
        if (!isNaN(numericValue)) {
            const applicableAboveRule = deviceCustomization.thresholds
                .filter(r => r.comparison === 'above' && numericValue > r.value)
                .sort((a, b) => b.value - a.value)[0]; // Get the one with highest value

            const applicableBelowRule = deviceCustomization.thresholds
                .filter(r => r.comparison === 'below' && numericValue < r.value)
                .sort((a, b) => a.value - b.value)[0]; // Get the one with lowest value

            const ruleToApply = applicableAboveRule || applicableBelowRule;

            if (ruleToApply) {
                if (ruleToApply.style.backgroundColor) {
                    dynamicBackgroundColor = ruleToApply.style.backgroundColor;
                }
                if (ruleToApply.style.valueColor) {
                    dynamicValueColor = ruleToApply.style.valueColor;
                }
            }
        }
    }


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
        case 'name': {
            const nameProps = getStyleProps(element, 'nameText', 'Название');
            return (
                <div key={element.id} style={style}>
                    <AutoFitText text={device.name} className="w-full h-full" pClassName="font-medium leading-tight" pStyle={nameProps.style} maxFontSize={100} mode="multi-line" maxLines={2} fontSize={nameProps.fontSize} textAlign={element.styles.textAlign} dataAttrs={nameProps.dataAttrs} />
                </div>
            );
        }
        case 'icon':
          const iconColor = isOn
              ? (element.styles.onColor || 'rgb(59 130 246)') // default blue
              : (element.styles.offColor || 'rgb(156 163 175)'); // default gray-400
          return (
            <div
              key={element.id}
              style={{ ...style, color: iconColor }}
              data-style-key="iconColor"
              data-style-name={`Цвет иконки (${isOn ? 'Вкл' : 'Выкл'})`}
              data-style-property={isOn ? 'onColor' : 'offColor'}
              data-style-origin="template"
              data-template-id={template.id}
              data-template-element-id={element.id}
              data-is-on={String(isOn)}
            >
              <DeviceIcon icon={device.icon ?? device.type} isOn={isOn} className="!w-full !h-full" iconAnimation={device.iconAnimation} />
            </div>
          );
        case 'status': {
            const statusProps = getStyleProps(element, 'statusText', 'Статус');
            return (
                <div key={element.id} style={style}>
                    <AutoFitText text={device.status} className="w-full h-full" pClassName="text-sm" pStyle={statusProps.style} maxFontSize={100} mode="single-line" fontSize={statusProps.fontSize} textAlign={element.styles.textAlign} dataAttrs={statusProps.dataAttrs} />
                </div>
            );
        }
        case 'value': {
          const { decimalPlaces } = element.styles;
          let valueText = device.status;
          const numericStatus = parseFloat(device.status);
          if (!isNaN(numericStatus) && typeof decimalPlaces === 'number' && decimalPlaces >= 0) {
            valueText = numericStatus.toFixed(decimalPlaces);
          }
           const valueProps = getStyleProps(element, 'valueText', 'Значение');
           if (dynamicValueColor) {
               valueProps.style.color = dynamicValueColor;
           }
          return (
            <div key={element.id} style={style} className="flex items-center">
              <AutoFitText text={valueText} className="w-full h-full" pClassName="font-semibold" maxFontSize={100} mode="single-line" fontSize={valueProps.fontSize} textAlign={element.styles.textAlign} pStyle={valueProps.style} dataAttrs={valueProps.dataAttrs}/>
            </div>
          );
        }
        case 'unit': {
          const isNumericStatus = !isNaN(parseFloat(device.status));
          if (!device.unit || !isNumericStatus) return null;
          const unitProps = getStyleProps(element, 'unitText', 'Единица изм.');
          return (
            <div key={element.id} style={style}>
              <AutoFitText text={device.unit} className="w-full h-full" pClassName="font-medium" pStyle={unitProps.style} maxFontSize={100} mode="single-line" fontSize={unitProps.fontSize} textAlign={element.styles.textAlign} dataAttrs={unitProps.dataAttrs}/>
            </div>
          );
        }
        case 'chart':
          return (
            <div key={element.id} style={style}>
              <SparklineChart data={device.history || mockHistory} strokeColor={isDark ? "#4B5563" : "#D1D5DB"} />
            </div>
          );
        case 'slider': {
           if (!isOn || device.brightness === undefined) return null;
           return (
              <div key={element.id} style={style} onClick={(e) => { if (!isPreview) e.stopPropagation(); }}>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={device.brightness}
                  onInput={(e) => { if (!isPreview) onBrightnessChange(parseInt(e.currentTarget.value)); }}
                  disabled={isPreview}
                  className="w-full h-full bg-gray-300 dark:bg-gray-700/50 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
           );
        }
        case 'temperature': {
           const { decimalPlaces } = element.styles;
           let tempText = '';
           if (typeof device.temperature === 'number') {
             if (typeof decimalPlaces === 'number' && decimalPlaces >= 0) {
               tempText = device.temperature.toFixed(decimalPlaces);
             } else {
               tempText = device.temperature.toFixed(0);
             }
           }
           const tempProps = getStyleProps(element, 'valueText', 'Температура');
           return (
             <div key={element.id} style={style} className="pointer-events-none">
               <AutoFitText text={`${tempText}°`} className="w-full h-full" pClassName="font-bold" pStyle={tempProps.style} maxFontSize={100} mode="single-line" fontSize={tempProps.fontSize} textAlign={element.styles.textAlign} dataAttrs={tempProps.dataAttrs}/>
             </div>
           );
        }
        case 'target-temperature':
          return (
            <div key={element.id} style={style} onClick={e => { if (!isPreview) e.stopPropagation(); }}>
              <ThermostatDial 
                min={device.minTemp ?? 10}
                max={device.maxTemp ?? 35}
                value={device.targetTemperature ?? 21}
                current={device.temperature ?? 21}
                onChange={value => { if (!isPreview) onTemperatureChange(value); }}
                hvacAction={device.hvacAction ?? 'idle'}
                idleLabelColor={element.styles.idleLabelColor}
                heatingLabelColor={element.styles.heatingLabelColor}
                coolingLabelColor={element.styles.coolingLabelColor}
                colorScheme={colorScheme}
              />
            </div>
          );
        case 'hvac-modes': {
            const dropdownRef = useRef<HTMLDivElement>(null);
            const isDropdownOpen = openMenuDeviceId === device.id;
        
            useEffect(() => {
                const handleClickOutside = (event: MouseEvent) => {
                    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                        setOpenMenuDeviceId?.(null);
                    }
                };
                if (isDropdownOpen) {
                    document.addEventListener('mousedown', handleClickOutside);
                }
                return () => {
                    document.removeEventListener('mousedown', handleClickOutside);
                };
            }, [isDropdownOpen, setOpenMenuDeviceId]);
        
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
        
            const handleModeClick = (mode: string) => {
                if (isPreview) return;
                if (isPresetMode) {
                    onPresetChange(mode);
                } else {
                    onHvacModeChange(mode);
                }
                setOpenMenuDeviceId?.(null);
            };
            
            const handleButtonClick = (e: React.MouseEvent) => {
                if (isPreview) return;
                e.stopPropagation();
                setOpenMenuDeviceId?.(isDropdownOpen ? null : device.id);
            };
        
            const activeConfig = getConfig(activeMode?.toLowerCase() || (isPresetMode ? 'none' : 'off'));
        
            return (
                <div key={element.id} style={style} onClick={e => { if (!isPreview) e.stopPropagation(); }} ref={dropdownRef}>
                    <div className="relative w-full h-full flex items-center justify-center">
                        <button
                            onClick={handleButtonClick}
                            disabled={isPreview}
                            className="w-full h-full flex flex-col items-center justify-center bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 rounded-xl transition-all p-1"
                        >
                            <Icon icon={activeConfig.icon} className="w-auto h-[55%] text-black dark:text-white" />
                            <span className="text-[10px] font-bold text-black dark:text-white mt-auto leading-tight text-center">{activeConfig.label}</span>
                        </button>
        
                        {isDropdownOpen && !isPreview && (
                            <div className="absolute top-full right-0 mt-2 min-w-[150px] w-max bg-gray-100 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-1 z-20 fade-in">
                                {modes.map(mode => {
                                    const config = getConfig(mode);
                                    return (
                                        <button
                                            key={mode}
                                            onClick={() => handleModeClick(mode)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-lg transition-colors ${activeMode?.toLowerCase() === mode.toLowerCase() ? 'bg-blue-600/60 text-white' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/10'}`}
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
        case 'linked-entity': {
            const { linkedEntityId, showValue } = element.styles;
            if (!linkedEntityId) return null;
            
            const linkedDevice = allKnownDevices.get(linkedEntityId);
            
            if (!linkedDevice) {
                return (
                    <div key={element.id} style={style} className="flex items-center justify-center" title={`Связанное устройство не найдено: ${linkedEntityId}`}>
                        <Icon icon="mdi:alert-circle-outline" className="w-full h-full text-yellow-500/80" />
                    </div>
                );
            }
            
            const isLinkedOn = linkedDevice.state === 'on';
            const iconColor = isLinkedOn ? (element.styles.onColor || 'rgb(59 130 246)') : (element.styles.offColor || 'rgb(156 163 175)');

            let valueText: string | null = null;
            if (showValue) {
                const numericStatus = parseFloat(linkedDevice.status);
                if (!isNaN(numericStatus)) {
                    valueText = (typeof element.styles.decimalPlaces === 'number' && element.styles.decimalPlaces >= 0)
                        ? numericStatus.toFixed(element.styles.decimalPlaces)
                        : linkedDevice.status;
                }
            }
            
            const hasIcon = true;
            const hasValue = !!valueText;
        
            return (
                <div key={element.id} style={style} className="w-full h-full flex items-center justify-center gap-1 p-1 overflow-hidden">
                    {hasIcon && (
                        <div style={{ color: iconColor }} className={`flex-shrink-0 ${hasValue ? 'w-[40%]' : 'w-full h-full'}`}>
                            <DeviceIcon
                                icon={linkedDevice.icon ?? linkedDevice.type}
                                isOn={isLinkedOn}
                                className="!w-full !h-full"
                                iconAnimation={linkedDevice.iconAnimation}
                            />
                        </div>
                    )}
                    {hasValue && (
                        <div className="flex-grow h-full min-w-0">
                             <AutoFitText
                                text={valueText}
                                className="w-full h-full"
                                pClassName="font-semibold"
                                pStyle={{ color: isOn ? colorScheme.valueTextColorOn : colorScheme.valueTextColor, fontFamily: isOn ? colorScheme.valueTextFontFamilyOn : colorScheme.valueTextFontFamily, fontSize: isOn ? `${colorScheme.valueTextFontSizeOn}px` : `${colorScheme.valueTextFontSize}px`, }}
                                fontSize={isOn ? colorScheme.valueTextFontSizeOn : colorScheme.valueTextFontSize}
                                maxFontSize={100}
                                mode="single-line"
                                textAlign={element.styles.textAlign || 'center'}
                                dataAttrs={{ 
                                    'data-style-key': 'valueTextColor', 
                                    'data-style-name': 'Значение', 
                                    'data-is-text': 'true',
                                    'data-style-origin': 'scheme',
                                    'data-is-on': String(isOn),
                                }}
                            />
                        </div>
                    )}
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
        style={{ backgroundColor: dynamicBackgroundColor }}
        onContextMenu={onContextMenu}
        data-style-key="cardBackground"
        data-style-name="Фон карточки"
        data-style-origin="scheme"
        data-is-on={String(isOn)}
      >
        {isPreview && 
            <div 
                className="absolute inset-0 bg-center" 
                style={{ 
                    backgroundImage: `linear-gradient(rgba(100,116,139,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.2) 1px, transparent 1px)`, 
                    backgroundSize: `10px 10px`
                }} 
            />
        }
        {template.elements.map(renderElement)}
        {/* Device Indicators */}
        {template.deviceSlots && deviceBindings && deviceBindings.map(binding => {
            if (!binding.enabled) return null;
            const slot = template.deviceSlots?.find(s => s.id === binding.slotId);
            const entity = allKnownDevices.get(binding.entityId);

            if (!slot || !entity) return null;

            const isEntityOn = entity.state === 'on';
            const isEntityUnavailable = entity.state === 'unavailable';

            let iconToUse = binding.icon || entity.icon || entity.type;
            if (isEntityUnavailable) {
                iconToUse = 'mdi:power-plug-off-outline';
            }

            const { visualStyle } = slot;
            const color = isEntityOn ? visualStyle.activeColor : visualStyle.inactiveColor;
            
            let animationClass = '';
            if (isEntityOn && (visualStyle.type.includes('animation'))) {
                if (visualStyle.animationType === 'pulse') animationClass = 'animate-pulse-scale';
                if (visualStyle.animationType === 'rotate') animationClass = 'animate-spin';
            }

            const iconStyle: React.CSSProperties = {
                color: isEntityUnavailable ? '#9CA3AF' : color, // gray-400 for unavailable
                fontSize: `${slot.iconSize}px`,
                filter: (isEntityOn && visualStyle.type.includes('glow')) 
                    ? `drop-shadow(0 0 ${visualStyle.glowIntensity * 8}px ${color})`
                    : 'none'
            };
            
            let valueText: string | null = null;
            if (visualStyle.showValue) {
                const numericStatus = parseFloat(entity.status);
                if (!isNaN(numericStatus)) {
                    valueText = (typeof visualStyle.decimalPlaces === 'number' && visualStyle.decimalPlaces >= 0)
                        ? numericStatus.toFixed(visualStyle.decimalPlaces)
                        : entity.status;
                }
            }

            return (
                <div
                    key={binding.slotId}
                    title={entity.name}
                    className={`absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${slot.interactive && !isPreview ? 'cursor-pointer' : 'cursor-default'}`}
                    style={{
                        left: `${slot.position.x}%`,
                        top: `${slot.position.y}%`,
                        width: visualStyle.showValue && valueText ? 'auto' : `${slot.iconSize}px`,
                        height: visualStyle.showValue && valueText ? 'auto' : `${slot.iconSize}px`,
                    }}
                    onClick={slot.interactive ? (e) => handleIndicatorClick(e, entity.id) : undefined}
                >
                  {visualStyle.showValue && valueText ? (
                    <div className="flex items-baseline text-black dark:text-white whitespace-nowrap" style={{ color }}>
                      <span
                        className="font-semibold leading-none"
                        style={{ fontSize: visualStyle.fontSize ? `${visualStyle.fontSize}px` : `${slot.iconSize * 0.8}px` }}
                      >
                        {valueText}
                      </span>
                      {visualStyle.unit && (
                        <span
                          className="font-medium text-gray-600 dark:text-gray-400 leading-none ml-1"
                          style={{ fontSize: visualStyle.fontSize ? `${visualStyle.fontSize * 0.6}px` : `${slot.iconSize * 0.5}px` }}
                        >
                          {visualStyle.unit}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className={animationClass} style={{ width: '100%', height: '100%' }}>
                        <DeviceIcon icon={iconToUse} isOn={isEntityOn} className="!w-full !h-full !m-0" />
                        <div style={iconStyle} className="absolute inset-0">
                            <DeviceIcon icon={iconToUse} isOn={isEntityOn} className="!w-full !h-full !m-0" />
                        </div>
                    </div>
                  )}
                </div>
            );
        })}
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
                  if (isEditMode || isPreview) return;
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
                {!isEditMode && !isPreview && (
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
              <div className={isOn ? 'text-blue-500' : 'opacity-70'}>
                 <DeviceIcon icon={device.icon ?? device.type} isOn={isOn} iconAnimation={device.iconAnimation} />
              </div>
              {isOn && device.brightness !== undefined && (
                <div className={`${styles.brightnessCircle} rounded-full border-2 border-current opacity-30 flex items-center justify-center`}>
                  <span className={styles.brightnessText}>{device.brightness}%</span>
                </div>
              )}
            </div>
            <div className="flex-grow text-left overflow-hidden flex flex-col justify-end min-h-0">
                <div className="flex-grow flex items-end min-h-0">
                    <AutoFitText
                        text={device.name}
                        className="w-full h-full"
                        pClassName={styles.nameText}
                        pStyle={{ color: isOn ? colorScheme.nameTextColorOn : colorScheme.nameTextColor, fontFamily: isOn ? colorScheme.nameTextFontFamilyOn : colorScheme.nameTextFontFamily, fontSize: isOn ? `${colorScheme.nameTextFontSizeOn}px` : `${colorScheme.nameTextFontSize}px` }}
                        fontSize={isOn ? colorScheme.nameTextFontSizeOn : colorScheme.nameTextFontSize}
                        maxFontSize={18}
                        mode="multi-line"
                        dataAttrs={{ 'data-style-key': 'nameTextColor', 'data-style-name': 'Название', 'data-is-text': 'true', 'data-style-origin': 'scheme', 'data-is-on': String(isOn) }}
                    />
                </div>
              <p className={`${styles.statusText} transition-colors flex-shrink-0`} style={{ color: isOn ? colorScheme.statusTextColorOn : colorScheme.statusTextColor, fontFamily: isOn ? colorScheme.statusTextFontFamilyOn : colorScheme.statusTextFontFamily, fontSize: isOn ? `${colorScheme.statusTextFontSizeOn}px` : `${colorScheme.statusTextFontSize}px` }} data-style-key="statusTextColor" data-style-name="Статус" data-is-text="true" data-style-origin="scheme" data-is-on={String(isOn)}>{device.status}</p>
               {isOn && (
                <div className="mt-2 flex-shrink-0" onClick={(e) => { if (!isPreview) e.stopPropagation(); }}>
                    <input
                        type="range"
                        min="1"
                        max="100"
                        value={device.brightness}
                        onInput={(e) => { if (!isPreview) onBrightnessChange(parseInt(e.currentTarget.value)); }}
                        disabled={isPreview}
                        className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
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
                <div className="opacity-70">
                    <DeviceIcon icon={device.icon ?? device.type} isOn={false} iconAnimation={device.iconAnimation} />
                </div>

                {device.presetModes && device.presetModes.length > 0 && (
                    <div className="relative z-10" ref={presetMenuRef}>
                        <button
                            onClick={(e) => { if (!isPreview) { e.stopPropagation(); setIsPresetMenuOpen(prev => !prev); } }}
                            disabled={isPreview}
                            className={`${styles.thermostatPresetButton} rounded-full hover:bg-black/10 dark:hover:bg-white/10`}
                            aria-label="Открыть предустановки"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className={styles.thermostatPresetIcon} viewBox="0 0 20 20" fill="currentColor">
                             <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                           </svg>
                        </button>
                        {isPresetMenuOpen && !isPreview && (
                            <div className="absolute top-full right-0 mt-1 w-40 bg-gray-100 dark:bg-gray-700 rounded-md shadow-lg z-20 ring-1 ring-black/5 dark:ring-black dark:ring-opacity-5 p-1 max-h-48 overflow-y-auto fade-in">
                                {device.presetModes.map(preset => (
                                    <button
                                        key={preset}
                                        onClick={() => { onPresetChange(preset); setIsPresetMenuOpen(false); }}
                                        className="block w-full text-left px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
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
                        pStyle={{ color: isOn ? colorScheme.nameTextColorOn : colorScheme.nameTextColor, fontFamily: isOn ? colorScheme.nameTextFontFamilyOn : colorScheme.nameTextFontFamily, fontSize: isOn ? `${colorScheme.nameTextFontSizeOn}px` : `${colorScheme.nameTextFontSize}px` }}
                        fontSize={isOn ? colorScheme.nameTextFontSizeOn : colorScheme.nameTextFontSize}
                        maxFontSize={18}
                        mode="multi-line"
                        dataAttrs={{ 'data-style-key': 'nameTextColor', 'data-style-name': 'Название', 'data-is-text': 'true', 'data-style-origin': 'scheme', 'data-is-on': String(isOn) }}
                    />
                </div>
                <p className={`${styles.thermostatTempText} flex-shrink-0`} style={{ color: colorScheme.valueTextColor, fontFamily: colorScheme.valueTextFontFamily, fontSize: `${colorScheme.valueTextFontSize}px` }} data-style-key="valueTextColor" data-style-name="Температура" data-is-text="true" data-style-origin="scheme" data-is-on={String(isOn)}>{device.temperature}{device.unit}</p>
                <div className="flex items-center justify-between mt-1 flex-shrink-0">
                    <button onClick={(e) => { if (!isPreview) { e.stopPropagation(); onTemperatureChange(-0.5, true); } }} disabled={isPreview} className={`${styles.thermostatButton} rounded-full flex items-center justify-center font-light text-2xl leading-none pb-1`}>-</button>
                    <span className={`${styles.thermostatTargetText}`} style={{ color: colorScheme.statusTextColor, fontFamily: colorScheme.statusTextFontFamily, fontSize: `${colorScheme.statusTextFontSize}px` }} data-style-key="statusTextColor" data-style-name="Целевая темп." data-is-text="true" data-style-origin="scheme" data-is-on={String(isOn)}>Цель: {device.targetTemperature?.toFixed(1)}{device.unit}</span>
                    <button onClick={(e) => { if (!isPreview) { e.stopPropagation(); onTemperatureChange(0.5, true); } }} disabled={isPreview} className={`${styles.thermostatButton} rounded-full flex items-center justify-center font-light text-2xl leading-none pb-1`}>+</button>
                </div>
            </div>
          </div>
        );
      case DeviceType.Sensor: {
        const isNumericStatus = !isNaN(parseFloat(device.status));
        return (
          <div className="flex flex-col h-full text-left">
            <div className={`flex-shrink-0 opacity-70`}>
              <DeviceIcon icon={device.icon ?? device.type} isOn={false} iconAnimation={device.iconAnimation} />
            </div>
            <div className="flex-grow flex flex-col justify-end overflow-hidden min-h-0">
               <div className="flex-grow flex items-end min-h-0">
                <AutoFitText
                    text={device.name}
                    className="w-full h-full"
                    pClassName={styles.nameText}
                    pStyle={{ color: isOn ? colorScheme.nameTextColorOn : colorScheme.nameTextColor, fontFamily: isOn ? colorScheme.nameTextFontFamilyOn : colorScheme.nameTextFontFamily, fontSize: isOn ? `${colorScheme.nameTextFontSizeOn}px` : `${colorScheme.nameTextFontSize}px` }}
                    fontSize={isOn ? colorScheme.nameTextFontSizeOn : colorScheme.nameTextFontSize}
                    maxFontSize={18}
                    mode="multi-line"
                    dataAttrs={{ 'data-style-key': 'nameTextColor', 'data-style-name': 'Название', 'data-is-text': 'true', 'data-style-origin': 'scheme', 'data-is-on': String(isOn) }}
                />
              </div>
              <div className="flex items-baseline">
                <p className={`${styles.sensorStatusText}`} style={{ color: colorScheme.valueTextColor, fontFamily: colorScheme.valueTextFontFamily, fontSize: `${colorScheme.valueTextFontSize}px` }} data-style-key="valueTextColor" data-style-name="Значение" data-is-text="true" data-style-origin="scheme" data-is-on={String(isOn)}>{device.status}</p>
                {isNumericStatus && device.unit && <p className={`ml-1 ${styles.sensorUnitText}`} style={{ color: colorScheme.unitTextColor, fontFamily: colorScheme.unitTextFontFamily, fontSize: `${colorScheme.unitTextFontSize}px` }} data-style-key="unitTextColor" data-style-name="Единица изм." data-is-text="true" data-style-origin="scheme" data-is-on={String(isOn)}>{device.unit}</p>}
              </div>
            </div>
          </div>
        );
      }
      default:
        return (
          <div className="flex flex-col h-full">
            <div className={`flex-shrink-0 ${isOn ? 'text-blue-500' : 'opacity-70'}`}>
               <DeviceIcon icon={device.icon ?? device.type} isOn={isOn} iconAnimation={device.iconAnimation} />
            </div>
            <div className="flex-grow text-left overflow-hidden flex flex-col justify-end min-h-0">
              <div className="flex-grow flex items-end min-h-0">
                <AutoFitText
                    text={device.name}
                    className="w-full h-full"
                    pClassName={styles.nameText}
                    pStyle={{ color: isOn ? colorScheme.nameTextColorOn : colorScheme.nameTextColor, fontFamily: isOn ? colorScheme.nameTextFontFamilyOn : colorScheme.nameTextFontFamily, fontSize: isOn ? `${colorScheme.nameTextFontSizeOn}px` : `${colorScheme.nameTextFontSize}px` }}
                    fontSize={isOn ? colorScheme.nameTextFontSizeOn : colorScheme.nameTextFontSize}
                    maxFontSize={18}
                    mode="multi-line"
                    dataAttrs={{ 'data-style-key': 'nameTextColor', 'data-style-name': 'Название', 'data-is-text': 'true', 'data-style-origin': 'scheme', 'data-is-on': String(isOn) }}
                />
              </div>
              <p className={`${styles.statusText} transition-colors flex-shrink-0`} style={{ color: isOn ? colorScheme.statusTextColorOn : colorScheme.statusTextColor, fontFamily: isOn ? colorScheme.statusTextFontFamilyOn : colorScheme.statusTextFontFamily, fontSize: isOn ? `${colorScheme.statusTextFontSizeOn}px` : `${colorScheme.statusTextFontSize}px` }} data-style-key="statusTextColor" data-style-name="Статус" data-is-text="true" data-style-origin="scheme" data-is-on={String(isOn)}>{device.status}</p>
            </div>
          </div>
        );
    }
  };

  const getCardClasses = () => {
    const baseClasses = "w-full h-full rounded-2xl flex flex-col transition-all duration-200 ease-in-out select-none relative";
    
    if (template) {
        return baseClasses;
    }

    const layoutClasses = isCamera ? 'p-0' : styles.padding;
    const interactionClasses = (isTogglable || isCamera) && !isEditMode && !isPreview ? 'cursor-pointer hover:brightness-95 dark:hover:brightness-110' : '';
  
    return `${baseClasses} ${layoutClasses} ${interactionClasses}`;
  }

  const getCardStyle = (): React.CSSProperties => {
      if(template) {
          return {};
      }
      return {
          backgroundColor: isOn ? colorScheme.cardBackgroundOn : colorScheme.cardBackground,
      }
  }

  return (
    <div className={getCardClasses()} style={getCardStyle()} onContextMenu={onContextMenu} data-style-key="cardBackground" data-style-name="Фон карточки" data-style-origin="scheme" data-is-on={String(isOn)}>
       {renderContent()}
    </div>
  );
};

export default React.memo(DeviceCard);