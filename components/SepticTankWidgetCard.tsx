import React from 'react';
import { Device, ColorThemeSet } from '../types';
import { useAppStore } from '../store/appStore';

interface EventTimerWidgetCardProps {
    device: Device;
    colorScheme: ColorThemeSet;
}

const EventTimerWidgetCard: React.FC<EventTimerWidgetCardProps> = ({ device }) => {
    const { resetCustomWidgetTimer } = useAppStore();

    const { fillPercentage = 0, daysRemaining = 0, widgetId, buttonText = "Сброс" } = device;

    // Функция для определения цвета заливки в зависимости от процента
    const getFillColor = (percentage: number): string => {
        if (percentage >= 85) return '#ef4444'; // red-500
        if (percentage >= 60) return '#f59e0b'; // amber-500
        return '#22c55e'; // green-500
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

    return (
        <div className="w-full h-full relative bg-gray-800 dark:bg-gray-900 rounded-2xl overflow-hidden text-white select-none">
            {/* Слой с "жидкой" заливкой */}
            <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-in-out"
                style={{ height: `${fillPercentage}%` }}
            >
                {/* Основной цвет заливки под волной */}
                <div className="absolute inset-0" style={{ backgroundColor: fillColor }} />

                {/* SVG для создания волнистого края */}
                <svg
                    className="absolute left-0 w-full"
                    viewBox="0 0 500 50"
                    preserveAspectRatio="none"
                    style={{ height: '50px', top: '-50px' }}
                >
                    <path
                        d={wavePath}
                        style={{ stroke: 'none', fill: fillColor }}
                    />
                </svg>
            </div>

            {/* Слой с контентом */}
            <div className="relative w-full h-full flex flex-col justify-between items-center p-4">
                {/* Пустой div для выравнивания по flexbox */}
                <div /> 

                {/* Центральная часть: количество оставшихся дней */}
                <div className="text-center">
                    <p 
                        className="text-7xl lg:text-8xl font-bold tracking-tighter"
                        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                    >
                        {daysRemaining}
                    </p>
                </div>
                
                {/* Нижняя часть: кнопка сброса */}
                <button
                    onClick={handleReset}
                    className="text-lg font-semibold hover:opacity-80 transition-opacity"
                    style={{ textShadow: '0 1px 5px rgba(0,0,0,0.4)' }}
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
};

export default EventTimerWidgetCard;