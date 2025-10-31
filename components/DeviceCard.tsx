

import React, { useState, useRef, useEffect } from 'react';
import { Device, DeviceType } from '../types';
import DeviceIcon from './DeviceIcon';

interface DeviceCardProps {
  device: Device;
  onToggle: () => void;
  onTemperatureChange: (change: number) => void;
  onPresetChange: (preset: string) => void;
  isEditMode: boolean;
  onEditDevice: (device: Device) => void;
  onRemoveFromTab?: () => void; // Optional: for removing device from a tab
  onContextMenu: (event: React.MouseEvent) => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onToggle, onTemperatureChange, onPresetChange, isEditMode, onEditDevice, onRemoveFromTab, onContextMenu }) => {
  const isOn = device.status.toLowerCase() === 'вкл' || device.status.toLowerCase() === 'on';
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);

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

  const baseClasses = "aspect-square rounded-2xl p-3 flex flex-col transition-all duration-200 ease-in-out select-none";
  const onStateClasses = "bg-gray-200 text-gray-900 shadow-lg";
  const offStateClasses = "bg-gray-800/80 hover:bg-gray-700/80 ring-1 ring-white/10";
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
          <div className="flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <DeviceIcon type={device.type} isOn={isOn} />
              {isOn && device.brightness !== undefined && (
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 ${isOn ? 'border-gray-400/50' : 'border-gray-500'} flex items-center justify-center`}>
                  <span className={`text-xs font-semibold ${isOn ? textOnClasses : textOffClasses}`}>{device.brightness}%</span>
                </div>
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm leading-tight text-ellipsis overflow-hidden whitespace-nowrap">{device.name}</p>
              <p className={`text-xs ${isOn ? textOnClasses : textOffClasses}`}>{device.status}</p>
            </div>
          </div>
        );
      case DeviceType.Thermostat:
        return (
          <div className="flex flex-col justify-between h-full text-left">
            <div>
              <DeviceIcon type={device.type} isOn={false} />
              <p className="font-semibold text-sm leading-tight mt-2">{device.name}</p>
              <p className="font-bold text-lg">{device.temperature}{device.unit}</p>
            </div>
             <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button onClick={(e) => { e.stopPropagation(); onTemperatureChange(-0.5); }} className="w-7 h-7 rounded-full bg-black/20 text-white flex items-center justify-center text-lg">-</button>
                  <span className="text-sm font-medium text-gray-300">Цель: {device.targetTemperature}{device.unit}</span>
                  <button onClick={(e) => { e.stopPropagation(); onTemperatureChange(0.5); }} className="w-7 h-7 rounded-full bg-black/20 text-white flex items-center justify-center text-lg">+</button>
                </div>

                {device.presetModes && device.presetModes.length > 0 && (
                    <div className="relative" ref={presetMenuRef}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsPresetMenuOpen(prev => !prev); }}
                            className="w-full text-left text-sm p-1.5 rounded-md bg-black/20 text-gray-300 hover:bg-black/40 transition-colors"
                        >
                            Предустановка: <span className="font-semibold text-white">{device.presetMode || 'Нет'}</span>
                        </button>

                        {isPresetMenuOpen && (
                            <div className="absolute bottom-full left-0 mb-2 w-full bg-gray-700 rounded-md shadow-lg z-20 ring-1 ring-black ring-opacity-5 p-1 max-h-40 overflow-y-auto">
                                {device.presetModes.map(preset => (
                                    <button
                                        key={preset}
                                        onClick={() => {
                                            onPresetChange(preset);
                                            setIsPresetMenuOpen(false);
                                        }}
                                        className="block w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-600 rounded-md"
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
          </div>
        );
      case DeviceType.Sensor:
        return (
          <div className="flex flex-col justify-between h-full text-left">
            <div>
              <DeviceIcon type={device.type} isOn={false} />
              <p className="font-semibold text-sm leading-tight mt-2 text-ellipsis overflow-hidden whitespace-nowrap">{device.name}</p>
            </div>
             <div className="flex items-baseline mt-1">
              <p className="font-bold text-3xl">{device.status}</p>
              {device.unit && <p className="text-lg font-medium text-gray-400 ml-1">{device.unit}</p>}
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col justify-between h-full">
            <div className="flex-shrink-0">
               <DeviceIcon type={device.type} isOn={isOn} />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm leading-tight text-ellipsis overflow-hidden whitespace-nowrap">{device.name}</p>
              <p className={`text-xs ${isOn ? textOnClasses : textOffClasses}`}>{device.status}</p>
            </div>
          </div>
        );
    }
  };

  const getCardClasses = () => {
    let classes = `${baseClasses} `;
    if (device.type === DeviceType.Thermostat || device.type === DeviceType.Sensor) {
      classes += offStateClasses;
    } else {
      classes += isOn ? onStateClasses : offStateClasses;
    }
    if (isTogglable && !isEditMode) {
        classes += ' cursor-pointer';
    }
    return classes;
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