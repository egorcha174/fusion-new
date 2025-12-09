
import { DeviceType } from '../types';

export const iconMap: Record<number, { on: string; off: string; animation?: 'spin' | 'pulse' | 'glow' }> = {
  [DeviceType.Light]: { on: 'mdi:lightbulb', off: 'mdi:lightbulb-outline' },
  [DeviceType.DimmableLight]: { on: 'mdi:lightbulb', off: 'mdi:lightbulb-outline' },
  [DeviceType.Lamp]: { on: 'mdi:lamp', off: 'mdi:lamp-outline' },
  [DeviceType.Spotlight]: { on: 'mdi:spotlight', off: 'mdi:spotlight-beam' },
  [DeviceType.BalconyLight]: { on: 'mdi:wall-sconce-flat', off: 'mdi:wall-sconce-flat-outline' },
  [DeviceType.Climate]: { on: 'mdi:thermostat-box', off: 'mdi:thermostat-box' },
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
  [DeviceType.Unknown]: { on: 'mdi:help-rhombus-outline', off: 'mdi:help-rhombus-outline' },
};

export const getIconNameForDeviceType = (type: DeviceType | number, isOn: boolean = false): string => {
    const t = type as number;
    const entry = iconMap[t] || iconMap[DeviceType.Unknown];
    return isOn ? entry.on : entry.off;
};
