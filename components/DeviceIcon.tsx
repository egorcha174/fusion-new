import React from 'react';
import { DeviceType, CardSize } from '../types';

interface DeviceIconProps {
  type: DeviceType;
  isOn: boolean;
  cardSize: CardSize;
  className?: string;
  ariaLabel?: string;
  haDomain?: string;
  haDeviceClass?: string;
}

const normalizeType = (originalType: DeviceType, haDomain?: string, haDeviceClass?: string): DeviceType => {
  if (!haDomain && !haDeviceClass) return originalType;

  const domain = haDomain?.toLowerCase() ?? '';
  const deviceClass = haDeviceClass?.toLowerCase() ?? '';

  if (deviceClass) {
    if (deviceClass === 'door') return DeviceType.DoorSensor;
    if (['plug', 'outlet'].includes(deviceClass)) return DeviceType.Outlet;
    if (['motion'].includes(deviceClass)) return DeviceType.Sensor;
    if (['window', 'opening'].includes(deviceClass)) return DeviceType.Sensor;
    if (['temperature', 'humidity', 'pressure', 'sound', 'battery', 'power'].includes(deviceClass)) return DeviceType.Sensor;
    if (['smoke', 'gas', 'moisture'].includes(deviceClass)) return DeviceType.Sensor;
  }

  switch (domain) {
    case 'light':
      return DeviceType.Light;
    case 'switch':
      return deviceClass === 'plug' ? DeviceType.Outlet : DeviceType.Switch;
    case 'fan':
      return DeviceType.Fan;
    case 'climate':
    case 'thermostat':
      return DeviceType.Thermostat;
    case 'media_player':
      if (deviceClass.includes('speaker') || deviceClass.includes('audio')) return DeviceType.Speaker;
      if (deviceClass.includes('tv') || deviceClass.includes('screen') || deviceClass.includes('display')) return DeviceType.TV;
      if (deviceClass.includes('game') || deviceClass.includes('console')) return DeviceType.Playstation;
      return DeviceType.TV;
    case 'camera':
      return DeviceType.Monitor;
    case 'sensor':
    case 'binary_sensor':
    case 'device_tracker':
      if (deviceClass === 'weather' || deviceClass === 'forecast') return DeviceType.Weather;
      return DeviceType.Sensor;
    case 'vacuum':
      return DeviceType.Playstation;
    case 'cover':
      return DeviceType.Switch;
    case 'alarm_control_panel':
      return DeviceType.Unknown;
    case 'humidifier':
    case 'water_heater':
      return DeviceType.Climate;
    default:
      return originalType;
  }
};

const IconWrapper: React.FC<{
  children: React.ReactNode;
  isOn: boolean;
  cardSize: CardSize;
  className?: string;
  ariaLabel?: string;
}> = ({ children, isOn, cardSize, className = '', ariaLabel }) => {
  const colorClass = isOn ? 'text-blue-500' : 'text-gray-400';
  const sizeClasses: Record<CardSize, string> = {
    sm: 'w-8 h-8',
    md: 'w-8 h-8 sm:w-10 sm:h-10',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={`${sizeClasses[cardSize]} mb-1 ${colorClass} ${className}`}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {children}
    </div>
  );
};

const SvgLight = ({ filled = false }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2a6 6 0 00-4 10.5V16a2 2 0 002 2h4a2 2 0 002-2v-3.5A6 6 0 0012 2z" />
    {!filled && <path d="M9.5 20h5" />}
  </svg>
);

const SvgLamp = ({ filled = false }: { filled?: boolean }) => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 2h8l4 8H4l4-8z" />
        <path d="M12 10v10" />
        {!filled && <path d="M8 22h8" />}
    </svg>
);

const SvgSpotlight = ({ filled = false }: { filled?: boolean }) => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        {!filled && <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />}
    </svg>
);

const SvgBalconyLight = ({ filled = false }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="4" width="16" height="10" rx="2" />
    <path d="M12 14v6" />
    {!filled && <path d="M8 20h8" />}
  </svg>
);

const SvgComputer = () => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
    </svg>
);

