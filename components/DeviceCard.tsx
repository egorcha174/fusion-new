import React, { useState, useEffect, useMemo } from 'react';
import { Device, DeviceType, CardTemplate, DeviceCustomizations, ColorScheme, CardElement } from '../types';
import DeviceIcon, { getIconNameForDeviceType } from './DeviceIcon';
import { Icon } from '@iconify/react';
import SparklineChart from './SparklineChart';
import ThermostatDial from './ThermostatDial';
import EventTimerWidgetCard from './EventTimerWidgetCard';
import BatteryWidgetCard from './BatteryWidgetCard';

interface DeviceCardProps {
  device: Device;
  template?: CardTemplate;
  allKnownDevices: Map<string, Device>;
  customizations: DeviceCustomizations;
  cardWidth?: number;
  cardHeight?: number;
  isEditMode: boolean;
  isPreview?: boolean;
  onDeviceToggle: (deviceId: string) => void;
  onTemperatureChange: (deviceId: string, temperature: number, isDelta?: boolean) => void;
  onBrightnessChange: (deviceId: string, brightness: number) => void;
  onHvacModeChange: (deviceId: string, mode: string) => void;
  onPresetChange: (deviceId: string, preset: string) => void;
  onFanSpeedChange: (deviceId: string, value: number | string) => void;
  onEditDevice: (device: Device) => void;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  openMenuDeviceId?: string | null;
  setOpenMenuDeviceId?: (id: string | null) => void;
  colorScheme: ColorScheme['light'];
  isDark: boolean;
  autoPlay?: boolean; // Added prop for grid control
  // FIX: Added gridCellSize to props to resolve TypeScript error in DashboardGrid.
  gridCellSize?: number;
}

