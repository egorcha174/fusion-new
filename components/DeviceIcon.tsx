import React from 'react';
import { DeviceType, CardSize } from '../types';

interface DeviceIconProps {
  type: DeviceType;
  isOn: boolean;
  cardSize: CardSize;
  className?: string;
  ariaLabel?: string;
  /* Новые опциональные поля для интеграции с Home Assistant.
     Они необязательны и не ломают существующие вызовы компонента. */
  haDomain?: string; // например: 'light', 'sensor', 'switch', 'climate', 'media_player'
  haDeviceClass?: string; // например: 'motion', 'plug', 'door', 'temperature', 'sound'
}

/* normalizeType: пытается сопоставить HA domain/device_class с вашим DeviceType.
   Если haDomain/haDeviceClass не переданы или не удалось сопоставить — возвращает originalType (обратно совместимо). */
const normalizeType = (originalType: DeviceType, haDomain?: string, haDeviceClass?: string): DeviceType => {
  if (!haDomain && !haDeviceClass) return originalType;

  const domain = haDomain?.toLowerCase() ?? '';
  const deviceClass = haDeviceClass?.toLowerCase() ?? '';

  // Сначала попытки на основе конкретного device_class (более приоритетно)
  if (deviceClass) {
    if (['plug', 'outlet'].includes(deviceClass)) return DeviceType.Outlet;
    if (['motion'].includes(deviceClass)) return DeviceType.Sensor;
    if (['door', 'window', 'opening'].includes(deviceClass)) return DeviceType.Sensor;
    if (['temperature', 'humidity', 'pressure', 'sound', 'battery', 'power'].includes(deviceClass)) return DeviceType.Sensor;
    if (['smoke', 'gas', 'moisture', 'moisture'].includes(deviceClass)) return DeviceType.Sensor;
  }

  // Затем сопоставление по domain Home Assistant
  switch (domain) {
    case 'light':
      return DeviceType.Light;
    case 'switch':
      // некоторые розетки представлены как switch; оставляем Outlet только если deviceClass указан как plug
      return deviceClass === 'plug' ? DeviceType.Outlet : DeviceType.Switch;
    case 'fan':
      return DeviceType.Fan;
    case 'climate':
    case 'thermostat':
      return DeviceType.Thermostat;
    case 'media_player':
      // media_player может быть ТВ, колонкой или медиаплеером — оставим общий маппинг в зависимости от device_class
      if (deviceClass.includes('speaker') || deviceClass.includes('audio')) return DeviceType.Speaker;
      if (deviceClass.includes('tv') || deviceClass.includes('screen') || deviceClass.includes('display')) return DeviceType.TV;
      if (deviceClass.includes('game') || deviceClass.includes('console')) return DeviceType.Playstation;
      return DeviceType.TV;
    case 'camera':
      return DeviceType.Monitor;
    case 'sensor':
    case 'binary_sensor':
    case 'device_tracker':
      // погодные сенсоры часто имеют platform weather или device_class 'weather'
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

const IconWrapper: React.FC<{children: React.ReactNode; isOn: boolean; cardSize: CardSize; className?: string; ariaLabel?: string}> =
  ({ children, isOn, cardSize, className = '', ariaLabel }) => {
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

/* Унифицированные SVG-компоненты (viewBox 0 0 24 24, currentColor) */
const SvgLight = ({ filled = false }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2a6 6 0 00-4 10.5V16a2 2 0 002 2h4a2 2 0 002-2v-3.5A6 6 0 0012 2z" />
    {!filled && <path d="M9.5 20h5" />}
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

const SvgController = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="6" width="18" height="10" rx="2" />
    <path d="M8 9v6M16 9v6" />
  </svg>
);

const SvgSensor = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6" />
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

/* Сопоставление DeviceType с компонентами иконок — поведение совместимо с прежним кодом */
const icons: Record<DeviceType, (props: { isOn: boolean }) => React.ReactNode> = {
  [DeviceType.Light]: ({ isOn }) => <SvgLight filled={isOn} />,
  [DeviceType.DimmableLight]: ({ isOn }) => <SvgLight filled={isOn} />