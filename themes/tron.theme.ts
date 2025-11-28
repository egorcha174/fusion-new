import { ThemeDefinition } from '../types';

export const tronTheme: ThemeDefinition = {
    id: 'tron',
    name: 'Трон',
    isCustom: false,
    scheme: {
        light: {
            dashboardBackgroundType: "gradient",
            dashboardBackgroundColor1: "#F0F9FF",
            dashboardBackgroundColor2: "#CFFAFE",
            dashboardBackgroundImageBlur: 0,
            dashboardBackgroundImageBrightness: 100,
            cardOpacity: 0.9,
            panelOpacity: 0.8,
            cardBorderRadius: 6,
            cardBorderWidth: 1,
            cardBorderColor: "#0891B2",
            cardBorderColorOn: "#0891B2",
            iconBackgroundShape: "rounded-square",
            iconBackgroundColorOn: "rgba(8, 145, 178, 0.15)",
            iconBackgroundColorOff: "rgba(8, 145, 178, 0.05)",
            cardBackground: "rgba(255, 255, 255, 0.9)",
            cardBackgroundOn: "rgba(224, 242, 254, 1)",
            tabTextColor: "#64748B",
            activeTabTextColor: "#0891B2",
            tabIndicatorColor: "#0891B2",
            thermostatHandleColor: "#FFFFFF",
            thermostatDialTextColor: "#0891B2",
            thermostatDialLabelColor: "#64748B",
            thermostatHeatingColor: "#EA580C",
            thermostatCoolingColor: "#06B6D4",
            clockTextColor: "#0891B2",
            weatherIconSize: 96,
            weatherForecastIconSize: 48,
            weatherCurrentTempFontSize: 36,
            weatherCurrentDescFontSize: 14,
            weatherForecastDayFontSize: 12,
            weatherForecastMaxTempFontSize: 18,
            weatherForecastMinTempFontSize: 14,
            nameTextColor: "#334155",
            statusTextColor: "#64748B",
            valueTextColor: "#0891B2",
            unitTextColor: "#0891B2",
            nameTextColorOn: "#0C4A6E",
            statusTextColorOn: "#0369A1",
            valueTextColorOn: "#0891B2",
            unitTextColorOn: "#0891B2"
        },
        dark: {
            dashboardBackgroundType: "gradient",
            dashboardBackgroundColor1: "#020617", // Nearly black
            dashboardBackgroundColor2: "#0B1120", // Dark blue-black
            dashboardBackgroundImageBlur: 0,
            dashboardBackgroundImageBrightness: 100,
            cardOpacity: 0.85,
            panelOpacity: 0.85,
            cardBorderRadius: 6, // Tech feel
            cardBorderWidth: 1,
            cardBorderColor: "#22D3EE",
            cardBorderColorOn: "#22D3EE",
            iconBackgroundShape: "rounded-square",
            iconBackgroundColorOn: "rgba(34, 211, 238, 0.15)",
            iconBackgroundColorOff: "rgba(34, 211, 238, 0.05)",
            cardBackground: "rgba(15, 23, 42, 0.6)", // Dark Slate
            cardBackgroundOn: "rgba(6, 182, 212, 0.25)", // Cyan glow
            tabTextColor: "#475569",
            activeTabTextColor: "#22D3EE", // Cyan Neon
            tabIndicatorColor: "#22D3EE",
            thermostatHandleColor: "#0F172A",
            thermostatDialTextColor: "#22D3EE",
            thermostatDialLabelColor: "#94A3B8",
            thermostatHeatingColor: "#F97316", // Neon Orange (Clu)
            thermostatCoolingColor: "#22D3EE", // Neon Blue (Tron)
            clockTextColor: "#22D3EE",
            weatherIconSize: 96,
            weatherForecastIconSize: 48,
            weatherCurrentTempFontSize: 36,
            weatherCurrentDescFontSize: 14,
            weatherForecastDayFontSize: 12,
            weatherForecastMaxTempFontSize: 18,
            weatherForecastMinTempFontSize: 14,
            nameTextColor: "#E2E8F0",
            statusTextColor: "#64748B",
            valueTextColor: "#22D3EE",
            unitTextColor: "#22D3EE",
            nameTextColorOn: "#FFFFFF",
            statusTextColorOn: "#A5F3FC",
            valueTextColorOn: "#FFFFFF",
            unitTextColorOn: "#FFFFFF"
        }
    }
};
