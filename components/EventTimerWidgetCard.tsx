import React from 'react';
import { Device, ColorThemeSet } from '../types';
import { useAppStore } from '../store/appStore';

interface EventTimerWidgetCardProps {
    device: Device;
    colorScheme: ColorThemeSet;
    onContextMenu?: (event: React.MouseEvent) => void;
}

// Вспомогательные функции для работы с цветом
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    } : null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

const interpolateColor = (color1: string, color2: string, factor: number): string => {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    if (!c1 || !c2) return color1; // Fallback

    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    return rgbToHex(r, g, b);
};


const EventTimerWidgetCard: React.FC<EventTimerWidgetCardProps> = ({ device, colorScheme, onContextMenu }) => {
    const { resetCustomWidgetTimer } = useAppStore();

    const { fillPercentage = 0, daysRemaining = 0, widgetId, buttonText = "Сброс", fillColors, animation, showName, name } = device;

    // Функция для определения цвета заливки в зависимости от процента и настроек
    const getFillColor = (percentage: number): string => {
        const [start = '#22c55e', mid = '#f59e0b', end = '#ef4444'] = fillColors || [];
        
        if (percentage < 50) {
            // Интерполяция между начальным и средним цветом
            return interpolateColor(start, mid, percentage / 50);
        } else {
            // Интерполяция между средним и конечным цветом
            return interpolateColor(mid, end, (percentage - 50) / 50);
        }
    };

    const fillColor = getFillColor(fillPercentage);

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (widgetId) {
            resetCustomWidgetTimer(widgetId);
        }
    };
    
    // SVG-путь для создания "волнистого" края
    const wavePath = "M0,25 C150,50 350,0 500,25 L500,51 L0,51 Z";
    const waveAnimationClass = animation === 'wave' ? 'animate-wave' : '';

    return (
        <div 
            className="w-full h-full relative rounded-2xl overflow-hidden text-white select-none"
            style={{ backgroundColor: colorScheme.cardBackground }}
            onContextMenu={onContextMenu}
        >
            {/* Слой с "жидкой" заливкой */}
            <div
                className="absolute bottom-0 left-0 right-0"
                style={{ height: `${fillPercentage}%`, transition: animation === 'smooth' ? 'height 0.7s ease-in-out' : 'none' }}
            >
                {/* Основной цвет заливки под волной */}
                <div className="absolute inset-0" style={{ backgroundColor: fillColor, transition: 'background-color 0.5s linear' }} />

                {/* SVG для создания волнистого края */}
                <svg
                    className={`absolute left-0 w-[200%] ${waveAnimationClass}`} // Ширина 200% для плавной анимации
                    viewBox="0 0 1000 50" // viewBox увеличен вдвое по ширине
                    preserveAspectRatio="none"
                    style={{ height: '50px', top: '-49px' }} // -49px чтобы избежать щели
                >
                    <path
                        d="M0,25 C300,50 700,0 1000,25 L1000,51 L0,51 Z" // Путь также увеличен
                        style={{ stroke: 'none', fill: fillColor, transition: 'fill 0.5s linear' }}
                    />
                </svg>
            </div>

            {/* Слой с контентом */}
            <div className="relative w-full h-full flex flex-col items-center p-4">
                 {/* Title */}
                <div className="h-8 flex-shrink-0 text-center pt-1">
                    {showName && (
                        <p 
                            className="font-semibold text-lg" 
                            style={{ textShadow: '0 1px 5px rgba(0,0,0,0.4)', color: colorScheme.nameTextColorOn }}
                        >
                            {name}
                        </p>
                    )}
                </div>

                {/* Number */}
                <div className="flex-grow flex items-center justify-center">
                    <p 
                        className="text-8xl xl:text-9xl font-bold tracking-tighter -mt-4" 
                        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)', color: colorScheme.nameTextColorOn }}
                    >
                        {daysRemaining}
                    </p>
                </div>
                
                {/* Button */}
                <div className="h-8 flex-shrink-0 text-center pb-1">
                    <button
                        onClick={handleReset}
                        className="text-lg font-semibold hover:opacity-80 transition-opacity"
                        style={{ textShadow: '0 1px 5px rgba(0,0,0,0.4)', color: colorScheme.statusTextColorOn }}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventTimerWidgetCard;