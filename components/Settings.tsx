





import React, { useRef, useState } from 'react';
import { ClockSettings, ClockSize, CardTemplates, CardTemplate, ColorScheme, DeviceType } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { useAppStore } from '../store/appStore';
import { useHAStore } from '../store/haStore';

// Тип для статуса WebSocket-соединения
type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'failed';

interface SettingsProps {
  onConnect: (url: string, token: string) => void;
  connectionStatus: ConnectionStatus;
  error: string | null;
}

/**
 * Вспомогательный компонент для строки настройки цвета.
 */
const ColorSettingRow: React.FC<{ label: string, value: string, onChange: (newColor: string) => void }> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg">
    <label className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</label>
    <input
      type="color"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"
    />
  </div>
);

// Список ключей в localStorage, которые будут сохранены при экспорте.
const LOCAL_STORAGE_KEYS = [
  'ha-url', 'ha-token', 'ha-tabs', 'ha-active-tab', 'ha-device-customizations',
  'ha-clock-settings', 'ha-card-templates', 'ha-sidebar-width', 'ha-openweathermap-key',
  'ha-camera-settings', 'ha-theme', 'ha-color-scheme', 'ha-sidebar-visible',
];

/**
 * Компонент страницы настроек.
 * Отображает форму подключения, если соединение не установлено,
 * или различные настройки приложения, если соединение активно.
 */
