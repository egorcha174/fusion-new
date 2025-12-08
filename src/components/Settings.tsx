import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CardTemplates, CardTemplate, ColorScheme, DeviceType, ColorThemeSet, EventTimerWidget, WeatherSettings, ServerConfig, ThemeDefinition, Device, AuroraSettings } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { useAppStore, BackgroundEffectType } from '../store/appStore';
import { useHAStore } from '../store/haStore';
import JSZip from 'jszip';
import { Icon } from '@iconify/react';
import { LOCAL_STORAGE_KEYS } from '../constants';
import { format } from 'date-fns';
import { nanoid } from 'nanoid';
import { set as setAtPath } from '../utils/obj-path';
import { generatePackage, validatePackage } from '../utils/packageManager';
import { Section, LabeledInput, ColorInput, RangeInput, ThemeEditor } from './SettingsControls';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'failed';
type SettingsTab = 'appearance' | 'interface' | 'templates' | 'connection' | 'backup';

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
        auroraSettings, setAuroraSettings,
        handleResetTemplates
    } = useAppStore();

    const { allKnownDevices, disconnect } = useHAStore();

    const [editingTheme, setEditingTheme] = useState<ThemeDefinition | null>(null);
    const [confirmingDeleteTheme, setConfirmingDeleteTheme] = useState<ThemeDefinition | null>(null);
    const [activeEditorTab, setActiveEditorTab] = useState<'light' | 'dark'>('light');
    const [confirmingResetTemplates, setConfirmingResetTemplates] = useState(false);

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

                        const validStorageKeys = Object.values(LOCAL_STORAGE_KEYS);
                        Object.keys(importedSettings).forEach(key => {
                            if (validStorageKeys.includes(key as any)) {
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
            const pkg = await generatePackage(theme, 'User', 'Exported from dashboard');
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
            Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
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
            } else if (path.endsWith('cardBorderWidth')) {
                newTheme.scheme.light.cardBorderWidth = value;
                newTheme.scheme.dark.cardBorderWidth = value;
            } else if (path.endsWith('iconBackgroundShape')) {
                newTheme.scheme.light.iconBackgroundShape = value;
                newTheme.scheme.dark.iconBackgroundShape = value;
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
                                onClick={() => {
                                    disconnect();
                                    setActiveServerId(null);
                                }}
                                className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                Отключиться
                            </button>
                        </div>
                    </Section>

                    <Section title="Внешний вид" description="Настройка режима темы (светлая/темная) и фоновой анимации.">
                        <LabeledInput label="Режим темы">
                            <select value={themeMode} onChange={e => setThemeMode(e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                                <option value="auto">Системная</option>
                                <option value="day">Светлая</option>
                                <option value="night">Темная</option>
                                <option value="schedule">По расписанию</option>
                            </select>
                        </LabeledInput>

                        {themeMode === 'schedule' && (
                            <div className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg space-y-3 mt-2 mb-2 animate-in fade-in slide-in-from-top-1">
                                <LabeledInput label="Начало ночи">
                                    <input type="time" value={scheduleStartTime} onChange={e => setScheduleStartTime(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm" />
                                </LabeledInput>
                                <LabeledInput label="Конец ночи">
                                    <input type="time" value={scheduleEndTime} onChange={e => setScheduleEndTime(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm" />
                                </LabeledInput>
                            </div>
                        )}

                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-4"></div>

                        <LabeledInput label="Анимация фона">
                            <select value={backgroundEffect} onChange={e => setBackgroundEffect(e.target.value as BackgroundEffectType)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm">
                                <option value="none">Нет</option>
                                <option value="weather">По погоде</option>
                                <option value="tron">Трон</option>
                                <option value="snow">Снег</option>
                                <option value="rain">Дождь</option>
                                <option value="strong-cloudy">Сильная облачность</option>
                                <option value="rain-clouds">Облака и дождь</option>
                                <option value="snow-rain">Снег с дождем</option>
                                <option value="thunderstorm">Гроза</option>
                                <option value="leaves">Листопад</option>
                                <option value="river">Речные волны</option>
                                <option value="aurora">Полярное сияние</option>
                                <option value="sun-glare">Солнечные блики</option>
                                <option value="sun-clouds">Солнечные блики с облаками</option>
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

                    <Section title="Погода" description="Настройте источник данных о погоде для виджета и фоновых эффектов.">
                        <LabeledInput label="Провайдер погоды">
                            <select value={weatherProvider} onChange={e => setWeatherProvider(e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                                <option value="homeassistant">Home Assistant</option>
                                <option value="openweathermap">OpenWeatherMap</option>
                                <option value="yandex">Яндекс.Погода</option>
                                <option value="foreca">Foreca</option>
                            </select>
                        </LabeledInput>

                        {weatherProvider === 'homeassistant' && (
                            <LabeledInput label="Сущность погоды" description="Выберите вашу сущность weather из Home Assistant.">
                                <select value={weatherEntityId} onChange={e => setWeatherEntityId(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                                    <option value="">-- Выберите сущность --</option>
                                    {weatherEntities.map(entity => (
                                        <option key={entity.id} value={entity.id}>{entity.name}</option>
                                    ))}
                                </select>
                            </LabeledInput>
                        )}

                        {weatherProvider === 'openweathermap' && (
                            <LabeledInput label="Ключ API OpenWeatherMap" description="Требуется для получения прогноза.">
                                <input type="password" value={openWeatherMapKey} onChange={e => setOpenWeatherMapKey(e.target.value)} placeholder="Вставьте ваш ключ API" className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
                            </LabeledInput>
                        )}
                        
                        {weatherProvider === 'yandex' && (
                            <LabeledInput label="Ключ API Яндекс.Погоды" description="Тариф 'Прогноз по координатам'.">
                                <input type="password" value={yandexWeatherKey} onChange={e => setYandexWeatherKey(e.target.value)} placeholder="Вставьте ваш ключ API" className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
                            </LabeledInput>
                        )}
                        
                        {weatherProvider === 'foreca' && (
                            <LabeledInput label="Ключ API Foreca" description="Требуется Basic/Pro подписка.">
                                <input type="password" value={forecaApiKey} onChange={e => setForecaApiKey(e.target.value)} placeholder="Вставьте ваш ключ API" className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
                            </LabeledInput>
                        )}

                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-4"></div>

                        <LabeledInput label="Дней в прогнозе">
                            <input type="number" min="1" max="7" value={weatherSettings.forecastDays} onChange={e => setWeatherSettings({ ...weatherSettings, forecastDays: parseInt(e.target.value, 10) })} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
                        </LabeledInput>

                        <LabeledInput label="Набор иконок">
                            <select value={weatherSettings.iconPack} onChange={e => setWeatherSettings({ ...weatherSettings, iconPack: e.target.value as any })} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                                <option value="default">Стандартные (анимированные)</option>
                                <option value="meteocons">Meteocons</option>
                                <option value="weather-icons">Weather Icons</option>
                                <option value="material-symbols-light">Material Symbols</option>
                            </select>
                        </LabeledInput>
                    </Section>

                    <Section title="Тема оформления" description="Выберите тему из списка. Используйте кнопку копирования для создания своей версии.">
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
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
                             <div className="text-center">
                                <label
                                    className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-400 dark:border-gray-600 transition-all flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:border-gray-500 cursor-pointer"
                                >
                                    <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                                        <Icon icon="mdi:file-upload-outline" className="w-8 h-8 mb-1" />
                                        <span className="text-xs font-medium">Импорт темы</span>
                                    </div>
                                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                                </label>
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

                    <Section title="Шаблоны карточек" description="Управление шаблонами для устройств." defaultOpen={false}>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                            {(Object.values(templates) as CardTemplate[]).map((template) => (
                                <div key={template.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 p-3 rounded-md border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{template.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{template.deviceType}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => setEditingTemplate(template)} 
                                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                                            title="Редактировать шаблон"
                                        >
                                            <Icon icon="mdi:pencil" className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteTemplate(template.id)} 
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                            title="Удалить шаблон"
                                        >
                                            <Icon icon="mdi:trash-can-outline" className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="pt-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                <Icon icon="mdi:information-outline" className="w-4 h-4 inline mr-1" />
                                Чтобы создать новый шаблон, используйте контекстное меню на карточке устройства в режиме редактирования.
                            </p>
                            <button
                                onClick={() => setConfirmingResetTemplates(true)}
                                className="w-full text-sm text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 py-2.5 rounded-lg transition-colors border border-red-200 dark:border-red-900/30 mt-2"
                            >
                                Сбросить все шаблоны к стандартным
                            </button>
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

            <ConfirmDialog
                isOpen={confirmingResetTemplates}
                title="Сбросить шаблоны?"
                message={
                    <>
                        Вы уверены, что хотите сбросить все шаблоны карточек к стандартным?
                        <br />
                        Все ваши пользовательские шаблоны и изменения будут утеряны.
                    </>
                }
                onConfirm={() => {
                    handleResetTemplates();
                    setConfirmingResetTemplates(false);
                }}
                onCancel={() => setConfirmingResetTemplates(false)}
                confirmText="Сбросить"
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
        return createPortal(
            <div className={`fixed inset-0 z-[60] flex justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                 {/* Backdrop - removed blur and color to allow previewing changes */}
                <div className="absolute inset-0" onClick={onClose} />
                
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
            </div>,
            document.body
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