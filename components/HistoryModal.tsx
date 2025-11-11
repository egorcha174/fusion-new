import React, { useState, useEffect, useMemo } from 'react';
import { Device, ColorScheme } from '../types';
import LoadingSpinner from './LoadingSpinner';
import HistoryChart from './HistoryChart';
// FIX: Module '"date-fns"' has no exported member 'subHours' or 'subDays'.
// Changed to import from specific sub-paths for robust module resolution.
import { subHours } from 'date-fns/subHours';
import { subDays } from 'date-fns/subDays';
import { Icon } from '@iconify/react';

interface HistoryModalProps {
  entityId: string;
  onClose: () => void;
  getHistory: (entityIds: string[], startTime: string, endTime?: string) => Promise<any>;
  allKnownDevices: Map<string, Device>;
  colorScheme: ColorScheme['light'];
  decimalPlaces?: number;
}

type TimeRange = '1h' | '6h' | '12h' | '24h' | '3d';

const TIME_RANGES: { id: TimeRange; label: string }[] = [
    { id: '1h', label: '1 час' },
    { id: '6h', label: '6 часов' },
    { id: '12h', label: '12 часов' },
    { id: '24h', label: '24 часа' },
    { id: '3d', label: '3 дня' },
];

// Функция для сглаживания данных методом скользящего среднего
const smoothData = (data: { x: Date; y: number }[], windowSize: number): { x: Date; y: number }[] => {
  if (windowSize <= 1 || data.length < windowSize) {
    return data;
  }

  const smoothedData: { x: Date; y: number }[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(data.length, i + halfWindow + 1);
    const windowSlice = data.slice(start, end);
    const sum = windowSlice.reduce((acc, point) => acc + point.y, 0);
    const avg = sum / windowSlice.length;
    
    smoothedData.push({ x: data[i].x, y: avg });
  }

  return smoothedData;
};


const HistoryModal: React.FC<HistoryModalProps> = ({ entityId, onClose, getHistory, allKnownDevices, colorScheme, decimalPlaces }) => {
  const [rawProcessedData, setRawProcessedData] = useState<{ x: Date; y: number }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('6h');
  const [isSmoothed, setIsSmoothed] = useState(false);

  const device = allKnownDevices.get(entityId);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setRawProcessedData(null);

      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case '1h': startDate = subHours(now, 1); break;
        case '6h': startDate = subHours(now, 6); break;
        case '12h': startDate = subHours(now, 12); break;
        case '24h': startDate = subHours(now, 24); break;
        case '3d': startDate = subDays(now, 3); break;
        default: startDate = subHours(now, 24);
      }

      try {
        const data = await getHistory([entityId], startDate.toISOString(), now.toISOString());
        const historyPoints = data[entityId];

        if (!historyPoints || historyPoints.length === 0) {
          throw new Error("Нет данных истории за выбранный период.");
        }

        // Cначала сортируем, чтобы гарантировать правильный порядок
        const sortedPoints = historyPoints
          .filter((point: any) => point && !isNaN(parseFloat(point.s)))
          .map((point: any) => ({
            x: new Date(point.lu * 1000), // last_updated in seconds
            y: parseFloat(point.s),
          }))
          .sort((a, b) => a.x.getTime() - b.x.getTime());
        
        // Затем фильтруем, чтобы обеспечить строгое возрастание временных меток
        // и удалить точки с некорректным временем или дубликатами.
        const processedData: { x: Date, y: number }[] = [];
        if (sortedPoints.length > 0) {
            processedData.push(sortedPoints[0]);
            for (let i = 1; i < sortedPoints.length; i++) {
                // Добавляем точку, только если ее временная метка строго больше предыдущей.
                if (sortedPoints[i].x.getTime() > processedData[processedData.length - 1].x.getTime()) {
                    processedData.push(sortedPoints[i]);
                }
            }
        }
        
        if (processedData.length < 2) {
          throw new Error("Недостаточно данных для построения графика.");
        }

        setRawProcessedData(processedData);

      } catch (err: any) {
        setError(err.message || "Не удалось загрузить историю.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [entityId, timeRange, getHistory]);
  
  const chartData = useMemo(() => {
    if (!rawProcessedData) return null;

    const dataToRender = isSmoothed 
      ? smoothData(rawProcessedData, 5) // Окно сглаживания - 5 точек
      : rawProcessedData;

    // Format for Recharts: { x: timestamp, y: value }
    return dataToRender.map(p => ({
        x: p.x.getTime(),
        y: p.y,
    }));
  }, [rawProcessedData, isSmoothed]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in"
      onClick={onClose}
    >
      <div
        className="backdrop-blur-xl rounded-2xl shadow-lg w-full max-w-4xl h-full max-h-[80vh] ring-1 ring-black/5 dark:ring-white/10 flex flex-col"
        style={{ backgroundColor: colorScheme.cardBackground }}
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 flex-shrink-0 flex items-center justify-between border-b border-gray-300/50 dark:border-gray-700/50">
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">История: {device?.name || entityId}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">График изменения состояния</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                 <Icon icon="mdi:close" className="w-6 h-6" />
            </button>
        </header>
        
        <div className="p-4 flex-shrink-0 flex items-center justify-between gap-4 border-b border-gray-300/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2">
                {TIME_RANGES.map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setTimeRange(id)}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${timeRange === id ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>
             <div className="flex items-center gap-2">
                <label htmlFor="smoothing-toggle" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">Сглаживать</label>
                <button
                    id="smoothing-toggle"
                    onClick={() => setIsSmoothed(prev => !prev)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isSmoothed ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'}`}
                >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isSmoothed ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
        </div>

        <main className="flex-1 p-4 overflow-hidden relative">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <LoadingSpinner />
                </div>
            )}
            {error && !loading && (
                <div className="absolute inset-0 flex items-center justify-center text-center text-red-500 dark:text-red-400 p-4">
                    <div>
                        <p className="font-semibold">Ошибка загрузки графика</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}
            {chartData && !loading && !error && (
                <HistoryChart 
                    data={chartData} 
                    unit={device?.unit || ''} 
                    decimalPlaces={decimalPlaces} 
                    deviceName={device?.name || entityId} 
                />
            )}
        </main>
      </div>
    </div>
  );
};

export default HistoryModal;