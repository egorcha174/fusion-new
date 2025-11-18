import React, { useState, useEffect, useMemo } from 'react';
import { ColorScheme, WeatherSettings, Device } from '../types';
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
    weatherProvider: 'openweathermap' | 'yandex' | 'foreca' | 'homeassistant';
    openWeatherMapKey: string;
    yandexWeatherKey: string;
    forecaApiKey: string;
    getConfig: () => Promise<any>;
    colorScheme: ColorScheme['light'];
    weatherSettings: WeatherSettings;
    allKnownDevices: Map<string, Device>;
    weatherEntityId: string | null;
    getWeatherForecasts: (entityId: string, type: 'daily' | 'hourly') => Promise<any>;
}

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
 * Преобразует состояние погоды из Home Assistant в код иконки OpenWeatherMap.
 * @param {string} condition - Состояние из Home Assistant (например, 'partlycloudy').
 * @returns {string} - Код иконки OWM (например, '02d').
 */
const haConditionToOwmCode = (condition: string): string => {
    const mapping: { [key: string]: string } = {
        'clear-night': '01n', 'sunny': '01d', 'cloudy': '03d',
        'partlycloudy': '02d', 'fog': '50d', 'hail': '09d',
        'rainy': '10d', 'pouring': '09d', 'snowy': '13d',
        'snowy-rainy': '13d', 'lightning': '11d', 'lightning-rainy': '11d',
        'windy': '02d', 'windy-variant': '02d', 'exceptional': '01d',
    };
    return mapping[condition] || '01d';
};


/**
 * Виджет для отображения текущей погоды и прогноза на несколько дней.
 * Получает данные из OpenWeatherMap API, используя координаты из конфигурации Home Assistant.
 */
const WeatherWidget: React.FC<WeatherWidgetProps> = (props) => {
    const { weatherProvider, openWeatherMapKey, yandexWeatherKey, forecaApiKey, getConfig, colorScheme, weatherSettings, allKnownDevices, weatherEntityId, getWeatherForecasts } = props;
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Мемоизируем сущность погоды, чтобы уменьшить количество пересчетов.
    const weatherEntity = useMemo(() => weatherEntityId ? allKnownDevices.get(weatherEntityId) : null, [allKnownDevices, weatherEntityId]);

    // Создаем стабильные зависимости для useEffect, чтобы избежать лишних перезагрузок.
    const { temperature, status, condition } = weatherEntity || {};
    const forecastJson = useMemo(() => JSON.stringify(weatherEntity?.forecast), [weatherEntity?.forecast]);


    useEffect(() => {
        const { forecastDays } = weatherSettings;

        /**
         * Получает и обрабатывает данные из встроенной интеграции погоды Home Assistant.
         */
        const fetchHomeAssistantWeather = async (): Promise<WeatherData> => {
            if (!weatherEntityId || !weatherEntity) {
                throw new Error("Сущность погоды Home Assistant не выбрана или не найдена.");
            }
            
            if (weatherEntity.haDomain !== 'weather') {
                throw new Error("Выбранная сущность не является погодной интеграцией.");
            }

            // Получение прогноза через сервис
            let forecastData: any[] = [];
            try {
                // Запрашиваем ежедневный прогноз
                const forecastResult = await getWeatherForecasts(weatherEntityId, 'daily');
                // Ответ содержит ключ с entity_id, внутри которого находится массив forecast
                if (forecastResult && forecastResult[weatherEntityId] && forecastResult[weatherEntityId].forecast) {
                    forecastData = forecastResult[weatherEntityId].forecast;
                } else {
                    console.warn('Прогноз погоды не был получен от сервиса get_forecasts.');
                }
            } catch (e) {
                console.error("Ошибка при вызове сервиса weather.get_forecasts:", e);
                // Если сервис не сработал, не прерываем выполнение, а просто оставляем прогноз пустым
            }

            // Fallback: если сервис не вернул данные, пытаемся взять их из атрибутов сущности (для старых интеграций)
            if (forecastData.length === 0 && weatherEntity.forecast && weatherEntity.forecast.length > 0) {
                console.log('Используется прогноз из атрибутов сущности (fallback).');
                forecastData = weatherEntity.forecast;
            }
    
            return {
                current: {
                    temp: Math.round(weatherEntity.temperature ?? 0),
                    desc: weatherEntity.status,
                    icon: haConditionToOwmCode(weatherEntity.condition ?? 'sunny'),
                },
                forecast: forecastData.slice(0, forecastDays).map((f) => ({
                    day: new Date(f.datetime).toLocaleDateString("ru-RU", { weekday: "short" }),
                    tempMax: f.temperature, // HA daily forecast usually uses 'temperature' for max temp
                    tempMin: f.templow,
                    icon: haConditionToOwmCode(f.condition),
                }))
            };
        };
        
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
            const locationUrl = `https://fnw-ws.foreca.com/api/v1/location/search/${lon},${lat}?lang=ru`;
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
                    case 'homeassistant':
                        fetchFn = fetchHomeAssistantWeather;
                        break;
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
                setWeatherData(processedData);
            } catch (err: any) {
                console.error("Failed to fetch weather data:", err);
                setError(err.message || "Неизвестная ошибка.");
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [
        weatherProvider,
        openWeatherMapKey,
        yandexWeatherKey,
        forecaApiKey,
        weatherEntityId,
        weatherSettings.forecastDays,
        // Более точные зависимости для предотвращения лишних перезагрузок
        temperature,
        status,
        condition,
        forecastJson,
        // Функции из пропсов
        getConfig,
        getWeatherForecasts
    ]);

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
            {forecast && forecast.length > 0 && (
                <div className={`mt-4 grid grid-cols-${weatherSettings.forecastDays} gap-2 text-center`}>
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
            )}
        </div>
    );
};

export default WeatherWidget;