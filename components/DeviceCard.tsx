

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Device, DeviceType, CardSize } from '../types';
import DeviceIcon from './DeviceIcon';
import SparklineChart from './SparklineChart';

interface DeviceCardProps {
  device: Device;
  onToggle: () => void;
  onTemperatureChange: (change: number) => void;
  onBrightnessChange: (brightness: number) => void;
  onPresetChange: (preset: string) => void;
  isEditMode: boolean;
  onEditDevice: (device: Device) => void;
  onRemoveFromTab?: () => void; // Optional: for removing device from a tab
  onContextMenu: (event: React.MouseEvent) => void;
  cardSize: CardSize;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onToggle, onTemperatureChange, onBrightnessChange, onPresetChange, isEditMode, onEditDevice, onRemoveFromTab, onContextMenu, cardSize }) => {
  const isOn = device.status.toLowerCase() === 'включено';
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  
  const cardStyles = {
    sm: {
      padding: 'p-2',
      nameText: 'text-xs font-semibold leading-tight',
      statusText: 'text-[11px]',
      sensorStatusText: 'text-2xl font-bold',
      sensorUnitText: 'text-base font-medium',
      thermostatTempText: 'font-bold text-base',
      thermostatTargetText: 'text-[11px] font-medium',
      thermostatButton: 'w-6 h-6 text-sm font-semibold',
      thermostatPresetButton: 'w-6 h-6',
      thermostatPresetIcon: 'h-4 w-4',
      brightnessCircle: 'w-8 h-8',
      brightnessText: 'text-[11px] font-semibold',
    },
    md: {
      padding: 'p-3',
      nameText: 'text-sm font-semibold leading-tight',
      statusText: 'text-xs',
      sensorStatusText: 'text-3xl font-bold',
      sensorUnitText: 'text-lg font-medium',
      thermostatTempText: 'font-bold text-lg',
      thermostatTargetText: 'text-xs font-medium',
      thermostatButton: 'w-7 h-7 text-base font-semibold',
      thermostatPresetButton: 'w-7 h-7',
      thermostatPresetIcon: 'h-5 w-5',
      brightnessCircle: 'w-9 h-9 sm:w-10 sm:h-10',
      brightnessText: 'text-xs font-semibold',
    },
    lg: {
      padding: 'p-4',
      nameText: 'text-base font-semibold leading-tight',
      statusText: 'text-sm',
      sensorStatusText: 'text-4xl font-bold',
      sensorUnitText: 'text-xl font-medium',
      thermostatTempText: 'font-bold text-2xl',
      thermostatTargetText: 'text-sm font-medium',
      thermostatButton: 'w-8 h-8 text-lg font-semibold',
      thermostatPresetButton: 'w-8 h-8',
      thermostatPresetIcon: 'h-6 w-6',
      brightnessCircle: 'w-11 h-11',
      brightnessText: 'text-sm font-semibold',
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
  
  const isTogglable = device.type !== DeviceType.Thermostat && device.type !== DeviceType.Climate && device.type !== DeviceType.Sensor;

  const handleClick = () => {
    if (isEditMode) return;
    if (isTogglable) {
      onToggle();
    }
  };
  
  const handleContextMenu = (e: React.MouseEvent) => {
    if (isEditMode) return;
    onContextMenu(e);
  };

  const renderContent = () => {
    switch (device.type) {
      case DeviceType.DimmableLight:
        return (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-start">
              <DeviceIcon type={device.type} isOn={isOn} cardSize={cardSize} />
              {isOn && device.brightness !== undefined && (
                <div className={`${styles.brightnessCircle} rounded-full border-2 ${isOn ? 'border-gray-400/50' : 'border-gray-500'} flex items-center justify-center`}>
                  <span className={`${styles.brightnessText} ${isOn ? textOnClasses : textOffClasses}`}>{device.brightness}%</span>
                </div>
              )}
            </div>
             <div className="flex-grow"></div>
            <div className="text-left">
              <p className={`${styles.nameText} text-ellipsis overflow-hidden whitespace-nowrap`}>{device.name}</p>
              <p className={`${styles.statusText} ${isOn ? textOnClasses : textOffClasses}`}>{device.status}</p>
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
                <DeviceIcon type={device.type} isOn={false} cardSize={cardSize} />

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
              <p className={`${styles.nameText} text-ellipsis overflow-hidden whitespace-nowrap`}>{device.name}</p>
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
        // NOTE: Using mock data for the sparkline as historical data fetching is not yet implemented.
        // In a real scenario, this data would come from the `device.history` prop.
        const mockHistory = useMemo(() => {
            const value = parseFloat(device.status) || 20;
            // Generate a more realistic trend (e.g., a gentle sine wave variation)
            return Array.from({ length: 20 }, (_, i) => 
                value + (Math.sin(i / 3) * (value * 0.05)) + (Math.random() - 0.5) * (value * 0.05)
            );
        }, [device.status]);

        return (
          <div className="flex flex-col h-full text-left">
            <div>
              <DeviceIcon type={device.type} isOn={false} cardSize={cardSize} />
              <p className={`${styles.nameText} mt-2 text-ellipsis overflow-hidden whitespace-nowrap`}>{device.name}</p>
            </div>
             <div className="flex-grow flex items-center w-full my-1 min-h-0">
              <SparklineChart data={device.history || mockHistory} />
            </div>
            <div className="flex items-baseline mt-auto flex-shrink-0">
              <p className={styles.sensorStatusText}>{device.status}</p>
              {device.unit && <p className={`${styles.sensorUnitText} text-gray-400 ml-1`}>{device.unit}</p>}
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col justify-between h-full">
            <div className="flex-shrink-0">
               <DeviceIcon type={device.type} isOn={isOn} cardSize={cardSize} />
            </div>
            <div className="text-left">
              <p className={`${styles.nameText} text-ellipsis overflow-hidden whitespace-nowrap`}>{device.name}</p>
              <p className={`${styles.statusText} ${isOn ? textOnClasses : textOffClasses}`}>{device.status}</p>
            </div>
          </div>
        );
    }
  };

  const getCardClasses = () => {
    const baseClasses = "rounded-2xl flex flex-col transition-all duration-200 ease-in-out select-none";
    const onStateClasses = "bg-gray-200 text-gray-900 shadow-lg";
    const offStateClasses = "bg-gray-800/80 hover:bg-gray-700/80 ring-1 ring-white/10";
    
    let finalClasses = `${baseClasses} ${styles.padding} aspect-square `;

    if (device.type === DeviceType.Sensor || device.type === DeviceType.Thermostat) {
        finalClasses += offStateClasses;
    } else {
        finalClasses += isOn ? onStateClasses : offStateClasses;
    }
  
    if (isTogglable && !isEditMode) {
        finalClasses += ' cursor-pointer';
    }
    return finalClasses;
  }

  return (
    <div className={getCardClasses()} onClick={handleClick} onContextMenu={handleContextMenu}>
       <div className="relative w-full h-full">
         {isEditMode && (
          <div className="absolute -top-2 -right-2 z-10 flex flex-col gap-2">
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
    </div>
  );
};

export default DeviceCard;