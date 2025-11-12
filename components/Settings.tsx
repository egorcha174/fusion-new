

import React, { useRef, useState, useMemo } from 'react';
import { CardTemplates, CardTemplate, ColorScheme, DeviceType, ColorThemeSet } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { useAppStore } from '../store/appStore';
import { useHAStore } from '../store/haStore';
import JSZip from 'jszip';
import { Icon } from '@iconify/react';
import appleTheme from '../apple-inspired-light.theme.json';

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

const LOCAL_STORAGE_KEYS = [
  'ha-url', 'ha-token', 'ha-tabs', 'ha-active-tab', 'ha-device-customizations',
  'ha-clock-settings', 'ha-card-templates', 'ha-sidebar-width', 'ha-openweathermap-key',
  'ha-camera-settings', 'ha-theme', 'ha-color-scheme', 'ha-sidebar-visible',
];

const ColorSettingRow: React.FC<{ label: string, value: string, onChange: (newColor: string) => void }> = React.memo(({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <label className="text-sm text-gray-800 dark:text-gray-300">{label}</label>
    <input
      type="color"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"
    />
  </div>
));

const NumberSettingRow: React.FC<{ label: string; value: number | undefined; onChange: (newValue: number) => void; placeholder?: string; suffix?: string; }> = React.memo(({ label, value, onChange, placeholder, suffix }) => (
    <div className="flex items-center justify-between">
        <label className="text-sm text-gray-800 dark:text-gray-300">{label}</label>
        <div className="flex items-center gap-2">
            <input
                type="number"
                value={value || ''}
                onChange={e => onChange(parseInt(e.target.value, 10))}
                placeholder={placeholder || "Авто"}
                className="w-20 bg-gray-200 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {suffix && <span className="text-sm text-gray-500 dark:text-gray-400">{suffix}</span>}
        </div>
    </div>
));


const FontSettingRow: React.FC<{
    label: string;
    fontFamily: string | undefined;
    fontSize: number | undefined;
    onFontFamilyChange: (font: string) => void;
    onFontSizeChange: (size: number) => void;
}> = React.memo(({ label, fontFamily, fontSize, onFontFamilyChange, onFontSizeChange }) => (
    <div className="space-y-2">
        <label className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</label>
        <div className="grid grid-cols-2 gap-2">
            <select
                value={fontFamily || ''}
                onChange={e => onFontFamilyChange(e.target.value)}
                className="w-full bg-gray-200 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
            >
                <option value="">По умолчанию</option>
                {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
            </select>
             <input
                type="number"
                value={fontSize || ''}
                onChange={e => onFontSizeChange(parseInt(e.target.value))}
                placeholder="Авто"
                className="w-full bg-gray-200 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
        </div>
    </div>
));

// Локальный компонент секции для лучшей организации настроек
const Section: React.FC<{ title: string, children: React.ReactNode, defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left font-semibold text-gray-900 dark:text-gray-100">
        <span>{title}</span>
        <Icon icon="mdi:chevron-down" className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="pt-4 space-y-3 border-t border-gray-300 dark:border-gray-600 mt-3">{children}</div>}
    </div>
  );
};


