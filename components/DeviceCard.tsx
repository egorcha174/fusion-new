import React, { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { Device, DeviceType, CardTemplate, CardElement, DeviceCustomizations, ColorScheme } from '../types';
import DeviceIcon from './DeviceIcon';
import SparklineChart from './SparklineChart';
import ThermostatDial from './ThermostatDial';
import { Icon } from '@iconify/react';
import { CameraStreamContent } from './CameraStreamContent';
import BatteryWidgetCard from './BatteryWidgetCard';
import EventTimerWidgetCard from './EventTimerWidgetCard';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Применяет заданную прозрачность к строке цвета.
 * @param color - Строка цвета (HEX или RGB).
 * @param opacity - Прозрачность от 0 до 1.
 * @returns - Строка цвета в формате RGBA.
 */
const applyOpacity = (color: string | undefined, opacity: number | undefined): string | undefined => {
    if (color === undefined || opacity === undefined || opacity >= 1) return color;
    if (opacity < 0) opacity = 0;

    let r: number, g: number, b: number;

    if (color.startsWith('#')) {
        const hex = color.length === 4 ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}` : color;
        if (hex.length !== 7) return color; // Invalid hex
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    } else if (color.startsWith('rgb')) {
        const parts = color.match(/(\d+)/g);
        if (!parts || parts.length < 3) return color;
        [r, g, b] = parts.map(Number);
    } else {
        return color; // Can't parse, return as is
    }

    if (isNaN(r) || isNaN(g) || isNaN(b)) return color;

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};


/**
 * Компонент для автоматического подбора размера шрифта текста, чтобы он помещался в контейнер.
 * @param {string} text - Текст для отображения.
 * @param {string} [className] - Классы для внешнего div-контейнера.
 * @param {string} [pClassName] - Классы для внутреннего p-элемента с текстом.
 * @param {number} [maxFontSize=48] - Максимальный размер шрифта в px.
 * @param {'single-line' | 'multi-line'} [mode='multi-line'] - Режим переноса строк.
 * @param {number} [maxLines=2] - Максимальное количество строк в режиме 'multi-line'.
 * @param {number} [fontSize] - Если указан, используется этот фиксированный размер шрифта, и автоподбор отключается.
 * @param {'left' | 'center' | 'right'} [textAlign] - Горизонтальное выравнивание.
 * @param {React.CSSProperties} [pStyle] - Инлайновые стили для p-элемента.
 */
const AutoFitText: React.FC<{
  text: string;
  className?: string;
  pClassName?: string;
  maxFontSize?: number;
  mode?: 'single-line' | 'multi-line';
  maxLines?: number;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  pStyle?: React.CSSProperties;
}> = ({ text, className, pClassName, maxFontSize = 48, mode = 'multi-line', maxLines = 2, fontSize, textAlign, pStyle }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pRef = useRef<HTMLParagraphElement>(null);

  // useLayoutEffect используется вместо useEffect, чтобы измерения произошли синхронно после рендера,
  // до того, как браузер отрисует кадр, что предотвращает "прыжки" текста.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const p = pRef.current;
    if (!container || !p) return;

    // Если размер шрифта задан явно, просто применяем его и выходим.
    if (fontSize) {
      p.style.fontSize = `${fontSize}px`;
      p.style.whiteSpace = mode === 'multi-line' ? 'normal' : 'nowrap';
      return;
    }

    // Основная логика автоподбора размера.
    const fitText = () => {
      let currentSize = maxFontSize;
      const tolerance = 1; // Небольшой допуск, чтобы избежать "дрожания" при пересчете.

      p.style.fontSize = `${currentSize}px`;
      p.style.whiteSpace = mode === 'multi-line' ? 'normal' : 'nowrap';
      
      // В цикле уменьшаем размер шрифта, пока текст не поместится в контейнер.
      while (
        currentSize > 8 &&
        (p.scrollWidth > container.clientWidth + tolerance || p.scrollHeight > container.clientHeight + tolerance)
      ) {
        currentSize -= 1;
        p.style.fontSize = `${currentSize}px`;
      }
    };
    
    // ResizeObserver следит за изменением размеров контейнера и запускает fitText при необходимости.
    const resizeObserver = new ResizeObserver(fitText);
    if (container) {
        resizeObserver.observe(container);
    }
    fitText(); // Первоначальный подбор размера

    return () => {
        if(container) {
            resizeObserver.unobserve(container);
        }
    };
  }, [text, maxFontSize, mode, fontSize, pStyle]);

  const multiLineStyles: React.CSSProperties = mode === 'multi-line' ? {
      display: '-webkit-box',
      WebkitLineClamp: maxLines,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
  } : {};
  
  const textAlignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[textAlign || 'left'];


  return (
    <div ref={containerRef} className={`${className} flex items-center ${textAlignClass}`}>
      <p ref={pRef} className={pClassName} style={{ lineHeight: 1.15, wordBreak: 'break-word', ...multiLineStyles, ...pStyle }}>
        {text}
      </p>
    </div>
  );
};


interface DeviceCardProps {
  device: Device;
  allKnownDevices: Map<string, Device>;
  customizations: DeviceCustomizations;
  onDeviceToggle: (deviceId: string) => void;
  onTemperatureChange: (temperature: number, isDelta?: boolean) => void;
  onBrightnessChange: (brightness: number) => void;
  onHvacModeChange: (mode: string) => void;
  onPresetChange: (preset: string) => void;
  onFanSpeedChange: (deviceId: string, value: number | string) => void;
  onCameraCardClick: (device: Device) => void;
  isEditMode: boolean;
  isPreview?: boolean; // Используется в редакторе шаблонов
  onEditDevice: (device: Device) => void;
  onRemoveFromTab?: () => void;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<{ url: string }>;
  template?: CardTemplate; // Шаблон для рендеринга
  openMenuDeviceId?: string | null; // Для управления открытым меню HVAC
  setOpenMenuDeviceId?: (id: string | null) => void;
  colorScheme: ColorScheme['light']; // Текущая цветовая схема
  onContextMenu?: (event: React.MouseEvent) => void;
  isOnPreview?: boolean; // Для переключения состояния в редакторе
  isDark: boolean;
}

/**
 * Компонент, отображающий карточку устройства.
 * Может работать в двух режимах:
 * 1. На основе шаблона (template): универсальный рендерер, который строит UI по заданной структуре.
 * 2. Резервный (legacy): рендерит предопределенный UI для каждого типа устройства.
 */
const DeviceCard: React.FC<DeviceCardProps> = ({ device, allKnownDevices, customizations, onDeviceToggle, onTemperatureChange, onBrightnessChange, onHvacModeChange, onPresetChange, onFanSpeedChange, onCameraCardClick, isEditMode, isPreview = false, onEditDevice, onRemoveFromTab, haUrl, signPath, getCameraStreamUrl, template, openMenuDeviceId, setOpenMenuDeviceId, colorScheme, onContextMenu, isOnPreview, isDark }) => {
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const hvacModesRef = useRef<HTMLDivElement>(null);
  const [hvacDropdownPositionClass, setHvacDropdownPositionClass] = useState('top-full mt-2');
  
  // Определяем, включено ли устройство. В режиме превью используем isOnPreview.
  const isOn = isPreview ? (isOnPreview ?? true) : (device.status.toLowerCase() === 'включено' || device.state === 'on');
  
  const [animationType, setAnimationType] = useState<'on' | 'off' | null>(null);
  const prevIsOnRef = useRef(isOn);

  useEffect(() => {
    // Запускаем анимацию только при изменении состояния
    if (isOn && !prevIsOnRef.current) {
        setAnimationType('on');
        const timer = setTimeout(() => {
            setAnimationType(null);
        }, 400); // Длительность анимации
        return () => clearTimeout(timer);
    }
    if (!isOn && prevIsOnRef.current) {
        setAnimationType('off');
        const timer = setTimeout(() => {
            setAnimationType(null);
        }, 400); // Длительность анимации
        return () => clearTimeout(timer);
    }
    // Обновляем предыдущее состояние в конце эффекта
    prevIsOnRef.current = isOn;
  }, [isOn]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        // Закрываем меню HVAC, если клик был вне его
        if (openMenuDeviceId === device.id && hvacModesRef.current && !hvacModesRef.current.contains(event.target as Node)) {
            setOpenMenuDeviceId?.(null);
        }
        // Закрываем меню пресетов термостата (старый UI), если клик был вне его
        if (isPresetMenuOpen && presetMenuRef.current && !presetMenuRef.current.contains(event.target as Node)) {
            setIsPresetMenuOpen(false);
        }
    };
    
    // Добавляем слушатель только если одно из меню открыто
    if (openMenuDeviceId === device.id || isPresetMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
}, [openMenuDeviceId, isPresetMenuOpen, device.id, setOpenMenuDeviceId]);

  const handleHvacButtonClick = useCallback((e: React.MouseEvent, modes: string[]) => {
      if (isPreview) return;
      e.stopPropagation();

      if (hvacModesRef.current) {
          const rect = hvacModesRef.current.getBoundingClientRect();
          // Находим ближайший контейнер сетки для корректного расчета границ
          const gridContainer = hvacModesRef.current.closest('.dashboard-grid-container');
          // Если контейнер не найден (например, в превью), используем окно браузера как границу
          const containerRect = gridContainer ? gridContainer.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
          
          const dropdownHeight = (modes.length * 36) + 16; // Примерная высота выпадающего списка
          const spaceBelow = containerRect.bottom - rect.bottom;
          const spaceAbove = rect.top - containerRect.top;

          // Открываем вверх, если внизу места не хватает, а вверху - достаточно
          if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
              setHvacDropdownPositionClass('bottom-full mb-2');
          } else {
              setHvacDropdownPositionClass('top-full mt-2');
          }
      }
      setOpenMenuDeviceId?.(openMenuDeviceId === device.id ? null : device.id);
  }, [isPreview, device.id, openMenuDeviceId, setOpenMenuDeviceId]);
  
  // Моковые данные для спарклайн-графика в режиме превью.
  const mockHistory = useMemo(() => {
    if (device.type !== DeviceType.Sensor) return [];
    const value = parseFloat(device.status) || 20;
    return Array.from({ length: 20 }, (_, i) => 
        value + (Math.sin(i / 3) * (value * 0.05)) + (Math.random() - 0.5) * (value * 0.05)
    );
  }, [device.type, device.status]);

   // Локальные стили для резервного рендерера.
   const styles = {
      padding: 'p-[8%]',
      nameText: 'font-semibold leading-tight',
      statusText: 'text-sm opacity-70',
      sensorStatusText: 'font-bold',
      sensorUnitText: 'font-medium opacity-70',
      thermostatTempText: 'font-bold text-lg',
      thermostatTargetText: 'text-sm font-medium opacity-80',
      thermostatButton: 'w-8 h-8 text-lg font-semibold bg-black/5 dark:bg-white/5',
      thermostatPresetButton: 'w-8 h-8 bg-black/5 dark:bg-white/5',
      thermostatPresetIcon: 'h-5 w-5',
      brightnessCircle: 'w-10 h-10',
      brightnessText: 'text-xs font-semibold',
    };

  // Переводы для пресетов термостата.
  const presetTranslations: { [key: string]: string } = {
    'none': 'Нет', 'away': 'Не дома', 'comfort': 'Комфорт', 'eco': 'Эко',
    'home': 'Дома', 'sleep': 'Сон', 'activity': 'Активность', 'boost': 'Усиленный',
  };
  const translatePreset = (preset: string | undefined): string => {
      if (!preset) return presetTranslations['none'];
      const lowerPreset = preset.toLowerCase();
      return presetTranslations[lowerPreset] || preset.charAt(0).toUpperCase() + preset.slice(1);
  };
  
  // Обработчик клика по индикатору-слоту
  const handleIndicatorClick = (e: React.MouseEvent, entityId: string) => {
    if (isPreview) return;
    e.stopPropagation(); // Предотвращаем клик по самой карточке
    onDeviceToggle(entityId);
  };
  
  const isCamera = device.type === DeviceType.Camera;
  const isTogglable = device.type !== DeviceType.Thermostat && device.type !== DeviceType.Climate && device.type !== DeviceType.Sensor && !isCamera && device.type !== DeviceType.EventTimer && device.type !== DeviceType.BatteryWidget;
  const deviceBindings = customizations[device.id]?.deviceBindings;
  
  const flashOnColor = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(200, 200, 200, 0.6)';
  const dimOffColor = isDark ? 'rgba(10, 10, 10, 0.4)' : 'rgba(255, 255, 255, 0.4)';

  const animationOverlay = (
    <AnimatePresence>
      {animationType === 'on' && (
        <motion.div
          key="flash-on"
          // FIX: framer-motion props are failing type validation, likely due to a type definition issue.
          // Wrapping them in an object spread bypasses the incorrect type check.
          {...{
            initial: { scale: 0, opacity: 0.6 },
            animate: { scale: 2.5, opacity: 0 },
            exit: { opacity: 0 },
            transition: { duration: 0.4, ease: 'easeOut' },
          }}
          className="absolute inset-0 rounded-2xl pointer-events-none z-10"
          style={{
            background: `radial-gradient(circle, ${flashOnColor} 0%, rgba(0,0,0,0) 70%)`
          }}
        />
      )}
      {animationType === 'off' && (
        <motion.div
          key="dim-off"
          // FIX: framer-motion props are failing type validation, likely due to a type definition issue.
          // Wrapping them in an object spread bypasses the incorrect type check.
          {...{
            initial: { opacity: 0 },
            animate: { opacity: 1, transition: { duration: 0.15 } },
            exit: { opacity: 0, transition: { duration: 0.25 } },
          }}
          className="absolute inset-0 rounded-2xl pointer-events-none z-10"
          style={{
            backgroundColor: dimOffColor,
          }}
        />
      )}
    </AnimatePresence>
  );

  // --- УНИВЕРСАЛЬНЫЙ РЕНДЕРЕР НА ОСНОВЕ ШАБЛОНА ---
  if (template) {
     /**
      * Хелпер для получения динамических стилей цвета для текстовых элементов.
      * Определяет, какой цвет из глобальной цветовой схемы использовать.
      */
     const getStyleProps = (baseKey: string) => {
        const onSuffix = isOn ? 'On' : '';
        const colorProp = `${baseKey}Color${onSuffix}`;
        const color = (colorScheme as any)[colorProp];
        return { style: { color } };
    };

    // Динамический фон карточки, зависящий от состояния, темы и пороговых правил.
    let dynamicBackgroundColor = isOn ? colorScheme.cardBackgroundOn : colorScheme.cardBackground;
    let dynamicValueColor: string | undefined = undefined;

    // Проверяем правила пороговых значений для сенсоров.
    const deviceCustomization = customizations[device.id];
    if (device.type === DeviceType.Sensor && deviceCustomization?.thresholds && deviceCustomization.thresholds.length > 0) {
        const numericValue = parseFloat(device.status);
        if (!isNaN(numericValue)) {
            const applicableAboveRule = deviceCustomization.thresholds
                .filter(r => r.comparison === 'above' && numericValue > r.value)
                .sort((a, b) => b.value - a.value)[0]; // Берем самое "высокое" правило

            const applicableBelowRule = deviceCustomization.thresholds
                .filter(r => r.comparison === 'below' && numericValue < r.value)
                .sort((a, b) => a.value - b.value)[0]; // Берем самое "низкое" правило

            const ruleToApply = applicableAboveRule || applicableBelowRule;

            if (ruleToApply) {
                if (ruleToApply.style.backgroundColor) {
                    dynamicBackgroundColor = ruleToApply.style.backgroundColor;
                }
                if (ruleToApply.style.valueColor) {
                    dynamicValueColor = ruleToApply.style.valueColor;
                }
            }
        }
    }

    /**
     * Рендерит один элемент шаблона в зависимости от его `id`.
     * @param element - Объект элемента для рендеринга.
     */
    const renderElement = (element: CardElement) => {
      if (!element.visible) return null;

      const style: React.CSSProperties = {
        position: 'absolute',
        left: `${element.position.x}%`,
        top: `${element.position.y}%`,
        width: `${element.size.width}%`,
        height: `${element.size.height}%`,
        zIndex: element.zIndex,
      };
      
      // Динамически повышаем z-index для открытых меню, чтобы они были поверх других элементов.
      if (element.id === 'hvac-modes' && openMenuDeviceId === device.id) {
        style.zIndex = 100;
      }


      // `switch` по `id` элемента для определения, что и как рендерить.
      switch(element.id) {
        case 'name': {
            const nameProps = getStyleProps('nameText');
            return (
                <div key={element.id} style={style}>
                    <AutoFitText text={device.name} className="w-full h-full" pClassName="font-medium leading-tight" pStyle={{...nameProps.style, fontFamily: element.styles.fontFamily}} maxFontSize={100} mode="multi-line" maxLines={2} fontSize={element.styles.fontSize} textAlign={element.styles.textAlign} />
                </div>
            );
        }
        case 'icon': {
          const iconColor = isOn
              ? (element.styles.onColor || 'rgb(59 130 246)') // синий по умолчанию
              : (element.styles.offColor || 'rgb(156 163 175)'); // серый по умолчанию
          return (
            <div
              key={element.id}
              style={{ ...style, color: iconColor }}
            >
              <DeviceIcon icon={device.icon ?? device.type} isOn={isOn} className="!w-full !h-full" iconAnimation={device.iconAnimation} />
            </div>
          );
        }
        case 'status': {
            const statusProps = getStyleProps('statusText');
            return (
                <div key={element.id} style={style}>
                    <AutoFitText text={device.status} className="w-full h-full" pClassName="text-sm" pStyle={{...statusProps.style, fontFamily: element.styles.fontFamily}} maxFontSize={100} mode="single-line" fontSize={element.styles.fontSize} textAlign={element.styles.textAlign} />
                </div>
            );
        }
        case 'value': {
          const { decimalPlaces } = element.styles;
          let valueText = device.status;

          if (device.type === DeviceType.Humidifier && device.targetHumidity !== undefined) {
              const dp = typeof decimalPlaces === 'number' && decimalPlaces >= 0 ? decimalPlaces : 0;
              valueText = `${device.targetHumidity.toFixed(dp)}`;
          } else {
            const numericStatus = parseFloat(device.status);
            // Форматируем число, если это возможно и задано количество знаков.
            if (!isNaN(numericStatus) && typeof decimalPlaces === 'number' && decimalPlaces >= 0) {
              valueText = numericStatus.toFixed(decimalPlaces);
            }
          }

           const valueProps = getStyleProps('valueText');
           // Применяем цвет из порогового правила, если он есть.
           if (dynamicValueColor) {
               valueProps.style.color = dynamicValueColor;
           }
          return (
            <div key={element.id} style={style} className="flex items-center">
              <AutoFitText text={valueText} className="w-full h-full" pClassName="font-semibold" maxFontSize={100} mode="single-line" fontSize={element.styles.fontSize} textAlign={element.styles.textAlign} pStyle={{...valueProps.style, fontFamily: element.styles.fontFamily}}/>
            </div>
          );
        }
        case 'unit': {
          const isNumericStatus = !isNaN(parseFloat(device.status));
          if (!device.unit || !isNumericStatus) return null;
          const unitProps = getStyleProps('unitText');
          return (
            <div key={element.id} style={style}>
              <AutoFitText text={device.unit} className="w-full h-full" pClassName="font-medium" pStyle={{...unitProps.style, fontFamily: element.styles.fontFamily}} maxFontSize={100} mode="single-line" fontSize={element.styles.fontSize} textAlign={element.styles.textAlign}/>
            </div>
          );
        }
        case 'chart':
          return (
            <div key={element.id} style={style}>
              <SparklineChart
                data={device.history || mockHistory}
                strokeColor={isOn ? colorScheme.activeTabTextColor : colorScheme.tabTextColor}
                styleType={element.styles.chartType || 'gradient'}
              />
            </div>
          );
        case 'slider': {
           if (!isOn || device.brightness === undefined) return null;
           return (
              <div key={element.id} style={style} onClick={(e) => { if (!isPreview) e.stopPropagation(); }}>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={device.brightness}
                  onInput={(e) => { if (!isPreview) onBrightnessChange(parseInt(e.currentTarget.value)); }}
                  disabled={isPreview}
                  className="w-full h-full bg-gray-300 dark:bg-gray-700/50 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
           );
        }
        case 'temperature': {
           const { decimalPlaces } = element.styles;
           const isHumidifier = device.type === DeviceType.Humidifier;
           const tempValue = isHumidifier ? device.currentHumidity : device.temperature;
           const unit = isHumidifier ? '%' : '°';
           let tempText = '';
           if (typeof tempValue === 'number') {
             tempText = (typeof decimalPlaces === 'number' && decimalPlaces >= 0)
               ? tempValue.toFixed(decimalPlaces)
               : tempValue.toFixed(0);
           }
           const tempProps = getStyleProps('valueText');
           return (
             <div key={element.id} style={style} className="pointer-events-none">
               <AutoFitText text={`${tempText}${unit}`} className="w-full h-full" pClassName="font-bold" pStyle={{...tempProps.style, fontFamily: element.styles.fontFamily}} maxFontSize={100} mode="single-line" fontSize={element.styles.fontSize} textAlign={element.styles.textAlign}/>
             </div>
           );
        }
        case 'target-temperature': {
          const isHumidifier = device.type === DeviceType.Humidifier;
          const dialGradient = isHumidifier ? ['#60A5FA', '#3B82F6', '#2563EB'] : undefined;
          return (
            <div key={element.id} style={style} onClick={e => { if (!isPreview) e.stopPropagation(); }}>
              <ThermostatDial
                min={isHumidifier ? (device.minTemp ?? 0) : (device.minTemp ?? 10)}
                max={isHumidifier ? (device.maxTemp ?? 100) : (device.maxTemp ?? 35)}
                value={isHumidifier ? (device.targetHumidity ?? 50) : (device.targetTemperature ?? 21)}
                current={isHumidifier ? (device.currentHumidity ?? 40) : (device.temperature ?? 21)}
                onChange={value => { if (!isPreview) onTemperatureChange(value); }}
                hvacAction={device.hvacAction ?? 'idle'}
                idleLabelColor={element.styles.idleLabelColor}
                heatingLabelColor={element.styles.heatingLabelColor}
                coolingLabelColor={element.styles.coolingLabelColor}
                colorScheme={colorScheme}
                gradientColors={dialGradient}
              />
            </div>
          );
        }
        case 'hvac-modes': {
            const isDropdownOpen = openMenuDeviceId === device.id;
            const isHumidifier = device.type === DeviceType.Humidifier;
            const isThermostatWithPresets = !isHumidifier && device.presetModes && device.presetModes.length > 0;

            const modes = isHumidifier
                ? (device.presetModes || [])
                : (isThermostatWithPresets ? device.presetModes! : (device.hvacModes || []));
            
            const activeMode = isHumidifier 
                ? device.presetMode 
                : (isThermostatWithPresets ? device.presetMode : device.state);

            if (modes.length === 0) return null;
        
            const hvacModeConfig: { [key: string]: { icon: string, label: string } } = {
                'off': { icon: 'mdi:power-off', label: 'Выкл' }, 'cool': { icon: 'mdi:snowflake', label: 'Холод' },
                'heat': { icon: 'mdi:fire', label: 'Нагрев' }, 'auto': { icon: 'mdi:autorenew', label: 'Авто' },
                'fan_only': { icon: 'mdi:fan', label: 'Вент.' }, 'dry': { icon: 'mdi:water-percent', label: 'Осуш.' },
                'heat_cool': { icon: 'mdi:thermostat-auto', label: 'Авто' }
            };
        
            const presetModeConfig: { [key: string]: { icon: string, label: string } } = {
                'none': { icon: 'mdi:cancel', label: translatePreset('none') }, 'away': { icon: 'mdi:airplane-takeoff', label: translatePreset('away') },
                'comfort': { icon: 'mdi:sofa-outline', label: translatePreset('comfort') }, 'eco': { icon: 'mdi:leaf', label: translatePreset('eco') },
                'home': { icon: 'mdi:home-variant-outline', label: translatePreset('home') }, 'sleep': { icon: 'mdi:power-sleep', label: translatePreset('sleep') },
                'activity': { icon: 'mdi:run', label: translatePreset('activity') }, 'boost': { icon: 'mdi:rocket-launch-outline', label: translatePreset('boost') },
            };
            
            const humidifierModeConfig: { [key: string]: { icon: string, label: string } } = {
                'auto': { icon: 'mdi:autorenew', label: 'Авто' },
                'sleep': { icon: 'mdi:power-sleep', label: 'Сон' },
                'turbo': { icon: 'mdi:rocket-launch-outline', label: 'Турбо' },
                'normal': { icon: 'mdi:water-outline', label: 'Обычный' },
                'eco': { icon: 'mdi:leaf', label: 'Эко' },
                'baby': { icon: 'mdi:baby-carriage', label: 'Детский' },
                'comfort': { icon: 'mdi:sofa-outline', label: 'Комфорт' },
                'constant humidity': { icon: 'mdi:water-percent', label: 'Пост. влажность'},
                'off': { icon: 'mdi:power-off', label: 'Выкл' },
            };
        
            const getConfig = (mode: string) => {
                const lowerMode = mode.toLowerCase();
                if (isHumidifier) {
                    return humidifierModeConfig[lowerMode] || { icon: 'mdi:circle-medium', label: mode };
                }
                if (isThermostatWithPresets) {
                    return presetModeConfig[lowerMode] || { icon: 'mdi:circle-medium', label: translatePreset(mode) };
                }
                return hvacModeConfig[lowerMode] || { icon: 'mdi:circle-medium', label: mode };
            };
        
            const handleModeClick = (mode: string) => {
                if (isPreview) return;
                if (isHumidifier || isThermostatWithPresets) {
                    onPresetChange(mode);
                } else {
                    onHvacModeChange(mode);
                }
                setOpenMenuDeviceId?.(null);
            };
            
            const activeConfig = getConfig(activeMode?.toLowerCase() || (isHumidifier ? 'auto' : (isThermostatWithPresets ? 'none' : 'off')));
        
            return (
                <div key={element.id} style={style} onClick={e => { if (!isPreview) e.stopPropagation(); }} ref={hvacModesRef}>
                    <div className="relative w-full h-full flex items-center justify-center">
                        <button onClick={(e) => handleHvacButtonClick(e, modes)} disabled={isPreview} className="w-full h-full flex flex-col items-center justify-center bg-black/5 dark:bg-black/25 hover:bg-black/10 dark:hover:bg-black/40 rounded-xl transition-all p-1 ring-1 ring-black/5 dark:ring-white/10" style={{ color: colorScheme.activeTabTextColor }}>
                            <Icon icon={activeConfig.icon} className="w-auto h-[55%]" />
                            <span className="text-[10px] font-bold mt-auto leading-tight text-center">{activeConfig.label}</span>
                        </button>
        
                        {isDropdownOpen && !isPreview && (
                            <div className={`absolute right-0 min-w-[150px] w-max bg-gray-200/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-xl shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-1 z-50 fade-in ${hvacDropdownPositionClass}`}>
                                {modes.map(mode => {
                                    const config = getConfig(mode);
                                    const isActiveMode = activeMode?.toLowerCase() === mode.toLowerCase();
                                    return (
                                        <button
                                            key={mode}
                                            onClick={() => handleModeClick(mode)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-lg transition-colors ${!isActiveMode ? 'hover:bg-black/10 dark:hover:bg-white/10' : ''}`}
                                            style={isActiveMode ? { backgroundColor: colorScheme.tabIndicatorColor, color: '#FFFFFF' } : { color: colorScheme.activeTabTextColor }}
                                        >
                                            <Icon icon={config.icon} className="w-5 h-5 flex-shrink-0" />
                                            <span>{config.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        case 'linked-entity': {
            const { linkedEntityId, showValue } = element.styles;
            if (!linkedEntityId) return null;
            
            const finalEntityId = linkedEntityId === 'self' ? device.id : linkedEntityId;
            const linkedDevice = allKnownDevices.get(finalEntityId);
            
            if (!linkedDevice) {
                return (
                    <div key={element.id} style={style} className="flex items-center justify-center" title={`Связанное устройство не найдено: ${finalEntityId}`}>
                        <Icon icon="mdi:alert-circle-outline" className="w-full h-full text-yellow-500/80" />
                    </div>
                );
            }
            
            const isLinkedOn = linkedDevice.state === 'on';
            const iconColor = isLinkedOn ? (element.styles.onColor || 'rgb(59 130 246)') : (element.styles.offColor || 'rgb(156 163 175)');

            let valueText: string | null = null;
            if (showValue) {
                valueText = linkedDevice.status;
            }
        
            return (
                <div key={element.id} style={style} onClick={!isPreview ? (e) => { e.stopPropagation(); onDeviceToggle(finalEntityId); } : undefined} className={`w-full h-full flex flex-col items-center justify-center bg-black/5 dark:bg-black/25 hover:bg-black/10 dark:hover:bg-black/40 rounded-xl transition-all p-1 ring-1 ring-black/5 dark:ring-white/10 ${!isPreview ? 'cursor-pointer' : ''}`}>
                    <div style={{ color: iconColor }} className="w-auto h-[55%]">
                        <DeviceIcon icon={linkedDevice.icon ?? linkedDevice.type} isOn={isLinkedOn} className="!w-full !h-full" iconAnimation={linkedDevice.iconAnimation} />
                    </div>
                    {!!valueText && (
                        <div className="text-[10px] font-bold mt-auto leading-tight text-center" style={{ color: colorScheme.nameTextColor }}>
                             {valueText}
                        </div>
                    )}
                </div>
            );
        }
        case 'battery': {
            if (device.batteryLevel === undefined) return null;
        
            const getBatteryIcon = (level: number) => {
                if (level <= 20) return 'mdi:battery-alert-variant-outline';
                if (level <= 30) return 'mdi:battery-30-outline';
                if (level <= 60) return 'mdi:battery-60-outline';
                if (level <= 90) return 'mdi:battery-90-outline';
                return 'mdi:battery-outline';
            };
    
            const batteryText = `${device.batteryLevel}%`;
            const valueProps = getStyleProps('valueText');
            const iconColor = device.batteryLevel <= 20 ? '#ef4444' : valueProps.style.color;
    
            return (
                <div key={element.id} style={style} className="flex items-center justify-center gap-1 p-1 overflow-hidden pointer-events-none">
                    <Icon icon={getBatteryIcon(device.batteryLevel)} className="w-auto h-[60%] flex-shrink-0" style={{ color: iconColor }}/>
                    <div className="flex-grow h-full min-w-0">
                        <AutoFitText
                            text={batteryText}
                            className="w-full h-full"
                            pClassName="font-semibold"
                            pStyle={{ color: iconColor, fontFamily: element.styles.fontFamily }}
                            fontSize={element.styles.fontSize}
                            maxFontSize={100} mode="single-line" textAlign={element.styles.textAlign || 'left'}
                        />
                    </div>
                </div>
            );
        }
        case 'fan-speed-control': {
            const { linkedFanEntityId } = element.styles;
            if (!linkedFanEntityId) return null;

            const fanDevice = allKnownDevices.get(linkedFanEntityId);
            if (!fanDevice) {
                return (
                    <div key={element.id} style={style} className="flex items-center justify-center" title={`Вентилятор не найден: ${linkedFanEntityId}`}>
                        <Icon icon="mdi:alert-circle-outline" className="w-full h-full text-yellow-500/80" />
                    </div>
                );
            }
            
            // Определяем, используем ли мы уровни (select) или проценты (fan)
            const isSelectBased = fanDevice.fanLevels && fanDevice.fanLevels.length > 0;

            const speeds = isSelectBased ? fanDevice.fanLevels : [25, 50, 75, 100];
            const currentSpeed = isSelectBased ? fanDevice.fanLevel : fanDevice.fanSpeed;

            return (
                <div key={element.id} style={style} onClick={e => { if (!isPreview) e.stopPropagation(); }} className="flex items-center justify-center p-1">
                    <div className="flex w-full h-full bg-black/10 dark:bg-black/25 rounded-xl ring-1 ring-black/5 dark:ring-white/10 p-1">
                        {speeds!.map(speed => {
                            const isActive = currentSpeed === speed;
                            // Для "Level4" попробуем извлечь "4" для отображения.
                            const buttonText = typeof speed === 'string' 
                                ? speed.match(/\d+/)?.[0] || speed 
                                : speed;

                            return (
                                <button 
                                    key={speed}
                                    disabled={isPreview}
                                    onClick={() => { if (!isPreview) onFanSpeedChange(linkedFanEntityId, speed); }}
                                    className={`flex-1 text-xs font-bold rounded-lg transition-all ${isActive ? 'shadow-md' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}
                                    style={isActive ? { backgroundColor: colorScheme.tabIndicatorColor, color: '#FFFFFF' } : { color: colorScheme.activeTabTextColor }}
                                >
                                    {buttonText}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }
        default:
          return null;
      }
    };
    
    let isCardTogglable = isTogglable;
    if (device.type === DeviceType.Custom) {
        isCardTogglable = template.interactionType === 'active' && !!template.mainActionEntityId;
    }

    const hoverClass = !isEditMode && !isPreview ? 'hover:shadow-xl hover:scale-[1.02]' : '';
    const cursorClass = isCardTogglable && !isEditMode && !isPreview ? 'cursor-pointer' : '';
    const overflowClass = openMenuDeviceId === device.id ? '' : 'overflow-hidden';

    return (
      <div
        className={`w-full h-full relative rounded-2xl transition-shadow duration-300 ease-in-out select-none ${hoverClass} ${cursorClass} shadow-lg ring-1 ring-black/5 dark:ring-white/10 ${overflowClass}`}
        style={{ backgroundColor: applyOpacity(dynamicBackgroundColor, colorScheme.cardOpacity), backdropFilter: 'blur(16px)' }}
        onContextMenu={onContextMenu}
      >
        {animationOverlay}
        
        {isPreview && <div className="absolute inset-0 bg-center" style={{ backgroundImage: `linear-gradient(rgba(100,116,139,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.2) 1px, transparent 1px)`, backgroundSize: `10px 10px` }} />}
        
        {/* Рендерим все элементы из шаблона */}
        {template.elements.map(renderElement)}

        {/* Рендерим индикаторы-слоты */}
        {template.deviceSlots && deviceBindings && deviceBindings.map(binding => {
            if (!binding.enabled) return null;
            const slot = template.deviceSlots?.find(s => s.id === binding.slotId);
            const entity = allKnownDevices.get(binding.entityId);
            if (!slot || !entity) return null;

            const isEntityOn = entity.state === 'on';
            const isEntityUnavailable = entity.state === 'unavailable';
            let iconToUse = isEntityUnavailable ? 'mdi:power-plug-off-outline' : (binding.icon || entity.icon || entity.type);

            const { visualStyle } = slot;
            const color = isEntityOn ? visualStyle.activeColor : visualStyle.inactiveColor;
            let animationClass = '';
            if (isEntityOn && visualStyle.type.includes('animation')) {
                if (visualStyle.animationType === 'pulse') animationClass = 'animate-pulse-scale';
                if (visualStyle.animationType === 'rotate') animationClass = 'animate-spin';
            }
            const iconStyle: React.CSSProperties = {
                color: isEntityUnavailable ? '#9CA3AF' : color,
                fontSize: `${slot.iconSize}px`,
                filter: (isEntityOn && visualStyle.type.includes('glow')) ? `drop-shadow(0 0 ${visualStyle.glowIntensity * 8}px ${color})` : 'none'
            };
            
            let valueText: string | null = null;
            if (visualStyle.showValue) {
                const numericStatus = parseFloat(entity.status);
                if (!isNaN(numericStatus)) {
                    valueText = (typeof visualStyle.decimalPlaces === 'number' && visualStyle.decimalPlaces >= 0)
                        ? numericStatus.toFixed(visualStyle.decimalPlaces)
                        : entity.status;
                }
            }

            return (
                <div key={binding.slotId} title={entity.name} className={`absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${slot.interactive && !isPreview ? 'cursor-pointer' : 'cursor-default'}`}
                    style={{ left: `${slot.position.x}%`, top: `${slot.position.y}%`, width: visualStyle.showValue && valueText ? 'auto' : `${slot.iconSize}px`, height: visualStyle.showValue && valueText ? 'auto' : `${slot.iconSize}px` }}
                    onClick={slot.interactive ? (e) => handleIndicatorClick(e, entity.id) : undefined}
                >
                  {visualStyle.showValue && valueText ? (
                    <div className="flex items-baseline text-black dark:text-white whitespace-nowrap" style={{ color }}>
                      <span className="font-semibold leading-none" style={{ fontSize: visualStyle.fontSize ? `${visualStyle.fontSize}px` : `${slot.iconSize * 0.8}px` }}>{valueText}</span>
                      {visualStyle.unit && <span className="font-medium text-gray-600 dark:text-gray-400 leading-none ml-1" style={{ fontSize: visualStyle.fontSize ? `${visualStyle.fontSize * 0.6}px` : `${slot.iconSize * 0.5}px` }}>{visualStyle.unit}</span>}
                    </div>
                  ) : (
                    <div className={animationClass} style={{ width: '100%', height: '100%' }}>
                        <DeviceIcon icon={iconToUse} isOn={isEntityOn} className="!w-full !h-full !m-0" />
                        <div style={iconStyle} className="absolute inset-0">
                            <DeviceIcon icon={iconToUse} isOn={isEntityOn} className="!w-full !h-full !m-0" />
                        </div>
                    </div>
                  )}
                </div>
            );
        })}
      </div>
    );
  }

  // --- РЕЗЕРВНАЯ (LEGACY) ЛОГИКА РЕНДЕРЕНГА, если шаблон не предоставлен ---
  const renderContent = () => {
    switch (device.type) {
      case DeviceType.Camera:
        if (!haUrl || !signPath || !getCameraStreamUrl) {
            return <div>Ошибка: Требуется haUrl, signPath и getCameraStreamUrl для камеры.</div>
        }
        return (
            <div className="w-full h-full bg-black group relative">
                <CameraStreamContent entityId={device.id} haUrl={haUrl} signPath={signPath} getCameraStreamUrl={getCameraStreamUrl} altText={device.name} />
                {!isEditMode && !isPreview && (
                  <button onClick={(e) => { e.stopPropagation(); onCameraCardClick(device); }} className="absolute top-2 right-2 z-10 p-1.5 bg-black/40 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity" title="Открыть в отдельном окне">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5zM5 5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V11a1 1 0 10-2 0v6H5V7h6a1 1 0 000-2H5z" /></svg>
                  </button>
                )}
            </div>
        )
      case DeviceType.BatteryWidget:
        return <BatteryWidgetCard colorScheme={colorScheme} />;
      case DeviceType.EventTimer:
        return <EventTimerWidgetCard device={device} colorScheme={colorScheme} onContextMenu={onContextMenu} />;
      case DeviceType.DimmableLight:
        return (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-start flex-shrink-0">
              <div className={isOn ? 'text-blue-500' : 'opacity-70'}><DeviceIcon icon={device.icon ?? device.type} isOn={isOn} iconAnimation={device.iconAnimation} /></div>
              {isOn && device.brightness !== undefined && (<div className={`${styles.brightnessCircle} rounded-full border-2 border-current opacity-30 flex items-center justify-center`}><span className={styles.brightnessText}>{device.brightness}%</span></div>)}
            </div>
            <div className="flex-grow text-left overflow-hidden flex flex-col justify-end min-h-0">
                <div className="flex-grow flex items-end min-h-0">
                    <AutoFitText text={device.name} className="w-full h-full" pClassName={styles.nameText} pStyle={{ color: isOn ? colorScheme.nameTextColorOn : colorScheme.nameTextColor }} maxFontSize={18} mode="multi-line" />
                </div>
              <p className={`${styles.statusText} transition-colors flex-shrink-0`} style={{ color: isOn ? colorScheme.statusTextColorOn : colorScheme.statusTextColor }}>{device.status}</p>
               {isOn && (<div className="mt-2 flex-shrink-0" onClick={(e) => { if (!isPreview) e.stopPropagation(); }}><input type="range" min="1" max="100" value={device.brightness} onInput={(e) => { if (!isPreview) onBrightnessChange(parseInt(e.currentTarget.value)); }} disabled={isPreview} className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"/></div>)}
            </div>
          </div>
        );
      case DeviceType.Thermostat:
        return (
          <div className="flex flex-col h-full text-left">
            <div className="flex justify-between items-start flex-shrink-0">
                <div className="opacity-70"><DeviceIcon icon={device.icon ?? device.type} isOn={false} iconAnimation={device.iconAnimation} /></div>
                {device.presetModes && device.presetModes.length > 0 && (
                    <div className="relative z-10" ref={presetMenuRef}>
                        <button onClick={(e) => { if (!isPreview) { e.stopPropagation(); setIsPresetMenuOpen(prev => !prev); } }} disabled={isPreview} className={`${styles.thermostatPresetButton} rounded-full hover:bg-black/10 dark:hover:bg-white/10`} aria-label="Открыть предустановки">
                           <svg xmlns="http://www.w3.org/2000/svg" className={styles.thermostatPresetIcon} viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                        </button>
                        {isPresetMenuOpen && !isPreview && (
                            <div className="absolute top-full right-0 mt-1 w-40 bg-gray-100 dark:bg-gray-700 rounded-md shadow-lg z-20 ring-1 ring-black/5 dark:ring-black dark:ring-opacity-5 p-1 max-h-48 overflow-y-auto fade-in">
                                {device.presetModes.map(preset => (<button key={preset} onClick={() => { onPresetChange(preset); setIsPresetMenuOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md">{translatePreset(preset)}</button>))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="flex-grow flex flex-col justify-end overflow-hidden min-h-0">
                 <div className="flex-grow flex items-end min-h-0">
                    <AutoFitText text={device.name} className="w-full h-full" pClassName={styles.nameText} pStyle={{ color: isOn ? colorScheme.nameTextColorOn : colorScheme.nameTextColor }} maxFontSize={18} mode="multi-line" />
                </div>
                <p className={`${styles.thermostatTempText}`} style={{ color: colorScheme.valueTextColor }}>{device.temperature}{device.unit}</p>
                <div className="flex items-center justify-between mt-1 flex-shrink-0">
                    <button onClick={(e) => { if (!isPreview) { e.stopPropagation(); onTemperatureChange(-0.5, true); } }} disabled={isPreview} className={`${styles.thermostatButton} rounded-full flex items-center justify-center font-light text-2xl leading-none pb-1`}>-</button>
                    <span className={`${styles.thermostatTargetText}`} style={{ color: colorScheme.statusTextColor }}>Цель: {device.targetTemperature?.toFixed(1)}{device.unit}</span>
                    <button onClick={(e) => { if (!isPreview) { e.stopPropagation(); onTemperatureChange(0.5, true); } }} disabled={isPreview} className={`${styles.thermostatButton} rounded-full flex items-center justify-center font-light text-2xl leading-none pb-1`}>+</button>
                </div>
            </div>
          </div>
        );
      case DeviceType.Sensor: {
        const isNumericStatus = !isNaN(parseFloat(device.status));
        return (
          <div className="flex flex-col h-full text-left">
            <div className={`flex-shrink-0 opacity-70`}><DeviceIcon icon={device.icon ?? device.type} isOn={false} iconAnimation={device.iconAnimation} /></div>
            <div className="flex-grow flex flex-col justify-end overflow-hidden min-h-0">
               <div className="flex-grow flex items-end min-h-0">
                <AutoFitText text={device.name} className="w-full h-full" pClassName={styles.nameText} pStyle={{ color: isOn ? colorScheme.nameTextColorOn : colorScheme.nameTextColor }} maxFontSize={18} mode="multi-line" />
              </div>
              <div className="flex items-baseline">
                <p className={`${styles.sensorStatusText}`} style={{ color: colorScheme.valueTextColor }}>{device.status}</p>
                {isNumericStatus && device.unit && <p className={`ml-1 ${styles.sensorUnitText}`} style={{ color: colorScheme.unitTextColor }}>{device.unit}</p>}
              </div>
            </div>
          </div>
        );
      }
      default:
        return (
          <div className="flex flex-col h-full">
            <div className={`flex-shrink-0 ${isOn ? 'text-blue-500' : 'opacity-70'}`}><DeviceIcon icon={device.icon ?? device.type} isOn={isOn} iconAnimation={device.iconAnimation} /></div>
            <div className="flex-grow text-left overflow-hidden flex flex-col justify-end min-h-0">
              <div className="flex-grow flex items-end min-h-0">
                <AutoFitText text={device.name} className="w-full h-full" pClassName={styles.nameText} pStyle={{ color: isOn ? colorScheme.nameTextColorOn : colorScheme.nameTextColor }} maxFontSize={18} mode="multi-line" />
              </div>
              <p className={`${styles.statusText} transition-colors flex-shrink-0`} style={{ color: isOn ? colorScheme.statusTextColorOn : colorScheme.statusTextColor }}>{device.status}</p>
            </div>
          </div>
        );
    }
  };

  const getCardClasses = () => {
    const isMenuOpen = device.type === DeviceType.Thermostat && isPresetMenuOpen;
    const overflowClass = isMenuOpen ? '' : 'overflow-hidden';
    const baseClasses = `w-full h-full rounded-2xl flex flex-col transition-shadow duration-300 ease-in-out select-none relative shadow-lg ring-1 ring-black/5 dark:ring-white/10 ${overflowClass}`;
    const layoutClasses = (isCamera || device.type === DeviceType.BatteryWidget || device.type === DeviceType.EventTimer) ? 'p-0' : styles.padding;
    const cursorClass = (isTogglable) && !isEditMode && !isPreview ? 'cursor-pointer' : '';
    const hoverClass = !isEditMode && !isPreview ? 'hover:shadow-xl hover:scale-[1.02]' : '';
    return `${baseClasses} ${layoutClasses} ${cursorClass} ${hoverClass}`;
  }

  const getCardStyle = (): React.CSSProperties => {
      return { 
          backgroundColor: applyOpacity(isOn ? colorScheme.cardBackgroundOn : colorScheme.cardBackground, colorScheme.cardOpacity),
          backdropFilter: 'blur(16px)',
      };
  }

  return (
    <div className={getCardClasses()} style={getCardStyle()} onContextMenu={onContextMenu}>
       {animationOverlay}
       {renderContent()}
    </div>
  );
};

export default React.memo(DeviceCard);