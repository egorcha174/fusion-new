import React from 'react';
import { Icon } from '@iconify/react';

// Сопоставление кодов иконок OpenWeatherMap с иконками Iconify, типами анимаций и цветами
const iconMap: Record<string, { icon: string; animation: string; color: string }> = {
    '01d': { icon: 'mdi:weather-sunny', animation: 'animate-sunny', color: 'text-amber-400 dark:text-yellow-300' },
    '01n': { icon: 'mdi:weather-night', animation: 'animate-night', color: 'text-gray-200 dark:text-gray-400' },
    '02d': { icon: 'mdi:weather-partly-cloudy', animation: 'animate-cloudy', color: 'text-gray-400 dark:text-gray-300' },
    '02n': { icon: 'mdi:weather-night-partly-cloudy', animation: 'animate-cloudy', color: 'text-gray-400 dark:text-gray-300' },
    '03d': { icon: 'mdi:weather-cloudy', animation: 'animate-cloudy', color: 'text-gray-400 dark:text-gray-300' },
    '03n': { icon: 'mdi:weather-cloudy', animation: 'animate-cloudy', color: 'text-gray-400 dark:text-gray-300' },
    '04d': { icon: 'mdi:weather-cloudy', animation: 'animate-cloudy', color: 'text-gray-400 dark:text-gray-300' },
    '04n': { icon: 'mdi:weather-cloudy', animation: 'animate-cloudy', color: 'text-gray-400 dark:text-gray-300' },
    '09d': { icon: 'mdi:weather-pouring', animation: 'animate-rainy', color: 'text-gray-400 dark:text-gray-300' },
    '09n': { icon: 'mdi:weather-pouring', animation: 'animate-rainy', color: 'text-gray-400 dark:text-gray-300' },
    '10d': { icon: 'mdi:weather-rainy', animation: 'animate-rainy', color: 'text-gray-400 dark:text-gray-300' },
    '10n': { icon: 'mdi:weather-night-rain', animation: 'animate-rainy', color: 'text-gray-400 dark:text-gray-300' },
    '11d': { icon: 'mdi:weather-lightning-rainy', animation: 'animate-stormy', color: 'text-gray-400 dark:text-gray-300' },
    '11n': { icon: 'mdi:weather-lightning-rainy', animation: 'animate-stormy', color: 'text-gray-400 dark:text-gray-300' },
    '13d': { icon: 'mdi:weather-snowy-heavy', animation: 'animate-snowy', color: 'text-gray-400 dark:text-gray-300' },
    '13n': { icon: 'mdi:weather-snowy-heavy', animation: 'animate-snowy', color: 'text-gray-400 dark:text-gray-300' },
    '50d': { icon: 'mdi:weather-fog', animation: 'animate-foggy', color: 'text-gray-300 dark:text-gray-400' },
    '50n': { icon: 'mdi:weather-fog', animation: 'animate-foggy', color: 'text-gray-300 dark:text-gray-400' },
};

interface AnimatedWeatherIconProps {
    iconCode: string;
    className?: string;
    style?: React.CSSProperties;
}

const AnimatedWeatherIcon: React.FC<AnimatedWeatherIconProps> = ({ iconCode, className, style }) => {
    // Используем '01d' (солнечно) как резервный вариант, если иконка не найдена
    const { icon, animation, color } = iconMap[iconCode] || iconMap['01d']; 

    return (
        <div className={`relative ${className}`} style={style}>
            <Icon icon={icon} className={`w-full h-full ${animation} ${color}`} />
        </div>
    );
};

export default AnimatedWeatherIcon;