const ThemeEditor: React.FC<{
    themeKey: 'light' | 'dark';
    themeSet: ColorThemeSet;
    onUpdate: (field: keyof ColorThemeSet, value: any) => void;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = React.memo(({ themeKey, themeSet, onUpdate, onImageUpload }) => {
    const bgImageInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-4">
            <Section title="Фон дашборда" defaultOpen={true}>
                <div className="flex gap-1 bg-gray-200 dark:bg-gray-900/50 p-1 rounded-lg">
                    {(['color', 'gradient', 'image'] as const).map(type => (
                        <button key={type} onClick={() => onUpdate('dashboardBackgroundType', type)}
                            className={`flex-1 text-xs font-semibold py-1 rounded-md transition-colors ${themeSet.dashboardBackgroundType === type ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-50' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}>
                            {type === 'color' ? 'Цвет' : type === 'gradient' ? 'Градиент' : 'Изображение'}
                        </button>
                    ))}
                </div>
                {themeSet.dashboardBackgroundType === 'color' && <ColorSettingRow label="Цвет фона" value={themeSet.dashboardBackgroundColor1} onChange={v => onUpdate('dashboardBackgroundColor1', v)} />}
                {themeSet.dashboardBackgroundType === 'gradient' && (
                    <div className="space-y-2">
                        <ColorSettingRow label="Цвет 1" value={themeSet.dashboardBackgroundColor1} onChange={v => onUpdate('dashboardBackgroundColor1', v)} />
                        <ColorSettingRow label="Цвет 2" value={themeSet.dashboardBackgroundColor2 || '#ffffff'} onChange={v => onUpdate('dashboardBackgroundColor2', v)} />
                    </div>
                )}
                {themeSet.dashboardBackgroundType === 'image' && (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            {themeSet.dashboardBackgroundImage && <img src={themeSet.dashboardBackgroundImage} className="w-16 h-10 object-cover rounded-md" />}
                            <button onClick={() => bgImageInputRef.current?.click()} className="flex-1 text-center bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm p-2 rounded-lg">Загрузить...</button>
                            <input type="file" accept="image/*" ref={bgImageInputRef} onChange={onImageUpload} className="hidden"/>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Размытие: {themeSet.dashboardBackgroundImageBlur || 0}px</label>
                            <input type="range" min="0" max="20" value={themeSet.dashboardBackgroundImageBlur || 0} onChange={e => onUpdate('dashboardBackgroundImageBlur', parseInt(e.target.value))} className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Яркость: {themeSet.dashboardBackgroundImageBrightness || 100}%</label>
                            <input type="range" min="20" max="150" value={themeSet.dashboardBackgroundImageBrightness || 100} onChange={e => onUpdate('dashboardBackgroundImageBrightness', parseInt(e.target.value))} className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                        </div>
                    </div>
                )}
            </Section>
            
            <Section title="Панели и прозрачность">
                <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Панели (Боковая и Шапка): {Math.round((themeSet.panelOpacity ?? 1) * 100)}%</label>
                    <input type="range" min="0.2" max="1" step="0.05" value={themeSet.panelOpacity ?? 1} onChange={e => onUpdate('panelOpacity', parseFloat(e.target.value))} className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                </div>
                 <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Карточки: {Math.round((themeSet.cardOpacity ?? 1) * 100)}%</label>
                    <input type="range" min="0.2" max="1" step="0.05" value={themeSet.cardOpacity ?? 1} onChange={e => onUpdate('cardOpacity', parseFloat(e.target.value))} className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                </div>
             </Section>
             
             <Section title="Карточки (общие)">
                <ColorSettingRow label="Фон (Выкл.)" value={themeSet.cardBackground} onChange={v => onUpdate('cardBackground', v)} />
                <ColorSettingRow label="Фон (Вкл.)" value={themeSet.cardBackgroundOn} onChange={v => onUpdate('cardBackgroundOn', v)} />
             </Section>

            <Section title="Вкладки">
                <ColorSettingRow label="Текст (неактивная)" value={themeSet.tabTextColor} onChange={v => onUpdate('tabTextColor', v)} />
                <ColorSettingRow label="Текст (активная)" value={themeSet.activeTabTextColor} onChange={v => onUpdate('activeTabTextColor', v)} />
                <ColorSettingRow label="Индикатор (активная)" value={themeSet.tabIndicatorColor} onChange={v => onUpdate('tabIndicatorColor', v)} />
            </Section>

            <Section title="Термостат">
                <ColorSettingRow label="Ручка" value={themeSet.thermostatHandleColor} onChange={v => onUpdate('thermostatHandleColor', v)} />
                <ColorSettingRow label="Целевая температура" value={themeSet.thermostatDialTextColor} onChange={v => onUpdate('thermostatDialTextColor', v)} />
                <ColorSettingRow label="Подпись (Цель/Нагрев)" value={themeSet.thermostatDialLabelColor} onChange={v => onUpdate('thermostatDialLabelColor', v)} />
                <ColorSettingRow label="Режим нагрева" value={themeSet.thermostatHeatingColor} onChange={v => onUpdate('thermostatHeatingColor', v)} />
                <ColorSettingRow label="Режим охлаждения" value={themeSet.thermostatCoolingColor} onChange={v => onUpdate('thermostatCoolingColor', v)} />
            </Section>

            <Section title="Часы">
                 <ColorSettingRow label="Цвет текста" value={themeSet.clockTextColor} onChange={v => onUpdate('clockTextColor', v)} />
            </Section>

            <Section title="Виджет Погоды">
                <NumberSettingRow label="Размер иконки (текущая)" value={themeSet.weatherIconSize} onChange={v => onUpdate('weatherIconSize', v)} suffix="px" />
                <NumberSettingRow label="Размер иконки (прогноз)" value={themeSet.weatherForecastIconSize} onChange={v => onUpdate('weatherForecastIconSize', v)} suffix="px" />
                <NumberSettingRow label="Шрифт (температура)" value={themeSet.weatherCurrentTempFontSize} onChange={v => onUpdate('weatherCurrentTempFontSize', v)} suffix="px" />
                <NumberSettingRow label="Шрифт (описание)" value={themeSet.weatherCurrentDescFontSize} onChange={v => onUpdate('weatherCurrentDescFontSize', v)} suffix="px" />
                <NumberSettingRow label="Шрифт (день)" value={themeSet.weatherForecastDayFontSize} onChange={v => onUpdate('weatherForecastDayFontSize', v)} suffix="px" />
                <NumberSettingRow label="Шрифт (прогноз, макс.)" value={themeSet.weatherForecastMaxTempFontSize} onChange={v => onUpdate('weatherForecastMaxTempFontSize', v)} suffix="px" />
                <NumberSettingRow label="Шрифт (прогноз, мин.)" value={themeSet.weatherForecastMinTempFontSize} onChange={v => onUpdate('weatherForecastMinTempFontSize', v)} suffix="px" />
            </Section>
            
            <Section title="Текст карточки (Выкл.)">
                <ColorSettingRow label="Название" value={themeSet.nameTextColor} onChange={v => onUpdate('nameTextColor', v)} />
                <ColorSettingRow label="Статус" value={themeSet.statusTextColor} onChange={v => onUpdate('statusTextColor', v)} />
                <ColorSettingRow label="Значение" value={themeSet.valueTextColor} onChange={v => onUpdate('valueTextColor', v)} />
                <FontSettingRow label="Шрифт (Название)" fontFamily={themeSet.nameTextFontFamily} fontSize={themeSet.nameTextFontSize} onFontFamilyChange={v => onUpdate('nameTextFontFamily', v)} onFontSizeChange={v => onUpdate('nameTextFontSize', v)} />
                <FontSettingRow label="Шрифт (Статус)" fontFamily={themeSet.statusTextFontFamily} fontSize={themeSet.statusTextFontSize} onFontFamilyChange={v => onUpdate('statusTextFontFamily', v)} onFontSizeChange={v => onUpdate('statusTextFontSize', v)} />
                <FontSettingRow label="Шрифт (Значение)" fontFamily={themeSet.valueTextFontFamily} fontSize={themeSet.valueTextFontSize} onFontFamilyChange={v => onUpdate('valueTextFontFamily', v)} onFontSizeChange={v => onUpdate('valueTextFontSize', v)} />
            </Section>

             <Section title="Текст карточки (Вкл.)">
                <ColorSettingRow label="Название" value={themeSet.nameTextColorOn} onChange={v => onUpdate('nameTextColorOn', v)} />
                <ColorSettingRow label="Статус" value={themeSet.statusTextColorOn} onChange={v => onUpdate('statusTextColorOn', v)} />
                <ColorSettingRow label="Значение" value={themeSet.valueTextColorOn} onChange={v => onUpdate('valueTextColorOn', v)} />
                <FontSettingRow label="Шрифт (Название)" fontFamily={themeSet.nameTextFontFamilyOn} fontSize={themeSet.nameTextFontSizeOn} onFontFamilyChange={v => onUpdate('nameTextFontFamilyOn', v)} onFontSizeChange={v => onUpdate('nameTextFontSizeOn', v)} />
                <FontSettingRow label="Шрифт (Статус)" fontFamily={themeSet.statusTextFontFamilyOn} fontSize={themeSet.statusTextFontSizeOn} onFontFamilyChange={v => onUpdate('statusTextFontFamilyOn', v)} onFontSizeChange={v => onUpdate('statusTextFontSizeOn', v)} />
                <FontSettingRow label="Шрифт (Значение)" fontFamily={themeSet.valueTextFontFamilyOn} fontSize={themeSet.valueTextFontSizeOn} onFontFamilyChange={v => onUpdate('valueTextFontFamilyOn', v)} onFontSizeChange={v => onUpdate('valueTextFontSizeOn', v)} />
            </Section>
        </div>
    );
});

const Settings: React.FC<{
    onConnect: (url: string, token: string) => void;
    connectionStatus: ConnectionStatus;
    error: string | null;
}> = ({ onConnect, connectionStatus, error }) => {
    const { disconnect, haUrl } = useHAStore();
    const {
        templates, setEditingTemplate, handleDeleteTemplate,
        colorScheme, setColorScheme, onResetColorScheme,
        isSidebarVisible, setIsSidebarVisible, createNewBlankTemplate,
        openWeatherMapKey, setOpenWeatherMapKey
    } = useAppStore();
    
    const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
    const [url, setUrl] = useState(() => localStorage.getItem('ha-url') || '');
    const [token, setToken] = useState(() => localStorage.getItem('ha-token') || '');
    const [localError, setLocalError] = useState('');
    const [deletingTemplate, setDeletingTemplate] = useState<CardTemplate | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const themeFileInputRef = useRef<HTMLInputElement>(null);
    const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
    const [activeThemeEditor, setActiveThemeEditor] = useState<'light' | 'dark'>('light');

    const isLoading = connectionStatus === 'connecting';

    const handleConnect = () => {
        if (!url || !token) { setLocalError('Пожалуйста, укажите URL и токен доступа.'); return; }
        setLocalError('');
        localStorage.setItem('ha-url', url);
        localStorage.setItem('ha-token', token);
        onConnect(url, token);
    };
    
    const handleLoadAppleTheme = () => {
        if (window.confirm("Загрузить тему 'Apple Home (Light)'? Это перезапишет текущие настройки внешнего вида.")) {
            setColorScheme(appleTheme.colorScheme);
        }
    };

    const handleExportSettings = () => {
        try {
            const settings: Record<string, any> = {};
            LOCAL_STORAGE_KEYS.forEach(key => {
                const item = localStorage.getItem(key);
                if (item) { try { settings[key] = JSON.parse(item); } catch(e) { settings[key] = item; } }
            });
            const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `ha-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(blobUrl);
        } catch (err) { alert("Не удалось экспортировать настройки."); }
    };

    const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const settings = JSON.parse(e.target?.result as string);
                if (!window.confirm("Вы уверены? Это перезапишет все текущие настройки и перезагрузит страницу.")) return;
                LOCAL_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
                Object.keys(settings).forEach(key => { if (LOCAL_STORAGE_KEYS.includes(key)) localStorage.setItem(key, typeof settings[key] === 'string' ? settings[key] : JSON.stringify(settings[key])); });
                alert("Настройки импортированы. Приложение будет перезагружено.");
                window.location.reload();
            } catch (err) { alert("Не удалось импортировать настройки."); }
        };
        reader.readAsText(file);
    };

    const handleExportTheme = async () => {
        try {
            const zip = new JSZip();
            zip.file("theme.json", JSON.stringify({ 'ha-dashboard-theme-version': 2, 'exported-at': new Date().toISOString(), colorScheme }, null, 2));
            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ha-dashboard-theme-${new Date().toISOString().slice(0, 10)}.zip`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) { alert("Не удалось экспортировать тему."); }
    };

    const handleImportTheme = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const zip = await JSZip.loadAsync(file);
            const themeFile = zip.file("theme.json");
            if (!themeFile) throw new Error("Отсутствует theme.json.");
            const importedData = JSON.parse(await themeFile.async("string"));
            if (!importedData.colorScheme?.light || !importedData.colorScheme?.dark) throw new Error("Неверный формат файла темы.");
            if (window.confirm("Импортировать новую тему? Это перезапишет текущие настройки цветов и фона.")) {
                setColorScheme(importedData.colorScheme);
                alert("Тема импортирована.");
            }
        } catch (err: any) { alert(`Не удалось импортировать тему: ${err.message}`); }
    };

    const updateColorSchemeField = (theme: 'light' | 'dark', field: keyof ColorThemeSet, value: any) => {
        const newScheme = JSON.parse(JSON.stringify(colorScheme));
        newScheme[theme][field] = value;
        setColorScheme(newScheme);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, theme: 'light' | 'dark') => {
        const file = e.target.files?.[0];
        if (file?.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => updateColorSchemeField(theme, 'dashboardBackgroundImage', event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const themeEditorComponent = useMemo(() => (
        <ThemeEditor
            themeKey={activeThemeEditor}
            themeSet={colorScheme[activeThemeEditor]}
            onUpdate={(field, value) => updateColorSchemeField(activeThemeEditor, field, value)}
            onImageUpload={(e) => handleImageUpload(e, activeThemeEditor)}
        />
    ), [activeThemeEditor, colorScheme]);

    const TAB_CONFIG = [
        { id: 'appearance', label: 'Внешний вид', icon: 'mdi:palette-outline' },
        { id: 'interface', label: 'Интерфейс', icon: 'mdi:application-cog-outline' },
        { id: 'templates', label: 'Шаблоны', icon: 'mdi:view-dashboard-edit-outline' },
        { id: 'connection', label: 'Подключение и API', icon: 'mdi:lan-connect' },
        { id: 'backup', label: 'Резервное копирование', icon: 'mdi:archive-arrow-down-outline' },
    ];

    if (connectionStatus !== 'connected') {
        return (
            <div className="min-h-screen bg-gray-200 dark:bg-gray-900 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/10">
                <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-6">Home Assistant</h1>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Home Assistant URL</label>
                    <input id="url" type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="e.g., 192.168.1.100:8123" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} />
                  </div>
                  <div>
                    <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Long-Lived Access Token</label>
                    <input id="token" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste your token here" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} />
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Вы можете создать токен на странице своего профиля в Home Assistant.</p>
                  </div>
                   {(error || localError) && <p className="text-red-400 text-sm text-center">{error || localError}</p>}
                  <button onClick={handleConnect} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={isLoading}>
                    {isLoading ? 'Подключение...' : 'Подключиться'}
                  </button>
                </div>
              </div>
            </div>
          );
    }
    
    return (
        <>
            <div className="w-full max-w-5xl h-[90vh] bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/10 flex overflow-hidden">
                {/* Sidebar Navigation */}
                <nav className="w-56 flex-shrink-0 bg-gray-200/50 dark:bg-gray-900/30 p-4 border-r border-black/5 dark:border-white/5 space-y-2">
                    <h1 className="text-xl font-bold px-2 pb-4 text-gray-900 dark:text-gray-100">Настройки</h1>
                    {TAB_CONFIG.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as SettingsTab)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg text-left transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-700/50'}`}>
                            <Icon icon={tab.icon} className="w-5 h-5 flex-shrink-0" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Content Area */}
                <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
                    {activeTab === 'appearance' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                 <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Внешний вид</h2>
                                 <button onClick={onResetColorScheme} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Сбросить</button>
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg space-y-3">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Готовые темы</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Выберите готовую тему для быстрого старта.</p>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleLoadAppleTheme} 
                                        className="flex-1 text-center bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm p-2 rounded-lg"
                                    >
                                        Apple Home (Light)
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-1 bg-gray-200 dark:bg-gray-900/50 p-1 rounded-lg self-start">
                                <button onClick={() => setActiveThemeEditor('light')} className={`px-4 py-1 text-sm font-semibold rounded-md transition-colors ${activeThemeEditor === 'light' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-50' : 'text-gray-600 dark:text-gray-400'}`}>Светлая тема</button>
                                <button onClick={() => setActiveThemeEditor('dark')} className={`px-4 py-1 text-sm font-semibold rounded-md transition-colors ${activeThemeEditor === 'dark' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-50' : 'text-gray-600 dark:text-gray-400'}`}>Темная тема</button>
                            </div>
                            {themeEditorComponent}
                        </div>
                    )}
                    {activeTab === 'interface' && (
                         <div className="space-y-6">
                             <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Интерфейс</h2>
                            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg">
                                <label htmlFor="showSidebar" className="text-sm font-medium text-gray-800 dark:text-gray-200">Показывать боковую панель</label>
                                <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isSidebarVisible ? 'bg-blue-600' : 'bg-gray-500 dark:bg-gray-600'}`}>
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isSidebarVisible ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    )}
                     {activeTab === 'templates' && (
                         <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Шаблоны карточек</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Создавайте и управляйте шаблонами для различных типов устройств.</p>
                             <div className="space-y-2 mb-4">
                                {Object.values(templates).map((template: CardTemplate) => (
                                    <div key={template.id} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg">
                                        <div className="flex items-center gap-2 overflow-hidden"><span className="text-xs font-mono bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{template.deviceType}</span><p className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate pr-2">{template.name}</p></div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button onClick={() => setEditingTemplate(template)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" title="Редактировать"><Icon icon="mdi:pencil-outline" className="h-4 w-4" /></button>
                                            <button onClick={() => setDeletingTemplate(template)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-md hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors" title="Удалить"><Icon icon="mdi:trash-can-outline" className="h-4 w-4" /></button>
                                        </div>
                                    </div>
                                ))}
                             </div>
                             <div className="relative">
                                <button onClick={() => setIsCreateMenuOpen(prev => !prev)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">Создать шаблон</button>
                                {isCreateMenuOpen && (<div onMouseLeave={() => setIsCreateMenuOpen(false)} className="absolute bottom-full left-0 right-0 mb-2 w-full bg-gray-200 dark:bg-gray-700 rounded-lg shadow-lg z-10 ring-1 ring-black/5 dark:ring-black ring-opacity-5 overflow-hidden fade-in"><button onClick={()=>{setEditingTemplate(createNewBlankTemplate(DeviceType.Sensor)); setIsCreateMenuOpen(false);}} className="block w-full text-left px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Для сенсора</button><button onClick={()=>{setEditingTemplate(createNewBlankTemplate(DeviceType.Light)); setIsCreateMenuOpen(false);}} className="block w-full text-left px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Для светильника</button><button onClick={()=>{setEditingTemplate(createNewBlankTemplate(DeviceType.Switch)); setIsCreateMenuOpen(false);}} className="block w-full text-left px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Для переключателя</button><button onClick={()=>{setEditingTemplate(createNewBlankTemplate(DeviceType.Thermostat)); setIsCreateMenuOpen(false);}} className="block w-full text-left px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Для климата</button></div>)}
                             </div>
                        </div>
                    )}
                    {activeTab === 'connection' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Подключение и API</h2>
                            <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg space-y-3">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Вы подключены к {haUrl}.</p>
                                <button onClick={disconnect} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">Отключиться</button>
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg space-y-3">
                                <label htmlFor="owmKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">OpenWeatherMap API Key</label>
                                <input id="owmKey" type="password" value={openWeatherMapKey} onChange={(e) => setOpenWeatherMapKey(e.target.value)} placeholder="Введите ваш API ключ" className="w-full bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <p className="text-xs text-gray-500 dark:text-gray-500">Необходим для виджета погоды.</p>
                            </div>
                        </div>
                    )}
                     {activeTab === 'backup' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Резервное копирование</h2>
                            <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg space-y-3">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Настройки приложения</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Сохраните все ваши настройки, включая вкладки, шаблоны, API ключи и внешний вид.</p>
                                <div className="flex gap-4">
                                    <button onClick={handleExportSettings} className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">Экспорт</button>
                                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">Импорт</button>
                                    <input type="file" ref={fileInputRef} onChange={handleImportSettings} accept="application/json" className="hidden" />
                                </div>
                            </div>
                             <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg space-y-3">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Тема</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Экспортируйте вашу текущую тему (цвета, шрифты, фон), чтобы поделиться ей, или импортируйте новую.</p>
                                <div className="flex gap-4">
                                    <button onClick={handleExportTheme} className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">Экспорт</button>
                                    <button onClick={() => themeFileInputRef.current?.click()} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">Импорт</button>
                                    <input type="file" ref={themeFileInputRef} onChange={handleImportTheme} accept=".zip" className="hidden" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
             <ConfirmDialog isOpen={!!deletingTemplate} title="Удалить шаблон?" message={<>Вы уверены, что хотите удалить шаблон <strong className="text-black dark:text-white">"{deletingTemplate?.name}"</strong>?<br/>Это действие нельзя отменить.</>} onConfirm={() => { if (deletingTemplate) handleDeleteTemplate(deletingTemplate.id); setDeletingTemplate(null); }} onCancel={() => setDeletingTemplate(null)} confirmText="Удалить"/>
        </>
    );
};

export default Settings;