import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { constructHaUrl } from '../utils/url';

// --- Types ---
interface CurrentWeather {
    temp: number;
    desc: string;
    icon: string;
}

interface ForecastDay {
    day: string;
    tempMax: number;
    icon: string;
}

interface WeatherData {
    current: CurrentWeather;
    forecast: ForecastDay[];
}

interface WeatherWidgetProps {
    openWeatherMapKey: string;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ openWeatherMapKey }) => {
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [haUrl] = useLocalStorage('ha-url', '');
    const [token] = useLocalStorage('ha-token', '');

    const getWeatherIconUrl = (iconCode: string, size: '2x' | '1x' = '1x') => {
        return `https://openweathermap.org/img/wn/${iconCode}${size === '2x' ? '@2x' : ''}.png`;
    };

    useEffect(() => {
        const fetchWeather = async () => {
            if (!haUrl || !token) {
                setError("Home Assistant не настроен.");
                setLoading(false);
                return;
            }
            if (!openWeatherMapKey) {
                setError("Ключ API OpenWeatherMap не настроен.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // 1. Get location from Home Assistant
                const configUrl = constructHaUrl(haUrl, '/api/config', 'http');
                const configRes = await fetch(configUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!configRes.ok) {
                    throw new Error(`Ошибка при получении конфигурации HA: ${configRes.statusText}`);
                }
                
                const haConfig = await configRes.json();
                const { latitude: lat, longitude: lon } = haConfig;

                if (!lat || !lon) {
                    throw new Error("В конфигурации HA не найдены широта или долгота.");
                }

                // 2. Get forecast from OpenWeatherMap
                const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${openWeatherMapKey}&units=metric&lang=ru`;
                const weatherRes = await fetch(forecastUrl);

                if (!weatherRes.ok) {
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
                    const noonSample = arr[Math.floor(arr.length / 2)];
                    const icon = noonSample.weather[0].icon;
                    return { day: dayName, tempMax, icon };
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
    }, [haUrl, token, openWeatherMapKey]);

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
            <div className="flex items-center gap-3">
                <img 
                    src={getWeatherIconUrl(current.icon, '2x')} 
                    alt={current.desc} 
                    className="w-14 h-14 flex-shrink-0"
                />
                <div className="overflow-hidden">
                    <p className="text-2xl font-bold">{current.temp}°C</p>
                    <p className="text-gray-400 text-sm truncate capitalize" title={current.desc}>{current.desc}</p>
                </div>
            </div>

            {/* 4-Day Forecast */}
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {forecast.map((day, index) => (
                    <div key={index} className="flex flex-col items-center space-y-1">
                        <p className="text-xs font-medium text-gray-400 capitalize">{day.day}</p>
                         <img 
                            src={getWeatherIconUrl(day.icon)} 
                            alt=""
                            className="w-10 h-10"
                        />
                        <p className="text-sm font-semibold">{Math.round(day.tempMax)}°</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeatherWidget;