
import { ThemeColors } from '../types';

/**
 * Применяет заданную прозрачность к строке цвета.
 * @param color - Строка цвета (HEX, RGB, RGBA).
 * @param opacity - Прозрачность от 0 до 1.
 * @returns - Строка цвета в формате RGBA.
 */
export const applyOpacity = (color: string | undefined, opacity: number | undefined): string => {
    if (!color) return 'transparent';
    if (opacity === undefined || opacity >= 1) return color;
    if (opacity < 0) opacity = 0;

    let r = 0, g = 0, b = 0;

    if (color.startsWith('#')) {
        const hex = color.length === 4 ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}` : color;
        if (hex.length === 7) {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
        } else {
            return color;
        }
    } else if (color.startsWith('rgb')) {
        const parts = color.match(/(\d+(\.\d+)?)/g);
        if (parts && parts.length >= 3) {
            r = parseFloat(parts[0]);
            g = parseFloat(parts[1]);
            b = parseFloat(parts[2]);
        } else {
            return color;
        }
    } else {
        return color;
    }

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Generates CSS variables string from a theme configuration.
 */
export const generateThemeCss = (theme: ThemeColors): string => {
    const cardBg = applyOpacity(theme.cardBackground, theme.cardOpacity ?? 1);
    const cardBgOn = applyOpacity(theme.cardBackgroundOn, theme.cardOpacity ?? 1);
    const panelBg = `rgba(30, 30, 30, ${theme.panelOpacity ?? 0.75})`; // Base dark, overridden by specific logic in components if needed, or standardized here.
    
    // Note: Dashboard background logic is complex (gradient vs image), handled in specific var generation below.

    let dashboardBg = theme.dashboardBackgroundColor1;
    if (theme.dashboardBackgroundType === 'gradient') {
        dashboardBg = `linear-gradient(160deg, ${theme.dashboardBackgroundColor1}, ${theme.dashboardBackgroundColor2 || theme.dashboardBackgroundColor1})`;
    } else if (theme.dashboardBackgroundType === 'image' && theme.dashboardBackgroundImage) {
        // Images are handled via style prop usually due to size, but we can set a fallback color
        dashboardBg = theme.dashboardBackgroundColor1; 
    }

    return `
        :root {
            /* Backgrounds */
            --bg-dashboard-1: ${theme.dashboardBackgroundColor1};
            --bg-dashboard-2: ${theme.dashboardBackgroundColor2 || theme.dashboardBackgroundColor1};
            --bg-card: ${cardBg};
            --bg-card-on: ${cardBgOn};
            --bg-card-raw: ${theme.cardBackground};
            --bg-card-on-raw: ${theme.cardBackgroundOn};
            
            /* Opacity & Dimensions */
            --opacity-card: ${theme.cardOpacity ?? 1};
            --opacity-panel: ${theme.panelOpacity ?? 0.75};
            --radius-card: ${theme.cardBorderRadius ?? 16}px;
            --border-width-card: ${theme.cardBorderWidth ?? 0}px;
            --border-color-card: ${theme.cardBorderColor || 'transparent'};
            --border-color-card-on: ${theme.cardBorderColorOn || 'transparent'};

            /* Text Colors (Off State) */
            --text-name: ${theme.nameTextColor};
            --text-status: ${theme.statusTextColor};
            --text-value: ${theme.valueTextColor};
            --text-unit: ${theme.unitTextColor};

            /* Text Colors (On State) */
            --text-name-on: ${theme.nameTextColorOn};
            --text-status-on: ${theme.statusTextColorOn};
            --text-value-on: ${theme.valueTextColorOn};
            --text-unit-on: ${theme.unitTextColorOn};

            /* Interface */
            --text-tab: ${theme.tabTextColor};
            --text-tab-active: ${theme.activeTabTextColor};
            --indicator-tab: ${theme.tabIndicatorColor};
            --text-clock: ${theme.clockTextColor};

            /* Thermostat */
            --thermo-handle: ${theme.thermostatHandleColor};
            --thermo-text: ${theme.thermostatDialTextColor};
            --thermo-label: ${theme.thermostatDialLabelColor};
            --thermo-heat: ${theme.thermostatHeatingColor};
            --thermo-cool: ${theme.thermostatCoolingColor};

            /* Weather Widget */
            --weather-icon-size: ${theme.weatherIconSize ?? 96}px;
            --weather-forecast-icon-size: ${theme.weatherForecastIconSize ?? 48}px;
            --weather-current-temp-size: ${theme.weatherCurrentTempFontSize ?? 36}px;
            --weather-current-desc-size: ${theme.weatherCurrentDescFontSize ?? 14}px;
            --weather-forecast-day-size: ${theme.weatherForecastDayFontSize ?? 12}px;
            --weather-forecast-max-temp-size: ${theme.weatherForecastMaxTempFontSize ?? 18}px;
            --weather-forecast-min-temp-size: ${theme.weatherForecastMinTempFontSize ?? 14}px;
        }
    `;
};
