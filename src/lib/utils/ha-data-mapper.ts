
import { DeviceType } from '../types';
import type { Device, Room, HassEntity, HassArea, HassDevice, HassEntityRegistryEntry, DeviceCustomizations, DeviceCustomization, WeatherForecast } from '../types';

/**
 * Определяет внутренний тип устройства (`DeviceType`) на основе данных из Home Assistant.
 */
const getDeviceType = (entity: HassEntity): DeviceType => {
  const entityId = entity.entity_id;
  const attributes = entity.attributes || {};
  const friendlyName = (attributes.friendly_name || '').toLowerCase();
  const entityIdLower = entityId.toLowerCase();
  const domain = entityId.split('.')[0];
  const deviceClass = attributes.device_class;

  if (domain === 'internal') {
    if (entityId.includes('event-timer')) return DeviceType.EventTimer;
    if (entityId.includes('battery')) return DeviceType.BatteryWidget;
    if (entityId.includes('custom-card')) return DeviceType.Custom;
  }

  switch (domain) {
    case 'weather': return DeviceType.Weather;
    case 'climate': return DeviceType.Thermostat;
    case 'fan': return DeviceType.Fan;
    case 'humidifier': return DeviceType.Humidifier;
    case 'scene': return DeviceType.Scene;
    case 'automation': return DeviceType.Automation;
    case 'script': return DeviceType.Script;
    case 'media_player': return DeviceType.MediaPlayer;
    case 'person': return DeviceType.Person;
    case 'device_tracker': return DeviceType.Person;
    case 'vacuum': return DeviceType.Vacuum;
    case 'timer': return DeviceType.Timer;
    case 'update': return DeviceType.Update;
    case 'lock': return DeviceType.Lock;
    case 'siren': return DeviceType.Siren;
    case 'input_boolean': return DeviceType.InputBoolean;
    case 'input_number': return DeviceType.InputNumber;
    case 'input_text': return DeviceType.InputText;
    case 'input_select': return DeviceType.InputSelect;
  }

  if (domain === 'light') {
    return attributes.brightness !== undefined ? DeviceType.DimmableLight : DeviceType.Light;
  }
  
  if (domain === 'switch') {
    if (deviceClass === 'outlet') return DeviceType.Outlet;
    if (friendlyName.includes('light') || friendlyName.includes('свет') || friendlyName.includes('лампа') || friendlyName.includes('торшер') || friendlyName.includes('люстра')) {
      return DeviceType.Light;
    }
    return DeviceType.Switch;
  }

  if (domain === 'sensor') {
      return DeviceType.Sensor;
  }

  if (domain === 'binary_sensor') {
      if (deviceClass === 'door' || deviceClass === 'garage_door' || deviceClass === 'window' || deviceClass === 'opening') {
          return DeviceType.DoorSensor;
      }
      if (deviceClass === 'lock') return DeviceType.Lock;
      return DeviceType.BinarySensor;
  }

  if (domain === 'cover') {
      return DeviceType.Cover;
  }

  const combinedName = `${friendlyName} ${entityIdLower}`;

  if (combinedName.includes('tv') || combinedName.includes('телевизор')) return DeviceType.TV;
  if (combinedName.includes('playstation')) return DeviceType.Playstation;
  if (combinedName.includes('computer') || combinedName.includes('компьютер')) return DeviceType.Computer;
  if (combinedName.includes('monitor') || combinedName.includes('монитор')) return DeviceType.Monitor;
  if (combinedName.includes('speaker') || combinedName.includes('колонка')) return DeviceType.Speaker;
  if (combinedName.includes('fan') || combinedName.includes('вентилятор')) return DeviceType.Fan;
  
  if (entity.state) {
      return DeviceType.Sensor;
  }

  return DeviceType.Unknown;
};

const getStatusText = (entity: HassEntity): string => {
    if (entity.state === 'unavailable') return 'Недоступно';
    if (entity.state === 'unknown') return 'Неизвестно';
    
    const domain = entity.entity_id.split('.')[0];
    const attributes = entity.attributes || {};
    const deviceClass = attributes.device_class;

    if (domain === 'climate') {
        const hvacAction = attributes.hvac_action; 
        const state = entity.state;

        const stateTranslations: Record<string, string> = {
            'cool': 'Охлаждение', 'heat': 'Нагрев', 'fan_only': 'Вентилятор',
            'dry': 'Осушение', 'auto': 'Авто', 'heat_cool': 'Авто', 'off': 'Выключено',
        };
        const actionTranslations: Record<string, string> = {
            'cooling': 'Охлаждение', 'heating': 'Нагрев', 'fan': 'Вентилятор',
            'drying': 'Осушение', 'off': 'Выключено', 'idle': 'Ожидание',
        };

        if (hvacAction && hvacAction !== 'idle' && hvacAction !== 'off') {
            return actionTranslations[hvacAction] || hvacAction;
        }
        return stateTranslations[state] || state.charAt(0).toUpperCase() + state.slice(1);
    }
    
    if (domain === 'media_player') {
        if ((entity.state === 'playing' || entity.state === 'paused') && attributes.media_title) {
            if (attributes.media_artist) {
                return `${attributes.media_artist} - ${attributes.media_title}`;
            }
            return attributes.media_title;
        }
        const stateTranslations: Record<string, string> = { 'playing': 'Воспроизведение', 'paused': 'Пауза', 'idle': 'Ожидание', 'off': 'Выключено', 'on': 'Включено', 'buffering': 'Буферизация' };
        return stateTranslations[entity.state] || entity.state;
    }

    if (domain === 'weather') {
        const stateMap: Record<string, string> = {
            'clear-night': 'Ясно', 'cloudy': 'Облачно', 'exceptional': 'Особые условия', 'fog': 'Туман',
            'hail': 'Град', 'lightning': 'Гроза', 'lightning-rainy': 'Гроза с дождем',
            'partlycloudy': 'Переменная облачность', 'pouring': 'Ливень', 'rainy': 'Дождь',
            'snowy': 'Снег', 'snowy-rainy': 'Снег с дождем', 'sunny': 'Солнечно',
            'windy': 'Ветрено', 'windy-variant': 'Ветрено',
        };
        return stateMap[entity.state] || entity.state.charAt(0).toUpperCase() + entity.state.slice(1);
    }

    if (domain === 'cover') {
        if (entity.state === 'open') return 'Открыто';
        if (entity.state === 'closed') return 'Закрыто';
        if (entity.state === 'opening') return 'Открывается...';
        if (entity.state === 'closing') return 'Закрывается...';
        if (attributes.current_position !== undefined) return `${attributes.current_position}%`;
        return entity.state;
    }

    if (domain === 'lock') {
        if (entity.state === 'locked') return 'Закрыто';
        if (entity.state === 'unlocked') return 'Открыто';
        if (entity.state === 'locking') return 'Закрывается...';
        if (entity.state === 'unlocking') return 'Открывается...';
    }

    if (domain === 'person' || domain === 'device_tracker') {
        if (entity.state === 'home') return 'Дома';
        if (entity.state === 'not_home') return 'Не дома';
        return entity.state; 
    }

    if (domain === 'vacuum') {
        const map: Record<string, string> = { 'docked': 'На базе', 'cleaning': 'Уборка', 'returning': 'Возврат на базу', 'error': 'Ошибка', 'idle': 'Ожидание' };
        return map[entity.state] || entity.state;
    }

    if (domain === 'update') {
        if (entity.state === 'on') {
            return attributes.installed_version && attributes.latest_version 
                ? `Доступно: ${attributes.latest_version}` 
                : 'Доступно обновление';
        }
        return 'Обновлено';
    }

    if (domain === 'timer') {
        if (entity.state === 'active') return 'Запущен';
        if (entity.state === 'paused') return 'Пауза';
        return 'Остановлен';
    }

    if (domain === 'automation') {
        if (entity.state === 'on') return 'Включена';
        if (entity.state === 'off') return 'Выключена';
    }

    if (domain === 'script') {
        if (entity.state === 'on') return 'Выполняется';
        return 'Готов к запуску';
    }

    if (domain === 'scene') {
        return 'Активировать';
    }
    
    if (domain === 'binary_sensor') {
        const isOn = entity.state === 'on';
        switch (deviceClass) {
            case 'battery': return isOn ? 'Разряжена' : 'Норма';
            case 'connectivity': return isOn ? 'Подключено' : 'Отключено';
            case 'door':
            case 'garage_door':
            case 'opening':
            case 'window':
                return isOn ? 'Открыто' : 'Закрыто';
            case 'lock': return isOn ? 'Открыто' : 'Закрыто';
            case 'moisture': return isOn ? 'Влага обнаружена' : 'Сухо';
            case 'motion': return isOn ? 'Движение' : 'Нет движения';
            case 'occupancy': return isOn ? 'Занято' : 'Свободно';
            case 'plug': return isOn ? 'Вставлено' : 'Отключено';
            case 'presence': return isOn ? 'Дома' : 'Не дома';
            case 'safety': return isOn ? 'Опасно' : 'Безопасно';
            case 'smoke': return isOn ? 'Дым' : 'Чисто';
            case 'sound': return isOn ? 'Звук' : 'Тихо';
            case 'vibration': return isOn ? 'Вибрация' : 'Спокойно';
            case 'power': return isOn ? 'Есть питание' : 'Нет питания';
            case 'problem': return isOn ? 'Проблема' : 'ОК';
            case 'update': return isOn ? 'Есть обновление' : 'Актуально';
            default: return isOn ? 'Включено' : 'Выключено';
        }
    }
    
    if (domain === 'sensor' || domain === 'input_number') {
        if (attributes.unit_of_measurement) {
            return `${entity.state} ${attributes.unit_of_measurement}`;
        }
        return entity.state;
    }
    
    if (entity.state === 'on') return 'Включено';
    if (entity.state === 'off') return 'Выключено';
    
    return entity.state.charAt(0).toUpperCase() + entity.state.slice(1);
}

