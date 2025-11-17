import React from 'react';
import { Icon } from '@iconify/react';
import { WeatherSettings } from '../types';

// Сопоставление кодов иконок OpenWeatherMap с иконками Iconify, типами анимаций и цветами
const defaultIconMap: Record<string, { icon: string; animation: string; color: string }> = {
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

const owmToMeteocons: Record<string, string> = {
    '01d': 'meteocons:clear-day-fill', '01n': 'meteocons:clear-night-fill',
    '02d': 'meteocons:partly-cloudy-day-fill', '02n': 'meteocons:partly-cloudy-night-fill',
    '03d': 'meteocons:cloudy-fill', '03n': 'meteocons:cloudy-fill',
    '04d': 'meteocons:overcast-fill', '04n': 'meteocons:overcast-fill',
    '09d': 'meteocons:drizzle-fill', '09n': 'meteocons:drizzle-fill',
    '10d': 'meteocons:rain-fill', '10n': 'meteocons:rain-fill',
    '11d': 'meteocons:thunderstorms-fill', '11n': 'meteocons:thunderstorms-fill',
    '13d': 'meteocons:snow-fill', '13n': 'meteocons:snow-fill',
    '50d': 'meteocons:fog-fill', '50n': 'meteocons:fog-fill',
};

const owmToWeatherIcons: Record<string, string> = {
    '01d': 'wi:day-sunny', '01n': 'wi:night-clear',
    '02d': 'wi:day-cloudy', '02n': 'wi:night-alt-cloudy',
    '03d': 'wi:cloud', '03n': 'wi:cloud',
    '04d': 'wi:cloudy', '04n': 'wi:cloudy',
    '09d': 'wi:showers', '09n': 'wi:night-alt-showers',
    '10d': 'wi:day-rain', '10n': 'wi:night-alt-rain',
    '11d': 'wi:day-thunderstorm', '11n': 'wi:night-alt-thunderstorm',
    '13d': 'wi:day-snow', '13n': 'wi:night-alt-snow',
    '50d': 'wi:day-fog', '50n': 'wi:night-fog',
};

const owmToMaterialSymbols: Record<string, string> = {
    '01d': 'material-symbols-light:sunny', '01n': 'material-symbols-light:clear-night',
    '02d': 'material-symbols-light:partly-cloudy-day', '02n': 'material-symbols-light:partly-cloudy-night',
    '03d': 'material-symbols-light:cloudy', '03n': 'material-symbols-light:cloudy',
    '04d': 'material-symbols-light:cloudy', '04n': 'material-symbols-light:cloudy',
    '09d': 'material-symbols-light:rainy', '09n': 'material-symbols-light:rainy',
    '10d': 'material-symbols-light:rainy', '10n': 'material-symbols-light:rainy',
    '11d': 'material-symbols-light:thunderstorm', '11n': 'material-symbols-light:thunderstorm',
    '13d': 'material-symbols-light:cloudy-snowing', '13n': 'material-symbols-light:cloudy-snowing',
    '50d': 'material-symbols-light:foggy', '50n': 'material-symbols-light:foggy',
};


interface AnimatedWeatherIconProps {
    iconCode: string;
    iconPack: WeatherSettings['iconPack'];
    className?: string;
    style?: React.CSSProperties;
}

const AnimatedWeatherIcon: React.FC<AnimatedWeatherIconProps> = ({ iconCode, iconPack, className, style }) => {
    const fallbackData = defaultIconMap['01d'];
    const { animation } = defaultIconMap[iconCode] || fallbackData;
    
    let iconName: string;
    let colorClass: string;

    if (iconPack === 'default') {
        const { icon, color } = defaultIconMap[iconCode] || fallbackData;
        iconName = icon;
        colorClass = color;
    } else {
        colorClass = 'text-gray-600 dark:text-gray-300';
        switch (iconPack) {
            case 'meteocons':
                iconName = owmToMeteocons[iconCode] || owmToMeteocons['01d'];
                break;
            case 'weather-icons':
                iconName = owmToWeatherIcons[iconCode] || owmToWeatherIcons['01d'];
                break;
            case 'material-symbols-light':
                iconName = owmToMaterialSymbols[iconCode] || owmToMaterialSymbols['01d'];
                break;
            default:
                iconName = fallbackData.icon;
                colorClass = fallbackData.color;
        }
    }

    const iconClassName = `w-full h-full ${animation} ${colorClass}`;

    return (
        <div className={`relative ${className}`} style={style}>
            <Icon icon={iconName} className={iconClassName} />
        </div>
    );
};

export default AnimatedWeatherIcon;