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
                                <button 
                                    onClick={handleConnect} 
                                    disabled={!selectedServerId || connectionStatus === 'connecting'} 
                                    className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    {connectionStatus === 'connecting' ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 