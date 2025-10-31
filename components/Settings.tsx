
import React from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'failed';

interface SettingsProps {
  onConnect: (url: string, token: string) => void;
  connectionStatus: ConnectionStatus;
  error: string | null;
}

const Settings: React.FC<SettingsProps> = ({ onConnect, connectionStatus, error }) => {
  const [url, setUrl] = useLocalStorage('ha-url', '');
  const [token, setToken] = useLocalStorage('ha-token', '');
  const [localError, setLocalError] = React.useState('');

  const handleConnect = () => {
    if (!url || !token) {
      setLocalError('Please provide both URL and Access Token.');
      return;
    }
    setLocalError('');
    onConnect(url, token);
  };

  const isLoading = connectionStatus === 'connecting';

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
