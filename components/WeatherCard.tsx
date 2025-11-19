import React from 'react';
import { ForecastData, fetchWeatherForecast } from '../utils/weatherForecast';

interface WeatherCardProps {
  entityId: string;
  haUrl: string;
  token: string;
}

export function WeatherCard({ entityId, haUrl, token }: WeatherCardProps) {
  const [forecast, setForecast] = React.useState<ForecastData[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWeatherForecast(entityId, haUrl, token);
        setForecast(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [entityId, haUrl, token]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!forecast.length) return <div className="p-4">No data</div>;

  return (
    <div className="p-4 bg-slate-800 rounded-lg shadow-lg max-w-md">
      <h3 className="mb-4 text-lg font-semibold text-slate-100">Weather Forecast</h3>
      <div className="grid grid-cols-2 gap-2">
        {forecast.slice(0, 5).map((day, i) => (
          <div key={i} className="p-2 bg-slate-700 rounded">
            <div className="text-sm font-medium text-slate-200">{day.datetime}</div>
            <div className="text-xs text-slate-400">
              {day.temperature}°C {day.condition}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
