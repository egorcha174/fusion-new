import React, { useRef, useState, useMemo, useEffect } from 'react';
import { CardTemplates, CardTemplate, ColorScheme, DeviceType, ColorThemeSet, EventTimerWidget } from '../types';
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
      "thermostatHandleColor": "#FFFFFF", "thermostatDialTextColor": "#005a5a", "thermostatDialLabelColor": "#5c677d", "thermostatHeatingColor": "#ff6b6b", "thermostatCoolingColor": "#4d96ff", "clockTextColor": "#005a5a",
      "nameTextColor": "#333d4f", "statusTextColor": "#5c677d", "valueTextColor": "#005a5a", "unitTextColor": "#005a5a", "nameTextColorOn": "#005a5a", "statusTextColorOn": "#5c677d", "valueTextColorOn": "#005a5a", "unitTextColorOn": "#005a5a"
    },
    "dark": {
      "dashboardBackgroundType": "gradient", "dashboardBackgroundColor1": "#1a2a3a", "dashboardBackgroundColor2": "#101a24", "cardOpacity": 0.8, "panelOpacity": 0.7,
      "cardBackground": "rgba(20, 30, 40, 0.8)", "cardBackgroundOn": "rgba(25, 35, 45, 1.0)", "tabTextColor": "#9cb3cc", "activeTabTextColor": "#00dada", "tabIndicatorColor": "#00dada",
      "thermostatHandleColor": "#1a2a3a", "thermostatDialTextColor": "#00dada", "thermostatDialLabelColor": "#9cb3cc", "thermostatHeatingColor": "#ff8787", "thermostatCoolingColor": "#74afff", "clockTextColor": "#00dada",
      "nameTextColor": "#c0d4e7", "statusTextColor": "#9cb3cc", "valueTextColor": "#00dada", "unitTextColor": "#00dada", "nameTextColorOn": "#00dada", "statusTextColorOn": "#9cb3cc", "valueTextColorOn": "#00dada", "unitTextColorOn": "#00dada"
    }
  }
};

const deepSpaceTheme: ThemeObject = {
  "colorScheme": {
    "light": {
      "dashboardBackgroundType": "gradient", "dashboardBackgroundColor1": "#D4DEE7", "dashboardBackgroundColor2": "#BCC8D6", "cardOpacity": 0.85, "panelOpacity": 0.75,
      "cardBackground": "rgba(255, 255, 255, 0.7)", "cardBackgroundOn": "rgba(255, 255, 255, 0.9)", "tabTextColor": "#4A5568", "activeTabTextColor": "#1A202C", "tabIndicatorColor": "#2D3748",
      "thermostatHandleColor": "#FFFFFF", "thermostatDialTextColor": "#1A202C", "thermostatDialLabelColor": "#4A5568", "thermostatHeatingColor": "#DD6B20", "thermostatCoolingColor": "#3182CE", "clockTextColor": "#1A202C",
      "nameTextColor": "#2D3748", "statusTextColor": "#718096", "valueTextColor": "#1A202C", "unitTextColor": "#1A202C", "nameTextColorOn": "#1A202C", "statusTextColorOn": "#2D3748", "valueTextColorOn": "#1A202C", "unitTextColorOn": "#1A202C"
    },
    "dark": {
      "dashboardBackgroundType": "color",
      "dashboardBackgroundColor1": "#0a0f14",
      "dashboardBackgroundColor2": "#10161d",
      "cardOpacity": 0.8,
      "panelOpacity": 0.7,
      "cardBackground": "rgba(18, 25, 35, 0.8)",
      "cardBackgroundOn": "rgba(25, 33, 45, 0.9)",
      "tabTextColor": "#9FB1CC",
      "activeTabTextColor": "#EAF0F6",
      "tabIndicatorColor": "#89B3F8",
      "thermostatHandleColor": "#121923",
      "thermostatDialTextColor": "#EAF0F6",
      "thermostatDialLabelColor": "#9FB1CC",
      "thermostatHeatingColor": "#F6AD55",
      "thermostatCoolingColor": "#63B3ED",
      "clockTextColor": "#EAF0F6",
      "nameTextColor": "#CBD5E0",
      "statusTextColor": "#A0AEC0",
      "valueTextColor": "#EAF0F6",
      "unitTextColor": "#EAF0F6",
      "nameTextColorOn": "#EAF0F6",
      "statusTextColorOn": "#CBD5E0",
      "valueTextColorOn": "#EAF0F6",
      "unitTextColorOn": "#EAF0F6"
    }
  }
};

