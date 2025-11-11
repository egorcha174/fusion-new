





/**
 * Перечисление всех возможных типов устройств, используемых в приложении.
 * Это внутреннее представление, которое используется для определения иконки,
 * поведения карточки и доступных элементов в шаблонах.
 */
export enum DeviceType {
  Light,
  Lamp,
  Spotlight,
  Climate,
  TV,
  Computer,
  Monitor,
  Speaker,
  Playstation,
  BalconyLight,
  DimmableLight,
  Thermostat,
  Sensor,
  Outlet,
  Weather,
  Switch,
  Fan,
  DoorSensor,
  Camera,
  Unknown, // Резервный тип для неопознанных устройств
}

/**
 * Структура данных для одного дня в прогнозе погоды.
 */
export interface WeatherForecast {
    condition: string; // Состояние погоды (например, 'partlycloudy')
    temperature: number; // Максимальная температура
    templow: number; // Минимальная температура
    datetime: string; // Дата в формате ISO
}

/**
 * Основной интерфейс для представления устройства в приложении.
 * Эта структура данных является результатом преобразования сущности Home Assistant (HassEntity).
 */
export interface Device {
  id: string; // entity_id из Home Assistant
  name: string; // Имя устройства
  status: string; // Человекочитаемый статус (например, 'Включено', '22.5°C', 'Нагрев')
  type: DeviceType; // Внутренний тип устройства
  icon?: string; // Переопределение иконки (имя из Iconify)
  iconAnimation?: 'none' | 'spin' | 'pulse' | 'glow'; // Анимация иконки
  brightness?: number; // Яркость для DimmableLight (0-100)
  temperature?: number; // Текущая температура для термостата или погоды
  targetTemperature?: number; // Целевая температура для термостата
  unit?: string; // Единица измерения (например, '°C', '%')
  forecast?: WeatherForecast[]; // Прогноз погоды для устройств типа Weather
  condition?: string; // Состояние погоды в "сыром" виде (например, 'partlycloudy')
  presetMode?: string; // Текущий пресет для термостата
  presetModes?: string[]; // Доступные пресеты для термостата
  hvacModes?: string[]; // Доступные режимы HVAC
  hvacAction?: string; // Текущее действие HVAC (например, 'heating', 'cooling')
  minTemp?: number; // Минимальная температура для термостата
  maxTemp?: number; // Максимальная температура для термостата
  history?: number[]; // История значений для спарклайн-графиков
  haDomain?: string; // Домен из Home Assistant (например, 'light', 'sensor')
  haDeviceClass?: string; // device_class из Home Assistant
  state?: string; // "Сырое" состояние из Home Assistant (например, 'on', 'off')
}

/**
 * Представление комнаты (области) из Home Assistant.
 */
export interface Room {
  id: string; // area_id из Home Assistant
  name: string; // Название комнаты
  devices: Device[]; // Массив устройств в этой комнате
}

/**
 * Описывает положение и размер устройства на сетке дашборда.
 */
export interface GridLayoutItem {
  deviceId: string; // ID устройства
  col: number; // Колонка (начиная с 0)
  row: number; // Ряд (начиная с 0)
  width?: number; // Ширина в ячейках сетки
  height?: number; // Высота в ячейках сетки
}

/**
 * Представление пользовательской вкладки на дашборде.
 */
export interface Tab {
  id: string; // Уникальный ID вкладки
  name: string; // Название вкладки
  layout: GridLayoutItem[]; // Расположение устройств на этой вкладке
  gridSettings: {
    cols: number; // Количество колонок в сетке
    rows: number; // Количество рядов в сетке
  };
}

// --- Типы для пользовательских настроек ---

/**
 * Привязка сущности к слоту-индикатору в шаблоне карточки.
 */
export interface DeviceBinding {
  slotId: string; // ID слота в шаблоне
  entityId: string; // ID сущности Home Assistant
  icon?: string; // Переопределение иконки
  enabled: boolean; // Включен ли этот индикатор
}

