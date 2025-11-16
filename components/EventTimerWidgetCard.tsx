import React, { useMemo } from 'react';
import { Device, ColorThemeSet } from '../types';

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

const Bubbles = React.memo(() => {
    // Генерируем случайные свойства для пузырьков для создания естественного эффекта
    const bubbles = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: `${Math.random() * 12 + 4}px`, // Размер от 4px до 16px
        duration: `${Math.random() * 8 + 4}s`, // Продолжительность от 4s до 12s
        delay: `${Math.random() * 8}s`, // Задержка до 8s
        wobble: `${(Math.random() - 0.5) * 20}px`
    })), []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {bubbles.map(bubble => (
                <div
                    key={bubble.id}
                    className="absolute bottom-0 rounded-full bg-white/20"
                    style={{
                        left: bubble.left,
                        width: bubble.size,
                        height: bubble.size,
                        animation: `bubble-rise ${bubble.duration} ${bubble.delay} infinite ease-in-out`,
                        '--bubble-wobble': bubble.wobble,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
});


const EventTimerWidgetCard: React.FC<EventTimerWidgetCardProps> = ({ device, colorScheme, onContextMenu }) => {
    const { 
        fillPercentage = 0, daysRemaining = 0,
        fillColors, animation, showName, name,
        nameFontSize, namePosition, daysRemainingFontSize, daysRemainingPosition 
    } = device;

    const effectiveAnimation = animation || 'smooth';

    const finalNamePosition = namePosition || { x: 50, y: 15 };
    const finalDaysPosition = daysRemainingPosition || { x: 50, y: 50 };

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

    const fillStyle: React.CSSProperties = {
        height: `${fillPercentage}%`,
        backgroundColor: fillColor,
        transition: effectiveAnimation === 'smooth' 
            ? 'height 0.7s ease-in-out, background-color 0.5s linear' 
            : 'background-color 0.5s linear',
    };

    return (
        <div 
            className="w-full h-full relative rounded-2xl overflow-hidden text-white select-none"
            style={{ backgroundColor: colorScheme.cardBackground }}
            onContextMenu={onContextMenu}
        >
            {/* Слой с "жидкой" заливкой */}
            <div
                className="absolute bottom-0 left-0 right-0"
                style={fillStyle}
            >
                {/* Условный рендеринг анимации пузырьков */}
                {effectiveAnimation === 'bubbles' && <Bubbles />}

                {/* Условный рендеринг анимации волны */}
                {effectiveAnimation === 'wave' && (
                    <svg
                        className="absolute left-0 w-[200%] animate-wave"
                        viewBox="0 0 2000 50"
                        preserveAspectRatio="none"
                        style={{ height: '50px', top: '-49px' }}
                    >
                        <path
                            d="M0,25 C300,50 700,0 1000,25 C1300,50 1700,0 2000,25 L2000,51 L0,51 Z"
                            style={{ stroke: 'none', fill: fillColor, transition: 'fill 0.5s linear' }}
                        />
                    </svg>
                )}
            </div>

            {/* Слой с контентом */}
            <div className="relative w-full h-full p-4">
                {showName && (
                    <div 
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
                        style={{
                            top: `${finalNamePosition.y}%`,
                            left: `${finalNamePosition.x}%`,
                            color: colorScheme.nameTextColorOn,
                            textShadow: '0 1px 5px rgba(0,0,0,0.4)',
                        }}
                    >
                        <p className="font-semibold" style={{ fontSize: nameFontSize ? `${nameFontSize}px` : '1.125rem' }}>
                            {name}
                        </p>
                    </div>
                )}

                <div 
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                        top: `${finalDaysPosition.y}%`,
                        left: `${finalDaysPosition.x}%`,
                        color: colorScheme.nameTextColorOn,
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                    }}
                >
                    <p 
                        className="font-bold tracking-tighter"
                        style={{ fontSize: daysRemainingFontSize ? `${daysRemainingFontSize}px` : '5.5rem' }}
                    >
                        {daysRemaining}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EventTimerWidgetCard;