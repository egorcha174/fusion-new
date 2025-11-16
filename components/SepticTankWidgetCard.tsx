import React from 'react';
import { Device, ColorThemeSet } from '../types';
import { useAppStore } from '../store/appStore';
import { Icon } from '@iconify/react';
import DeviceIcon from './DeviceIcon';

interface SepticTankWidgetCardProps {
    device: Device;
    colorScheme: ColorThemeSet;
}

const SepticTankWidgetCard: React.FC<SepticTankWidgetCardProps> = ({ device, colorScheme }) => {
    const { resetSepticTankTimer } = useAppStore();

    const { fillPercentage = 0, daysRemaining = 0, state } = device;

    // Функция для определения цвета заливки в зависимости от процента
    const getFillColor = (percentage: number) => {
        if (percentage >= 85) return 'bg-red-500/80';
        if (percentage >= 60) return 'bg-yellow-500/80';
        return 'bg-green-500/80';
    };
    
    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Вы уверены, что хотите сбросить таймер? Это действие установит новую дату отсчета на сегодня.')) {
            resetSepticTankTimer();
        }
    };
    
    if (state === 'inactive') {
        return (
             <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
                <DeviceIcon icon={device.type} isOn={false} className="!w-1/3 !h-1/3 opacity-50" />
                <p className="font-semibold mt-2" style={{ color: colorScheme.valueTextColor }}>Ассенизатор</p>
                <p className="text-sm" style={{ color: colorScheme.statusTextColor }}>{device.status}</p>
                <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">Перейдите в Настройки → Интерфейс, чтобы задать интервал и запустить таймер.</p>
            </div>
        )
    }

    return (
        <div className="w-full h-full relative overflow-hidden">
            {/* Слой с заливкой */}
            <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-500 ease-in-out"
                style={{
                    height: `${fillPercentage}%`,
                    backgroundColor: getFillColor(fillPercentage),
                }}
            />

            {/* Контент поверх заливки */}
            <div className="relative w-full h-full flex flex-col justify-between p-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                         <DeviceIcon icon={device.type} isOn={true} className="!w-6 !h-6 !m-0" />
                         <h3 className="font-semibold" style={{ color: colorScheme.nameTextColorOn }}>{device.name}</h3>
                    </div>
                    <button 
                        onClick={handleReset}
                        title="Сбросить таймер (зафиксировать приезд)"
                        className="p-2 bg-black/10 dark:bg-white/10 rounded-full hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                    >
                        <Icon icon="mdi:restore" className="w-5 h-5" />
                    </button>
                </div>

                <div className="text-center">
                    <p className="text-7xl font-bold tracking-tighter" style={{ color: colorScheme.valueTextColorOn }}>
                        {daysRemaining}
                    </p>
                    <p className="text-lg font-medium -mt-2" style={{ color: colorScheme.statusTextColorOn }}>
                        {daysRemaining === 1 ? 'день' : (daysRemaining > 1 && daysRemaining < 5) ? 'дня' : 'дней'}
                    </p>
                </div>
                
                <div className="text-center">
                   <p className="text-sm font-medium" style={{ color: colorScheme.statusTextColorOn }}>
                        Заполнено на {Math.round(fillPercentage)}%
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SepticTankWidgetCard;