const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  template,
  allKnownDevices,
  customizations,
  cardWidth = 1,
  cardHeight = 1,
  isEditMode,
  isPreview = false,
  onDeviceToggle,
  onBrightnessChange,
  onTemperatureChange,
  onHvacModeChange,
  onPresetChange,
  onFanSpeedChange,
  onEditDevice,
  haUrl,
  signPath,
  colorScheme,
  autoPlay = true
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Reset loading state when device state changes
  useEffect(() => {
    setIsLoading(false);
  }, [device.state, device.status]);

  // Safety timeout for loading state
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isLoading) {
      timeout = setTimeout(() => setIsLoading(false), 2000);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const handleMainToggle = (e: React.MouseEvent) => {
    if (isEditMode || isPreview) return;
    
    e.stopPropagation();
    
    // Sensors and some other types are not toggleable via main click
    if ([DeviceType.Sensor, DeviceType.Weather].includes(device.type)) return;
    
    setIsLoading(true);
    onDeviceToggle(device.id);
  };

  const getIsOn = () => {
      if (device.type === DeviceType.Climate) return device.hvacAction !== 'off' && device.hvacAction !== 'idle';
      return device.state === 'on' || device.state === 'active' || device.state === 'home' || device.state === 'open' || device.state === 'playing';
  };
  const isOn = getIsOn();

  const getCardStyle = (): React.CSSProperties => {
      const baseStyle: React.CSSProperties = {
          borderRadius: `var(--radius-card)`,
          borderWidth: `var(--border-width-card)`,
          borderStyle: 'solid',
          borderColor: isOn ? 'var(--border-color-card-on)' : 'var(--border-color-card)',
          transition: 'background-color 0.3s ease, border-color 0.3s ease',
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
      };

      if (device.type === DeviceType.MediaPlayer && (device.state === 'playing' || device.state === 'paused') && device.entityPictureUrl) {
          return {
              ...baseStyle,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundImage: `url(${device.entityPictureUrl})`,
          };
      }
      
      return { 
          ...baseStyle,
          backgroundColor: isOn ? 'var(--bg-card-on)' : 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
      };
  }

  // --- Special Widget Handling ---
  if (device.type === DeviceType.EventTimer) {
      return <EventTimerWidgetCard device={device} colorScheme={colorScheme} />;
  }

  if (device.type === DeviceType.BatteryWidget) {
      return (
          <div style={getCardStyle()} className="w-full h-full select-none">
              <BatteryWidgetCard colorScheme={colorScheme} />
          </div>
      );
  }

  const renderElement = (element: CardElement) => {
    if (!element.visible) return null;

    let finalSize = { ...element.size };
    // FIX: Use cardWidth and cardHeight to calculate element size when sizeMode is 'cell'.
    if (element.sizeMode === 'cell' && cardWidth > 0 && cardHeight > 0) {
        finalSize.width = element.size.width / cardWidth;
        finalSize.height = element.size.height / cardHeight;
    }

    const commonStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${element.position.x}%`,
      top: `${element.position.y}%`,
      width: `${finalSize.width}%`,
      height: `${finalSize.height}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: element.zIndex + 10, // Ensure elements are above background
    };
    
    // For elements that must be square, enforce aspect ratio.
    // This will use the width and automatically adjust the height, preventing distortion.
    if (element.id === 'icon' || element.id === 'target-temperature') {
        (commonStyle as any).aspectRatio = '1';
        commonStyle.height = 'auto';
    }


    const isFlex = ['name', 'status', 'value', 'unit', 'temperature', 'target-temperature-text', 'current-temperature-prefixed'].includes(element.id);
    const customStyles = { ...element.styles };
    
    // FIX: Apply flexbox classes for alignment based on textAlign style.
    let flexClasses = "flex items-center"; // Default vertical alignment
    if (isFlex) {
        switch (customStyles.textAlign) {
            case 'center': flexClasses += ' justify-center'; break;
            case 'right': flexClasses += ' justify-end'; break;
            default: flexClasses += ' justify-start'; break;
        }
    }
    
    Object.assign(commonStyle, customStyles);
    delete commonStyle.textAlign;

    switch (element.id) {
      case 'name':
        return (
          <div key={element.uniqueId} style={commonStyle} className={`truncate pointer-events-none ${flexClasses}`}>
            <span style={{ color: isOn ? (colorScheme.nameTextColorOn || 'var(--text-name-on)') : (colorScheme.nameTextColor || 'var(--text-name)') }}>
                {device.name}
            </span>
          </div>
        );
      case 'status':
        return (
          <div key={element.uniqueId} style={commonStyle} className={`truncate pointer-events-none ${flexClasses}`}>
             <span style={{ color: isOn ? (colorScheme.statusTextColorOn || 'var(--text-status-on)') : (colorScheme.statusTextColor || 'var(--text-status)') }}>
                {device.status}
            </span>
          </div>
        );
      case 'icon': {
        const elementIcon = device.icon || getIconNameForDeviceType(device.type, isOn);
        
        const iconBg = isOn 
            ? (element.styles.iconBackgroundColorOn ?? colorScheme.iconBackgroundColorOn) 
            : (element.styles.iconBackgroundColorOff ?? colorScheme.iconBackgroundColorOff);
            
        const iconShape = colorScheme.iconBackgroundShape || 'circle';
        const borderRadius = iconBg ? (iconShape === 'circle' ? '50%' : `calc(var(--radius-card) * 0.5)`) : '0';

        const iconColor = isOn ? element.styles.onColor : element.styles.offColor;
        
        return (
          <div key={element.uniqueId} style={{...commonStyle, pointerEvents: 'none'}} className="flex items-center justify-center">
             <div 
                style={{
                    backgroundColor: iconBg || 'transparent',
                    borderRadius: borderRadius,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.3s ease, border-radius 0.3s ease'
                }}
             >
                {isLoading ? (
                    <Icon 
                        icon="mdi:loading" 
                        className="animate-spin" 
                        style={{ 
                            color: iconColor || (isOn ? 'var(--text-name-on)' : 'var(--text-name)'),
                            width: '60%', 
                            height: '60%' 
                        }} 
                    />
                ) : (
                    <div style={{ width: iconBg ? '60%' : '100%', height: iconBg ? '60%' : '100%', color: iconColor }}>
                        <DeviceIcon
                            icon={elementIcon}
                            isOn={isOn}
                            className="!w-full !h-full !m-0"
                            iconAnimation={device.iconAnimation}
                        />
                    </div>
                )}
             </div>
          </div>
        );
      }
      case 'value': {
        let valueToDisplay = device.state;
        const numValue = parseFloat(device.state);
        if (typeof element.styles.decimalPlaces === 'number' && !isNaN(numValue)) {
            valueToDisplay = numValue.toFixed(element.styles.decimalPlaces);
        }
        return (
          <div key={element.uniqueId} style={commonStyle} className={`truncate pointer-events-none w-full ${flexClasses}`}>
             <span style={{ color: isOn ? (colorScheme.valueTextColorOn || 'var(--text-value-on)') : (colorScheme.valueTextColor || 'var(--text-value)') }}>
                {valueToDisplay}
             </span>
          </div>
        );
      }
      case 'unit':
        return (
          <div key={element.uniqueId} style={commonStyle} className={`truncate pointer-events-none w-full ${flexClasses}`}>
             <span style={{ color: isOn ? (colorScheme.unitTextColorOn || 'var(--text-unit-on)') : (colorScheme.unitTextColor || 'var(--text-unit)') }}>
                {device.unit}
             </span>
          </div>
        );
      case 'slider':
        if (device.type !== DeviceType.Light && device.type !== DeviceType.DimmableLight) return null;
        return (
            <div key={element.uniqueId} style={commonStyle} onClick={e => e.stopPropagation()}>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={device.brightness || 0}
                    onChange={(e) => onBrightnessChange(device.id, parseInt(e.target.value))}
                    className="w-full h-full accent-blue-500 cursor-pointer"
                />
            </div>
        );
      case 'chart':
        return (
            <div key={element.uniqueId} style={commonStyle} className="pointer-events-none">
                <SparklineChart 
                    data={device.history || []} 
                    width={100} 
                    height={30} 
                    strokeColor={isOn ? (colorScheme.valueTextColorOn || 'var(--text-value-on)') : (colorScheme.valueTextColor || 'var(--text-value)')}
                    styleType={element.styles.chartType}
                />
            </div>
        );
       case 'temperature': {
            if (typeof device.temperature !== 'number') return null;

            let valueToDisplay: string | number = device.temperature;
            if (typeof element.styles.decimalPlaces === 'number') {
                valueToDisplay = device.temperature.toFixed(element.styles.decimalPlaces);
            }

            return (
                <div key={element.uniqueId} style={commonStyle} className={`truncate pointer-events-none w-full ${flexClasses}`}>
                    <span style={{ color: isOn ? (colorScheme.valueTextColorOn || 'var(--text-value-on)') : (colorScheme.valueTextColor || 'var(--text-value)') }}>
                        {valueToDisplay}
                    </span>
                </div>
            );
        }
      case 'target-temperature':
         if (device.type !== DeviceType.Thermostat) return null;
         return (
             <div key={element.uniqueId} style={commonStyle} onClick={e => e.stopPropagation()}>
                 <ThermostatDial
                    min={device.minTemp || 7}
                    max={device.maxTemp || 35}
                    value={device.targetTemperature || 20}
                    current={device.temperature || 0}
                    onChange={(val) => onTemperatureChange(device.id, val)}
                    hvacAction={device.hvacAction || 'off'}
                    colorScheme={colorScheme}
                    idleLabelColor={element.styles.idleLabelColor}
                    heatingLabelColor={element.styles.heatingLabelColor}
                    coolingLabelColor={element.styles.coolingLabelColor}
                 />
             </div>
         );
        case 'target-temperature-text': {
            if (device.type !== DeviceType.Thermostat || typeof device.targetTemperature !== 'number') return null;
            let valueToDisplay = device.targetTemperature.toFixed(element.styles.decimalPlaces ?? 1);
            return (
              <div key={element.uniqueId} style={commonStyle} className={`truncate pointer-events-none w-full ${flexClasses}`}>
                 <span style={{ color: isOn ? (colorScheme.valueTextColorOn || 'var(--text-value-on)') : (colorScheme.valueTextColor || 'var(--text-value)') }}>
                    {valueToDisplay}°
                 </span>
              </div>
            );
        }
        case 'current-temperature-prefixed': {
            if (device.type !== DeviceType.Thermostat || typeof device.temperature !== 'number') return null;
            let valueToDisplay = device.temperature.toFixed(element.styles.decimalPlaces ?? 1);
            return (
              <div key={element.uniqueId} style={commonStyle} className={`truncate pointer-events-none w-full ${flexClasses}`}>
                 <span style={{ color: isOn ? (colorScheme.statusTextColorOn || 'var(--text-status-on)') : (colorScheme.statusTextColor || 'var(--text-status)') }}>
                    Current: {valueToDisplay}°
                 </span>
              </div>
            );
        }
        case 'temperature-slider': {
            if (device.type !== DeviceType.Thermostat) return null;
            
            const min = device.minTemp || 7;
            const max = device.maxTemp || 35;
            const value = device.targetTemperature || min;
            const percentage = max === min ? 0 : ((value - min) / (max - min)) * 100;
    
            return (
                <div key={element.uniqueId} style={commonStyle} className="thermostat-slider-container" onClick={e => e.stopPropagation()}>
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={0.5}
                        value={value}
                        onChange={(e) => onTemperatureChange(device.id, parseFloat(e.target.value))}
                        className="thermostat-slider"
                        style={{ '--track-percentage': `${percentage}%` } as React.CSSProperties}
                    />
                </div>
            );
        }
        case 'hvac-modes': {
            if (device.type !== DeviceType.Thermostat || !device.hvacModes) return null;
            const modesToShow = device.hvacModes.filter(m => ['heat', 'cool', 'auto', 'heat_cool', 'off'].includes(m));
    
            const modeLabels: Record<string, string> = {
                'heat': 'Heat',
                'cool': 'Cool',
                'auto': 'Auto',
                'heat_cool': 'Auto',
                'off': 'Off'
            };
    
            return (
                <div key={element.uniqueId} style={commonStyle} className="flex items-center justify-around gap-2" onClick={e => e.stopPropagation()}>
                    {modesToShow.map(mode => (
                        <button 
                            key={mode}
                            onClick={() => onHvacModeChange(device.id, mode)}
                            className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all flex-1
                                ${device.state === mode 
                                    ? 'bg-white/90 text-slate-800 shadow-sm'
                                    : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
                        >
                            {modeLabels[mode] || mode}
                        </button>
                    ))}
                </div>
            );
        }
      default:
        return null;
    }
  };

  return (
    <div 
        className="select-none"
        style={getCardStyle()} 
        onClick={handleMainToggle}
    >
       {/* Layer 1+: Template Elements */}
       {template?.elements.sort((a, b) => a.zIndex - b.zIndex).map(renderElement)}
    </div>
  );
};

export default React.memo(DeviceCard);