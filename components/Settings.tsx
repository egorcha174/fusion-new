import React, { useRef, useState, useMemo, useEffect } from 'react';
import { CardTemplates, CardTemplate, ColorScheme, DeviceType, ColorThemeSet, EventTimerWidget, WeatherSettings, ServerConfig, ThemeDefinition, Device } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { useAppStore } from '../store/appStore';
import { useHAStore } from '../store/haStore';
import JSZip from 'jszip';
import { Icon } from '@iconify/react';
import { LOCAL_STORAGE_KEYS } from '../constants';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { nanoid } from 'nanoid';
import { set as setAtPath } from '../utils/obj-path';

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
const Section: React.FC<{ title: string, children: React.ReactNode, defaultOpen?: boolean, description?: string, key?: string }> = ({ title, children, defaultOpen = true, description, key }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4" key={key}>
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
                <RangeInput onUpdate={onUpdate} label="Скругление углов" path={`${pathPrefix}.cardBorderRadius`} value={scheme.cardBorderRadius ?? 16} min={0} max={24} step={1} unit="px" />
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
            <Section title="Виджет Погоды" defaultOpen={false}>
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
}

const Settings: React.FC<SettingsProps> = ({ onConnect, connectionStatus, error }) => {
    const importTemplatesRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<SettingsTab>('connection');
    
    // Состояния для вкладки "Подключение"
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [editingServer, setEditingServer] = useState<Partial<ServerConfig> | null>(null);
    const [serverToDelete, setServerToDelete] = useState<ServerConfig | null>(null);
    
    const {
        templates, setTemplates, handleDeleteTemplate,
        clockSettings, setClockSettings,
        sidebarWidth, setSidebarWidth,
        isSidebarVisible, setIsSidebarVisible,
        themeMode, setThemeMode,
        scheduleStartTime, setScheduleStartTime,
        scheduleEndTime, setScheduleEndTime,
        themes, activeThemeId, selectTheme, saveTheme, deleteTheme,
        onResetColorScheme,
        weatherProvider, setWeatherProvider,
        openWeatherMapKey, setOpenWeatherMapKey,
        yandexWeatherKey, setYandexWeatherKey,
        forecaApiKey, setForecaApiKey,
        weatherSettings, setWeatherSettings,
        weatherEntityId, setWeatherEntityId,
        lowBatteryThreshold, setLowBatteryThreshold,
        isChristmasThemeEnabled, setIsChristmasThemeEnabled,
        servers, activeServerId, addServer, updateServer, deleteServer, setActiveServerId,
    } = useAppStore();
    const { allKnownDevices } = useHAStore();

    const [editingTheme, setEditingTheme] = useState<ThemeDefinition | null>(null);
    const [confirmingDeleteTheme, setConfirmingDeleteTheme] = useState<ThemeDefinition | null>(null);

    // FIX: Added explicit type annotation `(d: Device)` to the filter callback to resolve type inference issues where `d` was being treated as `unknown`. This ensures `d.haDomain` and subsequent property access on the filtered items are correctly typed.
    const weatherEntities = useMemo(() => 
        Array.from(allKnownDevices.values()).filter((d: Device) => d.haDomain === 'weather'), 
        [allKnownDevices]
    );

    useEffect(() => {
        // При первой загрузке выбрать активный сервер
        if (!selectedServerId && activeServerId) {
            setSelectedServerId(activeServerId);
        }
    }, [activeServerId, selectedServerId]);
    
    useEffect(() => {
        // Если выбранный сервер удалили, сбрасываем форму редактирования.
        // Проверяем `editingServer.id`, чтобы не сбрасывать при создании нового сервера.
        if (editingServer && editingServer.id && !servers.some(s => s.id === editingServer.id)) {
            setEditingServer(null);
        }
    }, [servers, editingServer]);


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
                const zip = await JSZip.loadAsync(e.target?.result as ArrayBuffer);
                const settingsFile = zip.file("ha-dashboard-settings.json");

                if (!settingsFile) {
                    throw new Error("Файл 'ha-dashboard-settings.json' не найден в архиве.");
                }

                const content = await settingsFile.async("string");
                const importedSettings = JSON.parse(content);

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
        } else {
            const newTheme: ThemeDefinition = {
                id: nanoid(),
                name: `${theme.name} (копия)`,
                isCustom: true,
                scheme: JSON.parse(JSON.stringify(theme.scheme)),
            };
            setEditingTheme(newTheme);
        }
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


    // --- JSX для рендеринга каждой вкладки ---
    const renderConnectionTab = () => {
        const currentSelectedServer = servers.find(s => s.id === selectedServerId);

        return (
            <div className="flex h-full">
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
                        <button onClick={() => currentSelectedServer && setEditingServer(currentSelectedServer)} disabled={!currentSelectedServer} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed" title="Редактировать"><Icon icon="mdi:pencil" className="w-5 h-5" /></button>
                        <button onClick={() => currentSelectedServer && setServerToDelete(currentSelectedServer)} disabled={!currentSelectedServer} className="p-2 text-red-500 hover:bg-red-500/10 rounded-md disabled:opacity-50 disabled:cursor-not-allowed" title="Удалить"><Icon icon="mdi:trash-can-outline" className="w-5 h-5" /></button>
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
        );
    };
    
    const [activeEditorTab, setActiveEditorTab] = useState<'light' | 'dark'>('light');
    
    const renderAppearanceTab = () => (
        <div className="space-y-4">
            <Section title="Тема оформления" description="Выберите готовую тему или нажмите на нее для создания копии и редактирования.">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {themes.map(theme => (
                        <div key={theme.id} className="text-center group relative">
                            <button
                                onClick={() => {
                                    selectTheme(theme.id);
                                    handleEditTheme(theme);
                                }}
                                className="w-full aspect-video rounded-lg border-2 dark:border-gray-600 transition-all flex items-center justify-center text-xs font-semibold"
                                style={{
                                    backgroundImage: `linear-gradient(135deg, ${theme.scheme.light.dashboardBackgroundColor1} 50%, ${theme.scheme.dark.dashboardBackgroundColor1} 50%)`,
                                    borderColor: activeThemeId === theme.id ? '#3b82f6' : 'transparent'
                                }}
                            >
                                <span className="bg-white/50 dark:bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm">{theme.name}</span>
                            </button>
                            {theme.isCustom && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setConfirmingDeleteTheme(theme); }}
                                    className="absolute top-1 right-1 z-10 p-1 bg-gray-800/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                                    title="Удалить тему"
                                >
                                    <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                    <div className="text-center">
                        <button
                            onClick={handleCreateNewTheme}
                            className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-400 dark:border-gray-600 transition-all flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                        >
                            <Icon icon="mdi:plus" className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                        </button>
                    </div>
                </div>
            </Section>

            {editingTheme && (
                <Section key={editingTheme.id} title={editingTheme.isCustom ? `Редактирование "${editingTheme.name}"` : `Создание копии "${editingTheme.name}"`} description="Настройте цвета и сохраните тему." defaultOpen={true}>
                    {editingTheme.isCustom && (
                        <LabeledInput label="Название темы">
                            <input
                                type="text"
                                value={editingTheme.name}
                                onChange={e => setEditingTheme(t => t ? { ...t, name: e.target.value } : null)}
                                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </LabeledInput>
                    )}
                    <div className="flex border-b border-gray-200 dark:border-gray-700 mt-4">
                        <button onClick={() => setActiveEditorTab('light')} className={`px-4 py-2 text-sm font-medium ${activeEditorTab === 'light' ? 'border-b-2 border-blue-500 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Светлая</button>
                        <button onClick={() => setActiveEditorTab('dark')} className={`px-4 py-2 text-sm font-medium ${activeEditorTab === 'dark' ? 'border-b-2 border-blue-500 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Темная</button>
                    </div>
                    <div className="pt-4">
                        {activeEditorTab === 'light' && <ThemeEditor themeType="light" colorScheme={editingTheme.scheme} onUpdate={handleUpdateEditingThemeValue} />}
                        {activeEditorTab === 'dark' && <ThemeEditor themeType="dark" colorScheme={editingTheme.scheme} onUpdate={handleUpdateEditingThemeValue} />}
                    </div>
                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button onClick={() => setEditingTheme(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors">Отмена</button>
                        <button onClick={handleSaveTheme} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Сохранить</button>
                    </div>
                </Section>
            )}
            
            <Section title="Режим день/ночь" description="Автоматически переключает светлую и темную тему.">
                 <select value={themeMode} onChange={(e) => setThemeMode(e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="auto">Как в системе</option>
                    <option value="day">Всегда светлая</option>
                    <option value="night">Всегда темная</option>
                    <option value="schedule">По расписанию</option>
                </select>
                {themeMode === 'schedule' && (
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
                        <option value="homeassistant">Home Assistant</option>
                        <option value="openweathermap">OpenWeatherMap</option>
                        <option value="yandex">Яндекс Погода</option>
                        <option value="foreca">Foreca</option>
                    </select>
                 </LabeledInput>
                 {weatherProvider === 'homeassistant' && (
                    <LabeledInput label="Сущность погоды">
                        <select value={weatherEntityId || ''} onChange={e => setWeatherEntityId(e.target.value || null)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm">
                            <option value="">-- Выберите сущность --</option>
                            {weatherEntities.map(entity => (
                                <option key={entity.id} value={entity.id}>{entity.name}</option>
                            ))}
                        </select>
                    </LabeledInput>
                 )}
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
                 <LabeledInput label="Набор иконок">
                    <select value={weatherSettings.iconPack} onChange={e => setWeatherSettings({ ...weatherSettings, iconPack: e.target.value as any })} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm">
                        <option value="default">Стандартные (анимированные)</option>
                        <option value="meteocons">Meteocons</option>
                        <option value="weather-icons">Weather Icons</option>
                        <option value="material-symbols-light">Material Symbols</option>
                    </select>
                </LabeledInput>
                <LabeledInput label="Дней для прогноза">
                    <input type="number" min="1" max="7" value={weatherSettings.forecastDays} onChange={e => setWeatherSettings({ ...weatherSettings, forecastDays: Math.max(1, Math.min(7, parseInt(e.target.value, 10) || 4)) })} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm"/>
                </LabeledInput>
            </Section>

            <Section title="Прочее">
                <LabeledInput label="Порог низкого заряда">
                    <div className="flex items-center gap-2">
                        <input type="range" min="5" max="50" step="5" value={lowBatteryThreshold} onChange={e => setLowBatteryThreshold(Number(e.target.value))} className="w-full accent-blue-500"/>
                        <span className="text-sm font-mono">{lowBatteryThreshold}px</span>
                    </div>
                </LabeledInput>
                <LabeledInput label="Новогодняя тема">
                    <button onClick={() => setIsChristmasThemeEnabled(!isChristmasThemeEnabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isChristmasThemeEnabled ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isChristmasThemeEnabled ? 'translate-x-6' : 'translate-x-1'}`}/>
                    </button>
                </LabeledInput>
            </Section>

        </div>
    );
    
    const renderTemplatesTab = () => {
        const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
        const templateTypesToCreate: { label: string; type: DeviceType | 'custom' }[] = [
            { label: 'Сенсор', type: DeviceType.Sensor },
            { label: 'Светильник', type: DeviceType.Light },
            { label: 'Переключатель', type: DeviceType.Switch },
            { label: 'Климат', type: DeviceType.Thermostat },
            { label: 'Увлажнитель', type: DeviceType.Humidifier },
            { label: 'Кастомный', type: 'custom' },
        ];
        return (
            <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Шаблоны позволяют полностью кастомизировать внешний вид карточек для определенных типов устройств.</p>
                <div className="flex justify-end">
                    <div className="relative">
                        <button 
                            onClick={() => setIsCreateMenuOpen(prev => !prev)}
                            className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md py-2 px-4 transition-colors"
                        >
                            <Icon icon="mdi:plus" className="w-5 h-5" />
                            Создать шаблон
                        </button>
                        {isCreateMenuOpen && (
                            <div 
                                onMouseLeave={() => setIsCreateMenuOpen(false)}
                                className="absolute right-0 mt-2 w-48 bg-gray-100 dark:bg-gray-700 rounded-md shadow-lg z-10 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden fade-in"
                            >
                                <div className="py-1">
                                    {templateTypesToCreate.map(item => (
                                        <button
                                            key={item.label}
                                            onClick={() => {
                                                const newTemplate = useAppStore.getState().createNewBlankTemplate(item.type);
                                                useAppStore.getState().setEditingTemplate(newTemplate);
                                                setIsCreateMenuOpen(false);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
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
    };
    
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
        if (connectionStatus === 'connected' && activeTab === 'connection') {
            setActiveTab('appearance');
        }
    }, [connectionStatus, activeTab]);

    return (
        <>
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
                <main className="flex-1 overflow-y-auto">
                    {/* HACK: Добавляем p-6 только если это не вкладка подключения, т.к. у нее свой внутренний layout */}
                    <div className={activeTab === 'connection' ? 'h-full' : 'p-6'}>
                        {tabs.find(t => t.id === activeTab)?.content}
                    </div>
                </main>
            </div>
            {serverToDelete && (
                <ConfirmDialog
                    isOpen={!!serverToDelete}
                    title="Удалить сервер?"
                    message={<>Вы уверены, что хотите удалить <strong className="text-black dark:text-white">"{serverToDelete.name}"</strong>? Это действие нельзя отменить.</>}
                    onConfirm={() => {
                        deleteServer(serverToDelete.id);
                        setServerToDelete(null);
                    }}
                    onCancel={() => setServerToDelete(null)}
                />
            )}
             {confirmingDeleteTheme && (
                <ConfirmDialog
                    isOpen={!!confirmingDeleteTheme}
                    title="Удалить тему?"
                    message={<>Вы уверены, что хотите удалить тему <strong className="text-black dark:text-white">"{confirmingDeleteTheme.name}"</strong>? Это действие нельзя отменить.</>}
                    onConfirm={() => {
                        deleteTheme(confirmingDeleteTheme.id);
                        if (editingTheme?.id === confirmingDeleteTheme.id) {
                            setEditingTheme(null);
                        }
                        setConfirmingDeleteTheme(null);
                    }}
                    onCancel={() => setConfirmingDeleteTheme(null)}
                />
            )}
        </>
    );
};

export default Settings;
