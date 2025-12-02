
import React from 'react';
import { ColorScheme, WeatherSettings } from '../types';
import AnimatedWeatherIcon from './AnimatedWeatherIcon';
import { useAppStore } from '../store/appStore';

interface WeatherWidgetProps {
    weatherProvider: 'openweathermap' | 'yandex' | 'foreca' | 'homeassistant';
    weatherEntityId: string;
    openWeatherMapKey: string;
    yandexWeatherKey: string;
    forecaApiKey: string;
    getConfig: () => Promise<any>;
    colorScheme: ColorScheme['light'];
    weatherSettings: WeatherSettings;
}

/**
 * Виджет для отображения текущей погоды и прогноза на несколько дней.
 * Данные загружаются глобально через useWeather hook и читаются из store.
 */
const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weatherSettings }) => {
    const { weatherData } = useAppStore();

    if (!weatherData) {
        return ( // Скелет загрузки или сообщение об отсутствии данных
            <div className="flex items-center gap-3 opacity-50">
                 <div className="w-14 h-14 flex-shrink-0 bg-gray-700 rounded-full animate-pulse"></div>
                 <div className="w-full">
                    <div className="h-6 bg-gray-700 rounded w-1/3 animate-pulse"></div>
                    <div className="h-4 bg-gray-700 rounded w-2/3 mt-2 animate-pulse"></div>
                </div>
            </div>
        );
    }
    
    const { current, forecast } = weatherData;
    
    return (
        <div>
            {/* Текущая погода */}
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <AnimatedWeatherIcon
                      iconCode={current.icon}
                      iconPack={weatherSettings.iconPack}
                      className="w-24 h-24 flex-shrink-0"
                      style={{ width: 'var(--weather-icon-size)', height: 'var(--weather-icon-size)' }}
                    />
                    <p className="text-4xl font-bold" style={{ color: 'var(--text-value)', fontSize: 'var(--weather-current-temp-size)' }}>
                      {Math.round(current.temp)}°C
                    </p>
                </div>
                <div className="w-24 text-center -mt-2">
                    <p className="text-sm capitalize" title={current.desc} style={{ color: 'var(--text-status)', fontSize: 'var(--weather-current-desc-size)' }}>
                      {current.desc}
                    </p>
                </div>
            </div>

            {/* Прогноз на N дней */}
            {forecast.length > 0 ? (
                <div className="mt-4 grid gap-2 text-center" style={{ gridTemplateColumns: `repeat(${Math.min(forecast.length, weatherSettings.forecastDays)}, minmax(0, 1fr))` }}>
                    {forecast.map((day, index) => (
                        <div key={index} className="flex flex-col items-center space-y-1">
                            <p className="text-xs font-medium capitalize" style={{ color: 'var(--text-name)', fontSize: 'var(--weather-forecast-day-size)' }}>
                              {day.day}
                            </p>
                             <AnimatedWeatherIcon
                                iconCode={day.icon}
                                iconPack={weatherSettings.iconPack}
                                className="w-12 h-12"
                                style={{ width: 'var(--weather-forecast-icon-size)', height: 'var(--weather-forecast-icon-size)' }}
                            />
                            <div>
                                <p className="text-lg font-semibold" style={{ color: 'var(--text-value)', fontSize: 'var(--weather-forecast-max-temp-size)' }}>
                                  {Math.round(day.tempMax)}°
                                </p>
                                <p className="text-sm -mt-1" style={{ color: 'var(--text-status)', fontSize: 'var(--weather-forecast-min-temp-size)' }}>
                                  {Math.round(day.tempMin)}°
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="mt-4 text-center text-sm opacity-60 py-2" style={{ color: 'var(--text-status)' }}>
                    Прогноз недоступен
                </div>
            )}
        </div>
    );
};

export default WeatherWidget;