/**
 * Пользовательские настройки для конкретного устройства.
 * Позволяет переопределять имя, тип, иконку и другие параметры.
 */
export interface DeviceCustomization {
  name?: string; // Пользовательское имя
  type?: DeviceType; // Пользовательский тип
  icon?: string; // Пользовательская иконка (Iconify)
  isHidden?: boolean; // Скрыто ли устройство
  templateId?: string; // ID шаблона карточки для этого устройства
  iconAnimation?: 'none' | 'spin' | 'pulse' | 'glow'; // Анимация иконки
  deviceBindings?: DeviceBinding[]; // Привязки для индикаторов
  thresholds?: ThresholdRule[]; // Правила пороговых значений (для сенсоров)
}

// Словарь кастомизаций, где ключ - это ID устройства (entity_id).
export type DeviceCustomizations = Record<string, DeviceCustomization>;

export type Page = 'dashboard' | 'settings' | 'all-devices';

export type ClockSize = 'sm' | 'md' | 'lg';

export interface ClockSettings {
    format: '12h' | '24h';
    showSeconds: boolean;
    size: ClockSize;
}

export interface CameraSettings {
  selectedEntityId: string | null;
}

/**
 * Набор цветов для одной темы (светлой или темной).
 * Определяет все цвета, используемые в интерфейсе.
 */
export interface ColorThemeSet {
  // Настройки фона
  dashboardBackgroundType: 'color' | 'gradient' | 'image';
  dashboardBackgroundColor1: string;
  dashboardBackgroundColor2?: string;
  dashboardBackgroundImage?: string; // base64 data URL
  dashboardBackgroundImageBlur?: number; // в пикселях
  dashboardBackgroundImageBrightness?: number; // в процентах
  
  // Настройки карточек
  cardOpacity?: number; // 0-1
  panelOpacity?: number; // 0-1

  cardBackground: string;
  cardBackgroundOn: string;
  tabTextColor: string;
  activeTabTextColor: string;
  tabIndicatorColor: string;
  thermostatHandleColor: string;
  thermostatDialTextColor: string;
  thermostatDialLabelColor: string;
  thermostatHeatingColor: string;
  thermostatCoolingColor: string;
  clockTextColor: string;

  // Цвета текста - состояние "Выкл"
  nameTextColor: string;
  statusTextColor: string;
  valueTextColor: string;
  unitTextColor: string;
  // Цвета текста - состояние "Вкл"
  nameTextColorOn: string;
  statusTextColorOn: string;
  valueTextColorOn: string;
  unitTextColorOn: string;

  // --- Свойства шрифтов ---
  nameTextFontFamily?: string;
  nameTextFontSize?: number;
  statusTextFontFamily?: string;
  statusTextFontSize?: number;
  valueTextFontFamily?: string;
  valueTextFontSize?: number;
  unitTextFontFamily?: string;
  unitTextFontSize?: number;

  nameTextFontFamilyOn?: string;
  nameTextFontSizeOn?: number;
  statusTextFontFamilyOn?: string;
  statusTextFontSizeOn?: number;
  valueTextFontFamilyOn?: string;
  valueTextFontSizeOn?: number;
  unitTextFontFamilyOn?: string;
  unitTextFontSizeOn?: number;
}

/**
 * Полная цветовая схема, включающая светлую и темную темы.
 */
export interface ColorScheme {
  light: ColorThemeSet;
  dark: ColorThemeSet;
}


// --- Система шаблонов карточек ---

// ID доступных элементов внутри шаблона карточки.
export type CardElementId = 'name' | 'icon' | 'value' | 'unit' | 'chart' | 'status' | 'slider' | 'temperature' | 'target-temperature' | 'hvac-modes' | 'linked-entity';

/**
 * Описывает один элемент (например, иконку, название) внутри шаблона карточки.
 */
