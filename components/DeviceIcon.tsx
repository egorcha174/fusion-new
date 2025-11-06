import React from 'react';
// FIX: Removed unused 'CardSize' import as it is not exported from '../types'.
import { DeviceType } from '../types';

interface DeviceIconProps {
  type: DeviceType;
  isOn: boolean;
  className?: string;
  ariaLabel?: string;
}

const IconWrapper: React.FC<{
  children: React.ReactNode;
  isOn: boolean;
  className?: string;
  ariaLabel?: string;
}> = ({ children, isOn, className = '', ariaLabel }) => {
  const colorClass = isOn ? 'text-blue-500' : 'text-gray-400';
  const sizeClasses = 'w-[40%] h-[40%]'; // Use relative size

  return (
    <div
      className={`${sizeClasses} mb-1 ${colorClass} ${className} transition-colors duration-300`}
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
    <path d="M 12 2 a 6 6 0 0 0 -4 10.5 V 16 a 2 2 0 0 0 2 2 h 4 a 2 2 0 0 0 2 -2 v -3.5 A 6 6 0 0 0 12 2z" />
    {!filled && <path d="M 9.5 20 h 5" />}
  </svg>
);

const SvgLamp = ({ filled = false }: { filled?: boolean }) => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M 8 2 h 8 l 4 8 H 4 l 4 -8z" />
        <path d="M 12 10 v 10" />
        {!filled && <path d="M 8 22 h 8" />}
    </svg>
);

const SvgSpotlight = ({ filled = false }: { filled?: boolean }) => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        {!filled && <path d="M 12 2 v 2 M 12 20 v 2 M 4.9 4.9 l 1.4 1.4 M 17.7 17.7 l 1.4 1.4 M 2 12 h 2 M 20 12 h 2 M 4.9 19.1 l 1.4 -1.4 M 17.7 6.3 l 1.4 -1.4" />}
    </svg>
);

const SvgBalconyLight = ({ filled = false }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="4" width="16" height="10" rx="2" />
    <path d="M 12 14 v 6" />
    {!filled && <path d="M 8 20 h 8" />}
  </svg>
);

const SvgComputer = () => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M 8 21 h 8" />
        <path d="M 12 17 v 4" />
    </svg>
);

const SvgPlaystation = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M 10 12 H 4 v 2 h 6 v -2z M 14 12 h 6 v 2 h -6 v -2z" />
    <path d="M 2 10 c 0 -2.2 1.8 -4 4 -4 h 12 c 2.2 0 4 1.8 4 4 v 4 c 0 2.2 -1.8 4 -4 4 H 6 c -2.2 0 -4 -1.8 -4 -4 v -4z" />
    <path d="M 8 10 V 8 h 2 v 2 h 2 V 8 h 2 v 2" />
  </svg>
);


const SvgThermostat = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M 12 15 v 5" />
    <circle cx="12" cy="10" r="1.5" fill="currentColor" />
  </svg>
);

const SvgDisplay = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M 8 20 h 8" />
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
    <path d="M 12 12 c 3 0 4.5 -2 6 -4 c -1 -1.5 -3 -2.5 -5 -2.5 M 12 12 c -3 0 -4.5 2 -6 4 c 1 1.5 3 2.5 5 2.5" />
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
    <path d="M 12 7 v 6" />
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

const SvgCamera = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SvgUnknown = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M 9.5 9 a 2.5 2.5 0 0 1 5 0 c 0 1.5 -2 1.7 -2 3.5" />
    <path d="M 12 17 h .01" />
  </svg>
);

export const icons: Record<DeviceType, (props: { isOn: boolean }) => React.ReactNode> = {
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
  [DeviceType.Camera]: () => <SvgCamera />,
  [DeviceType.Unknown]: () => <SvgUnknown />,
};

const DeviceIcon: React.FC<DeviceIconProps> = ({ type, isOn, className, ariaLabel }) => {
  // The `type` prop now directly represents the icon to be rendered.
  // Normalization must happen before this component is called.
  const renderFn = icons[type] ?? icons[DeviceType.Unknown];
  return (
    <IconWrapper isOn={isOn} className={className} ariaLabel={ariaLabel}>
      {renderFn({ isOn })}
    </IconWrapper>
  );
};

export default DeviceIcon;