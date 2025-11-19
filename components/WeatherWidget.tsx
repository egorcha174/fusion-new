
import React, { useState, useEffect } from 'react';
import { ColorScheme, WeatherSettings, WeatherForecast } from '../types';
import AnimatedWeatherIcon from './AnimatedWeatherIcon';
import { useHAStore } from '../store/haStore';

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
    weatherProvider: 'openweathermap' | 'yandex' | 'foreca' | 'homeassistant';
    weatherEntityId: string;
    openWeatherMapKey: string;
    yandexWeatherKey: string;
    forecaApiKey: string;
    getConfig: () => Promise<any>;
    colorScheme: ColorScheme['light'];
    weatherSettings: WeatherSettings;
}

// --- MAPPINGS FOR HA WEATHER ---
const haConditionToOwmCode: Record<string, string> = {
    'clear-night': '01n', 'cloudy': '03d', 'fog': '50d',
    'hail': '13d', 'lightning': '11d', 'lightning-rainy': '11d',
    'partlycloudy': '02d', 'pouring': '09d', 'rainy': '10d',
    'snowy': '13d', 'snowy-rainy': '13d', 'sunny': '01d',
    'windy': '50d', 'windy-variant': '50d', 'exceptional': '50d'
};

// --- MAPPINGS FOR YANDEX WEATHER ---
const yandexConditionToText: { [key: string]: string } = {
    'clear': 'Ясно', 'partly-cloudy': 'Малооблачно', 'cloudy': 'Облачно с прояснениями',
    'overcast': 'Пасмурно', 'drizzle': 'Морось', 'light-rain': 'Небольшой дождь', 'rain': 'Дождь',
    'moderate-rain': 'Умеренно сильный дождь', 'heavy-rain': 'Сильный дождь',
    'continuous-heavy-rain': 'Длительный сильный дождь', 'showers': 'Ливень',
    'wet-snow': 'Дождь со снегом', 'light-snow': 'Небольшой снег', 'snow': 'Снег',
    'snow-showers': 'Снегопад', 'hail': 'Град', 'thunderstorm': 'Гроза',
    'thunderstorm-with-rain': 'Дождь с грозой', 'thunderstorm-with-hail': 'Гроза с градом',
};

const yandexIconToOwmCode: { [key: string]: string } = {
    'skc-d': '01d', 'skc-n': '01n', 'bkn-d': '02d', 'bkn-n': '02n',
    'cld-d': '03d', 'cld-n': '03n', 'ovc': '04d',
    'ovc-ra': '10d', 'ovc-sn': '13d', 'ovc-ts-ra': '11d',
    'fg-fog': '50d',
    // Fallbacks
    'bkn-ra-d': '10d', 'bkn-ra-n': '10n', 'bkn-sn-d': '13d', 'bkn-sn-n': '13n',
    'ovc-ra-sn': '13d', 'ovc-dr': '09d', 'ovc-sn-sh': '13d', 'ovc-sh': '09d',
};

// --- MAPPING FOR FORECA WEATHER ---
const forecaSymbolToOwmCode = (symbol: string): string => {
    if (!symbol) return '01d';
    const symbolCode = parseInt(symbol.slice(1), 10);
    const dayNight = symbol.startsWith('d') ? 'd' : 'n';

    if (symbolCode === 100) return `01${dayNight}`; // Clear
    if (symbolCode >= 210 && symbolCode <= 212) return `02${dayNight}`; // Partly cloudy
    if (symbolCode >= 220 && symbolCode <= 222) return `03${dayNight}`; // Cloudy
    if (symbolCode === 230) return `04${dayNight}`; // Overcast
    if (symbolCode >= 311 && symbolCode <= 312) return `10${dayNight}`; // Rain
    if (symbolCode >= 320 && symbolCode <= 322) return `09${dayNight}`; // Showers
    if (symbolCode >= 411 && symbolCode <= 412) return `13${dayNight}`; // Snow
    if (symbolCode >= 420 && symbolCode <= 422) return `13${dayNight}`; // Snow showers
    if (symbolCode >= 430 && symbolCode <= 432) return `13${dayNight}`; // Sleet
    if (symbolCode >= 240 && symbolCode <= 242) return `11${dayNight}`; // Thunder
    if (symbolCode === 0) return `50${dayNight}`; // Fog

    // Default fallbacks
    if (symbol.includes('2')) return `03${dayNight}`; // Generic cloud
    if (symbol.includes('3')) return `10${dayNight}`; // Generic rain
    if (symbol.includes('4')) return `13${dayNight}`; // Generic snow

    return `01${dayNight}`; // Default to clear
};