const Settings: React.FC<SettingsProps> = (props) => {
  const { onConnect, connectionStatus, error } = props;
  const { disconnect, haUrl } = useHAStore();
  const {
      clockSettings, setClockSettings,
      templates, setEditingTemplate, handleDeleteTemplate,
      colorScheme, setColorScheme, onResetColorScheme,
      isSidebarVisible, setIsSidebarVisible, createNewBlankTemplate,
      openWeatherMapKey, setOpenWeatherMapKey
  } = useAppStore();
    
  // Локальное состояние для полей URL и токена. Инициализируется из localStorage.
  // Это не в Zustand, так как эти данные нужны до установления соединения.
  const [url, setUrl] = useState(() => localStorage.getItem('ha-url') || '');
  const [token, setToken] = useState(() => localStorage.getItem('ha-token') || '');

  const [localError, setLocalError] = useState('');
  const [deletingTemplate, setDeletingTemplate] = useState<CardTemplate | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const themeFileInputRef = useRef<HTMLInputElement>(null);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);


  // Обработчик нажатия на кнопку "Подключиться".
  const handleConnect = () => {
    if (!url || !token) {
      setLocalError('Please provide both URL and Access Token.');
      return;
    }
    setLocalError('');
    // Сохраняем учетные данные в localStorage при попытке подключения.
    localStorage.setItem('ha-url', url);
    localStorage.setItem('ha-token', token);
    onConnect(url, token);
  };

  // Обработчик экспорта настроек в JSON-файл.
  const handleExportSettings = () => {
    try {
      const settings: Record<string, any> = {};
      LOCAL_STORAGE_KEYS.forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          try {
             settings[key] = JSON.parse(item);
          } catch(e) {
            // Некоторые значения (как theme) не являются JSON, сохраняем как есть.
            settings[key] = item;
          }
        }
      });

      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `ha-dashboard-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to export settings:", err);
      alert("Не удалось экспортировать настройки.");
    }
  };

  // Обработчик импорта настроек из файла.
  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File content is not a string.");
        const settings = JSON.parse(text);

        const importedKeys = Object.keys(settings);
        const hasRequiredKeys = LOCAL_STORAGE_KEYS.some(key => importedKeys.includes(key));

        if (!hasRequiredKeys) {
            alert("Неверный файл резервной копии. Отсутствуют необходимые ключи настроек.");
            return;
        }
        
        if (!window.confirm("Вы уверены, что хотите импортировать настройки? Это перезапишет все текущие настройки и перезагрузит страницу.")) {
            return;
        }

        // Очищаем существующие ключи перед импортом.
        LOCAL_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));

        // Импортируем новые настройки.
        importedKeys.forEach(key => {
            if (LOCAL_STORAGE_KEYS.includes(key)) {
                const value = settings[key];
                localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            }
        });

        alert("Настройки успешно импортированы. Приложение будет перезагружено.");
        window.location.reload();

      } catch (err) {
        console.error("Failed to import settings:", err);
        alert("Не удалось импортировать настройки. Убедитесь, что это действительный файл резервной копии JSON.");
      } finally {
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Сбрасываем input, чтобы можно было выбрать тот же файл снова.
        }
      }
    };
    reader.readAsText(file);
  };

  const handleExportTheme = () => {
    try {
      const themeToExport = {
        'ha-dashboard-theme-version': 1,
        'exported-at': new Date().toISOString(),
        colorScheme,
      };
      const blob = new Blob([JSON.stringify(themeToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `ha-dashboard-theme-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export theme:", err);
      alert("Не удалось экспортировать тему.");
    }
  };

  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File content is not a string.");
        const importedData = JSON.parse(text);

        const importedScheme = importedData.colorScheme;
        if (!importedScheme || !importedScheme.light || !importedScheme.dark || !importedScheme.light.dashboardBackground || !importedScheme.dark.dashboardBackground) {
          throw new Error("Неверный формат файла темы. Отсутствуют необходимые ключи.");
        }

        if (window.confirm("Вы уверены, что хотите импортировать новую цветовую схему? Это перезапишет текущие настройки цветов.")) {
          setColorScheme(importedScheme);
          alert("Цветовая схема успешно импортирована.");
        }
      } catch (err: any) {
        console.error("Failed to import theme:", err);
        alert(`Не удалось импортировать тему: ${err.message}`);
      } finally {
        if (themeFileInputRef.current) {
          themeFileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  const isLoading = connectionStatus === 'connecting';

  // --- Рендеринг страницы настроек (когда соединение установлено) ---
  if (connectionStatus === 'connected') {
    return (
        <>
        <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/10 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-6">Настройки</h1>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-6">Вы подключены к {haUrl}.</p>
                <button
                    onClick={disconnect}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                    Отключиться
                </button>
            </div>
            
            {/* Секция настроек часов */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Настройки часов</h2>
                <div className="space-y-4">
                    {/* ... UI для формата, секунд, размера ... */}
                </div>
            </div>

            {/* Секция настроек интерфейса */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Интерфейс</h2>
                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg">
                    <label htmlFor="showSidebar" className="text-sm font-medium text-gray-800 dark:text-gray-200">Показывать боковую панель</label>
                    <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isSidebarVisible ? 'bg-blue-600' : 'bg-gray-500 dark:bg-gray-600'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isSidebarVisible ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {/* Секция настроек цветовой схемы */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Цветовая схема</h2>
                <div className="space-y-4">
                    <div>
                        <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Светлая тема</h3>
                        <div className="space-y-2">
                           {/* ... UI для настройки цветов светлой темы ... */}
                        </div>
                    </div>
                     <div>
                        <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Темная тема</h3>
                        <div className="space-y-2">
                           {/* ... UI для настройки цветов темной темы ... */}
                        </div>
                    </div>
                    <button onClick={onResetColorScheme} className="w-full text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600/80 rounded-md py-2 transition-colors">
                        Сбросить цвета
                    </button>
                </div>
            </div>
            
            {/* Секция API ключей */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">API Ключи</h2>
                <div>
                    <label htmlFor="owmKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">OpenWeatherMap API Key</label>
                    <input id="owmKey" type="password" value={openWeatherMapKey} onChange={(e) => setOpenWeatherMapKey(e.target.value)} placeholder="Введите ваш API ключ" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Необходим для виджета погоды.</p>
                </div>
            </div>
            
            {/* Секция управления шаблонами */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Шаблоны карточек</h2>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Создавайте и управляйте шаблонами для различных типов устройств.</p>
                 <div className="space-y-2 mb-4">
                    {Object.values(templates).map((template: CardTemplate) => (
                        <div key={template.id} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-xs font-mono bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{template.deviceType}</span>
                                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate pr-2">{template.name}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => setEditingTemplate(template)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" title="Редактировать"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                                <button onClick={() => setDeletingTemplate(template)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-md hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors" title="Удалить"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002 2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                            </div>
                        </div>
                    ))}
                 </div>
                 <div className="relative">
                    <button onClick={() => setIsCreateMenuOpen(prev => !prev)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">Создать шаблон</button>
                    {isCreateMenuOpen && (
                         <div onMouseLeave={() => setIsCreateMenuOpen(false)} className="absolute bottom-full left-0 right-0 mb-2 w-full bg-gray-200 dark:bg-gray-700 rounded-lg shadow-lg z-10 ring-1 ring-black/5 dark:ring-black ring-opacity-5 overflow-hidden fade-in">
                            <button onClick={() => { setEditingTemplate(createNewBlankTemplate(DeviceType.Sensor)); setIsCreateMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Для сенсора</button>
                            <button onClick={() => { setEditingTemplate(createNewBlankTemplate(DeviceType.Light)); setIsCreateMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Для светильника</button>
                            <button onClick={() => { setEditingTemplate(createNewBlankTemplate(DeviceType.Switch)); setIsCreateMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Для переключателя</button>
                            <button onClick={() => { setEditingTemplate(createNewBlankTemplate(DeviceType.Thermostat)); setIsCreateMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Для климата</button>
                        </div>
                    )}
                 </div>
            </div>

            {/* Секция управления темами */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Управление темами</h2>
                <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Экспортируйте вашу текущую цветовую схему, чтобы поделиться ей, или импортируйте новую.</p>
                    <div className="flex gap-4">
                        <button onClick={handleExportTheme} className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">Экспорт темы</button>
                        <button onClick={() => themeFileInputRef.current?.click()} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">Импорт темы</button>
                        <input type="file" ref={themeFileInputRef} onChange={handleImportTheme} accept="application/json" className="hidden" />
                    </div>
                </div>
            </div>

            {/* Секция резервного копирования */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Резервное копирование</h2>
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Сохраните все ваши настройки в файл или восстановите их из ранее созданной резервной копии.</p>
                <div className="flex gap-4">
                  <button onClick={handleExportSettings} className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">Экспорт</button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">Импорт</button>
                  <input type="file" ref={fileInputRef} onChange={handleImportSettings} accept="application/json" className="hidden" />
                </div>
              </div>
            </div>
        </div>
        {/* Диалог подтверждения удаления шаблона */}
         <ConfirmDialog
            isOpen={!!deletingTemplate}
            title="Удалить шаблон?"
            message={<>Вы уверены, что хотите удалить шаблон <strong className="text-black dark:text-white">"{deletingTemplate?.name}"</strong>?<br />Это действие нельзя отменить.</>}
            onConfirm={() => { if (deletingTemplate) handleDeleteTemplate(deletingTemplate.id); setDeletingTemplate(null); }}
            onCancel={() => setDeletingTemplate(null)}
            confirmText="Удалить"
        />
        </>
    );
  }

  // --- Рендеринг формы подключения (когда соединения нет) ---
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
};

export default Settings;