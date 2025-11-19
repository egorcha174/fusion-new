// Weather Forecast Utility for Home Assistant
export interface ForecastData {
  datetime: string;
  temperature: number | null;
  templow?: number | null;
  condition?: string;
}

export async function fetchWeatherForecast(
  entityId: string,
  haUrl: string,
  token: string
): Promise<ForecastData[]> {
  try {
    const url = `${haUrl}/api/weather/${entityId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.forecast) ? data.forecast : [];
  } catch (error) {
    console.error('Weather forecast error:', error);
    return [];
  }
}