export interface CardElement {
  id: CardElementId;
  visible: boolean; // Виден ли элемент
  position: { x: number; y: number }; // Позиция в % от левого верхнего угла
  size: { width: number; height: number }; // Размер в %
  zIndex: number; // z-index для наложения элементов
  styles: { // Специфичные стили для элемента
    decimalPlaces?: number; // Для 'value', 'temperature'
    onColor?: string; // Для 'icon'
    offColor?: string; // для 'icon'
    textAlign?: 'left' | 'center' | 'right'; // Для текстовых элементов
    linkedEntityId?: string; // для 'linked-entity'
    showValue?: boolean; // для 'linked-entity'
    chartTimeRange?: number; // для 'chart'
    chartTimeRangeUnit?: 'minutes' | 'hours' | 'days'; // для 'chart'
    chartType?: 'line' | 'gradient'; // для 'chart'
    idleLabelColor?: string; // для 'target-temperature'
    heatingLabelColor?: string; // для 'target-temperature'
    coolingLabelColor?: string; // для 'target-temperature'
  };
}

/**
 * Описывает один слот-индикатор на карточке.
 */
export interface DeviceSlot {
  id: string;
  position: { x: number; y: number }; // %
  iconSize: number; // px
  visualStyle: {
    type: 'color' | 'glow' | 'animation' | 'color_glow' | 'color_animation';
    activeColor: string;
    inactiveColor: string;
    glowIntensity: number; // 0-1
    animationType: 'pulse' | 'rotate' | 'none';
    showValue?: boolean; // Показывать ли значение вместо иконки
    decimalPlaces?: number;
    unit?: string;
    fontSize?: number;
  };
  interactive: boolean; // Можно ли нажимать на индикатор
}

/**
 * Стиль, применяемый при выполнении правила порогового значения.
 */
export interface ThresholdStyle {
  backgroundColor?: string;
  valueColor?: string;
}

/**
 * Правило для изменения стиля карточки сенсора при достижении порогового значения.
 */
export interface ThresholdRule {
  value: number;
  comparison: 'above' | 'below'; // Условие (больше или меньше)
  style: ThresholdStyle;
}

/**
 * Полное описание шаблона карточки устройства.
 */
export interface CardTemplate {
  id: string;
  name: string;
  deviceType: 'sensor' | 'light' | 'switch' | 'climate'; // Для какого типа устройств этот шаблон
  elements: CardElement[]; // Элементы внутри карточки
  styles: { // Общие стили для карточки
    // Стили фона перенесены в глобальную ColorScheme
  };
  width?: number; // Ширина по умолчанию в ячейках
  height?: number; // Высота по умолчанию в ячейках
  deviceSlots?: DeviceSlot[]; // Слоты для индикаторов
}

// Словарь шаблонов, где ключ - ID шаблона.
export type CardTemplates = Record<string, CardTemplate>;


// --- Типы для WebSocket API Home Assistant ---

/**
 * Представление сущности из Home Assistant.
 */
export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    device_class?: string;
    unit_of_measurement?: string;
    brightness?: number; // 0-255
    temperature?: number; // Целевая температура
    current_temperature?: number; // Текущая температура
    device_id?: string;
    // `forecast` может иметь любую структуру, в зависимости от интеграции
    forecast?: any;
    preset_mode?: string;
    preset_modes?: string[];
    hvac_modes?: string[];
    hvac_action?: string;
    min_temp?: number;
    max_temp?: number;
    [key: string]: any; // Для других атрибутов
  };
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
  last_changed: string;
  last_updated: string;
}

/**
 * Представление области (комнаты) из Home Assistant.
 */
export interface HassArea {
    area_id: string;
    name: string;
    picture: string | null;
}

/**
 * Представление физического устройства из Home Assistant.
 */
export interface HassDevice {
    id: string;
    area_id: string | null;
    name: string;
    // другие свойства не используются
}

/**
 * Запись из реестра сущностей Home Assistant, связывающая сущности, устройства и области.
 */
export interface HassEntityRegistryEntry {
    entity_id: string;
    area_id: string | null;
    device_id: string | null;
}