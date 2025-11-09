
import React, { useState, useEffect } from 'react';
import { ColorScheme } from '../types';

// --- Types ---
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

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ openWeatherMapKey, getConfig, colorScheme }) => {
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getWeatherIconUrl = (iconCode: string, size: '4x' | '2x' | '1x' = '1x') => {
        const sizeSuffix = size === '1x' ? '' : `@${size}`;
        return `https://openweathermap.org/img/wn/${iconCode}${sizeSuffix}.png`;
    };

    useEffect(() => {
        const fetchWeather = async () => {
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
                // 1. Get location from Home Assistant via WebSocket
                const haConfig = await getConfig();
                const { latitude: lat, longitude: lon } = haConfig;

                if (!lat || !lon) {
                    throw new Error("В конфигурации HA не найдены широта или долгота.");
                }

                // 2. Get forecast from OpenWeatherMap
                const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${openWeatherMapKey}&units=metric&lang=ru`;
                const weatherRes = await fetch(forecastUrl);

                if (!weatherRes.ok) {
                    if (weatherRes.status === 401) {
                         throw new Error("Неверный ключ API OpenWeatherMap.");
                    }
                    throw new Error(`Ошибка при получении прогноза: ${weatherRes.statusText}`);
                }

                const data = await weatherRes.json();
                
                // Process data
                const days: { [key: string]: any[] } = {};
                for (const item of data.list) {
                    const dayKey = item.dt_txt.split(' ')[0];
                    if (!days[dayKey]) days[dayKey] = [];
                    days[dayKey].push(item);
                }

                const forecast = Object.entries(days).slice(0, 4).map(([dayKey, arr]) => {
                    const dt = new Date(dayKey);
                    const dayName = dt.toLocaleDateString("ru-RU", { weekday: "short" });
                    const tempMax = Math.max(...arr.map((e) => e.main.temp_max));
                    const tempMin = Math.min(...arr.map((e) => e.main.temp_min));
                    const noonSample = arr[Math.floor(arr.length / 2)];
                    const icon = noonSample.weather[0].icon;
                    return { day: dayName, tempMax, tempMin, icon };
                });

                const now = data.list[0];
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
        return (
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
        return (
            <div className="text-red-400 bg-red-900/30 p-3 rounded-lg">
                <p className="text-sm font-semibold">Ошибка погоды</p>
                <p className="text-xs text-red-400/80 mt-1">{error || "Не удалось загрузить данные."}</p>
            </div>
        );
    }
    
    const { current, forecast } = weatherData;

    return (
        <div>
            {/* Current Weather */}
            <div className="flex items-center gap-2">
                <img 
                    src={getWeatherIconUrl(current.icon, '4x')} 
                    alt={current.desc} 
                    className="w-24 h-24 flex-shrink-0 -ml-2"
                />
                <div className="overflow-hidden">
                    <p
                      className="text-4xl font-bold"
                      style={{
                          color: colorScheme.valueTextColor,
                          fontFamily: colorScheme.valueTextFontFamily,
                          fontSize: colorScheme.valueTextFontSize ? `${colorScheme.valueTextFontSize}px` : undefined,
                      }}
                      data-style-key="valueTextColor"
                      data-style-name="Погода (температура)"
                      data-is-text="true"
                      data-style-origin="scheme"
                      data-is-on="false"
                    >
                      {current.temp}°C
                    </p>
                    <p
                      className="text-sm -mt-1 truncate capitalize"
                      title={current.desc}
                      style={{
                          color: colorScheme.statusTextColor,
                          fontFamily: colorScheme.statusTextFontFamily,
                          fontSize: colorScheme.statusTextFontSize ? `${colorScheme.statusTextFontSize}px` : undefined,
                      }}
                      data-style-key="statusTextColor"
                      data-style-name="Погода (описание)"
                      data-is-text="true"
                      data-style-origin="scheme"
                      data-is-on="false"
                    >
                      {current.desc}
                    </p>
                </div>
            </div>

            {/* 4-Day Forecast */}
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {forecast.map((day, index) => (
                    <div key={index} className="flex flex-col items-center space-y-1">
                        <p
                          className="text-xs font-medium capitalize"
                          style={{
                              color: colorScheme.nameTextColor,
                              fontFamily: colorScheme.nameTextFontFamily,
                              fontSize: colorScheme.nameTextFontSize ? `${colorScheme.nameTextFontSize}px` : undefined,
                          }}
                          data-style-key="nameTextColor"
                          data-style-name="Погода (день недели)"
                          data-is-text="true"
                          data-style-origin="scheme"
                          data-is-on="false"
                        >
                          {day.day}
                        </p>
                         <img 
                            src={getWeatherIconUrl(day.icon, '2x')} 
                            alt=""
                            className="w-12 h-12"
                        />
                        <div>
                            <p
                              className="text-lg font-semibold"
                              style={{
                                  color: colorScheme.valueTextColor,
                                  fontFamily: colorScheme.valueTextFontFamily,
                                  fontSize: colorScheme.valueTextFontSize ? `${colorScheme.valueTextFontSize}px` : undefined,
                              }}
                              data-style-key="valueTextColor"
                              data-style-name="Погода (макс. темп.)"
                              data-is-text="true"
                              data-style-origin="scheme"
                              data-is-on="false"
                            >
                              {Math.round(day.tempMax)}°
                            </p>
                            <p
                              className="text-sm -mt-1"
                              style={{
                                  color: colorScheme.statusTextColor,
                                  fontFamily: colorScheme.statusTextFontFamily,
                                  fontSize: colorScheme.statusTextFontSize ? `${colorScheme.statusTextFontSize}px` : undefined,
                              }}
                              data-style-key="statusTextColor"
                              data-style-name="Погода (мин. темп.)"
                              data-is-text="true"
                              data-style-origin="scheme"
                              data-is-on="false"
                            >
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