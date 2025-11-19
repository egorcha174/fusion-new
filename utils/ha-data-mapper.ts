
import { Device, Room, DeviceType, HassEntity, HassArea, HassDevice, HassEntityRegistryEntry, DeviceCustomizations, DeviceCustomization, WeatherForecast } from '../types';

/**
 * Определяет внутренний тип устройства (`DeviceType`) на основе данных из Home Assistant.
 * Использует иерархическую логику: сначала точные совпадения по домену,
 * затем домен + атрибуты, затем ключевые слова в названии.
 * 
 * @param {HassEntity} entity - Сущность Home Assistant.
 * @returns {DeviceType} - Внутренний тип устройства.
 */
const getDeviceType = (entity: HassEntity): DeviceType => {
  const entityId = entity.entity_id;
  const attributes = entity.attributes || {};
  const friendlyName = (attributes.friendly_name || '').toLowerCase();
  const entityIdLower = entityId.toLowerCase();
  const domain = entityId.split('.')[0];

  // --- Приоритет 0: Внутренние виджеты ---
  if (domain === 'internal') {
    if (entityId.includes('event-timer')) return DeviceType.EventTimer;
    if (entityId.includes('battery')) return DeviceType.BatteryWidget;
    if (entityId.includes('custom-card')) return DeviceType.Custom;
  }

  // --- Приоритет 1: Прямое сопоставление домена (однозначные случаи) ---
  switch (domain) {
    case 'camera': return DeviceType.Camera;
    case 'weather': return DeviceType.Weather;
    case 'sensor': return DeviceType.Sensor;
    case 'climate': return DeviceType.Thermostat;
    case 'fan': return DeviceType.Fan;
    case 'humidifier': return DeviceType.Humidifier;
    case 'scene': return DeviceType.Scene;
    case 'automation': return DeviceType.Automation;
    case 'script': return DeviceType.Script;
    case 'media_player': return DeviceType.MediaPlayer;
  }

  // --- Приоритет 2: Домен + Атрибуты/Класс устройства ---
  if (domain === 'light') {
    return attributes.brightness !== undefined ? DeviceType.DimmableLight : DeviceType.Light;
  }
  
  if (domain === 'switch') {
    if (attributes.device_class === 'outlet') return DeviceType.Outlet;
    // Эвристика: если имя переключателя похоже на светильник, классифицируем его как свет.
    if (friendlyName.includes('light') || friendlyName.includes('свет') || friendlyName.includes('лампа') || friendlyName.includes('торшер') || friendlyName.includes('люстра')) {
      return DeviceType.Light;
    }
  }

  // --- Приоритет 3: Поиск по ключевым словам в имени/ID (для неоднозначных доменов) ---
  const combinedName = `${friendlyName} ${entityIdLower}`;

  if (combinedName.includes('tv') || combinedName.includes('телевизор')) return DeviceType.TV;
  if (combinedName.includes('playstation')) return DeviceType.Playstation;
  if (combinedName.includes('computer') || combinedName.includes('компьютер')) return DeviceType.Computer;
  if (combinedName.includes('monitor') || combinedName.includes('монитор')) return DeviceType.Monitor;
  if (combinedName.includes('speaker') || combinedName.includes('колонка')) return DeviceType.Speaker;
  if (combinedName.includes('fan') || combinedName.includes('вентилятор')) return DeviceType.Fan;
  
  // --- Приоритет 4: Резервный вариант для оставшихся доменов ---
  if (domain === 'switch') return DeviceType.Switch;

  // --- Финальный резервный вариант ---
  console.warn(`[HA Data Mapper] Unknown device type for entity: ${entity.entity_id}`, entity);
  return DeviceType.Unknown;
};

/**
 * Преобразует "сырое" состояние сущности из Home Assistant в человекочитаемый текст на русском языке.
 * Обрабатывает специфичные статусы для климата, медиа-плееров, погоды и других доменов.
 * 
 * @param {HassEntity} entity - Сущность Home Assistant.
 * @returns {string} - Человекочитаемый статус.
 */
const getStatusText = (entity: HassEntity): string => {
    // Обрабатываем универсальные состояния в первую очередь
    if (entity.state === 'unavailable') return 'Недоступно';
    if (entity.state === 'unknown') return 'Неизвестно';
    
    const domain = entity.entity_id.split('.')[0];
    const attributes = entity.attributes || {};

    // Специальная логика для климата (термостатов)
    if (domain === 'climate') {
        const hvacAction = attributes.hvac_action; // 'heating', 'cooling', 'idle'
        const state = entity.state; // 'heat', 'cool', 'off'

        const stateTranslations: Record<string, string> = {
            'cool': 'Охлаждение', 'heat': 'Нагрев', 'fan_only': 'Вентилятор',
            'dry': 'Осушение', 'auto': 'Авто', 'heat_cool': 'Авто', 'off': 'Выключено',
        };
        const actionTranslations: Record<string, string> = {
            'cooling': 'Охлаждение', 'heating': 'Нагрев', 'fan': 'Вентилятор',
            'drying': 'Осушение', 'off': 'Выключено', 'idle': 'Ожидание',
        };

        // Если устройство активно что-то делает, показываем действие (приоритет).
        if (hvacAction && hvacAction !== 'idle' && hvacAction !== 'off') {
            return actionTranslations[hvacAction] || hvacAction;
        }

        // В противном случае показываем общий режим/состояние.
        return stateTranslations[state] || state.charAt(0).toUpperCase() + state.slice(1);
    }
    
    // Специальная логика для медиа-плееров
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


    // Специальная логика для погоды
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
    
    // Для сенсоров возвращаем "сырое" значение, форматирование будет на стороне компонента.
    if (domain === 'sensor') {
        return entity.state;
    }
    
    // Общие состояния для переключаемых устройств
    if (entity.state === 'on') return 'Включено';
    if (entity.state === 'off') return 'Выключено';
    
    // Резервный вариант: просто первая буква в верхнем регистре.
    return entity.state.charAt(0).toUpperCase() + entity.state.slice(1);
}

