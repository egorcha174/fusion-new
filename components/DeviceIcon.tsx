

import React from 'react';
import { DeviceType, CardSize } from '../types';

interface DeviceIconProps {
  type: DeviceType;
  isOn: boolean;
  cardSize: CardSize;
}

const IconWrapper: React.FC<{children: React.ReactNode, isOn: boolean, cardSize: CardSize}> = ({ children, isOn, cardSize }) => {
  const colorClass = isOn ? "text-blue-500" : "text-gray-400";
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
    const lightIcon = (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a6 6 0 00-6 6c0 2.237 1.233 4.16 3.01 5.197L6.06 16.05A.5.5 0 006.5 17h7a.5.5 0 00.44-.95l-.95-2.853A5.96 5.96 0 0016 8a6 6 0 00-6-6zM8.5 18a.5.5 0 00.5.5h2a.5.5 0 000-1h-2a.5.5 0 00-.5.5z" />
      </svg>
    );

    const thermostatIcon = (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12a1 1 0 100 2 1 1 0 000-2z" />
        <path fillRule="evenodd" d="M10 2a3 3 0 00-3 3v7.25a3.75 3.75 0 106 0V5a3 3 0 00-3-3zm1.5 7.25a2.25 2.25 0 11-4.5 0V5a1.5 1.5 0 013 0v4.25z" clipRule="evenodd" />
      </svg>
    );

    const displayIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2 4a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm14 0H4v8h12V4z" clipRule="evenodd" />
        </svg>
    );

  const icons: Record<DeviceType, React.ReactNode> = {
    [DeviceType.Light]: lightIcon,
    [DeviceType.DimmableLight]: lightIcon,
    [DeviceType.Lamp]: lightIcon,
    [DeviceType.Spotlight]: lightIcon,
    [DeviceType.BalconyLight]: lightIcon,
    [DeviceType.Climate]: thermostatIcon,
    [DeviceType.Thermostat]: thermostatIcon,
    [DeviceType.TV]: displayIcon,
    [DeviceType.Computer]: displayIcon,
    [DeviceType.Monitor]: displayIcon,
    [DeviceType.Speaker]: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm3 2a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
        <path d="M10 14a3 3 0 100-6 3 3 0 000 6z" />
      </svg>
    ),
    [DeviceType.Playstation]: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M1.5 7.5A2.5 2.5 0 014 5h12a2.5 2.5 0 012.5 2.5v5A2.5 2.5 0 0116 15H4a2.5 2.5 0 01-2.5-2.5v-5zM4 6.5a1 1 0 00-1 1v5a1 1 0 001 1h12a1 1 0 001-1v-5a1 1 0 00-1-1H4z" clipRule="evenodd" />
        <path d="M5.5 9a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zM8 10.5a.5.5 0 000-1V8a.5.5 0 00-1 0v1.5a.5.5 0 001 0zM13 11.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
      </svg>
    ),
    [DeviceType.Sensor]: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.5 8.5a.5.5 0 0 1 0-1h1a.5.5 0 0 1 0 1h-1z"/>
        <path d="M8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm0 1A7 7 0 1 1 8 1a7 7 0 0 1 0 14z"/>
        <path d="M8 4a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3A.5.5 0 0 1 8 4z"/>
      </svg>
    ),
    [DeviceType.Switch]: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0v-5.5A.75.75 0 0110 3zM6.505 5.234a.75.75 0 11.53 1.402A4.5 4.5 0 006.5 10a4.5 4.5 0 003.5 4.472v.278a.75.75 0 01-1.5 0v-.553a6 6 0 01-5.12-5.91L3.37 8.167a.75.75 0 011.06-1.06l.203.203A6.002 6.002 0 016.505 5.234zM13.495 5.234a.75.75 0 01.53-1.402A6 6 0 0116.63 8.167l.203-.203a.75.75 0 011.06 1.06l-.009.008a6 6 0 01-5.12 5.91v.553a.75.75 0 01-1.5 0v-.278A4.5 4.5 0 0013.5 10a4.5 4.5 0 00-3.035-4.266.75.75 0 01.53-1.402z" clipRule="evenodd" />
      </svg>
    ),
    [DeviceType.Outlet]: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm6 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    [DeviceType.Weather]: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path d="M7 6a4 4 0 014 4h.5a3.5 3.5 0 013.5 3.5v.5A2.5 2.5 0 0112.5 17h-8A2.5 2.5 0 012 14.5v-.5A3.5 3.5 0 015.5 10.5H6a4 4 0 011-4.5z" />
      </svg>
    ),
    [DeviceType.Unknown]: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.25 6.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zM9 13.25a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
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