const SvgPlaystation = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 12H4v2h6v-2zM14 12h6v2h-6v-2z" />
    <path d="M2 10c0-2.2 1.8-4 4-4h12c2.2 0 4 1.8 4 4v4c0 2.2-1.8 4-4 4H6c-2.2 0-4-1.8-4-4v-4z" />
    <path d="M8 10V8h2v2h2V8h2v2" />
  </svg>
);


const SvgThermostat = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M12 15v5" />
    <circle cx="12" cy="10" r="1.5" fill="currentColor" />
  </svg>
);

const SvgDisplay = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8" />
  </svg>
);

const SvgFan = ({ spinning = false }: { spinning?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={spinning ? 'animate-spin' : undefined}
  >
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <path d="M12 12c3 0 4.5-2 6-4-1-1.5-3-2.5-5-2.5M12 12c-3 0-4.5 2-6 4 1 1.5 3 2.5 5 2.5" />
  </svg>
);

const SvgSpeaker = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="6" height="14" rx="1" />
    <circle cx="16" cy="12" r="3" fill="currentColor" />
  </svg>
);

const SvgSensor = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6" />
  </svg>
);

const SvgDoorSensor = ({ isOn = false }: { isOn?: boolean }) => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x={isOn ? 2 : 5} y="3" width="9" height="18" rx="3" style={{ transition: 'x 0.2s ease-in-out' }} />
    <rect x={isOn ? 17 : 16} y="7" width="5" height="10" rx="2.5" style={{ transition: 'x 0.2s ease-in-out' }} />
  </svg>
);


const SvgSwitch = ({ isOn }: { isOn: boolean }) => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="8" width="18" height="8" rx="4" />
    <circle cx={isOn ? 17 : 7} cy="12" r="2" fill="currentColor" />
  </svg>
);

const SvgOutlet = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <rect x="9" y="8" width="6" height="8" rx="1" />
  </svg>
);

const SvgWeather = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 15a4 4 0 10-8 0" />
    <path d="M7 10a4 4 0 118 0" />
  </svg>
);

const SvgUnknown = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2 1.7-2 3.5" />
    <path d="M12 17h.01" />
  </svg>
);

const icons: Record<DeviceType, (props: { isOn: boolean }) => React.ReactNode> = {
  [DeviceType.Light]: ({ isOn }) => <SvgLight filled={isOn} />,
  [DeviceType.DimmableLight]: ({ isOn }) => <SvgLight filled={isOn} />,
  [DeviceType.Lamp]: ({ isOn }) => <SvgLamp filled={isOn} />,
  [DeviceType.Spotlight]: ({ isOn }) => <SvgSpotlight filled={isOn} />,
  [DeviceType.BalconyLight]: ({ isOn }) => <SvgBalconyLight filled={isOn} />,
  [DeviceType.Climate]: () => <SvgThermostat />,
  [DeviceType.Thermostat]: () => <SvgThermostat />,
  [DeviceType.TV]: () => <SvgDisplay />,
  [DeviceType.Computer]: () => <SvgComputer />,
  [DeviceType.Monitor]: () => <SvgDisplay />,
  [DeviceType.Fan]: ({ isOn }) => <SvgFan spinning={isOn} />,
  [DeviceType.Speaker]: () => <SvgSpeaker />,
  [DeviceType.Playstation]: () => <SvgPlaystation />,
  [DeviceType.Sensor]: () => <SvgSensor />,
  [DeviceType.DoorSensor]: ({ isOn }) => <SvgDoorSensor isOn={isOn} />,
  [DeviceType.Switch]: ({ isOn }) => <SvgSwitch isOn={isOn} />,
  [DeviceType.Outlet]: () => <SvgOutlet />,
  [DeviceType.Weather]: () => <SvgWeather />,
  [DeviceType.Unknown]: () => <SvgUnknown />,
};

const DeviceIcon: React.FC<DeviceIconProps> = ({ type, isOn, cardSize, className, ariaLabel, haDomain, haDeviceClass }) => {
  // Use the default built-in icons
  const normalizedType = normalizeType(type, haDomain, haDeviceClass);
  const renderFn = icons[normalizedType] ?? icons[DeviceType.Unknown];
  return (
    <IconWrapper isOn={isOn} cardSize={cardSize} className={className} ariaLabel={ariaLabel}>
      {renderFn({ isOn })}
    </IconWrapper>
  );
};

export default DeviceIcon;