import React, { useState } from 'react';
import { useHAStore } from '../store/haStore';
import { useAppStore } from '../store/appStore';
import { Icon } from '@iconify/react';
import { ColorThemeSet } from '../types';

interface BatteryWidgetCardProps {
    colorScheme: ColorThemeSet;
}

const BatteryWidgetCard: React.FC<BatteryWidgetCardProps> = ({ colorScheme }) => {
    const { batteryDevices } = useHAStore();
    const { lowBatteryThreshold } = useAppStore();
    const [isExpanded, setIsExpanded] = useState(false);

    if (batteryDevices.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <Icon icon="mdi:battery-off-outline" className="w-10 h-10 mb-2" style={{ color: colorScheme.statusTextColor }} />
                <p className="font-semibold" style={{ color: colorScheme.valueTextColor }}>Нет устройств с батареей</p>
                <p className="text-sm" style={{ color: colorScheme.statusTextColor }}>Не найдено устройств с уровнем заряда.</p>
            </div>
        );
    }

    const devicesToShow = isExpanded ? batteryDevices : batteryDevices.slice(0, 4);

    const getBatteryIcon = (level: number) => {
        if (level <= lowBatteryThreshold) return 'mdi:battery-alert-variant-outline';
        if (level <= 10) return 'mdi:battery-10';
        if (level <= 20) return 'mdi:battery-20';
        if (level <= 30) return 'mdi:battery-30';
        if (level <= 40) return 'mdi:battery-40';
        if (level <= 50) return 'mdi:battery-50';
        if (level <= 60) return 'mdi:battery-60';
        if (level <= 70) return 'mdi:battery-70';
        if (level <= 80) return 'mdi:battery-80';
        if (level <= 90) return 'mdi:battery-90';
        return 'mdi:battery';
    };

    return (
        <div className="w-full h-full flex flex-col p-4 overflow-hidden">
            <div className="flex-shrink-0 flex items-center gap-3 mb-3">
                <Icon icon="mdi:battery-heart-variant-outline" className="w-6 h-6" style={{ color: colorScheme.statusTextColor }} />
                <h3 className="font-semibold" style={{ color: colorScheme.valueTextColor }}>Уровень заряда</h3>
            </div>
            <div className="flex-grow space-y-2 overflow-y-auto no-scrollbar pr-1">
                {devicesToShow.map(({ deviceId, deviceName, batteryLevel }) => {
                    const isLow = batteryLevel <= lowBatteryThreshold;
                    const textColor = isLow ? '#ef4444' : colorScheme.nameTextColor;
                    const percentageColor = isLow ? '#ef4444' : colorScheme.statusTextColor;

                    return (
                        <div key={deviceId} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 overflow-hidden" style={{ color: textColor }}>
                                <Icon icon={getBatteryIcon(batteryLevel)} className="w-5 h-5 flex-shrink-0" />
                                <span className="truncate" title={deviceName}>{deviceName}</span>
                            </div>
                            <span className="font-semibold" style={{ color: percentageColor }}>{batteryLevel}%</span>
                        </div>
                    );
                })}
            </div>
             {batteryDevices.length > 4 && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    className="w-full text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-2 pt-1 flex-shrink-0"
                >
                    {isExpanded ? 'Свернуть' : `Показать еще ${batteryDevices.length - 4}`}
                </button>
            )}
        </div>
    );
};

export default BatteryWidgetCard;