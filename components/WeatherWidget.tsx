

import React, { useState, useEffect } from 'react';
import { ColorScheme } from '../types';
import AnimatedWeatherIcon from './AnimatedWeatherIcon';

// --- Типы данных для погоды ---
interface CurrentWeather {
    temp: number;
    desc: string;
    icon: string;
}

interface ForecastDay {
    day: string;
    tempMax: number;
    tempMin: number;
    icon: string;
}

interface WeatherData {
    current: CurrentWeather;
    forecast: ForecastDay[];
}

interface WeatherWidgetProps {
    openWeatherMapKey: string;
    getConfig: () => Promise<any>;
    colorScheme: ColorScheme['light'];
}

/**
 * Виджет для отображения текущей погоды и прогноза на несколько дней.
 * Получает данные из OpenWeatherMap API, используя координаты из конфигурации Home Assistant.
 */
const WeatherWidget: React.FC<WeatherWidgetProps> = ({ openWeatherMapKey, getConfig, colorScheme }) => {
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchWeather = async () => {
            // Проверяем наличие ключа API.
            if (!openWeatherMapKey) {
                setError("Ключ API OpenWeatherMap не настроен.");
                setLoading(false);
                return;
            }
            if (!getConfig) {
                setError("Функция получения конфигурации недоступна.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // 1. Получаем местоположение (широту и долготу) из конфигурации Home Assistant.
                const haConfig = await getConfig();
                const { latitude: lat, longitude: lon } = haConfig;

                if (!lat || !lon) {
                    throw new Error("В конфигурации HA не найдены широта или долгота.");
                }

                // 2. Запрашиваем прогноз у OpenWeatherMap.
                const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${openWeatherMapKey}&units=metric&lang=ru`;
                const weatherRes = await fetch(forecastUrl);

                if (!weatherRes.ok) {
                    if (weatherRes.status === 401) {
                         throw new Error("Неверный ключ API OpenWeatherMap.");
                    }
                    throw new Error(`Ошибка при получении прогноза: ${weatherRes.statusText}`);
                }

                const data = await weatherRes.json();
                
                if (!data || !Array.isArray(data.list) || data.list.length === 0) {
                    throw new Error("API вернуло пустые или некорректные данные о погоде.");
                }
                
                // 3. Обрабатываем полученные данные.
                // Группируем прогноз по дням.
                const days: { [key: string]: any[] } = {};
                for (const item of data.list) {
                    const dayKey = item.dt_txt.split(' ')[0];
                    if (!days[dayKey]) days[dayKey] = [];
                    days[dayKey].push(item);
                }

                // Вычисляем мин/макс температуру для каждого дня и выбираем иконку.
                const forecast = Object.entries(days).slice(0, 4).map(([dayKey, arr]) => {
                    const dt = new Date(dayKey);
                    const dayName = dt.toLocaleDateString("ru-RU", { weekday: "short" });
                    const tempMax = Math.max(...arr.map((e) => e.main.temp_max));
                    const tempMin = Math.min(...arr.map((e) => e.main.temp_min));
                    const noonSample = arr[Math.floor(arr.length / 2)]; // Примерная иконка для дня
                    const icon = noonSample.weather[0].icon;
                    return { day: dayName, tempMax, tempMin, icon };
                });

                const now = data.list[0]; // Текущая погода - это первый элемент в списке.
                const processedData: WeatherData = {
                    current: {
                        temp: Math.round(now.main.temp),
                        desc: now.weather[0].description,
                        icon: now.weather[0].icon
                    },
                    forecast
                };

                setWeatherData(processedData);

            } catch (err: any) {
                console.error("Failed to fetch weather data:", err);
                setError(err.message || "Неизвестная ошибка.");
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [openWeatherMapKey, getConfig]);

    if (loading) {
        return ( // Скелет загрузки
            <div className="flex items-center gap-3 opacity-50">
                 <div className="w-14 h-14 flex-shrink-0 bg-gray-700 rounded-full animate-pulse"></div>
                 <div className="w-full">
                    <div className="h-6 bg-gray-700 rounded w-1/3 animate-pulse"></div>
                    <div className="h-4 bg-gray-700 rounded w-2/3 mt-2 animate-pulse"></div>
                </div>
            </div>
        );
    }

    if (error || !weatherData) {
        return ( // Сообщение об ошибке
            <div className="text-red-400 bg-red-900/30 p-3 rounded-lg">
                <p className="text-sm font-semibold">Ошибка погоды</p>
                <p className="text-xs text-red-400/80 mt-1">{error || "Не удалось загрузить данные."}</p>
            </div>
        );
    }
    
    const { current, forecast } = weatherData;
    
    const currentIconSize = colorScheme.weatherIconSize ? `${colorScheme.weatherIconSize}px` : undefined;
    const forecastIconSize = colorScheme.weatherForecastIconSize ? `${colorScheme.weatherForecastIconSize}px` : undefined;

    return (
        <div>
            {/* Текущая погода */}
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <AnimatedWeatherIcon
                      iconCode={current.icon}
                      className="w-24 h-24 flex-shrink-0"
                      style={{ width: currentIconSize, height: currentIconSize }}
                    />
                    <p className="text-4xl font-bold" style={{ color: colorScheme.valueTextColor, fontSize: colorScheme.weatherCurrentTempFontSize ? `${colorScheme.weatherCurrentTempFontSize}px` : undefined }}>
                      {current.temp}°C
                    </p>
                </div>
                <div className="w-24 text-center -mt-2">
                    <p className="text-sm capitalize" title={current.desc} style={{ color: colorScheme.statusTextColor, fontSize: colorScheme.weatherCurrentDescFontSize ? `${colorScheme.weatherCurrentDescFontSize}px` : undefined }}>
                      {current.desc}
                    </p>
                </div>
            </div>

            {/* Прогноз на 4 дня */}
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {forecast.map((day, index) => (
                    <div key={index} className="flex flex-col items-center space-y-1">
                        <p className="text-xs font-medium capitalize" style={{ color: colorScheme.nameTextColor, fontSize: colorScheme.weatherForecastDayFontSize ? `${colorScheme.weatherForecastDayFontSize}px` : undefined, }}>
                          {day.day}
                        </p>
                         <AnimatedWeatherIcon
                            iconCode={day.icon}
                            className="w-12 h-12"
                            style={{ width: forecastIconSize, height: forecastIconSize }}
                        />
                        <div>
                            <p className="text-lg font-semibold" style={{ color: colorScheme.valueTextColor, fontSize: colorScheme.weatherForecastMaxTempFontSize ? `${colorScheme.weatherForecastMaxTempFontSize}px` : undefined, }}>
                              {Math.round(day.tempMax)}°
                            </p>
                            <p className="text-sm -mt-1" style={{ color: colorScheme.statusTextColor, fontSize: colorScheme.weatherForecastMinTempFontSize ? `${colorScheme.weatherForecastMinTempFontSize}px` : undefined, }}>
                              {Math.round(day.tempMin)}°
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeatherWidget;