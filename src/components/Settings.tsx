
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { CardTemplates, CardTemplate, ColorScheme, DeviceType, ColorThemeSet, EventTimerWidget, WeatherSettings, ServerConfig, ThemeDefinition, Device, AuroraSettings } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { useAppStore } from '../store/appStore';
import { useHAStore } from '../store/haStore';
import JSZip from 'jszip';
import { Icon } from '@iconify/react';
import { LOCAL_STORAGE_KEYS } from '../constants';
import { format } from 'date-fns';
import { nanoid } from 'nanoid';
import { set as setAtPath } from '../utils/obj-path';
import { generatePackage, validatePackage } from '../utils/packageManager';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'failed';
type SettingsTab = 'appearance' | 'interface' | 'templates' | 'connection' | 'backup';

const FONT_FAMILIES = [
    { name: 'Системный', value: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"` },
    { name: 'San Francisco (SF Pro)', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { name: 'Tahoma', value: 'Tahoma, Verdana, Segoe, sans-serif' },
    { name: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { name: 'Times New Roman', value: '"Times New Roman", Times, serif' },
];


// --- Вспомогательные компоненты ---
const Section: React.FC<{ title: string, children: React.ReactNode, defaultOpen?: boolean, description?: string }> = ({ title, children, defaultOpen = false, description }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left group">
        <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</h3>
            {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
        </div>
        <Icon icon="mdi:chevron-down" className={`w-6 h-6 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">{children}</div>}
    </div>
  );
};

const LabeledInput: React.FC<{ label: string, children: React.ReactNode, description?: string }> = ({ label, children, description }) => (
    <div className="grid grid-cols-2 items-center gap-4">
        <div>
            <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{label}</label>
            {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
        </div>
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
        <div className="flex items-center gap-2 justify-end">
            <span className="text-xs font-mono text-gray-400 uppercase">{value}</span>
            <input type="color" value={value || '#000000'} onChange={e => onUpdate(path, e.target.value)} className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent shadow-sm"/>
        </div>
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
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-12 text-right">{value}{unit}</span>
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
            <Section title="Фон дашборда" defaultOpen={true}>
                <LabeledInput label="Тип фона">
                    <select value={scheme.dashboardBackgroundType} onChange={e => onUpdate(`${pathPrefix}.dashboardBackgroundType`, e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="color">Сплошной цвет</option>
                        <option value="gradient">Градиент</option>
                        <option value="image">Изображение</option>
                    </select>
                </LabeledInput>
                {scheme.dashboardBackgroundType === 'image' ? (
                    <>
                        <LabeledInput label="Загрузить фон"><input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 text-gray-500 dark:text-gray-400"/></LabeledInput>
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
             <Section title="Прозрачность">
                <RangeInput onUpdate={onUpdate} label="Карточки" path={`${pathPrefix}.cardOpacity`} value={scheme.cardOpacity || 1} min={0} max={1} step={0.05} />
                <RangeInput onUpdate={onUpdate} label="Панели" path={`${pathPrefix}.panelOpacity`} value={scheme.panelOpacity || 1} min={0} max={1} step={0.05} />
            </Section>
            <Section title="Карточки">
                <RangeInput onUpdate={onUpdate} label="Скругление углов" path={`${pathPrefix}.cardBorderRadius`} value={scheme.cardBorderRadius ?? 16} min={0} max={24} step={1} unit="px" />
                <ColorInput onUpdate={onUpdate} label="Фон (Выкл)" path={`${pathPrefix}.cardBackground`} value={scheme.cardBackground} />
                <ColorInput onUpdate={onUpdate} label="Фон (Вкл)" path={`${pathPrefix}.cardBackgroundOn`} value={scheme.cardBackgroundOn} />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 pt-2 border-b border-gray-200 dark:border-gray-700 pb-1 mb-2">Текст (Выкл)</h4>
                <ColorInput onUpdate={onUpdate} label="Название" path={`${pathPrefix}.nameTextColor`} value={scheme.nameTextColor} />
                <ColorInput onUpdate={onUpdate} label="Статус" path={`${pathPrefix}.statusTextColor`} value={scheme.statusTextColor} />
                <ColorInput onUpdate={onUpdate} label="Значение" path={`${pathPrefix}.valueTextColor`} value={scheme.valueTextColor} />
                <ColorInput onUpdate={onUpdate} label="Ед. изм." path={`${pathPrefix}.unitTextColor`} value={scheme.unitTextColor} />
                 <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 pt-2 border-b border-gray-200 dark:border-gray-700 pb-1 mb-2">Текст (Вкл)</h4>
                <ColorInput onUpdate={onUpdate} label="Название" path={`${pathPrefix}.nameTextColorOn`} value={scheme.nameTextColorOn} />
                <ColorInput onUpdate={onUpdate} label="Статус" path={`${pathPrefix}.statusTextColorOn`} value={scheme.statusTextColorOn} />
                <ColorInput onUpdate={onUpdate} label="Значение" path={`${pathPrefix}.valueTextColorOn`} value={scheme.valueTextColorOn} />
                <ColorInput onUpdate={onUpdate} label="Ед. изм." path={`${pathPrefix}.unitTextColorOn`} value={scheme.unitTextColorOn} />
            </Section>
             <Section title="Элементы интерфейса">
                <ColorInput onUpdate={onUpdate} label="Текст вкладок" path={`${pathPrefix}.tabTextColor`} value={scheme.tabTextColor} />
                <ColorInput onUpdate={onUpdate} label="Активная вкладка" path={`${pathPrefix}.activeTabTextColor`} value={scheme.activeTabTextColor} />
                <ColorInput onUpdate={onUpdate} label="Индикатор вкладки" path={`${pathPrefix}.tabIndicatorColor`} value={scheme.tabIndicatorColor} />
                <ColorInput onUpdate={onUpdate} label="Цвет часов" path={`${pathPrefix}.clockTextColor`} value={scheme.clockTextColor} />
            </Section>
            <Section title="Термостат">
                <ColorInput onUpdate={onUpdate} label="Ручка" path={`${pathPrefix}.thermostatHandleColor`} value={scheme.thermostatHandleColor} />
                <ColorInput onUpdate={onUpdate} label="Текст цели" path={`${pathPrefix}.thermostatDialTextColor`} value={scheme.thermostatDialTextColor} />
                <ColorInput onUpdate={onUpdate} label="Подпись цели" path={`${pathPrefix}.thermostatDialLabelColor`} value={scheme.thermostatDialLabelColor} />
                <ColorInput onUpdate={onUpdate} label="Цвет нагрева" path={`${pathPrefix}.thermostatHeatingColor`} value={scheme.thermostatHeatingColor} />
                <ColorInput onUpdate={onUpdate} label="Цвет охлаждения" path={`${pathPrefix}.thermostatCoolingColor`} value={scheme.thermostatCoolingColor} />
            </Section>
            <Section title="Виджет Погоды">
                <RangeInput onUpdate={onUpdate} label="Размер иконки (сейчас)" path={`${pathPrefix}.weatherIconSize`} value={scheme.weatherIconSize || 96} min={32} max={128} step={1} unit="px" />
                <RangeInput onUpdate={onUpdate} label="Размер иконок (прогноз)" path={`${pathPrefix}.weatherForecastIconSize`} value={scheme.weatherForecastIconSize || 48} min={24} max={96} step={1} unit="px" />
                <RangeInput onUpdate={onUpdate} label="Шрифт (темп. сейчас)" path={`${pathPrefix}.weatherCurrentTempFontSize`} value={scheme.weatherCurrentTempFontSize || 36} min={16} max={72} step={1} unit="px" />
                <RangeInput onUpdate={onUpdate} label="Шрифт (описание)" path={`${pathPrefix}.weatherCurrentDescFontSize`} value={scheme.weatherCurrentDescFontSize || 14} min={10} max={24} step={1} unit="px" />
                <RangeInput onUpdate={onUpdate} label="Шрифт (день)" path={`${pathPrefix}.weatherForecastDayFontSize`} value={scheme.weatherForecastDayFontSize || 12} min={8} max={20} step={1} unit="px" />
                <RangeInput onUpdate={onUpdate} label="Шрифт (макс. темп.)" path={`${pathPrefix}.weatherForecastMaxTempFontSize`} value={scheme.weatherForecastMaxTempFontSize || 18} min={12} max={32} step={1} unit="px" />
                <RangeInput onUpdate={onUpdate} label="Шрифт (мин. темп.)" path={`${pathPrefix}.weatherForecastMinTempFontSize`} value={scheme.weatherForecastMinTempFontSize || 14} min={10} max={24} step={1} unit="px" />
            </Section>
        </div>
    );
};


// --- Основной компонент настроек ---
interface SettingsProps {
    onConnect?: (url: string, token: string) => void;
    connectionStatus?: ConnectionStatus;
    error?: string | null;
    variant?: 'page' | 'drawer';
    isOpen?: boolean;
    onClose?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onConnect, connectionStatus, error, variant = 'page', isOpen = false, onClose }) => {
    // Состояния для вкладки "Подключение"
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [editingServer, setEditingServer] = useState<Partial<ServerConfig> | null>(null);
    const [serverToDelete, setServerToDelete] = useState<ServerConfig | null>(null);
    
    const {
        templates, setTemplates, handleDeleteTemplate, setEditingTemplate,
        clockSettings, setClockSettings,
        sidebarWidth, setSidebarWidth,
        isSidebarVisible, setIsSidebarVisible,
        themeMode, setThemeMode,
        scheduleStartTime, setScheduleStartTime,
        scheduleEndTime, setScheduleEndTime,
        themes, activeThemeId, selectTheme, saveTheme, deleteTheme, importThemePackage,
        onResetColorScheme,
        weatherProvider, setWeatherProvider,
        weatherEntityId, setWeatherEntityId,
        openWeatherMapKey, setOpenWeatherMapKey,
        yandexWeatherKey, setYandexWeatherKey,
        forecaApiKey, setForecaApiKey,
        weatherSettings, setWeatherSettings,
        lowBatteryThreshold, setLowBatteryThreshold,
        backgroundEffect, setBackgroundEffect,
        servers, activeServerId, addServer, updateServer, deleteServer, setActiveServerId,
        auroraSettings, setAuroraSettings
    } = useAppStore();

    const { allKnownDevices, disconnect } = useHAStore();

    const [editingTheme, setEditingTheme] = useState<ThemeDefinition | null>(null);
    const [confirmingDeleteTheme, setConfirmingDeleteTheme] = useState<ThemeDefinition | null>(null);
    const [activeEditorTab, setActiveEditorTab] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        // При первой загрузке выбрать активный сервер
        if (!selectedServerId && activeServerId) {
            setSelectedServerId(activeServerId);
        }
    }, [activeServerId, selectedServerId]);
    
    useEffect(() => {
        // Если выбранный сервер удалили, сбрасываем форму редактирования.
        if (editingServer && editingServer.id && !servers.some(s => s.id === editingServer.id)) {
            setEditingServer(null);
        }
    }, [servers, editingServer]);

    const weatherEntities = useMemo(() => {
        return (Array.from(allKnownDevices.values()) as Device[])
            .filter(device => device.type === DeviceType.Weather || device.haDomain === 'weather')
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allKnownDevices]);


    const handleConnect = () => {
        const server = servers.find(s => s.id === selectedServerId);
        if (server && onConnect) {
            onConnect(server.url, server.token);
            setActiveServerId(server.id);
        }
    };
    
     const handleExport = async () => {
        try {
            const zip = new JSZip();

            // Собираем все настройки из localStorage
            const settingsToExport: { [key: string]: any } = {};
            for (const key of Object.values(LOCAL_STORAGE_KEYS) as string[]) {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    try {
                        settingsToExport[key] = JSON.parse(value);
                    } catch {
                        settingsToExport[key] = value;
                    }
                }
            }

            zip.file("ha-dashboard-settings.json", JSON.stringify(settingsToExport, null, 2));
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
                // 1. Try importing as ZIP (Full Backup)
                try {
                    const zip = await JSZip.loadAsync(e.target?.result as ArrayBuffer);
                    const settingsFile = zip.file("ha-dashboard-settings.json");

                    if (settingsFile) {
                        const content = await settingsFile.async("string");
                        const importedSettings = JSON.parse(content);

                        Object.keys(importedSettings).forEach(key => {
                            if (Object.values(LOCAL_STORAGE_KEYS).includes(key as any)) {
                               localStorage.setItem(key, JSON.stringify(importedSettings[key]));
                            }
                        });

                        alert("Настройки успешно импортированы! Страница будет перезагружена.");
                        window.location.reload();
                        return;
                    }
                } catch (zipErr) {
                    // Not a valid zip, try JSON (Theme Package)
                }

                // 2. Try importing as JSON (Theme Package)
                const decoder = new TextDecoder('utf-8');
                const jsonContent = decoder.decode(e.target?.result as ArrayBuffer);
                const json = JSON.parse(jsonContent);

                if (validatePackage(json)) {
                    importThemePackage(json);
                    alert(`Пакет темы "${json.manifest.name}" успешно импортирован!`);
                } else {
                    throw new Error("Неизвестный формат файла.");
                }

            } catch (err) {
                console.error("Failed to import settings:", err);
                alert(`Ошибка при импорте: ${(err as Error).message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExportTheme = async (theme: ThemeDefinition) => {
        try {
            const pkg = await generatePackage(theme, templates, 'User', 'Exported from dashboard');
            const json = JSON.stringify(pkg, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${theme.name.toLowerCase().replace(/\s+/g, '-')}.theme.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Failed to export theme:", e);
            alert("Ошибка при экспорте темы.");
        }
    };

    const handleResetAllSettings = () => {
        if(window.confirm("Вы уверены, что хотите сбросить ВСЕ настройки? Это действие нельзя отменить.")) {
            (Object.values(LOCAL_STORAGE_KEYS) as string[]).forEach(key => {
                localStorage.removeItem(key);
            });
            alert("Все настройки сброшены. Страница будет перезагружена.");
            window.location.reload();
        }
    };

    const handleResetAppearance = () => {
        onResetColorScheme();
        setThemeMode('auto');
        alert("Настройки внешнего вида сброшены к значениям по умолчанию.");
    };
    
    const handleSaveServer = () => {
        if (!editingServer || !editingServer.name || !editingServer.url || !editingServer.token) {
            alert("Пожалуйста, заполните все поля.");
            return;
        }

        if (editingServer.id) { // Редактирование существующего
            updateServer(editingServer as ServerConfig);
        } else { // Добавление нового
            const newServer = addServer({ name: editingServer.name, url: editingServer.url, token: editingServer.token });
            setSelectedServerId(newServer.id);
        }
        setEditingServer(null);
    };

    // --- Theme Management Handlers ---
    const handleCreateNewTheme = () => {
        const baseTheme = themes.find(t => t.id === 'apple-default') || themes[0];
        const newTheme: ThemeDefinition = {
            id: nanoid(),
            name: `Новая тема ${themes.filter(t => t.isCustom).length + 1}`,
            isCustom: true,
            scheme: JSON.parse(JSON.stringify(baseTheme.scheme)),
        };
        setEditingTheme(newTheme);
    };
    
    const handleEditTheme = (theme: ThemeDefinition) => {
        if (theme.isCustom) {
            setEditingTheme(JSON.parse(JSON.stringify(theme)));
        }
    };

    const handleDuplicateTheme = (theme: ThemeDefinition) => {
        const newTheme: ThemeDefinition = {
            id: nanoid(),
            name: `${theme.name} (копия)`,
            isCustom: true,
            scheme: JSON.parse(JSON.stringify(theme.scheme)),
        };
        setEditingTheme(newTheme);
    };
    
    const handleSaveTheme = () => {
        if (editingTheme) {
            saveTheme(editingTheme);
            setEditingTheme(null);
        }
    };
    
    const handleUpdateEditingThemeValue = (path: string, value: any) => {
        setEditingTheme(currentTheme => {
            if (!currentTheme) return null;
            const newTheme = JSON.parse(JSON.stringify(currentTheme));
            if (path.endsWith('cardBorderRadius')) {
                newTheme.scheme.light.cardBorderRadius = value;
                newTheme.scheme.dark.cardBorderRadius = value;
            } else {
                setAtPath(newTheme.scheme, path, value);
            }
            return newTheme;
        });
    };

    const handleAuroraChange = (key: keyof AuroraSettings, value: any) => {
        setAuroraSettings({ ...auroraSettings, [key]: value });
    };

    const AURORA_PRESETS: Record<string, AuroraSettings> = {
        classic: { color1: '#00ffc8', color2: '#78c8ff', color3: '#00b4ff', speed: 22, intensity: 90, blur: 18, saturate: 140, starsEnabled: true, starsSpeed: 6 },
        green: { color1: '#00ff9f', color2: '#00d68a', color3: '#00b36b', speed: 18, intensity: 100, blur: 14, saturate: 160, starsEnabled: true, starsSpeed: 5 },
        violet: { color1: '#b28cff', color2: '#8f6bff', color3: '#5f3bff', speed: 26, intensity: 80, blur: 22, saturate: 180, starsEnabled: true, starsSpeed: 8 },
    };

    const isLoginMode = connectionStatus !== 'connected';

    const content = (
        <>
            {/* Connection Section (Login Mode) */}
            {isLoginMode && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                <div className="flex h-96">
                    {/* Левая колонка со списком серверов */}
                    <div className="w-2/5 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                        <div className="p-4 flex-grow overflow-y-auto">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Сохраненные серверы</h3>
                            {servers.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Нет сохраненных серверов.</p>
                            ) : (
                                <div className="space-y-2">
                                    {servers.map(server => (
                                        <button
                                            key={server.id}
                                            onClick={() => setSelectedServerId(server.id)}
                                            className={`w-full text-left p-3 rounded-lg transition-colors ${selectedServerId === server.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700/50'}`}
                                        >
                                            <p className="font-semibold truncate">{server.name}</p>
                                            <p className={`text-xs truncate ${selectedServerId === server.id ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>{server.url}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-between gap-2">
                            <button onClick={() => { setEditingServer({}); setSelectedServerId(null); }} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md" title="Добавить сервер"><Icon icon="mdi:plus" className="w-5 h-5" /></button>
                            <button onClick={() => servers.find(s => s.id === selectedServerId) && setEditingServer(servers.find(s => s.id === selectedServerId)!)} disabled={!selectedServerId} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed" title="Редактировать"><Icon icon="mdi:pencil" className="w-5 h-5" /></button>
                            <button onClick={() => servers.find(s => s.id === selectedServerId) && setServerToDelete(servers.find(s => s.id === selectedServerId)!)} disabled={!selectedServerId} className="p-2 text-red-500 hover:bg-red-500/10 rounded-md disabled:opacity-50 disabled:cursor-not-allowed" title="Удалить"><Icon icon="mdi:trash-can-outline" className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {/* Правая колонка с формой и кнопкой подключения */}
                    <div className="w-3/5 flex flex-col">
                        <div className="p-6 flex-grow space-y-6 overflow-y-auto">
                            {(editingServer) ? (
                                <>
                                    <h3 className="text-lg font-bold">{editingServer.id ? 'Редактировать сервер' : 'Добавить новый сервер'}</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Название</label>
                                        <input type="text" value={editingServer.name || ''} onChange={e => setEditingServer(s => ({ ...s, name: e.target.value }))} placeholder="Мой дом" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URL-адрес Home Assistant</label>
                                        <input type="text" value={editingServer.url || ''} onChange={e => setEditingServer(s => ({ ...s, url: e.target.value }))} placeholder="http://homeassistant.local:8123" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Долгосрочный токен доступа</label>
                                        <input type="password" value={editingServer.token || ''} onChange={e => setEditingServer(s => ({ ...s, token: e.target.value }))} placeholder="Вставьте ваш токен сюда" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <Icon icon="mdi:server-network" className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
                                    <h3 className="text-lg font-semibold">Управление серверами</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Выберите сервер из списка слева, чтобы подключиться, или добавьте новый.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                             {error && <div className="bg-red-500/10 text-red-500 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}
                             {editingServer ? (
                                <div className="flex justify-end gap-4">
                                    <button onClick={() => setEditingServer(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors">Отмена</button>
                                    <button onClick={handleSaveServer} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Сохранить</button>
                                </div>
                             ) : (
                                <button onClick={handleConnect} disabled={!selectedServerId || connectionStatus === 'connecting'} className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 transition-colors">
                                    {connectionStatus === 'connecting' ? 'Подключение...' : 'Подключиться'}
                                </button>
                             )}
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Other Settings - Only show when connected */}
            {!isLoginMode && (
                <>
                    <Section title="Подключение" description="Управление соединением с Home Assistant.">
                        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg">
                            <div className="overflow-hidden mr-4">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {servers.find(s => s.id === activeServerId)?.name || 'Сервер'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {servers.find(s => s.id === activeServerId)?.url}
                                </p>
                            </div>
                            <button 
                                onClick={() => disconnect()}
                                className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                Отключиться
                            </button>
                        </div>
                    </Section>

                    <Section title="Интерфейс и Часы" description="Настройка отображения боковой панели, часов и порогов.">
                        <LabeledInput label="Формат времени">
                            <select value={clockSettings.format} onChange={e => setClockSettings({...clockSettings, format: e.target.value as '12h'|'24h'})} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                                <option value="24h">24 часа</option>
                                <option value="12h">12 часов</option>
                            </select>
                        </LabeledInput>
                        <LabeledInput label="Показывать секунды">
                            <div className="flex items-center justify-end">
                                <input type="checkbox" checked={clockSettings.showSeconds} onChange={e => setClockSettings({...clockSettings, showSeconds: e.target.checked})} className="w-5 h-5 accent-blue-600"/>
                            </div>
                        </LabeledInput>
                        <LabeledInput label="Размер часов">
                            <select value={clockSettings.size} onChange={e => setClockSettings({...clockSettings, size: e.target.value as any})} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                                <option value="sm">Маленький</option>
                                <option value="md">Средний</option>
                                <option value="lg">Крупный</option>
                            </select>
                        </LabeledInput>
                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
                        <LabeledInput label="Боковая панель">
                            <div className="flex items-center justify-end">
                                <label className="text-sm mr-2 text-gray-500">{isSidebarVisible ? 'Включена' : 'Выключена'}</label>
                                <input type="checkbox" checked={isSidebarVisible} onChange={e => setIsSidebarVisible(e.target.checked)} className="w-5 h-5 accent-blue-600"/>
                            </div>
                        </LabeledInput>
                        <LabeledInput label="Ширина панели" description={`${sidebarWidth}px`}>
                            <input type="range" min={200} max={500} value={sidebarWidth} onChange={e => setSidebarWidth(parseInt(e.target.value))} className="w-full accent-blue-500"/>
                        </LabeledInput>
                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
                        <LabeledInput label="Порог низкого заряда" description={`Устройства с зарядом ниже ${lowBatteryThreshold}% будут отмечены как разряженные.`}>
                            <input type="range" min={5} max={50} step={5} value={lowBatteryThreshold} onChange={e => setLowBatteryThreshold(parseInt(e.target.value))} className="w-full accent-red-500"/>
                        </LabeledInput>
                    </Section>

                    <Section title="Погода" description="Настройка источника погоды и API ключей.">
                        <LabeledInput label="Источник погоды">
                            <select value={weatherProvider} onChange={e => setWeatherProvider(e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                                <option value="openweathermap">OpenWeatherMap</option>
                                <option value="yandex">Яндекс.Погода</option>
                                <option value="foreca">Foreca</option>
                                <option value="homeassistant">Home Assistant (weather.*)</option>
                            </select>
                        </LabeledInput>

                        {weatherProvider === 'openweathermap' && (
                            <LabeledInput label="API Ключ (OWM)">
                                <input type="password" value={openWeatherMapKey} onChange={e => setOpenWeatherMapKey(e.target.value)} placeholder="Введите ключ..." className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"/>
                            </LabeledInput>
                        )}
                        {weatherProvider === 'yandex' && (
                            <LabeledInput label="API Ключ (Яндекс)">
                                <input type="password" value={yandexWeatherKey} onChange={e => setYandexWeatherKey(e.target.value)} placeholder="X-Yandex-Weather-Key" className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"/>
                            </LabeledInput>
                        )}
                        {weatherProvider === 'foreca' && (
                            <LabeledInput label="API Токен (Foreca)">
                                <input type="password" value={forecaApiKey} onChange={e => setForecaApiKey(e.target.value)} placeholder="Bearer токен" className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"/>
                            </LabeledInput>
                        )}
                        {weatherProvider === 'homeassistant' && (
                            <LabeledInput label="Сущность погоды">
                                <select value={weatherEntityId} onChange={e => setWeatherEntityId(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                                    <option value="">Выберите сущность...</option>
                                    {weatherEntities.map(dev => (
                                        <option key={dev.id} value={dev.id}>{dev.name} ({dev.id})</option>
                                    ))}
                                </select>
                            </LabeledInput>
                        )}

                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
                        
                        <LabeledInput label="Набор иконок">
                            <select value={weatherSettings.iconPack} onChange={e => setWeatherSettings({...weatherSettings, iconPack: e.target.value as any})} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                                <option value="default">По умолчанию (анимированные)</option>
                                <option value="meteocons">Meteocons</option>
                                <option value="weather-icons">Weather Icons</option>
                                <option value="material-symbols-light">Material Symbols</option>
                            </select>
                        </LabeledInput>
                        <LabeledInput label="Дней прогноза" description={`${weatherSettings.forecastDays} дней`}>
                            <input type="range" min={1} max={7} value={weatherSettings.forecastDays} onChange={e => setWeatherSettings({...weatherSettings, forecastDays: parseInt(e.target.value)})} className="w-full accent-blue-500"/>
                        </LabeledInput>
                    </Section>

                    <Section title="Тема оформления" description="Выберите тему из списка. Используйте кнопку копирования для создания своей версии.">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {themes.map(theme => (
                                <div key={theme.id} className="text-center group relative">
                                    <button
                                        onClick={() => selectTheme(theme.id)}
                                        className="w-full aspect-video rounded-lg border-2 dark:border-gray-600 transition-all flex items-center justify-center text-xs font-semibold shadow-sm hover:shadow-md"
                                        style={{
                                            backgroundImage: `linear-gradient(135deg, ${theme.scheme.light.dashboardBackgroundColor1} 50%, ${theme.scheme.dark.dashboardBackgroundColor1} 50%)`,
                                            borderColor: activeThemeId === theme.id ? '#3b82f6' : 'transparent',
                                            transform: activeThemeId === theme.id ? 'scale(1.02)' : 'scale(1)'
                                        }}
                                    >
                                        <span className="bg-white/50 dark:bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm">{theme.name}</span>
                                    </button>
                                    <div className="absolute top-1 right-1 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {theme.isCustom && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEditTheme(theme); }}
                                                className="p-1.5 bg-gray-800/80 rounded-full text-white hover:bg-blue-600 transition-colors backdrop-blur-sm"
                                                title="Редактировать тему"
                                            >
                                                <Icon icon="mdi:pencil" className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDuplicateTheme(theme); }}
                                            className="p-1.5 bg-gray-800/80 rounded-full text-white hover:bg-green-600 transition-colors backdrop-blur-sm"
                                            title="Создать копию"
                                        >
                                            <Icon icon="mdi:content-copy" className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleExportTheme(theme); }}
                                            className="p-1.5 bg-gray-800/80 rounded-full text-white hover:bg-purple-600 transition-colors backdrop-blur-sm"
                                            title="Экспортировать тему"
                                        >
                                            <Icon icon="mdi:export-variant" className="w-3.5 h-3.5" />
                                        </button>
                                        {theme.isCustom && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setConfirmingDeleteTheme(theme); }}
                                                className="p-1.5 bg-gray-800/80 rounded-full text-white hover:bg-red-600 transition-colors backdrop-blur-sm"
                                                title="Удалить тему"
                                            >
                                                <Icon icon="mdi:trash-can-outline" className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div className="text-center">
                                <button
                                    onClick={handleCreateNewTheme}
                                    className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-400 dark:border-gray-600 transition-all flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:border-gray-500"
                                >
                                    <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                                        <Icon icon="mdi:plus" className="w-8 h-8 mb-1" />
                                        <span className="text-xs font-medium">Создать тему</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </Section>

                    {editingTheme && (
                        <Section key={editingTheme.id} title={themes.some(t => t.id === editingTheme.id) ? `Редактирование "${editingTheme.name}"` : `Создание копии "${editingTheme.name}"`} description="Настройте цвета и сохраните тему." defaultOpen={true}>
                            {editingTheme.isCustom && (
                                <LabeledInput label="Название темы">
                                    <input
                                        type="text"
                                        value={editingTheme.name}
                                        onChange={e => setEditingTheme(t => t ? { ...t, name: e.target.value } : null)}
                                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </LabeledInput>
                            )}
                            <div className="flex border-b border-gray-200 dark:border-gray-700 mt-4">
                                <button onClick={() => setActiveEditorTab('light')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeEditorTab === 'light' ? 'border-b-2 border-blue-500 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Светлая</button>
                                <button onClick={() => setActiveEditorTab('dark')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeEditorTab === 'dark' ? 'border-b-2 border-blue-500 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Темная</button>
                            </div>
                            <div className="pt-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-lg p-4">
                                {activeEditorTab === 'light' && <ThemeEditor themeType="light" colorScheme={editingTheme.scheme} onUpdate={handleUpdateEditingThemeValue} />}
                                {activeEditorTab === 'dark' && <ThemeEditor themeType="dark" colorScheme={editingTheme.scheme} onUpdate={handleUpdateEditingThemeValue} />}
                            </div>
                            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button onClick={() => setEditingTheme(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors">Отмена</button>
                                <button onClick={handleSaveTheme} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                                    {!themes.some(t => t.id === editingTheme.id) ? 'Сохранить копию' : 'Сохранить'}
                                </button>
                            </div>
                        </Section>
                    )}
                    
                    <Section title="Анимация фона" defaultOpen={false}>
                        <LabeledInput label="Эффект">
                            <select value={backgroundEffect} onChange={e => setBackgroundEffect(e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm">
                                <option value="none">Нет</option>
                                <option value="snow">Снег</option>
                                <option value="rain">Дождь</option>
                                <option value="strong-cloudy">Сильная облачность</option>
                                <option value="rain-clouds">Облака и дождь</option>
                                <option value="leaves">Листопад</option>
                                <option value="river">Речные волны</option>
                                <option value="aurora">Полярное сияние</option>
                            </select>
                        </LabeledInput>
                        
                        {backgroundEffect === 'aurora' && (
                            <div className="mt-4 space-y-4 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Настройки сияния</h4>
                                    <div className="flex gap-2">
                                        {Object.entries(AURORA_PRESETS).map(([name, preset]) => (
                                            <button 
                                                key={name}
                                                onClick={() => setAuroraSettings(preset)}
                                                className="px-2 py-1 text-xs rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 shadow-sm"
                                            >
                                                {name === 'classic' ? 'Классика' : name === 'green' ? 'Зеленый' : 'Фиолет'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col items-center">
                                        <label className="text-xs mb-1 text-gray-500">Цвет 1</label>
                                        <input type="color" value={auroraSettings.color1} onChange={e => handleAuroraChange('color1', e.target.value)} className="w-full h-8 p-0 border-none rounded cursor-pointer bg-transparent"/>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <label className="text-xs mb-1 text-gray-500">Цвет 2</label>
                                        <input type="color" value={auroraSettings.color2} onChange={e => handleAuroraChange('color2', e.target.value)} className="w-full h-8 p-0 border-none rounded cursor-pointer bg-transparent"/>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <label className="text-xs mb-1 text-gray-500">Цвет 3</label>
                                        <input type="color" value={auroraSettings.color3} onChange={e => handleAuroraChange('color3', e.target.value)} className="w-full h-8 p-0 border-none rounded cursor-pointer bg-transparent"/>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <LabeledInput label="Скорость">
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="6" max="40" value={auroraSettings.speed} onChange={e => handleAuroraChange('speed', Number(e.target.value))} className="w-full accent-blue-500"/>
                                            <span className="text-xs w-8 text-right font-mono">{auroraSettings.speed}s</span>
                                        </div>
                                    </LabeledInput>
                                    <LabeledInput label="Интенсивность">
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="30" max="120" value={auroraSettings.intensity} onChange={e => handleAuroraChange('intensity', Number(e.target.value))} className="w-full accent-blue-500"/>
                                            <span className="text-xs w-8 text-right font-mono">{auroraSettings.intensity}%</span>
                                        </div>
                                    </LabeledInput>
                                    <LabeledInput label="Размытие">
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="4" max="40" value={auroraSettings.blur} onChange={e => handleAuroraChange('blur', Number(e.target.value))} className="w-full accent-blue-500"/>
                                            <span className="text-xs w-8 text-right font-mono">{auroraSettings.blur}px</span>
                                        </div>
                                    </LabeledInput>
                                    <LabeledInput label="Насыщенность">
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="80" max="220" value={auroraSettings.saturate} onChange={e => handleAuroraChange('saturate', Number(e.target.value))} className="w-full accent-blue-500"/>
                                            <span className="text-xs w-8 text-right font-mono">{auroraSettings.saturate}%</span>
                                        </div>
                                    </LabeledInput>
                                </div>
                                
                                <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                                    <LabeledInput label="Звезды">
                                        <div className="flex justify-end">
                                            <input type="checkbox" checked={auroraSettings.starsEnabled} onChange={e => handleAuroraChange('starsEnabled', e.target.checked)} className="w-5 h-5 accent-blue-600"/>
                                        </div>
                                    </LabeledInput>
                                    {auroraSettings.starsEnabled && (
                                        <div className="mt-2">
                                            <LabeledInput label="Скорость мерцания">
                                                <div className="flex items-center gap-2">
                                                    <input type="range" min="2" max="12" value={auroraSettings.starsSpeed} onChange={e => handleAuroraChange('starsSpeed', Number(e.target.value))} className="w-full accent-blue-500"/>
                                                    <span className="text-xs w-8 text-right font-mono">{auroraSettings.starsSpeed}s</span>
                                                </div>
                                            </LabeledInput>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Section>

                    <Section title="Режим день/ночь" description="Автоматически переключает светлую и темную тему.">
                        <select value={themeMode} onChange={(e) => setThemeMode(e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="auto">Как в системе</option>
                            <option value="day">Всегда светлая</option>
                            <option value="night">Всегда темная</option>
                            <option value="schedule">По расписанию</option>
                        </select>
                        {themeMode === 'schedule' && (
                            <div className="grid grid-cols-2 gap-4 mt-2 animate-in fade-in slide-in-from-top-1">
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

                    <Section title="Шаблоны карточек" description="Управление шаблонами для устройств." defaultOpen={false}>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                            {Object.values(templates).map((template: CardTemplate) => (
                                <div key={template.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 p-3 rounded-md border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{template.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{template.deviceType}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteTemplate(template.id)} 
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                        title="Удалить шаблон"
                                    >
                                        <Icon icon="mdi:trash-can-outline" className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="pt-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                <Icon icon="mdi:information-outline" className="w-4 h-4 inline mr-1" />
                                Чтобы создать новый шаблон, используйте контекстное меню на карточке устройства в режиме редактирования.
                            </p>
                        </div>
                    </Section>

                    <Section title="Резервное копирование" description="Сохраните все настройки в файл или восстановите их." defaultOpen={false}>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                                <Icon icon="mdi:download" className="w-5 h-5" />
                                Экспорт настроек
                            </button>
                            <label className="flex-1 flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer shadow-sm">
                                <Icon icon="mdi:upload" className="w-5 h-5" />
                                Импорт настроек
                                <input type="file" accept=".zip,.json" onChange={handleImport} className="hidden" />
                            </label>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Опасная зона</h4>
                            <button onClick={handleResetAllSettings} className="w-full text-sm text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 py-2.5 rounded-lg transition-colors border border-red-200 dark:border-red-900/30">
                                Сбросить все настройки и данные
                            </button>
                        </div>
                    </Section>

                    <div className="pt-8 mt-4 text-center border-t border-gray-100 dark:border-gray-800">
                        <button
                            onClick={handleResetAppearance}
                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:underline transition-colors"
                        >
                            Сбросить настройки внешнего вида
                        </button>
                    </div>
                </>
            )}
            
            {/* Confirm Delete Theme Dialog */}
            <ConfirmDialog
                isOpen={!!confirmingDeleteTheme}
                title="Удалить тему?"
                message={
                    <>
                        Вы уверены, что хотите удалить тему <strong className="text-gray-900 dark:text-white">"{confirmingDeleteTheme?.name}"</strong>?
                        <br />
                        Это действие нельзя отменить.
                    </>
                }
                onConfirm={() => {
                    if (confirmingDeleteTheme) deleteTheme(confirmingDeleteTheme.id);
                    setConfirmingDeleteTheme(null);
                }}
                onCancel={() => setConfirmingDeleteTheme(null)}
                confirmText="Удалить"
            />
            
            {/* Confirm Delete Server Dialog */}
            <ConfirmDialog
                isOpen={!!serverToDelete}
                title="Удалить сервер?"
                message={
                    <>
                        Вы уверены, что хотите удалить сервер <strong className="text-gray-900 dark:text-white">"{serverToDelete?.name}"</strong>?
                        <br />
                        Вам придется ввести URL и токен заново.
                    </>
                }
                onConfirm={() => {
                    if (serverToDelete) deleteServer(serverToDelete.id);
                    setServerToDelete(null);
                    if (selectedServerId === serverToDelete?.id) setSelectedServerId(null);
                }}
                onCancel={() => setServerToDelete(null)}
                confirmText="Удалить"
            />
        </>
    );

    if (variant === 'drawer') {
        // When used as a drawer (overlay), isOpen determines visibility.
        return (
            <div className={`fixed inset-0 z-[60] flex justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                 {/* Backdrop */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
                
                {/* Drawer Panel */}
                <div className={`relative w-full max-w-lg h-full bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto transition-transform duration-300 border-l border-gray-200 dark:border-gray-700 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                     <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Настройки</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
                            <Icon icon="mdi:close" className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-4 space-y-8 pb-20">
                        {content}
                    </div>
                </div>
            </div>
        );
    }

    // Default Page Layout (Login Screen)
    return (
        <div className="w-full max-w-4xl mx-auto p-4 space-y-8 pb-20">
            {content}
        </div>
    );
};

export default Settings;