const THEMES = [
    { name: 'Стандартная', value: 'apple-default', scheme: (appleTheme as ThemeObject).colorScheme },
    { name: 'Графит', value: 'apple-graphite', scheme: appleGraphiteTheme.colorScheme },
    { name: 'Мята', value: 'apple-mint', scheme: appleMintTheme.colorScheme },
    { name: 'Футуристика', value: 'futuristic', scheme: futuristicTheme.colorScheme },
    { name: 'Глубокий космос', value: 'deep-space', scheme: deepSpaceTheme.colorScheme },
];

// --- Вспомогательные компоненты ---
const Section: React.FC<{ title: string, children: React.ReactNode, defaultOpen?: boolean, description?: string }> = ({ title, children, defaultOpen = true, description }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left">
        <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
        </div>
        <Icon icon="mdi:chevron-down" className={`w-6 h-6 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  );
};

const LabeledInput: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
    <div className="grid grid-cols-2 items-center gap-4">
        <label className="text-sm text-gray-700 dark:text-gray-300">{label}</label>
        {children}
    </div>
);

const ColorInput: React.FC<{ 
    label: string; 
    path: string; 
    value: string; 
    onUpdate: (path: string, value: any) => void;
}> = ({ label, path, value, onUpdate }) => (
    <div className="grid grid-cols-2 items-center gap-4">
        <label className="text-sm text-gray-700 dark:text-gray-300 truncate">{label}</label>
        <input type="color" value={value || '#000000'} onChange={e => onUpdate(path, e.target.value)} className="w-10 h-10 p-0 border-none rounded-md cursor-pointer bg-transparent"/>
    </div>
);

const RangeInput: React.FC<{ 
    label: string; 
    path: string; 
    value: number; 
    min: number; 
    max: number; 
    step: number; 
    unit?: string;
    onUpdate: (path: string, value: any) => void;
}> = ({ label, path, value, min, max, step, unit, onUpdate }) => (
    <div className="grid grid-cols-2 items-center gap-4">
        <label className="text-sm text-gray-700 dark:text-gray-300 truncate">{label}</label>
        <div className="flex items-center gap-2">
            <input type="range" min={min} max={max} step={step} value={value} onChange={e => onUpdate(path, parseFloat(e.target.value))} className="w-full accent-blue-500"/>
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{value}{unit}</span>
        </div>
    </div>
);

const ThemeEditor: React.FC<{ 
    themeType: 'light' | 'dark',
    colorScheme: ColorScheme,
    onUpdate: (path: string, value: any) => void;
}> = ({ themeType, colorScheme, onUpdate }) => {
    const scheme = colorScheme[themeType];
    const pathPrefix = themeType;
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image')) return;
        
        const reader = new FileReader();
        reader.onloadend = () => {
            onUpdate(`${themeType}.dashboardBackgroundImage`, reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-4">
            <Section title="Фон дашборда" defaultOpen={false}>
                <LabeledInput label="Тип фона">
                    <select value={scheme.dashboardBackgroundType} onChange={e => onUpdate(`${pathPrefix}.dashboardBackgroundType`, e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm">
                        <option value="color">Сплошной цвет</option>
                        <option value="gradient">Градиент</option>
                        <option value="image">Изображение</option>
                    </select>
                </LabeledInput>
                {scheme.dashboardBackgroundType === 'image' ? (
                    <>
                        <LabeledInput label="Загрузить фон"><input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/></LabeledInput>
                        <RangeInput onUpdate={onUpdate} label="Размытие" path={`${pathPrefix}.dashboardBackgroundImageBlur`} value={scheme.dashboardBackgroundImageBlur || 0} min={0} max={50} step={1} unit="px" />
                        <RangeInput onUpdate={onUpdate} label="Яркость" path={`${pathPrefix}.dashboardBackgroundImageBrightness`} value={scheme.dashboardBackgroundImageBrightness || 100} min={0} max={200} step={5} unit="%" />
                    </>
                ) : (
                     <>
                        <ColorInput onUpdate={onUpdate} label="Цвет 1" path={`${pathPrefix}.dashboardBackgroundColor1`} value={scheme.dashboardBackgroundColor1} />
                        {scheme.dashboardBackgroundType === 'gradient' && <ColorInput onUpdate={onUpdate} label="Цвет 2" path={`${pathPrefix}.dashboardBackgroundColor2`} value={scheme.dashboardBackgroundColor2 || '#ffffff'} />}
                     </>
                )}
            </Section>
             <Section title="Прозрачность" defaultOpen={false}>
                <RangeInput onUpdate={onUpdate} label="Карточки" path={`${pathPrefix}.cardOpacity`} value={scheme.cardOpacity || 1} min={0} max={1} step={0.05} />
                <RangeInput onUpdate={onUpdate} label="Панели" path={`${pathPrefix}.panelOpacity`} value={scheme.panelOpacity || 1} min={0} max={1} step={0.05} />
            </Section>
            <Section title="Карточки" defaultOpen={false}>
                <ColorInput onUpdate={onUpdate} label="Фон (Выкл)" path={`${pathPrefix}.cardBackground`} value={scheme.cardBackground} />
                <ColorInput onUpdate={onUpdate} label="Фон (Вкл)" path={`${pathPrefix}.cardBackgroundOn`} value={scheme.cardBackgroundOn} />
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 pt-2">Текст (Выкл)</h4>
                <ColorInput onUpdate={onUpdate} label="Название" path={`${pathPrefix}.nameTextColor`} value={scheme.nameTextColor} />
                <ColorInput onUpdate={onUpdate} label="Статус" path={`${pathPrefix}.statusTextColor`} value={scheme.statusTextColor} />
                <ColorInput onUpdate={onUpdate} label="Значение" path={`${pathPrefix}.valueTextColor`} value={scheme.valueTextColor} />
                <ColorInput onUpdate={onUpdate} label="Ед. изм." path={`${pathPrefix}.unitTextColor`} value={scheme.unitTextColor} />
                 <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 pt-2">Текст (Вкл)</h4>
                <ColorInput onUpdate={onUpdate} label="Название" path={`${pathPrefix}.nameTextColorOn`} value={scheme.nameTextColorOn} />
                <ColorInput onUpdate={onUpdate} label="Статус" path={`${pathPrefix}.statusTextColorOn`} value={scheme.statusTextColorOn} />
                <ColorInput onUpdate={onUpdate} label="Значение" path={`${pathPrefix}.valueTextColorOn`} value={scheme.valueTextColorOn} />
                <ColorInput onUpdate={onUpdate} label="Ед. изм." path={`${pathPrefix}.unitTextColorOn`} value={scheme.unitTextColorOn} />
            </Section>
             <Section title="Интерфейс" defaultOpen={false}>
                <ColorInput onUpdate={onUpdate} label="Текст вкладок" path={`${pathPrefix}.tabTextColor`} value={scheme.tabTextColor} />
                <ColorInput onUpdate={onUpdate} label="Активная вкладка" path={`${pathPrefix}.activeTabTextColor`} value={scheme.activeTabTextColor} />
                <ColorInput onUpdate={onUpdate} label="Индикатор вкладки" path={`${pathPrefix}.tabIndicatorColor`} value={scheme.tabIndicatorColor} />
                <ColorInput onUpdate={onUpdate} label="Цвет часов" path={`${pathPrefix}.clockTextColor`} value={scheme.clockTextColor} />
            </Section>
            <Section title="Термостат" defaultOpen={false}>
                <ColorInput onUpdate={onUpdate} label="Ручка" path={`${pathPrefix}.thermostatHandleColor`} value={scheme.thermostatHandleColor} />
                <ColorInput onUpdate={onUpdate} label="Текст цели" path={`${pathPrefix}.thermostatDialTextColor`} value={scheme.thermostatDialTextColor} />
                <ColorInput onUpdate={onUpdate} label="Подпись цели" path={`${pathPrefix}.thermostatDialLabelColor`} value={scheme.thermostatDialLabelColor} />
                <ColorInput onUpdate={onUpdate} label="Цвет нагрева" path={`${pathPrefix}.thermostatHeatingColor`} value={scheme.thermostatHeatingColor} />
                <ColorInput onUpdate={onUpdate} label="Цвет охлаждения" path={`${pathPrefix}.thermostatCoolingColor`} value={scheme.thermostatCoolingColor} />
            </Section>
        </div>
    );
};


// --- Основной компонент настроек ---
interface SettingsProps {
    onConnect?: (url: string, token: string) => void;
    connectionStatus?: ConnectionStatus;
    error?: string | null;
}

const Settings: React.FC<SettingsProps> = ({ onConnect, connectionStatus, error }) => {
    const { haUrl } = useHAStore();
    const urlRef = useRef<HTMLInputElement>(null);
    const tokenRef = useRef<HTMLInputElement>(null);
    const importTemplatesRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<SettingsTab>('connection');
    const [isConfirmingReset, setIsConfirmingReset] = useState(false);
    
    const {
        templates, setTemplates, handleDeleteTemplate,
        clockSettings, setClockSettings,
        sidebarWidth, setSidebarWidth,
        isSidebarVisible, setIsSidebarVisible,
        theme, setTheme,
        scheduleStartTime, setScheduleStartTime,
        scheduleEndTime, setScheduleEndTime,
        colorScheme, setColorScheme, onResetColorScheme, DEFAULT_COLOR_SCHEME,
        updateColorSchemeValue,
        weatherProvider, setWeatherProvider,
        openWeatherMapKey, setOpenWeatherMapKey,
        yandexWeatherKey, setYandexWeatherKey,
        forecaApiKey, setForecaApiKey,
        lowBatteryThreshold, setLowBatteryThreshold,
    } = useAppStore();

    const handleConnect = () => {
        const url = urlRef.current?.value;
        const token = tokenRef.current?.value;
        if (url && token && onConnect) {
            onConnect(url, token);
        }
    };
    
    // ... (остальные обработчики: handleExport, handleImport, и т.д.) ...
     const handleExport = async () => {
        try {
            const zip = new JSZip();

            // Собираем все настройки из localStorage
            const settingsToExport: { [key: string]: any } = {};
            for (const key of Object.values(LOCAL_STORAGE_KEYS)) {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    try {
                        settingsToExport[key] = JSON.parse(value);
                    } catch {
                        settingsToExport[key] = value;
                    }
                }
            }

            // Добавляем файл с настройками в архив
            zip.file("ha-dashboard-settings.json", JSON.stringify(settingsToExport, null, 2));

            // Генерируем и скачиваем zip-файл
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `ha-dashboard-backup-${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Failed to export settings:", e);
            alert("Ошибка при экспорте настроек.");
        }
    };
    
    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const zip = await JSZip.loadAsync(e.target?.result as ArrayBuffer);
                const settingsFile = zip.file("ha-dashboard-settings.json");

                if (!settingsFile) {
                    throw new Error("Файл 'ha-dashboard-settings.json' не найден в архиве.");
                }

                const content = await settingsFile.async("string");
                const importedSettings = JSON.parse(content);

                // Применяем импортированные настройки
                Object.keys(importedSettings).forEach(key => {
                    if (Object.values(LOCAL_STORAGE_KEYS).includes(key as any)) {
                       localStorage.setItem(key, JSON.stringify(importedSettings[key]));
                    }
                });

                alert("Настройки успешно импортированы! Страница будет перезагружена.");
                window.location.reload();

            } catch (err) {
                console.error("Failed to import settings:", err);
                alert(`Ошибка при импорте: ${(err as Error).message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleResetAllSettings = () => {
        if(window.confirm("Вы уверены, что хотите сбросить ВСЕ настройки? Это действие нельзя отменить.")) {
            // Очищаем все ключи, связанные с приложением
            Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            alert("Все настройки сброшены. Страница будет перезагружена.");
            window.location.reload();
        }
    };

    const handleResetAppearance = () => {
        onResetColorScheme();
        setTheme('auto');
        alert("Настройки внешнего вида сброшены к значениям по умолчанию.");
    };

    // --- JSX для рендеринга каждой вкладки ---
    const renderConnectionTab = () => (
        <div className="space-y-6">
            <div>
                <label htmlFor="haUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URL-адрес Home Assistant</label>
                <input
                    id="haUrl"
                    ref={urlRef}
                    type="text"
                    defaultValue={localStorage.getItem('ha-url') || haUrl || ''}
                    placeholder="например, http://homeassistant.local:8123"
                    className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div>
                <label htmlFor="haToken" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Долгосрочный токен доступа</label>
                <input
                    id="haToken"
                    ref={tokenRef}
                    type="password"
                    defaultValue={localStorage.getItem('ha-token') || ''}
                    placeholder="Вставьте ваш токен сюда"
                    className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                 <a href="https://developers.home-assistant.io/docs/auth_api/#long-lived-access-token" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1">Как получить токен?</a>
            </div>
             {error && <div className="bg-red-500/10 text-red-500 dark:text-red-400 p-3 rounded-lg text-sm">{error}</div>}
            <button
                onClick={handleConnect}
                disabled={connectionStatus === 'connecting'}
                className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 transition-colors"
            >
                {connectionStatus === 'connecting' ? 'Подключение...' : 'Подключиться'}
            </button>
        </div>
    );
    
    const [activeEditorTab, setActiveEditorTab] = useState<'light' | 'dark'>('light');
    
    const renderAppearanceTab = () => (
        <div className="space-y-4">
            <Section title="Тема оформления" description="Выберите готовую тему или настройте цвета вручную.">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {THEMES.map(themeOption => (
                        <div key={themeOption.value} className="text-center">
                            <button
                                onClick={() => setColorScheme(themeOption.scheme)}
                                className="w-full aspect-video rounded-lg border-2 dark:border-gray-600 transition-all flex items-center justify-center text-xs font-semibold"
                                style={{
                                    backgroundImage: `linear-gradient(135deg, ${themeOption.scheme.light.dashboardBackgroundColor1} 50%, ${themeOption.scheme.dark.dashboardBackgroundColor1} 50%)`,
                                    borderColor: colorScheme.light.dashboardBackgroundColor1 === themeOption.scheme.light.dashboardBackgroundColor1 ? '#3b82f6' : 'transparent'
                                }}
                            >
                                <span className="bg-white/50 dark:bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm">{themeOption.name}</span>
                            </button>
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="Редактор темы" description="Настройте цвета текущей выбранной темы." defaultOpen={false}>
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button onClick={() => setActiveEditorTab('light')} className={`px-4 py-2 text-sm font-medium ${activeEditorTab === 'light' ? 'border-b-2 border-blue-500 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Светлая</button>
                    <button onClick={() => setActiveEditorTab('dark')} className={`px-4 py-2 text-sm font-medium ${activeEditorTab === 'dark' ? 'border-b-2 border-blue-500 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Темная</button>
                </div>
                <div className="pt-4">
                    {activeEditorTab === 'light' && <ThemeEditor themeType="light" colorScheme={colorScheme} onUpdate={updateColorSchemeValue} />}
                    {activeEditorTab === 'dark' && <ThemeEditor themeType="dark" colorScheme={colorScheme} onUpdate={updateColorSchemeValue} />}
                </div>
            </Section>
            
            <Section title="Режим день/ночь" description="Автоматически переключает светлую и темную тему.">
                 <select value={theme} onChange={(e) => setTheme(e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="auto">Как в системе</option>
                    <option value="day">Всегда светлая</option>
                    <option value="night">Всегда темная</option>
                    <option value="schedule">По расписанию</option>
                </select>
                {theme === 'schedule' && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Начало ночи</label>
                            <input type="time" value={scheduleStartTime} onChange={e => setScheduleStartTime(e.target.value)} className="w-full bg-gray-200 dark:bg-gray-800 p-2 rounded-md"/>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Конец ночи</label>
                            <input type="time" value={scheduleEndTime} onChange={e => setScheduleEndTime(e.target.value)} className="w-full bg-gray-200 dark:bg-gray-800 p-2 rounded-md"/>
                        </div>
                    </div>
                )}
            </Section>

            <div className="pt-4 mt-4 text-center">
                <button
                    onClick={handleResetAppearance}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:underline"
                >
                    Сбросить настройки внешнего вида
                </button>
            </div>
        </div>
    );
    
     const renderInterfaceTab = () => (
        <div className="space-y-4">
             <Section title="Боковая панель">
                <LabeledInput label="Показывать панель">
                     <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isSidebarVisible ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isSidebarVisible ? 'translate-x-6' : 'translate-x-1'}`}/>
                    </button>
                </LabeledInput>
                <LabeledInput label="Ширина панели">
                    <div className="flex items-center gap-2">
                        <input type="range" min="280" max="500" value={sidebarWidth} onChange={e => setSidebarWidth(Number(e.target.value))} className="w-full accent-blue-500"/>
                        <span className="text-sm font-mono">{sidebarWidth}px</span>
                    </div>
                </LabeledInput>
            </Section>

            <Section title="Часы">
                <LabeledInput label="Формат времени">
                    <select value={clockSettings.format} onChange={e => setClockSettings({ ...clockSettings, format: e.target.value as any })} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm">
                        <option value="24h">24 часа</option>
                        <option value="12h">12 часов</option>
                    </select>
                </LabeledInput>
                 <LabeledInput label="Показывать секунды">
                    <input type="checkbox" checked={clockSettings.showSeconds} onChange={e => setClockSettings({ ...clockSettings, showSeconds: e.target.checked })} className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"/>
                </LabeledInput>
                 <LabeledInput label="Размер часов">
                     <select value={clockSettings.size} onChange={e => setClockSettings({ ...clockSettings, size: e.target.value as any })} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm">
                        <option value="sm">Маленький</option>
                        <option value="md">Средний</option>
                        <option value="lg">Большой</option>
                    </select>
                </LabeledInput>
            </Section>
            
            <Section title="Виджет Погоды">
                 <LabeledInput label="Поставщик погоды">
                    <select value={weatherProvider} onChange={e => setWeatherProvider(e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm">
                        <option value="openweathermap">OpenWeatherMap</option>
                        <option value="yandex">Яндекс Погода</option>
                        <option value="foreca">Foreca</option>
                    </select>
                 </LabeledInput>
                 {weatherProvider === 'openweathermap' && (
                     <LabeledInput label="Ключ API OpenWeatherMap">
                        <input type="password" value={openWeatherMapKey} onChange={e => setOpenWeatherMapKey(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md"/>
                    </LabeledInput>
                 )}
                 {weatherProvider === 'yandex' && (
                     <LabeledInput label="Ключ API Яндекс Погоды">
                        <input type="password" value={yandexWeatherKey} onChange={e => setYandexWeatherKey(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md"/>
                    </LabeledInput>
                 )}
                 {weatherProvider === 'foreca' && (
                     <LabeledInput label="Ключ API Foreca">
                        <input type="password" value={forecaApiKey} onChange={e => setForecaApiKey(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md"/>
                    </LabeledInput>
                 )}
            </Section>

            <Section title="Прочее">
                <LabeledInput label="Порог низкого заряда">
                    <div className="flex items-center gap-2">
                        <input type="range" min="5" max="50" step="5" value={lowBatteryThreshold} onChange={e => setLowBatteryThreshold(Number(e.target.value))} className="w-full accent-blue-500"/>
                        <span className="text-sm font-mono">{lowBatteryThreshold}%</span>
                    </div>
                </LabeledInput>
            </Section>

        </div>
    );
    
    const renderTemplatesTab = () => (
        <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Шаблоны позволяют полностью кастомизировать внешний вид карточек для определенных типов устройств.</p>
            <div className="space-y-3">
            {Object.values(templates).map((template: CardTemplate) => (
                <div key={template.id} className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{template.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Тип: {template.deviceType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => useAppStore.getState().setEditingTemplate(template)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-md">
                            <Icon icon="mdi:pencil" className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDeleteTemplate(template.id)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-md">
                             <Icon icon="mdi:trash-can-outline" className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}
            </div>
        </div>
    );
    
    const renderBackupTab = () => (
         <div className="space-y-6">
            <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Экспорт настроек</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Сохраните все ваши настройки (вкладки, кастомизации, темы) в один файл для резервного копирования или переноса.</p>
                <button onClick={handleExport} className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md py-2 transition-colors">
                    <Icon icon="mdi:download" className="w-5 h-5" />
                    Экспортировать
                </button>
            </div>
             <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Импорт настроек</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Загрузите ранее экспортированный файл. Внимание: это перезапишет все текущие настройки!</p>
                <input type="file" accept=".zip" onChange={handleImport} className="hidden" ref={importTemplatesRef} />
                <button onClick={() => importTemplatesRef.current?.click()} className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md py-2 transition-colors">
                    <Icon icon="mdi:upload" className="w-5 h-5" />
                    Импортировать
                </button>
            </div>
            <div className="border-t border-red-500/30 pt-4">
                 <h3 className="text-base font-semibold text-red-500 dark:text-red-400">Опасная зона</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Сбросить все настройки к значениям по умолчанию. Это действие нельзя отменить.</p>
                  <button onClick={handleResetAllSettings} className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-red-500 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-md py-2 transition-colors">
                    <Icon icon="mdi:alert-octagon-outline" className="w-5 h-5" />
                    Сбросить все настройки
                </button>
            </div>
        </div>
    );
    
    const tabs: { id: SettingsTab; label: string; icon: string; content: React.ReactNode; }[] = [
        { id: 'connection', label: 'Подключение', icon: 'mdi:lan-connect', content: renderConnectionTab() },
        { id: 'appearance', label: 'Внешний вид', icon: 'mdi:palette-outline', content: renderAppearanceTab() },
        { id: 'interface', label: 'Интерфейс', icon: 'mdi:application-cog-outline', content: renderInterfaceTab() },
        { id: 'templates', label: 'Шаблоны', icon: 'mdi:view-dashboard-outline', content: renderTemplatesTab() },
        { id: 'backup', label: 'Бэкап', icon: 'mdi:content-save-cog-outline', content: renderBackupTab() },
    ];
    
    // Если подключение уже есть, открываем вкладку интерфейса по умолчанию
    useEffect(() => {
        if (connectionStatus === 'connected') {
            setActiveTab('interface');
        }
    }, [connectionStatus]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-4xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col md:flex-row min-h-[600px] max-h-[90vh]">
            <aside className="w-full md:w-56 flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 p-4">
                <h2 className="text-xl font-bold mb-6 hidden md:block">Настройки</h2>
                <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 p-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            <Icon icon={tab.icon} className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 p-6 overflow-y-auto">
                {tabs.find(t => t.id === activeTab)?.content}
            </main>
        </div>
    );
};

export default Settings;