import React, { useRef, useState, useMemo } from 'react';
import { CardTemplates, CardTemplate, ColorScheme, DeviceType, ColorThemeSet, SepticTankSettings } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { useAppStore } from '../store/appStore';
import { useHAStore } from '../store/haStore';
import JSZip from 'jszip';
import { Icon } from '@iconify/react';
import appleTheme from '../apple-inspired-light.theme.json';
import { LOCAL_STORAGE_KEYS } from '../constants';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'failed';
type SettingsTab = 'appearance' | 'interface' | 'templates' | 'connection' | 'backup';

// FIX: Define a type for theme objects to ensure they conform to the ColorScheme interface, which prevents TypeScript from inferring 'dashboardBackgroundType' as a generic string.
type ThemeObject = {
  colorScheme: ColorScheme;
};

const FONT_FAMILIES = [
    { name: 'Системный', value: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"` },
    { name: 'San Francisco (SF Pro)', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { name: 'Tahoma', value: 'Tahoma, Verdana, Segoe, sans-serif' },
    { name: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { name: 'Times New Roman', value: '"Times New Roman", Times, serif' },
];

// --- Новые темы ---
const appleGraphiteTheme: ThemeObject = {
  "colorScheme": {
    "light": {
      "dashboardBackgroundType": "gradient", "dashboardBackgroundColor1": "#EAEAEB", "dashboardBackgroundColor2": "#DCDCDC", "dashboardBackgroundImageBlur": 0, "dashboardBackgroundImageBrightness": 100, "cardOpacity": 0.85, "panelOpacity": 0.75,
      "cardBackground": "rgba(255, 255, 255, 0.8)", "cardBackgroundOn": "rgba(255, 255, 255, 0.95)", "tabTextColor": "#515154", "activeTabTextColor": "#1D1D1F", "tabIndicatorColor": "#1D1D1F",
      "thermostatHandleColor": "#FFFFFF", "thermostatDialTextColor": "#1D1D1F", "thermostatDialLabelColor": "#515154", "thermostatHeatingColor": "#F97316", "thermostatCoolingColor": "#3B82F6", "clockTextColor": "#1D1D1F",
      "weatherIconSize": 96, "weatherForecastIconSize": 48, "weatherCurrentTempFontSize": 36, "weatherCurrentDescFontSize": 14, "weatherForecastDayFontSize": 12, "weatherForecastMaxTempFontSize": 18, "weatherForecastMinTempFontSize": 14,
      "nameTextColor": "#1D1D1F", "statusTextColor": "#515154", "valueTextColor": "#1D1D1F", "unitTextColor": "#1D1D1F", "nameTextColorOn": "#1D1D1F", "statusTextColorOn": "#515154", "valueTextColorOn": "#1D1D1F", "unitTextColorOn": "#1D1D1F"
    },
    "dark": {
      "dashboardBackgroundType": "color", "dashboardBackgroundColor1": "#1C1C1E", "dashboardBackgroundColor2": "#2C2C2E", "dashboardBackgroundImageBlur": 0, "dashboardBackgroundImageBrightness": 100, "cardOpacity": 0.8, "panelOpacity": 0.75,
      "cardBackground": "rgba(44, 44, 46, 0.8)", "cardBackgroundOn": "rgba(60, 60, 62, 0.85)", "tabTextColor": "#8E8E93", "activeTabTextColor": "#F5F5F7", "tabIndicatorColor": "#F5F5F7",
      "thermostatHandleColor": "#1C1C1E", "thermostatDialTextColor": "#F5F5F7", "thermostatDialLabelColor": "#8E8E93", "thermostatHeatingColor": "#F28C18", "thermostatCoolingColor": "#0A84FF", "clockTextColor": "#F5F5F7",
      "weatherIconSize": 96, "weatherForecastIconSize": 48, "weatherCurrentTempFontSize": 36, "weatherCurrentDescFontSize": 14, "weatherForecastDayFontSize": 12, "weatherForecastMaxTempFontSize": 18, "weatherForecastMinTempFontSize": 14,
      "nameTextColor": "#F5F5F7", "statusTextColor": "#8E8E93", "valueTextColor": "#F5F5F7", "unitTextColor": "#F5F5F7", "nameTextColorOn": "#F5F5F7", "statusTextColorOn": "#8E8E93", "valueTextColorOn": "#F5F5F7", "unitTextColorOn": "#F5F5F7"
    }
  }
};
const appleMintTheme: ThemeObject = {
  "colorScheme": {
    "light": {
      "dashboardBackgroundType": "gradient", "dashboardBackgroundColor1": "#F0F7F6", "dashboardBackgroundColor2": "#E6F0EF", "dashboardBackgroundImageBlur": 0, "dashboardBackgroundImageBrightness": 100, "cardOpacity": 0.85, "panelOpacity": 0.75,
      "cardBackground": "rgba(255, 255, 255, 0.8)", "cardBackgroundOn": "rgba(255, 255, 255, 0.95)", "tabTextColor": "#374151", "activeTabTextColor": "#065F46", "tabIndicatorColor": "#059669",
      "thermostatHandleColor": "#FFFFFF", "thermostatDialTextColor": "#065F46", "thermostatDialLabelColor": "#374151", "thermostatHeatingColor": "#F97316", "thermostatCoolingColor": "#3B82F6", "clockTextColor": "#065F46",
      "weatherIconSize": 96, "weatherForecastIconSize": 48, "weatherCurrentTempFontSize": 36, "weatherCurrentDescFontSize": 14, "weatherForecastDayFontSize": 12, "weatherForecastMaxTempFontSize": 18, "weatherForecastMinTempFontSize": 14,
      "nameTextColor": "#374151", "statusTextColor": "#6B7280", "valueTextColor": "#065F46", "unitTextColor": "#065F46", "nameTextColorOn": "#065F46", "statusTextColorOn": "#374151", "valueTextColorOn": "#065F46", "unitTextColorOn": "#065F46"
    },
    "dark": {
      "dashboardBackgroundType": "color", "dashboardBackgroundColor1": "#1A2421", "dashboardBackgroundColor2": "#212E2A", "dashboardBackgroundImageBlur": 0, "dashboardBackgroundImageBrightness": 100, "cardOpacity": 0.8, "panelOpacity": 0.75,
      "cardBackground": "rgba(30, 41, 59, 0.8)", "cardBackgroundOn": "rgba(38, 52, 75, 0.85)", "tabTextColor": "#9CA3AF", "activeTabTextColor": "#A7F3D0", "tabIndicatorColor": "#34D399",
      "thermostatHandleColor": "#1A2421", "thermostatDialTextColor": "#A7F3D0", "thermostatDialLabelColor": "#9CA3AF", "thermostatHeatingColor": "#F28C18", "thermostatCoolingColor": "#0A84FF", "clockTextColor": "#A7F3D0",
      "weatherIconSize": 96, "weatherForecastIconSize": 48, "weatherCurrentTempFontSize": 36, "weatherCurrentDescFontSize": 14, "weatherForecastDayFontSize": 12, "weatherForecastMaxTempFontSize": 18, "weatherForecastMinTempFontSize": 14,
      "nameTextColor": "#D1D5DB", "statusTextColor": "#9CA3AF", "valueTextColor": "#A7F3D0", "unitTextColor": "#A7F3D0", "nameTextColorOn": "#A7F3D0", "statusTextColorOn": "#9CA3AF", "valueTextColorOn": "#A7F3D0", "unitTextColorOn": "#A7F3D0"
    }
  }
};

const futuristicTheme: ThemeObject = {
  "colorScheme": {
    "light": {
      "dashboardBackgroundType": "gradient", "dashboardBackgroundColor1": "#f5f7fa", "dashboardBackgroundColor2": "#eef2f7", "cardOpacity": 0.8, "panelOpacity": 0.7,
      "cardBackground": "rgba(255, 255, 255, 0.8)", "cardBackgroundOn": "rgba(255, 255, 255, 1.0)", "tabTextColor": "#5c677d", "activeTabTextColor": "#007a7a", "tabIndicatorColor": "#007a7a",
      "thermostatHandleColor": "#FFFFFF", "thermostatDialTextColor":