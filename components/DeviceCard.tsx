
import React from 'react';
import { Device, DeviceType } from '../types';
import DeviceIcon from './DeviceIcon';

interface DeviceCardProps {
  device: Device;
  onToggle: () => void;
  onTemperatureChange: (change: number) => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onToggle, onTemperatureChange }) => {
  const isOn = device.status.toLowerCase() === 'på' || device.status.toLowerCase() === 'on';

  const baseClasses = "aspect-square rounded-2xl p-3 flex flex-col transition-all duration-200 ease-in-out select-none";
  const onStateClasses = "bg-gray-200 text-gray-900 shadow-lg";
  const offStateClasses = "bg-gray-800/80 hover:bg-gray-700/80 ring-1 ring-white/10";
  const textOnClasses = "text-gray-800";
  const textOffClasses = "text-gray-400";
  
  // A device is considered togglable if it's not a sensor/thermostat.
  const isTogglable = device.type !== DeviceType.Thermostat && device.type !== DeviceType.Climate;

  const handleClick = () => {
    if (isTogglable) {
      onToggle();
    }
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
             <div className="flex items-center justify-between mt-1">
              <button onClick={(e) => { e.stopPropagation(); onTemperatureChange(-0.5); }} className="w-7 h-7 rounded-full bg-black/20 text-white flex items-center justify-center text-lg">-</button>
              <span className="text-sm font-medium text-gray-300">Target: {device.targetTemperature}{device.unit}</span>
              <button onClick={(e) => { e.stopPropagation(); onTemperatureChange(0.5); }} className="w-7 h-7 rounded-full bg-black/20 text-white flex items-center justify-center text-lg">+</button>
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
    if (device.type === DeviceType.Thermostat) {
      classes += offStateClasses; // Thermostats have a consistent off-state look
    } else {
      classes += isOn ? onStateClasses : offStateClasses;
    }
    if (isTogglable) {
        classes += ' cursor-pointer';
    }
    return classes;
  }

  return (
    <div className={getCardClasses()} onClick={handleClick}>
      {renderContent()}
    </div>
  );
};

export default DeviceCard;
