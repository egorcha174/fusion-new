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
  gridCellSize?: number;
}

const DeviceCardComponent: React.FC<DeviceCardProps> = ({
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
      return device.state === 'on' || device.state === 'active' || device.state === 'home' || device.state === 'open' || device.state === 'playing' || device.state === 'streaming' || device.state === 'recording';
  };
  const isOn = getIsOn();

  const getCardStyle = (): React.CSSProperties => {
      if (device.type === DeviceType.MediaPlayer && (device.state === 'playing' || device.state === 'paused') && device.entityPictureUrl) {
          return {
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundImage: `url(${device.entityPictureUrl})`,
              borderRadius: `${colorScheme.cardBorderRadius}px`,
          };
      }
      
      return { 
          backgroundColor: isOn ? colorScheme.cardBackgroundOn : colorScheme.cardBackground,
          backdropFilter: 'blur(16px)',
          borderRadius: `${colorScheme.cardBorderRadius}px`,
          overflow: 'hidden',
          position: 'relative',
          transition: 'background-color 0.3s ease',
          width: '100%',
          height: '100%',
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

    const commonStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${element.position.x}%`,
      top: `${element.position.y}%`,
      width: `${element.size.width}%`,
      height: `${element.size.height}%`,
      zIndex: element.zIndex + 10, // Ensure elements are above background
      ...element.styles,
    };

    // Handle text alignment and font styles from element.styles
    if (element.styles.textAlign) commonStyle.textAlign = element.styles.textAlign;
    if (element.styles.fontSize) commonStyle.fontSize = `${element.styles.fontSize}px`;
    if (element.styles.fontFamily) commonStyle.fontFamily = element.styles.fontFamily;

    switch (element.id) {
      case 'name':
        return (
          <div key={element.uniqueId} style={commonStyle} className="truncate pointer-events-none" title={device.name}>
            <span style={{ color: isOn ? (colorScheme.nameTextColorOn || 'var(--text-name-on)') : (colorScheme.nameTextColor || 'var(--text-name)') }}>
                {device.name}
            </span>
          </div>
        );
      case 'status':
        return (
          <div key={element.uniqueId} style={commonStyle} className="truncate pointer-events-none">
             <span style={{ color: isOn ? (colorScheme.statusTextColorOn || 'var(--text-status-on)') : (colorScheme.statusTextColor || 'var(--text-status)') }}>
                {device.status}
            </span>
          </div>
        );
      case 'icon':
        const elementIcon = device.icon || getIconNameForDeviceType(device.type, isOn);
        const iconBg = isOn ? element.styles.iconBackgroundColorOn : element.styles.iconBackgroundColorOff;
        const iconColor = isOn ? element.styles.onColor : element.styles.offColor;
        
        return (
          <div key={element.uniqueId} style={{...commonStyle, pointerEvents: 'none'}} className="flex items-center justify-center">
             <div 
                style={{
                    backgroundColor: iconBg || 'transparent',
                    borderRadius: iconBg ? '50%' : '0',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.3s ease'
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
      case 'value':
        return (
          <div key={element.uniqueId} style={commonStyle} className="truncate pointer-events-none flex items-center">
             <span style={{ color: isOn ? (colorScheme.valueTextColorOn || 'var(--text-value-on)') : (colorScheme.valueTextColor || 'var(--text-value)') }}>
                {device.state}
             </span>
          </div>
        );
      case 'unit':
        return (
          <div key={element.uniqueId} style={commonStyle} className="truncate pointer-events-none flex items-end">
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
      case 'hvac-modes':
        if (device.type !== DeviceType.Thermostat) return null;
        return (
            <div key={element.uniqueId} style={commonStyle} className="flex flex-col gap-1 justify-center pointer-events-auto" onClick={e => e.stopPropagation()}>
                {device.hvacModes?.map((mode) => (
                    <button
                        key={mode}
                        onClick={() => onHvacModeChange(device.id, mode)}
                        className={`w-full aspect-square rounded-full flex items-center justify-center text-xs transition-colors ${device.hvacAction === mode || (device.state === mode && device.hvacAction !== 'off') ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                        title={mode}
                    >
                        <Icon icon={mode === 'heat' ? 'mdi:fire' : mode === 'cool' ? 'mdi:snowflake' : mode === 'auto' ? 'mdi:cached' : 'mdi:power'} className="w-2/3 h-2/3" />
                    </button>
                ))}
            </div>
        );
      case 'linked-entity':
        return (
            <div key={element.uniqueId} style={commonStyle} className="flex items-center justify-center pointer-events-none">
                {element.styles.linkedEntityId && (
                    <div className="text-xs bg-black/50 text-white px-1 rounded">
                       {element.styles.showValue ? allKnownDevices.get(element.styles.linkedEntityId)?.state : ''}
                    </div>
                )}
            </div>
        );
      case 'battery':
        if (device.batteryLevel === undefined) return null;
        return (
            <div key={element.uniqueId} style={commonStyle} className={`flex items-center gap-1 ${flexClasses}`}>
                <Icon 
                    icon={device.batteryLevel > 20 ? "mdi:battery" : "mdi:battery-alert"} 
                    className={device.batteryLevel > 20 ? "text-green-500" : "text-red-500"}
                />
                <span className="text-xs">{device.batteryLevel}%</span>
            </div>
        );
      case 'fan-speed-control':
        if (device.type !== DeviceType.Humidifier && device.type !== DeviceType.Custom) return null;
        return (
            <div key={element.uniqueId} style={commonStyle} onClick={e => e.stopPropagation()} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800/50 rounded-full p-1">
                <button onClick={() => onFanSpeedChange(device.id, 'low')} className={`p-1 rounded-full ${device.fanLevel === 'low' ? 'bg-white shadow-sm dark:bg-gray-600' : ''}`}><Icon icon="mdi:fan-speed-1" className="w-4 h-4" /></button>
                <button onClick={() => onFanSpeedChange(device.id, 'medium')} className={`p-1 rounded-full ${device.fanLevel === 'medium' ? 'bg-white shadow-sm dark:bg-gray-600' : ''}`}><Icon icon="mdi:fan-speed-2" className="w-4 h-4" /></button>
                <button onClick={() => onFanSpeedChange(device.id, 'high')} className={`p-1 rounded-full ${device.fanLevel === 'high' ? 'bg-white shadow-sm dark:bg-gray-600' : ''}`}><Icon icon="mdi:fan-speed-3" className="w-4 h-4" /></button>
            </div>
        );
        
      // NEW ELEMENT RENDERERS
      case 'target-temperature-text':
        if (device.type !== DeviceType.Thermostat || device.targetTemperature === undefined) return null;
        let targetTextValue: string | number = device.targetTemperature;
        if (typeof element.styles.decimalPlaces === 'number') {
            targetTextValue = device.targetTemperature.toFixed(element.styles.decimalPlaces);
        }
        return (
            <div key={element.uniqueId} style={commonStyle} className={`truncate pointer-events-none w-full ${flexClasses}`}>
                <span style={{ color: isOn ? (colorScheme.valueTextColorOn || 'var(--text-value-on)') : (colorScheme.valueTextColor || 'var(--text-value)') }}>
                    {targetTextValue}
                </span>
            </div>
        );

      case 'current-temperature-prefixed':
        if (device.temperature === undefined) return null;
        let currTempValue: string | number = device.temperature;
        if (typeof element.styles.decimalPlaces === 'number') {
            currTempValue = device.temperature.toFixed(element.styles.decimalPlaces);
        }
        return (
            <div key={element.uniqueId} style={commonStyle} className={`truncate pointer-events-none w-full ${flexClasses}`}>
                <span className="opacity-70 mr-1" style={{ fontSize: '0.8em' }}>Текущая:</span>
                <span style={{ color: isOn ? (colorScheme.valueTextColorOn || 'var(--text-value-on)') : (colorScheme.valueTextColor || 'var(--text-value)') }}>
                    {currTempValue}
                </span>
            </div>
        );

      case 'temperature-slider':
        if (device.type !== DeviceType.Thermostat || device.targetTemperature === undefined) return null;
        return (
            <div key={element.uniqueId} style={commonStyle} onClick={e => e.stopPropagation()}>
                <input
                    type="range"
                    min={device.minTemp || 7}
                    max={device.maxTemp || 35}
                    step={0.5}
                    value={device.targetTemperature}
                    onChange={(e) => onTemperatureChange(device.id, parseFloat(e.target.value))}
                    className="w-full h-full accent-orange-500 cursor-pointer"
                />
            </div>
        );

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

export const DeviceCard = React.memo(DeviceCardComponent);