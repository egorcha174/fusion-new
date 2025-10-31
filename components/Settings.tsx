
import React, { useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ClockSettings } from '../types';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'failed';

interface SettingsProps {
  onConnect: (url: string, token: string) => void;
  connectionStatus: ConnectionStatus;
  error: string | null;
  onDisconnect?: () => void;
  clockSettings?: ClockSettings;
  onClockSettingsChange?: (settings: ClockSettings) => void;
}

// Keys to be backed up
const LOCAL_STORAGE_KEYS = [
  'ha-url',
  'ha-token',
  'ha-tabs',
  'ha-active-tab',
  'ha-device-customizations',
  'ha-clock-settings',
];

const Settings: React.FC<SettingsProps> = ({ onConnect, connectionStatus, error, onDisconnect, clockSettings, onClockSettingsChange }) => {
  const [url, setUrl] = useLocalStorage('ha-url', '');
  const [token, setToken] = useLocalStorage('ha-token', '');
  const [localError, setLocalError] = React.useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConnect = () => {
    if (!url || !token) {
      setLocalError('Please provide both URL and Access Token.');
      return;
    }
    setLocalError('');
    onConnect(url, token);
  };

  const handleExportSettings = () => {
    try {
      const settings: Record<string, any> = {};
      LOCAL_STORAGE_KEYS.forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          settings[key] = JSON.parse(item);
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

        // Clear existing keys before importing
        LOCAL_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));

        // Import new settings
        importedKeys.forEach(key => {
            if (LOCAL_STORAGE_KEYS.includes(key)) {
                localStorage.setItem(key, JSON.stringify(settings[key]));
            }
        });

        alert("Настройки успешно импортированы. Приложение будет перезагружено.");
        window.location.reload();

      } catch (err) {
        console.error("Failed to import settings:", err);
        alert("Не удалось импортировать настройки. Убедитесь, что это действительный файл резервной копии JSON.");
      } finally {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  const isLoading = connectionStatus === 'connecting';

  if (connectionStatus === 'connected' && onDisconnect && clockSettings && onClockSettingsChange) {
    return (
        <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl shadow-lg ring-1 ring-white/10 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-center text-gray-100 mb-6">Настройки</h1>
                <p className="text-center text-gray-400 mb-6">Вы подключены к {url}.</p>
                <button
                    onClick={onDisconnect}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                    Отключиться
                </button>
            </div>
            
            <div className="border-t border-gray-700 pt-6">
                <h2 className="text-xl font-bold text-gray-100 mb-4">Настройки часов</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Формат времени</label>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => onClockSettingsChange({ ...clockSettings, format: '24h' })}
                                className={`flex-1 py-2 rounded-lg text-sm transition-colors ${clockSettings.format === '24h' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                24-часовой
                            </button>
                            <button 
                                onClick={() => onClockSettingsChange({ ...clockSettings, format: '12h' })}
                                className={`flex-1 py-2 rounded-lg text-sm transition-colors ${clockSettings.format === '12h' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                12-часовой
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                        <label htmlFor="showSeconds" className="text-sm font-medium text-gray-200">Показывать секунды</label>
                        <button
                            onClick={() => onClockSettingsChange({ ...clockSettings, showSeconds: !clockSettings.showSeconds })}
                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${clockSettings.showSeconds ? 'bg-blue-600' : 'bg-gray-600'}`}
                        >
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${clockSettings.showSeconds ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <h2 className="text-xl font-bold text-gray-100 mb-4">Резервное копирование</h2>
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Сохраните все ваши настройки в файл или восстановите их из ранее созданной резервной копии.</p>
                <div className="flex gap-4">
                  <button onClick={handleExportSettings} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                    Экспорт
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                    Импорт
                  </button>
                  <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImportSettings}
                      accept="application/json"
                      className="hidden"
                  />
                </div>
              </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl shadow-lg ring-1 ring-white/10">
        <h1 className="text-3xl font-bold text-center text-gray-100 mb-6">Home Assistant</h1>
        <div className="space-y-6">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-2">
              Home Assistant URL
            </label>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g., 192.168.1.100:8123"
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">
              Long-Lived Access Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your token here"
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
             <p className="text-xs text-gray-500 mt-2">
                You can create a token in your Home Assistant Profile page.
            </p>
          </div>
           {(error || localError) && <p className="text-red-400 text-sm text-center">{error || localError}</p>}
          <button
            onClick={handleConnect}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
