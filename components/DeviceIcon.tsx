
import React from 'react';
import { DeviceType } from '../types';
import { Icon } from '@iconify/react';

interface DeviceIconProps {
  icon: string | DeviceType; // Может быть строкой (имя Iconify) или типом устройства
  isOn: boolean; // Включено ли устройство
  className?: string;
  ariaLabel?: string;
  iconAnimation?: 'none' | 'spin' | 'pulse' | 'glow'; // Тип анимации
}

// Карта, сопоставляющая внутренний тип устройства с иконками для состояний "вкл" и "выкл".
// Также определяет анимацию по умолчанию для некоторых типов (например, 'spin' для вентилятора).
const iconMap: Record<DeviceType, { on: string; off: string; animation?: 'spin' | 'pulse' | 'glow' }> = {
  [DeviceType.Light]: { on: 'mdi:lightbulb', off: 'mdi:lightbulb-outline' },
  [DeviceType.DimmableLight]: { on: 'mdi:lightbulb', off: 'mdi:lightbulb-outline' },
  [DeviceType.Lamp]: { on: 'mdi:lamp', off: 'mdi:lamp-outline' },
  [DeviceType.Spotlight]: { on: 'mdi:spotlight', off: 'mdi:spotlight-beam' },
  [DeviceType.BalconyLight]: { on: 'mdi:wall-sconce-flat', off: 'mdi:wall-sconce-flat-outline' },
  [DeviceType.Climate]: { on: 'mdi:thermostat-box', off: 'mdi:thermostat-box' },
  // [DeviceType.Thermostat] shares the same value (7) as DeviceType.Climate, so we cannot have both keys. 
  // Using the mapping for Climate.
  [DeviceType.TV]: { on: 'mdi:television-classic', off: 'mdi:television-classic' },
  [DeviceType.Computer]: { on: 'mdi:desktop-tower-monitor', off: 'mdi:desktop-tower-monitor' },
  [DeviceType.Monitor]: { on: 'mdi:monitor', off: 'mdi:monitor' },
  [DeviceType.Fan]: { on: 'mdi:fan', off: 'mdi:fan', animation: 'spin' },
  [DeviceType.Speaker]: { on: 'mdi:speaker', off: 'mdi:speaker' },
  [DeviceType.Playstation]: { on: 'mdi:sony-playstation', off: 'mdi:sony-playstation' },
  [DeviceType.Sensor]: { on: 'mdi:radar', off: 'mdi:radar' },
  [DeviceType.BinarySensor]: { on: 'mdi:checkbox-marked-circle-outline', off: 'mdi:checkbox-blank-circle-outline' },
  [DeviceType.DoorSensor]: { on: 'mdi:door-open', off: 'mdi:door-closed' },
  [DeviceType.Switch]: { on: 'mdi:toggle-switch', off: 'mdi:toggle-switch-off-outline' },
  [DeviceType.Outlet]: { on: 'mdi:power-socket-eu', off: 'mdi:power-socket-eu' },
  [DeviceType.Weather]: { on: 'mdi:weather-partly-cloudy', off: 'mdi:weather-partly-cloudy' },
  [DeviceType.BatteryWidget]: { on: 'mdi:battery-heart-variant-outline', off: 'mdi:battery-heart-variant-outline' },
  [DeviceType.Humidifier]: { on: 'mdi:air-humidifier', off: 'mdi:air-humidifier-off' },
  [DeviceType.EventTimer]: { on: 'mdi:pump', off: 'mdi:pump' },
  [DeviceType.Custom]: { on: 'mdi:view-dashboard-variant-outline', off: 'mdi:view-dashboard-variant-outline' },
  [DeviceType.Scene]: { on: 'mdi:palette-outline', off: 'mdi:palette-outline' },
  [DeviceType.Automation]: { on: 'mdi:robot-outline', off: 'mdi:robot-off-outline' },
  [DeviceType.Script]: { on: 'mdi:script-text-play-outline', off: 'mdi:script-text-outline' },
  [DeviceType.MediaPlayer]: { on: 'mdi:cast-connected', off: 'mdi:cast' },
  [DeviceType.Cover]: { on: 'mdi:window-open', off: 'mdi:window-closed' },
  [DeviceType.Lock]: { on: 'mdi:lock-open', off: 'mdi:lock' },
  [DeviceType.Person]: { on: 'mdi:account', off: 'mdi:account-outline' },
  [DeviceType.Vacuum]: { on: 'mdi:robot-vacuum', off: 'mdi:robot-vacuum-off' },
  [DeviceType.Timer]: { on: 'mdi:timer-play-outline', off: 'mdi:timer-stop-outline' },
  [DeviceType.Update]: { on: 'mdi:package-up', off: 'mdi:package-check' },
  [DeviceType.InputBoolean]: { on: 'mdi:toggle-switch', off: 'mdi:toggle-switch-off-outline' },
  [DeviceType.InputNumber]: { on: 'mdi:ray-vertex', off: 'mdi:ray-vertex' },
  [DeviceType.InputText]: { on: 'mdi:form-textbox', off: 'mdi:form-textbox' },
  [DeviceType.InputSelect]: { on: 'mdi:form-dropdown', off: 'mdi:form-dropdown' },
  [DeviceType.Siren]: { on: 'mdi:bullhorn', off: 'mdi:bullhorn-outline', animation: 'pulse' },
  [DeviceType.Camera]: { on: 'mdi:cctv', off: 'mdi:cctv-off' },
  [DeviceType.Unknown]: { on: 'mdi:help-rhombus-outline', off: 'mdi:help-rhombus-outline' },
};


