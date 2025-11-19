'use client';

import { useState, useCallback } from 'react';
import { ForecastData, fetchWeatherForecast } from '../utils/weatherForecast';

interface UseWeatherForecastReturn {
  forecast: ForecastData[] | null;
  loading: boolean;
  error: string | null;
  fetchForecast: (entityId: string, haUrl: string, token: string) => Promise<void>;
  clear: () => void;
}

export const useWeatherForecast = (): UseWeatherForecastReturn => {
  const [forecast, setForecast] = useState<ForecastData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(
    async (entityId: string, haUrl: string, token: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWeatherForecast(entityId, haUrl, token);
        setForecast(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch weather forecast');
        setForecast(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clear = useCallback(() => {
    setForecast(null);
    setError(null);
    setLoading(false);
  }, []);

  return { forecast, loading, error, fetchForecast, clear };
};

export default useWeatherForecast;