/**
 * Преобразует одну сущность Home Assistant (HassEntity) в формат устройства приложения (Device),
 * применяя при этом пользовательские настройки.
 * 
 * @param {HassEntity} entity - Сущность Home Assistant.
 * @param {DeviceCustomization} [customization={}] - Пользовательские настройки для этой сущности.
 * @param {WeatherForecast[]} [sideLoadedForecast] - Данные прогноза, полученные через сервисный вызов (приоритет).
 * @returns {Device | null} - Объект устройства или null, если не удалось преобразовать.
 */
const entityToDevice = (
    entity: HassEntity, 
    customization: DeviceCustomization = {}, 
    sideLoadedForecast?: WeatherForecast[]
): Device | null => {
  const attributes = entity.attributes || {};
  const originalType = getDeviceType(entity);
  
  // Создаем базовый объект устройства
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
  };

  // Добавляем специфичные для типов устройств атрибуты
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
    device.hvacAction = attributes.action; // humidifying, drying, idle
    device.minTemp = attributes.min_humidity; // Re-use minTemp for min_humidity
    device.maxTemp = attributes.max_humidity; // Re-use maxTemp for max_humidity
    device.presetMode = attributes.mode; // Re-use presetMode for mode
    device.presetModes = attributes.available_modes; // Re-use presetModes for available_modes
  }

  if (device.haDomain === 'fan') {
    device.fanSpeed = attributes.percentage;
  } else if (device.haDomain === 'select' && (device.id.includes('fan_level') || device.id.includes('speed'))) {
    device.fanLevel = entity.state;
    device.fanLevels = attributes.options;
  }
  
    if (device.type === DeviceType.MediaPlayer) {
        device.entityPictureUrl = attributes.entity_picture;
        device.mediaTitle = attributes.media_title;
        device.mediaArtist = attributes.media_artist;
        device.appName = attributes.app_name;
    }

  if (device.type === DeviceType.Weather) {
      device.temperature = attributes.temperature;
      device.condition = entity.state;

      // Логика получения прогноза:
      // 1. Приоритет: данные от сервиса weather.get_forecasts (sideLoadedForecast)
      // 2. Fallback: данные из атрибута forecast (для старых версий HA или некоторых интеграций)
      if (sideLoadedForecast && sideLoadedForecast.length > 0) {
          device.forecast = sideLoadedForecast;
      } else if (Array.isArray(attributes.forecast) && attributes.forecast.length > 0) {
          // Fallback для обратной совместимости
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

  // Добавляем уровень заряда, если он есть
  if (typeof attributes.battery_level === 'number') {
    device.batteryLevel = attributes.battery_level;
  }

  return device;
};

/**
 * Главная функция маппинга. Принимает все "сырые" данные из HA
 * и организует их в структуру комнат с устройствами.
 * Гарантирует, что все валидные устройства попадают в вывод.
 * 
 * @param {HassEntity[]} entities - Все сущности.
 * @param {HassArea[]} areas - Все области (комнаты).
 * @param {HassDevice[]} haDevices - Все физические устройства.
 * @param {HassEntityRegistryEntry[]} entityRegistry - Реестр сущностей для связей.
 * @param {DeviceCustomizations} customizations - Пользовательские настройки.
 * @param {boolean} [showHidden=false] - Показывать ли скрытые устройства.
 * @param {Record<string, WeatherForecast[]>} [forecasts={}] - Данные прогнозов погоды, полученные через сервисы.
 * @returns {Room[]} - Массив комнат с устройствами.
 */
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

  // Инициализируем карту комнат
  areas.forEach(area => {
    roomsMap.set(area.area_id, { id: area.area_id, name: area.name, devices: [] });
  });
  roomsMap.set('no_area', { id: 'no_area', name: 'Без пространства', devices: []});

  // Создаем карты для быстрого поиска связей (O(n) операции)
  const entityIdToAreaIdMap = new Map<string, string>();
  entityRegistry.forEach(entry => {
      if (entry.area_id) entityIdToAreaIdMap.set(entry.entity_id, entry.area_id);
  });
  
  const haDeviceById = new Map(haDevices.map(d => [d.id, d]));

  // Проходим по всем сущностям (O(m) операция)
  entities.forEach(entity => {
    if (!entity) return;

    const customization = customizations[entity.entity_id] || {};
    if (customization.isHidden && !showHidden) return; // Пропускаем скрытые

    // Pass the side-loaded forecast if available for this entity
    const sideLoadedForecast = forecasts[entity.entity_id];
    const device = entityToDevice(entity, customization, sideLoadedForecast);

    // Добавляем только успешно преобразованные устройства (включая "неизвестные")
    if (device) {
        // Определяем, к какой комнате принадлежит устройство (O(1) операции)
        let areaId: string | undefined | null = entityIdToAreaIdMap.get(entity.entity_id);
        if (!areaId && entity.attributes?.device_id) {
            const haDevice = haDeviceById.get(entity.attributes.device_id);
            if (haDevice?.area_id) areaId = haDevice.area_id;
        }

        const targetRoom = roomsMap.get(areaId || 'no_area') || roomsMap.get('no_area');
        targetRoom?.devices.push(device);
    }
  });

  // Возвращаем массив комнат, отфильтровывая пустые.
  return Array.from(roomsMap.values()).filter(room => room.devices.length > 0);
};
