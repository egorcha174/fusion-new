import React from 'react';
import { DeviceType } from '../types';
import { Icon } from '@iconify/react';

interface DeviceIconProps {
  icon: string | DeviceType;
  isOn: boolean;
  className?: string;
  ariaLabel?: string;
}

const iconMap: Record<DeviceType, { on: string; off: string; spinning?: boolean }> = {
  [DeviceType.Light]: { on: 'mdi:lightbulb', off: 'mdi:lightbulb-outline' },
  [DeviceType.DimmableLight]: { on: 'mdi:lightbulb', off: 'mdi:lightbulb-outline' },
  [DeviceType.Lamp]: { on: 'mdi:lamp', off: 'mdi:lamp-outline' },
  [DeviceType.Spotlight]: { on: 'mdi:spotlight', off: 'mdi:spotlight-beam' },
  [DeviceType.BalconyLight]: { on: 'mdi:wall-sconce-flat', off: 'mdi:wall-sconce-flat-outline' },
  [DeviceType.Climate]: { on: 'mdi:thermostat-box', off: 'mdi:thermostat-box' },
  [DeviceType.Thermostat]: { on: 'ic:baseline-device-thermostat', off: 'ic:baseline-device-thermostat' },
  [DeviceType.TV]: { on: 'mdi:television-classic', off: 'mdi:television-classic' },
  [DeviceType.Computer]: { on: 'mdi:desktop-tower-monitor', off: 'mdi:desktop-tower-monitor' },
  [DeviceType.Monitor]: { on: 'mdi:monitor', off: 'mdi:monitor' },
  [DeviceType.Fan]: { on: 'mdi:fan', off: 'mdi:fan', spinning: true },
  [DeviceType.Speaker]: { on: 'mdi:speaker', off: 'mdi:speaker' },
  [DeviceType.Playstation]: { on: 'mdi:sony-playstation', off: 'mdi:sony-playstation' },
  [DeviceType.Sensor]: { on: 'mdi:radar', off: 'mdi:radar' },
  [DeviceType.DoorSensor]: { on: 'mdi:door-open', off: 'mdi:door-closed' },
  [DeviceType.Switch]: { on: 'mdi:toggle-switch', off: 'mdi:toggle-switch-off-outline' },
  [DeviceType.Outlet]: { on: 'mdi:power-socket-eu', off: 'mdi:power-socket-eu' },
  [DeviceType.Weather]: { on: 'mdi:weather-partly-cloudy', off: 'mdi:weather-partly-cloudy' },
  [DeviceType.Camera]: { on: 'mdi:cctv', off: 'mdi:cctv' },
  [DeviceType.Unknown]: { on: 'mdi:help-rhombus-outline', off: 'mdi:help-rhombus-outline' },
};


// This export provides the list of available icon types for the settings modal.
export const icons: Record<DeviceType, any> = iconMap;

export const getIconNameForDeviceType = (type: DeviceType, isOn: boolean): string => {
    const iconData = iconMap[type] ?? iconMap[DeviceType.Unknown];
    return isOn ? iconData.on : iconData.off;
};

const DeviceIcon: React.FC<DeviceIconProps> = ({ icon, isOn, className = '', ariaLabel }) => {
  let iconName: string;
  let isSpinning = false;

  if (typeof icon === 'string') {
    iconName = icon;
    // Basic spinning heuristic for custom icons
    if (isOn && (icon.includes('fan') || icon.includes('spinner'))) {
        isSpinning = true;
    }
  } else {
    const iconData = iconMap[icon] ?? iconMap[DeviceType.Unknown];
    iconName = isOn ? iconData.on : iconData.off;
    isSpinning = isOn && iconData.spinning === true;
  }

  const colorClass = isOn ? 'text-blue-500' : 'text-gray-400';
  // Default size for DeviceCard. Can be overridden by passing a className.
  const baseClasses = 'w-[40%] h-[40%] mb-1';

  return (
    <div
      className={`${baseClasses} ${className}`}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
    >
      <Icon
        icon={iconName}
        className={`w-full h-full transition-colors duration-300 ${colorClass} ${isSpinning ? 'animate-spin' : ''}`}
      />
    </div>
  );
};

export default DeviceIcon;