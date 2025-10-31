

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
  const icons: Record<DeviceType, React.ReactNode> = {
    [DeviceType.Light]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
        <path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13h-5a.5.5 0 0 1-.46-.302l-.761-1.77a1.964 1.964 0 0 0-.453-.618A5.984 5.984 0 0 1 2 6zm6 8.5a.5.5 0 0 1 .5-.5h.5a.5.5 0 0 1 0 1h-.5a.5.5 0 0 1-.5-.5zM8 1a5 5 0 0 0-3.5 8.002a.5.5 0 0 1-.225.225A5 5 0 0 0 8 11a5 5 0 0 0 3.725-2.772.5.5 0 0 1-.225-.225A5 5 0 0 0 8 1z"/>
      </svg>
    ),
    [DeviceType.DimmableLight]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
        <path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13h-5a.5.5 0 0 1-.46-.302l-.761-1.77a1.964 1.964 0 0 0-.453-.618A5.984 5.984 0 0 1 2 6zm6 8.5a.5.5 0 0 1 .5-.5h.5a.5.5 0 0 1 0 1h-.5a.5.5 0 0 1-.5-.5zM8 1a5 5 0 0 0-3.5 8.002a.5.5 0 0 1-.225.225A5 5 0 0 0 8 11a5 5 0 0 0 3.725-2.772.5.5 0 0 1-.225-.225A5 5 0 0 0 8 1z"/>
      </svg>
    ),
    [DeviceType.Lamp]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
        <path fill-rule="evenodd" d="M4 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4Zm-1 2v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1Zm4 8a.5.5 0 0 1-.5.5h-2a.5.5 0 1 1 0-1h2a.5.5 0 0 1 .5.5ZM8 15a.5.5 0 0 1-.5.5H2a.5.5 0 0 1 0-1h5.5a.5.5 0 0 1 .5.5Z"/>
      </svg>
    ),
    [DeviceType.Spotlight]: (
       <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" transform="rotate(45)">
         <path d="M4.502 6.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-6a.5.5 0 0 1-.5-.5v-2z"/>
         <path d="M3 6.003l.01-.003.01-.002A1.5 1.5 0 0 1 4.5 4.5h7a1.5 1.5 0 0 1 1.48 1.498l.01.002.01.003v3.994l-.01.003-.01.002a1.5 1.5 0 0 1-1.48 1.498h-7a1.5 1.5 0 0 1-1.48-1.498l-.01-.002-.01-.003v-3.994zM1 6a2.5 2.5 0 0 1 2.5-2.5h8A2.5 2.5 0 0 1 14 6v4a2.5 2.5 0 0 1-2.5-2.5h-8A2.5 2.5 0 0 1 1 10V6z"/>
       </svg>
    ),
    [DeviceType.Climate]: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
            <path d="M12 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zM4 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H4z"/>
            <path d="M5.5 4.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5zM5.5 6.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5zM5.5 8.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5z"/>
        </svg>
    ),
    [DeviceType.Thermostat]: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
            <path d="M12 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zM4 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H4z"/>
            <path d="M5.5 4.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5zM5.5 6.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5zM5.5 8.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5z"/>
        </svg>
    ),
    [DeviceType.TV]: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
            <path d="M2.5 13.5A.5.5 0 0 1 3 13h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zM13.991 3H2c-.325 0-.502.078-.602.145a.758.758 0 0 0-.254.302A1.46 1.46 0 0 0 1 4.01V10c0 .325.078.502.145.602.1.067.218.155.302.254a1.464 1.464 0 0 0 .538.403V12h10v-.73A1.461 1.461 0 0 0 13.401 11c.101-.067.218-.155.302-.254a.758.758 0 0 0 .254-.302c.1-.067.145-.277.145-.602V4.01c0-.325-.078-.502-.145-.602a.757.757 0 0 0-.254-.302A1.46 1.46 0 0 0 13.991 3zM14 2H2C0 2 0 4 0 4v6c0 2 2 2 2 2h12c2 0 2-2 2-2V4c0-2-2-2-2-2z"/>
        </svg>
    ),
    [DeviceType.Computer]: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
            <path d="M12 1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h8zM4 0a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4z"/>
            <path d="M8 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
        </svg>
    ),
    [DeviceType.Monitor]: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
            <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H9.677l1.799 5.852a.5.5 0 0 1-.78.658L5.48 8.013l-1.42 1.42a.5.5 0 0 1-.707 0L.344 6.426a.5.5 0 0 1 .227-.58L3.33 4.5H.5a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h2.83l2.01-2.01a.5.5 0 0 1 .78.658L5.48 5.987l1.42-1.42a.5.5 0 0 1 .707 0l3.644-3.643a.5.5 0 0 1 .58.227z"/>
        </svg>
    ),
    [DeviceType.Speaker]: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 3a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 1 0v-8A.5.5 0 0 0 8 3z"/>
            <path d="M4 3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h1zm1-2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H5z"/>
            <path d="M12 3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h1zm1-2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-1z"/>
        </svg>
    ),
    [DeviceType.Playstation]: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
            <path d="M15.153 10.334a.5.5 0 0 0-.825-.373L12 11.231v-1.46L9.67 8.04a.5.5 0 0 0-.594-.03L6.5 9.407V5.5L8.85 3.734a.5.5 0 0 0-.17-.89L5.5 4.5l-2.025-.975A.5.5 0 0 0 3 3.99V11a.5.5 0 0 0 .825.373L6 10.142v1.46l2.33-1.727a.5.5 0 0 0 .594.03L11.5 8.593V13.5a.5.5 0 0 0 .825.373L14.5 12.142v-1.46l2.025.975a.5.5 0 0 0 .628-.423v-1.008z"/>
        </svg>
    ),
     [DeviceType.BalconyLight]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
        <path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13h-5a.5.5 0 0 1-.46-.302l-.761-1.77a1.964 1.964 0 0 0-.453-.618A5.984 5.984 0 0 1 2 6zm6 8.5a.5.5 0 0 1 .5-.5h.5a.5.5 0 0 1 0 1h-.5a.5.5 0 0 1-.5-.5zM8 1a5 5 0 0 0-3.5 8.002a.5.5 0 0 1-.225.225A5 5 0 0 0 8 11a5 5 0 0 0 3.725-2.772.5.5 0 0 1-.225-.225A5 5 0 0 0 8 1z"/>
      </svg>
    ),
    [DeviceType.Sensor]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
        <path d="M11.5 8.5a.5.5 0 0 1 0-1h1a.5.5 0 0 1 0 1h-1z"/>
        <path d="M8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm0 1A7 7 0 1 1 8 1a7 7 0 0 1 0 14z"/>
        <path d="M8 4a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3A.5.5 0 0 1 8 4z"/>
      </svg>
    ),
    [DeviceType.Switch]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
        <path d="M7.5 1v7h1V1h-1z"/>
        <path d="M3 8.812a4.999 4.999 0 0 1 2.578-4.375l-.485-.874A6 6 0 1 0 11 3.616l-.501.865A5 5 0 1 1 3 8.812z"/>
      </svg>
    ),
    [DeviceType.Outlet]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
        <path d="M3.05 3.05a7 7 0 1 0 9.9 9.9 7 7 0 0 0-9.9-9.9zM2 8a6 6 0 1 1 12 0A6 6 0 0 1 2 8zm3-2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2A.5.5 0 0 1 5 6zm0 4a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zm5-4a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
      </svg>
    ),
    // FIX: Added missing icon for Weather device type.
    [DeviceType.Weather]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
        <path d="M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383z"/>
      </svg>
    ),
    [DeviceType.Unknown]: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
        <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
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