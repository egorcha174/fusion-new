# Weather Forecast Integration Guide

This document provides a comprehensive setup guide for integrating Home Assistant weather forecasts into the Fusion UI application.

## Overview

The weather forecast integration consists of three main components:

- **Utility Function** (`utils/weatherForecast.ts`) - API communication with Home Assistant
- **React Component** (`components/WeatherCard.tsx`) - UI display of forecast data
- **Custom Hook** (`hooks/useWeatherForecast.ts`) - State management and data fetching

## Prerequisites

1. Home Assistant running and accessible
2. Home Assistant Long-Lived Access Token
3. A weather entity in Home Assistant (e.g., `weather.home`)

## Setup Instructions

### Step 1: Obtain Home Assistant Access Token

1. Go to Home Assistant UI Settings > Users
2. Scroll down to "Long-Lived Access Tokens"
3. Click "Create Token"
4. Give it a name (e.g., "Fusion UI Weather")
5. Copy the generated token

### Step 2: Configure Environment Variables

Create or update your `.env.local` file in the project root:

```
NEXT_PUBLIC_HA_URL=http://192.168.0.98:8123
HA_TOKEN=your_long_lived_access_token_here
WEATHER_ENTITY_ID=weather.home
```

**Important Security Notes:**
- Never commit `.env.local` to version control
- The `HA_TOKEN` is sensitive - keep it secure
- Use `NEXT_PUBLIC_` prefix only for values that should be exposed to the client

### Step 3: Import and Use Components

#### Using the WeatherCard Component

```tsx
import WeatherCard from '@/components/WeatherCard';

export function MyPage() {
  const haUrl = process.env.NEXT_PUBLIC_HA_URL;
  const token = process.env.HA_TOKEN;
  const entityId = process.env.WEATHER_ENTITY_ID;

  return (
    <WeatherCard 
      entityId={entityId} 
      haUrl={haUrl} 
      token={token} 
    />
  );
}
```

#### Using the Custom Hook

```tsx
'use client';

import { useEffect } from 'react';
import { useWeatherForecast } from '@/hooks/useWeatherForecast';

export function WeatherDisplay() {
  const { forecast, loading, error, fetchForecast } = useWeatherForecast();

  useEffect(() => {
    fetchForecast(
      process.env.NEXT_PUBLIC_WEATHER_ENTITY_ID,
      process.env.NEXT_PUBLIC_HA_URL,
      process.env.HA_TOKEN
    );
  }, [fetchForecast]);

  if (loading) return <div>Loading forecast...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!forecast) return <div>No forecast data</div>;

  return (
    <div>
      {forecast.map((day, index) => (
        <div key={index}>
          <p>Date: {day.datetime}</p>
          <p>Temperature: {day.temperature}°C</p>
          <p>Condition: {day.condition}</p>
        </div>
      ))}
    </div>
  );
}
```

## API Details

### Endpoint

The integration uses the Home Assistant REST API weather endpoint:

```
GET /api/weather/{entity_id}
```

### Request Headers

```
Authorization: Bearer {your_token}
Content-Type: application/json
```

### Response Format

```json
[
  {
    "datetime": "2024-01-20T00:00:00Z",
    "temperature": 18,
    "temperature_high": 22,
    "temperature_low": 12,
    "condition": "clear-night",
    "humidity": 65,
    "precipitation": 0,
    "wind_speed": 5,
    "forecast": null
  }
]
```

## Error Handling

The integration includes error handling for:

- Network connectivity issues
- Invalid tokens
- Missing weather entities
- Malformed API responses

Errors are logged to the console and displayed in the UI when appropriate.

## Troubleshooting

### "Failed to fetch weather forecast" Error

1. Verify the Home Assistant URL is correct
2. Check that the access token is valid and not expired
3. Ensure the weather entity ID exists in Home Assistant
4. Check browser console for detailed error messages

### CORS Issues

If you encounter CORS errors:

1. Ensure Home Assistant is accessible from your frontend domain
2. Check Home Assistant CORS configuration
3. Use proper proxy settings if behind a firewall

### No Forecast Data

1. Verify the weather entity exists: Settings > Devices & Services > Weather
2. Check the entity ID format (usually `weather.{location_name}`)
3. Ensure the weather integration is properly configured in Home Assistant

## Integration with Existing Store

To auto-load weather forecasts when the app connects to Home Assistant:

1. Open `store/haStore.ts`
2. In the connection/initialization logic, add:

```tsx
const { data } = await fetchWeatherForecast(
  weatherEntityId,
  haUrl,
  token
);
setWeatherForecast(data);
```

3. Add weather forecast state to your store

## Performance Optimization

- Forecasts are cached during component lifecycle
- Implement refresh intervals using `setInterval` for periodic updates
- Use `React.memo` to prevent unnecessary re-renders
- Consider pagination for extended forecast periods

## Security Best Practices

1. Never expose long-lived tokens in version control
2. Use environment variables for all sensitive data
3. Implement token rotation policies
4. Monitor API usage for suspicious activity
5. Use HTTPS in production

## Support & Troubleshooting

For issues or questions:

1. Check Home Assistant logs: `Settings > System > Logs`
2. Verify network connectivity
3. Review browser developer console for errors
4. Check Home Assistant API documentation

## References

- [Home Assistant REST API Documentation](https://developers.home-assistant.io/docs/api/rest/)
- [Home Assistant Weather Integration](https://www.home-assistant.io/integrations/weather/)