// Экспортируем карту для использования в модальном окне настроек устройства.
export const icons: Record<DeviceType, any> = iconMap;

// Хелпер для получения имени иконки по типу устройства и его состоянию.
export const getIconNameForDeviceType = (type: DeviceType, isOn: boolean): string => {
    const iconData = iconMap[type] ?? iconMap[DeviceType.Unknown];
    return isOn ? iconData.on : iconData.off;
};

/**
 * Компонент для отображения иконки устройства.
 * Обрабатывает кастомные иконки, иконки по умолчанию и анимации.
 */
const DeviceIcon: React.FC<DeviceIconProps> = ({ icon, isOn, className = '', ariaLabel, iconAnimation }) => {
  let iconName: string;
  let animationClass = '';

  // Определяем, какую анимацию использовать:
  // 1. Приоритет у `iconAnimation` из пропсов.
  // 2. Если его нет, используется анимация по умолчанию из `iconMap`.
  // 3. `iconAnimation='none'` отключает любую анимацию.
  const defaultAnimation = typeof icon !== 'string' ? (iconMap[icon] ?? iconMap[DeviceType.Unknown]).animation : undefined;
  const effectiveAnimation = iconAnimation === 'none' ? undefined : (iconAnimation ?? defaultAnimation);
  
  // Применяем класс анимации только если устройство включено.
  if (isOn && effectiveAnimation) {
    switch (effectiveAnimation) {
      case 'spin': animationClass = 'animate-spin'; break;
      case 'pulse': animationClass = 'animate-pulse-scale'; break;
      case 'glow': animationClass = 'animate-glow'; break;
    }
  }

  // Определяем имя иконки для Iconify.
  if (typeof icon === 'string') {
    // Если `icon` - это строка, значит, это кастомная иконка (например, "mdi:lightbulb").
    iconName = icon;
  } else {
    // Если `icon` - это `DeviceType`, получаем иконку из `iconMap`.
    const iconData = iconMap[icon] ?? iconMap[DeviceType.Unknown];
    iconName = isOn ? iconData.on : iconData.off;
  }

  // Базовые классы для установки размера иконки по умолчанию внутри DeviceCard.
  const baseClasses = 'w-[40%] h-[40%] mb-1';

  return (
    <div
      className={`${baseClasses} ${className}`}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
    >
      <Icon
        icon={iconName}
        className={`w-full h-full transition-colors duration-300 ${animationClass}`}
      />
    </div>
  );
};

export default DeviceIcon;
