import React from 'react';
import { DeviceType, CardSize } from '../types';

interface DeviceIconProps {
  type: DeviceType;
  isOn: boolean;
  cardSize: CardSize;
}

const IconWrapper: React.FC<{ children: React.ReactNode; isOn: boolean; cardSize: CardSize }> = ({ children, isOn, cardSize }) => {
  const colorClass = isOn ? 'text-blue-500' : 'text-gray-400';
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-8 h-8 sm:w-10 sm:h-10',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`${sizeClasses[cardSize]} mb-1 ${colorClass}`}>
      {children}
    </div>
  );
};

const DeviceIcon: React.FC<DeviceIconProps> = ({ type, isOn, cardSize }) => {
  const icons: Record<DeviceType, React.ReactNode> = {
    [DeviceType.Light]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3a6 6 0 00-2 11.65V18h4v-3.35A6 6 0 0012 3z" />
        <path d="M10 21h4" />
      </svg>
    ),
    [DeviceType.DimmableLight]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 4v2m0 12v2m8-8h-2M6 12H4m12.95-4.95l-1.414 1.414M7.05 16.95L5.636 18.364" />
      </svg>
    ),
    [DeviceType.Lamp]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 12h8l-2-8H10l-2 8zm2 8h4v-2H10v2z" />
      </svg>
    ),
    [DeviceType.Spotlight]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 5V3m0 18v-2m9-7h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05L5.636 5.636" />
      </svg>
    ),
    [DeviceType.BalconyLight]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3v4m0 10v4m4-10h4M4 11h4m9.364 7.364L20 20m-16 0l2.636-1.636M12 7a5 5 0 100 10 5 5 0 000-10z" />
      </svg>
    ),
    [DeviceType.Climate]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2a5 5 0 00-5 5v6.5a5 5 0 1010 0V7a5 5 0 00-5-5z" />
        <circle cx="12" cy="17" r="1" />
      </svg>
    ),
    [DeviceType.Thermostat]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M10 2a3 3 0 00-3 3v9a5 5 0 1010 0V5a3 3 0 00-3-3z" />
        <path d="M10 11h4" />
      </svg>
    ),
    [DeviceType.TV]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M8 21h8" />
      </svg>
    ),
    [DeviceType.Computer]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8m-8-4h8" />
      </svg>
    ),
    [DeviceType.Monitor]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
      </svg>
    ),
    [DeviceType.Fan]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="2" />
        <path d="M12 4a8 8 0 018 8 8 8 0 01-8 8 8 8 0 010-16z" />
      </svg>
    ),
    [DeviceType.Speaker]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <circle cx="12" cy="8" r="2" />
        <circle cx="12" cy="16" r="3" />
      </svg>
    ),
    [DeviceType.Playstation]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4 15l8-4 8 4M4 19l8-4 8 4" />
        <path d="M12 3v8" />
      </svg>
    ),
    [DeviceType.Sensor]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <rect x="6" y="4" width="12" height="16" rx="2" />
        <path d="M12 8v8" />
      </svg>
    ),
    [DeviceType.Switch]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <rect x="4" y="6" width="16" height="12" rx="6" />
        <circle cx="16" cy="12" r="2" />
      </svg>
    ),
    [DeviceType.Outlet]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" />
        <path d="M9 10v4m6-4v4" />
      </svg>
    ),
    [DeviceType.Weather]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 15a4 4 0 014-4 5 5 0 019.9-1A4 4 0 1119 15H3z" />
      </svg>
    ),
    [DeviceType.Unknown]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4m0 4h.01" />
      </svg>
    ),
  };

  return (
    <IconWrapper isOn={isOn} cardSize={cardSize}>
      {icons[type]}
    </IconWrapper>
  );
};

export default DeviceIcon;
