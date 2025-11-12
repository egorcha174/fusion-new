import React from 'react';
import { Icon } from '@iconify/react';

// Сопоставление кодов иконок OpenWeatherMap с иконками Iconify и типами анимаций
const iconMap: Record<string, { icon: string; animation: string }> = {
    '01d': { icon: 'mdi:weather-sunny', animation: 'animate-sunny' },
    '01n': { icon: 'mdi:weather-night', animation: 'animate-night' },
    '02d': { icon: 'mdi:weather-partly-cloudy', animation: 'animate-cloudy' },
    '02n': { icon: 'mdi:weather-night-partly-cloudy', animation: 'animate-cloudy' },
    '03d': { icon: 'mdi:weather-cloudy', animation: 'animate-cloudy' },
    '03n': { icon: 'mdi:weather-cloudy', animation: 'animate-cloudy' },
    '04d': { icon: 'mdi:weather-cloudy', animation: 'animate-cloudy' },
    '04n': { icon: 'mdi:weather-cloudy', animation: 'animate-cloudy' },
    '09d': { icon: 'mdi:weather-pouring', animation: 'animate-rainy' },
    '09n': { icon: 'mdi:weather-pouring', animation: 'animate-rainy' },
    '10d': { icon: 'mdi:weather-rainy', animation: 'animate-rainy' },
    '10n': { icon: 'mdi:weather-night-rain', animation: 'animate-rainy' },
    '11d': { icon: 'mdi:weather-lightning-rainy', animation: 'animate-stormy' },
    '11n': { icon: 'mdi:weather-lightning-rainy', animation: 'animate-stormy' },
    '13d': { icon: 'mdi:weather-snowy-heavy', animation: 'animate-snowy' },
    '13n': { icon: 'mdi:weather-snowy-heavy', animation: 'animate-snowy' },
    '50d': { icon: 'mdi:weather-fog', animation: 'animate-foggy' },
    '50n': { icon: 'mdi:weather-fog', animation: 'animate-foggy' },
};

interface AnimatedWeatherIconProps {
    iconCode: string;
    className?: string;
    style?: React.CSSProperties;
}

const AnimatedWeatherIcon: React.FC<AnimatedWeatherIconProps> = ({ iconCode, className, style }) => {
    // Используем '01d' (солнечно) как резервный вариант, если иконка не найдена
    const { icon, animation } = iconMap[iconCode] || iconMap['01d']; 

    return (
        <div className={`relative ${className}`} style={style}>
            <Icon icon={icon} className={`w-full h-full ${animation}`} />
        </div>
    );
};

export default AnimatedWeatherIcon;