const entityToDevice = (
    entity: HassEntity, 
    customization: DeviceCustomization = {}, 
    sideLoadedForecast?: WeatherForecast[]
): Device | null => {
  const attributes = entity.attributes || {};
  const originalType = getDeviceType(entity);
  
  const device: Device = {
    id: entity.entity_id,
    name: customization.name || attributes.friendly_name || entity.entity_id,
    status: getStatusText(entity),
    type: customization.type !== undefined ? customization.type : originalType,
    icon: customization.icon,
    iconAnimation: customization.iconAnimation,
    unit: attributes.unit_of_measurement,
    haDomain: entity.entity_id.split('.')[0],
    haDeviceClass: attributes.device_class,
    state: entity.state,
    attributes: attributes, 
  };

  if (device.type === DeviceType.DimmableLight && attributes.brightness) {
    device.brightness = Math.round((attributes.brightness / 255) * 100);
  }
  
  if (device.type === DeviceType.Thermostat) {
    device.temperature = attributes.current_temperature;
    device.targetTemperature = attributes.temperature;
    device.presetMode = attributes.preset_mode;
    device.presetModes = attributes.preset_modes;
    device.hvacModes = attributes.hvac_modes;
    device.hvacAction = attributes.hvac_action;
    device.minTemp = attributes.min_temp;
    device.maxTemp = attributes.max_temp;
  }
  
  if (device.type === DeviceType.Humidifier) {
    device.targetHumidity = attributes.humidity;
    device.currentHumidity = attributes.current_humidity;
    device.hvacAction = attributes.action;
    device.minTemp = attributes.min_humidity;
    device.maxTemp = attributes.max_humidity;
    device.presetMode = attributes.mode;
    device.presetModes = attributes.available_modes;
  }

  if (device.haDomain === 'fan') {
    device.fanSpeed = attributes.percentage;
  } else if (device.haDomain === 'select' && (device.id.includes('fan_level') || device.id.includes('speed'))) {
    device.fanLevel = entity.state;
    device.fanLevels = attributes.options;
  }
  
  if (device.type === DeviceType.Cover && attributes.current_position !== undefined) {
      device.currentPosition = attributes.current_position;
  }
  
  if (device.type === DeviceType.MediaPlayer) {
        device.entityPictureUrl = attributes.entity_picture;
        device.mediaTitle = attributes.media_title;
        device.mediaArtist = attributes.media_artist;
        device.appName = attributes.app_name;
  }
  
  if (device.type === DeviceType.Person && attributes.entity_picture) {
      device.entityPictureUrl = attributes.entity_picture;
  }

  if (device.type === DeviceType.Weather) {
      device.temperature = attributes.temperature;
      device.condition = entity.state;

      if (sideLoadedForecast && sideLoadedForecast.length > 0) {
          device.forecast = sideLoadedForecast;
      } else if (Array.isArray(attributes.forecast) && attributes.forecast.length > 0) {
          device.forecast = attributes.forecast.map((f: any) => ({
              datetime: f.datetime,
              condition: f.condition,
              temperature: f.temperature,
              templow: f.templow !== undefined ? f.templow : f.temperature
          }));
      } else {
          device.forecast = [];
      }
  }

  if (typeof attributes.battery_level === 'number') {
    device.batteryLevel = attributes.battery_level;
  }

  return device;
};

export const mapEntitiesToRooms = (
    entities: HassEntity[], 
    areas: HassArea[], 
    haDevices: HassDevice[], 
    entityRegistry: HassEntityRegistryEntry[],
    customizations: DeviceCustomizations,
    showHidden: boolean = false,
    forecasts: Record<string, WeatherForecast[]> = {}
): Room[] => {
  const roomsMap: Map<string, Room> = new Map();

  areas.forEach(area => {
    roomsMap.set(area.area_id, { id: area.area_id, name: area.name, devices: [] });
  });
  roomsMap.set('no_area', { id: 'no_area', name: 'Без пространства', devices: []});

  const entityIdToAreaIdMap = new Map<string, string>();
  entityRegistry.forEach(entry => {
      if (entry.area_id) entityIdToAreaIdMap.set(entry.entity_id, entry.area_id);
  });
  
  const haDeviceById = new Map(haDevices.map(d => [d.id, d]));

  entities.forEach(entity => {
    if (!entity) return;

    const customization = customizations[entity.entity_id] || {};
    if (customization.isHidden && !showHidden) return; 

    const sideLoadedForecast = forecasts[entity.entity_id];
    
    try {
        const device = entityToDevice(entity, customization, sideLoadedForecast);

        if (device) {
            let areaId: string | undefined | null = entityIdToAreaIdMap.get(entity.entity_id);
            if (!areaId && entity.attributes?.device_id) {
                const haDevice = haDeviceById.get(entity.attributes.device_id);
                if (haDevice?.area_id) areaId = haDevice.area_id;
            }

            const targetRoom = roomsMap.get(areaId || 'no_area') || roomsMap.get('no_area');
            targetRoom?.devices.push(device);
        }
    } catch (err) {
        console.error(`Failed to map entity ${entity.entity_id}:`, err);
    }
  });

  return Array.from(roomsMap.values()).filter(room => room.devices.length > 0);
};
