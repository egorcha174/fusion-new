
import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useHAStore } from '../store/haStore';
import { WeatherData, WeatherForecast } from '../types';
import { yandexConditionToText, yandexIconToOwmCode, forecaSymbolToOwmCode, haConditionToOwmCode } from '../utils/weatherUtils';

export const useWeather = () => {
    const {
        weatherProvider,
        weatherEntityId,
        openWeatherMapKey,
        yandexWeatherKey,
        forecaApiKey,
        weatherSettings,
        setWeatherData
    } = useAppStore();

    const { getConfig, allKnownDevices } = useHAStore();

    useEffect(() => {
        // If using Home Assistant provider, map the entity directly from store to weatherData
        if (weatherProvider === 'homeassistant') {
            if (weatherEntityId) {
                const device = allKnownDevices.get(weatherEntityId);
                if (device) {
                    const { forecastDays } = weatherSettings;
                    const mappedForecast = (device.forecast || []).slice(0, forecastDays).map((f: WeatherForecast) => {
                        const dt = new Date(f.datetime);
                        const dayName = dt.toLocaleDateString("ru-RU", { weekday: "short" });
                        return {
                            day: dayName,
                            tempMax: f.temperature,
                            tempMin: f.templow !== undefined ? f.templow : f.temperature,
                            icon: haConditionToOwmCode[f.condition || ''] || '01d'
                        };
                    });

                    const newWeatherData: WeatherData = {
                        current: {
                            temp: device.temperature ?? 0,
                            desc: device.status,
                            icon: haConditionToOwmCode[device.condition || ''] || '01d'
                        },
                        forecast: mappedForecast
                    };
                    setWeatherData(newWeatherData);
                } else {
                    setWeatherData(null);
                }
            } else {
                setWeatherData(null);
            }
            return; // Stop here for HA provider
        }

        // For external providers, fetch periodically
        const { forecastDays } = weatherSettings;

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
                const tempMax = Math.max(...arr.map((e: any) => e.main.temp_max));
                const tempMin = Math.min(...arr.map((e: any) => e.main.temp_min));
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
                setWeatherData(processedData);
            } catch (err: any) {
                console.error("Failed to fetch weather data:", err);
                setWeatherData(null);
            }
        };

        fetchWeather();
        const interval = setInterval(fetchWeather, 30 * 60 * 1000); // 30 mins
        return () => clearInterval(interval);
    }, [
        weatherProvider, weatherEntityId, openWeatherMapKey, 
        yandexWeatherKey, forecaApiKey, weatherSettings, 
        getConfig, setWeatherData, allKnownDevices
    ]);
};