/**
 * Виджет для отображения текущей погоды и прогноза на несколько дней.
 * Поддерживает OpenWeatherMap, Yandex, Foreca и Home Assistant (через сервис weather.get_forecasts).
 */
const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weatherProvider, weatherEntityId, openWeatherMapKey, yandexWeatherKey, forecaApiKey, getConfig, colorScheme, weatherSettings }) => {
    const [externalWeatherData, setExternalWeatherData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Get reactive device from store for HA provider.
    // This ensures the component re-renders when the device state changes, without triggering API calls.
    const haDevice = useHAStore(state => state.allKnownDevices.get(weatherEntityId));

    useEffect(() => {
        const { forecastDays } = weatherSettings;
        
        // Skip fetch for Home Assistant provider, as it relies on the reactive `haDevice` from store
        // and global periodic fetching in App.tsx
        if (weatherProvider === 'homeassistant') {
            setExternalWeatherData(null);
            setLoading(false);
            setError(null);
            return;
        }

        const fetchOpenWeatherMapWeather = async () => {
            if (!openWeatherMapKey) throw new Error("Ключ API OpenWeatherMap не настроен.");
            
            const haConfig = await getConfig();
            const { latitude: lat, longitude: lon } = haConfig;
            if (!lat || !lon) throw new Error("В конфигурации HA не найдены широта или долгота.");

            const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${openWeatherMapKey}&units=metric&lang=ru`;
            const weatherRes = await fetch(forecastUrl);

            if (!weatherRes.ok) {
                if (weatherRes.status === 401) throw new Error("Неверный ключ API OpenWeatherMap.");
                throw new Error(`Ошибка при получении прогноза: ${weatherRes.statusText}`);
            }

            const data = await weatherRes.json();
            if (!data || !Array.isArray(data.list) || data.list.length === 0) throw new Error("API вернуло пустые или некорректные данные.");
            
            const days: { [key: string]: any[] } = {};
            for (const item of data.list) {
                const dayKey = item.dt_txt.split(' ')[0];
                if (!days[dayKey]) days[dayKey] = [];
                days[dayKey].push(item);
            }

            const forecast = Object.entries(days).slice(0, forecastDays).map(([dayKey, arr]) => {
                const dt = new Date(dayKey);
                const dayName = dt.toLocaleDateString("ru-RU", { weekday: "short" });
                const tempMax = Math.max(...arr.map((e) => e.main.temp_max));
                const tempMin = Math.min(...arr.map((e) => e.main.temp_min));
                const noonSample = arr[Math.floor(arr.length / 2)];
                const icon = noonSample.weather[0].icon;
                return { day: dayName, tempMax, tempMin, icon };
            });

            const now = data.list[0];
            return {
                current: { temp: Math.round(now.main.temp), desc: now.weather[0].description, icon: now.weather[0].icon },
                forecast
            };
        };
        
        const fetchYandexWeather = async () => {
            if (!yandexWeatherKey) throw new Error("Ключ API Яндекс Погоды не настроен.");

            const haConfig = await getConfig();
            const { latitude: lat, longitude: lon } = haConfig;
            if (!lat || !lon) throw new Error("В конфигурации HA не найдены широта или долгота.");
            
            const url = `https://api.weather.yandex.ru/v2/forecast?lat=${lat}&lon=${lon}&lang=ru_RU&limit=${forecastDays}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Yandex-Weather-Key': yandexWeatherKey
                }
            });
            
            if (!response.ok) {
                if(response.status === 403) throw new Error("Неверный или неактивный ключ API Яндекс Погоды.");
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Ошибка API Яндекс Погоды: ${errorData.message || response.statusText}`);
            }
            
            const data = await response.json();
            
            const { fact: now, forecasts } = data;
            
            if (!now || !forecasts) {
                throw new Error("API Яндекс Погоды вернуло некорректные данные.");
            }

            return {
                current: {
                    temp: now.temp,
                    desc: yandexConditionToText[now.condition] || now.condition,
                    icon: yandexIconToOwmCode[now.icon] || '01d',
                },
                forecast: forecasts.slice(0, forecastDays).map((f: any) => ({
                    day: new Date(f.date).toLocaleDateString("ru-RU", { weekday: "short" }),
                    tempMax: f.parts.day.temp_max,
                    tempMin: f.parts.day.temp_min,
                    icon: yandexIconToOwmCode[f.parts.day.icon] || '01d',
                }))
            };
        };
        
        const fetchForecaWeather = async () => {
            if (!forecaApiKey) throw new Error("Ключ API Foreca не настроен.");

            const haConfig = await getConfig();
            const { latitude: lat, longitude: lon } = haConfig;
            if (!lat || !lon) throw new Error("В конфигурации HA не найдены широта или долгота.");

            // 1. Find location ID
            const locationUrl = `https://fnw-ws.foreca.com/api/v1/location/search/${lon},lat=${lat}?lang=ru`;
            const locationResponse = await fetch(locationUrl, {
                headers: { 'Authorization': `Bearer ${forecaApiKey}` }
            });

            if (!locationResponse.ok) {
                if(locationResponse.status === 401) throw new Error("Неверный ключ API Foreca.");
                throw new Error(`Ошибка поиска локации Foreca: ${locationResponse.statusText}`);
            }
            const locationData = await locationResponse.json();
            const locationId = locationData?.locations?.[0]?.id;
            if (!locationId) throw new Error("Не удалось найти локацию в Foreca.");

            // 2. Fetch current and forecast data
            const [currentResponse, forecastResponse] = await Promise.all([
                fetch(`https://fnw-ws.foreca.com/api/v1/current/${locationId}`, { headers: { 'Authorization': `Bearer ${forecaApiKey}` } }),
                fetch(`https://fnw-ws.foreca.com/api/v1/forecast/daily/${locationId}?dataset=full&periods=${forecastDays}&lang=ru`, { headers: { 'Authorization': `Bearer ${forecaApiKey}` } })
            ]);

            if (!currentResponse.ok || !forecastResponse.ok) {
                throw new Error("Ошибка при получении данных погоды от Foreca.");
            }

            const currentData = await currentResponse.json();
            const forecastData = await forecastResponse.json();

            const { current } = currentData;
            const { forecast } = forecastData;

            if (!current || !forecast) {
                throw new Error("API Foreca вернуло некорректные данные.");
            }
            
            return {
                current: {
                    temp: current.temperature,
                    desc: current.symbolPhrase,
                    icon: forecaSymbolToOwmCode(current.symbol),
                },
                forecast: forecast.slice(0, forecastDays).map((f: any) => ({
                    day: new Date(f.date).toLocaleDateString("ru-RU", { weekday: "short" }),
                    tempMax: f.maxTemp,
                    tempMin: f.minTemp,
                    icon: forecaSymbolToOwmCode(f.symbol),
                }))
            };
        };

        const fetchWeather = async () => {
            setLoading(true);
            setError(null);
            try {
                let fetchFn;
                switch (weatherProvider) {
                    case 'yandex':
                        fetchFn = fetchYandexWeather;
                        break;
                    case 'foreca':
                        fetchFn = fetchForecaWeather;
                        break;
                    default:
                        fetchFn = fetchOpenWeatherMapWeather;
                        break;
                }
                const processedData = await fetchFn();
                setExternalWeatherData(processedData);
            } catch (err: any) {
                console.error("Failed to fetch weather data:", err);
                setError(err.message || "Неизвестная ошибка.");
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
        const interval = setInterval(fetchWeather, 30 * 60 * 1000); // 30 mins
        return () => clearInterval(interval);
    }, [weatherProvider, weatherEntityId, openWeatherMapKey, yandexWeatherKey, forecaApiKey, getConfig, weatherSettings]);

    // Derive display data based on provider
    let weatherData: WeatherData | null = null;
    let displayError = error;

    if (weatherProvider === 'homeassistant') {
        if (!weatherEntityId) {
            displayError = "Сущность погоды не выбрана.";
        } else if (!haDevice) {
            // Only show error if we are reasonably sure we should have data (e.g. connection is established)
            // For now, simple check to avoid flashing error on load
             displayError = "Устройство не найдено или загружается.";
        } else {
             const { forecastDays } = weatherSettings;
             const mappedForecast = (haDevice.forecast || []).slice(0, forecastDays).map((f: WeatherForecast) => {
                 const dt = new Date(f.datetime);
                 const dayName = dt.toLocaleDateString("ru-RU", { weekday: "short" });
                 return {
                     day: dayName,
                     tempMax: f.temperature,
                     tempMin: f.templow !== undefined ? f.templow : f.temperature,
                     icon: haConditionToOwmCode[f.condition || ''] || '01d'
                 };
             });

             weatherData = {
                 current: {
                     temp: haDevice.temperature ?? 0,
                     desc: haDevice.status,
                     icon: haConditionToOwmCode[haDevice.condition || ''] || '01d'
                 },
                 forecast: mappedForecast
             };
             displayError = null; // Clear error if device found
        }
    } else {
        weatherData = externalWeatherData;
    }

    if (loading && !weatherData) {
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

    if ((displayError && !weatherData) || (weatherProvider === 'homeassistant' && !haDevice)) {
        return ( // Сообщение об ошибке
            <div className="text-red-400 bg-red-900/30 p-3 rounded-lg">
                <p className="text-sm font-semibold">Ошибка погоды</p>
                <p className="text-xs text-red-400/80 mt-1">{displayError || "Не удалось загрузить данные."}</p>
            </div>
        );
    }
    
    // Fallback for safety
    if (!weatherData) return null;
    
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
                      iconPack={weatherSettings.iconPack}
                      className="w-24 h-24 flex-shrink-0"
                      style={{ width: currentIconSize, height: currentIconSize }}
                    />
                    <p className="text-4xl font-bold" style={{ color: colorScheme.valueTextColor, fontSize: colorScheme.weatherCurrentTempFontSize ? `${colorScheme.weatherCurrentTempFontSize}px` : undefined }}>
                      {Math.round(current.temp)}°C
                    </p>
                </div>
                <div className="w-24 text-center -mt-2">
                    <p className="text-sm capitalize" title={current.desc} style={{ color: colorScheme.statusTextColor, fontSize: colorScheme.weatherCurrentDescFontSize ? `${colorScheme.weatherCurrentDescFontSize}px` : undefined }}>
                      {current.desc}
                    </p>
                </div>
            </div>

            {/* Прогноз на N дней */}
            {forecast.length > 0 ? (
                <div className="mt-4 grid gap-2 text-center" style={{ gridTemplateColumns: `repeat(${Math.min(forecast.length, weatherSettings.forecastDays)}, minmax(0, 1fr))` }}>
                    {forecast.map((day, index) => (
                        <div key={index} className="flex flex-col items-center space-y-1">
                            <p className="text-xs font-medium capitalize" style={{ color: colorScheme.nameTextColor, fontSize: colorScheme.weatherForecastDayFontSize ? `${colorScheme.weatherForecastDayFontSize}px` : undefined, }}>
                              {day.day}
                            </p>
                             <AnimatedWeatherIcon
                                iconCode={day.icon}
                                iconPack={weatherSettings.iconPack}
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
            ) : (
                <div className="mt-4 text-center text-sm opacity-60 py-2" style={{ color: colorScheme.statusTextColor }}>
                    Прогноз недоступен
                </div>
            )}
        </div>
    );
};

export default WeatherWidget;
