
import { DeviceType } from '$types';

export const iconMap: Record<number, { on: string; off: string; animation?: 'spin' | 'pulse' | 'glow' }> = {
  [DeviceType.Light]: { on: 'mdi:lightbulb', off: 'mdi:lightbulb-outline' },
  [DeviceType.DimmableLight]: { on: 'mdi:lightbulb', off: 'mdi:lightbulb-outline' },
  [DeviceType.Switch]: { on: 'mdi:toggle-switch', off: 'mdi:toggle-switch-off-outline' },
  [DeviceType.Sensor]: { on: 'mdi:radar', off: 'mdi:radar' },
  [DeviceType.BinarySensor]: { on: 'mdi:checkbox-marked-circle-outline', off: 'mdi:checkbox-blank-circle-outline' },
  [DeviceType.Climate]: { on: 'mdi:thermostat-box', off: 'mdi:thermostat-box' },
  [DeviceType.Thermostat]: { on: 'mdi:thermostat-box', off: 'mdi:thermostat-box' },
  [DeviceType.Fan]: { on: 'mdi:fan', off: 'mdi:fan', animation: 'spin' },
  [DeviceType.Humidifier]: { on: 'mdi:air-humidifier', off: 'mdi:air-humidifier-off' },
  [DeviceType.Unknown]: { on: 'mdi:help-rhombus-outline', off: 'mdi:help-rhombus-outline' },
  // ... Add more mappings as needed from original
};

export const getIconNameForDeviceType = (type: DeviceType | number, isOn: boolean = false): string => {
    const t = type as number;
    const entry = iconMap[t] || iconMap[DeviceType.Unknown];
    return isOn ? entry.on : entry.off;
};
