import React, { useState, useEffect, useMemo } from 'react';
import { Device, ColorScheme } from '../types';
import LoadingSpinner from './LoadingSpinner';
import HistoryChart from './HistoryChart';
// FIX: Using specific subpath imports for date-fns to resolve module issues.
import { format } from 'date-fns';
import { subDays } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { Icon } from '@iconify/react';

interface HistoryPageProps {
  entityId: string;
  onBack: () => void;
  getHistory: (entityIds: string[], startTime: string, endTime?: string) => Promise<any>;
  allKnownDevices: Map<string, Device>;
  colorScheme: ColorScheme['light'];
}

const HistoryPage: React.FC<HistoryPageProps> = ({ entityId, onBack, getHistory, allKnownDevices, colorScheme }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endDate, setEndDate] = useState(new Date());
  const [startDate, setStartDate] = useState(subDays(new Date(), 1));

  const device = allKnownDevices.get(entityId);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setChartData(null);
      try {
        const data = await getHistory([entityId], startDate.toISOString(), endDate.toISOString());
        
        const historyPoints = data[entityId];
        
        if (!historyPoints || historyPoints.length === 0) {
            throw new Error("Нет данных истории за выбранный период.");
        }

        const processedData = historyPoints
            .filter((point: any) => point && !isNaN(parseFloat(point.s)))
            .map((point: any) => ({
                x: new Date(point.lc * 1000), // last_changed in seconds
                y: parseFloat(point.s),
            }));
        
        if (processedData.length < 2) {
             throw new Error("Недостаточно данных для построения графика.");
        }

        setChartData({
            datasets: [{
                label: device?.name || entityId,
                data: processedData,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 5,
                fill: true,
                tension: 0.3,
            }]
        });
      } catch (err: any) {
        setError(err.message || "Не удалось загрузить историю.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [entityId, startDate, endDate, getHistory, device?.name]);

  const formattedDateRange = useMemo(() => {
    const start = format(startDate, 'd MMM, HH:mm', { locale: ru });
    const end = format(endDate, 'd MMM, HH:mm', { locale: ru });
    return `${start} - ${end}`;
  }, [startDate, endDate]);

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-800/80 backdrop-blur-md shadow-md z-10 flex-shrink-0">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <Icon icon="mdi:arrow-left" className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold">История</h1>
            </div>
            <div className="flex items-center gap-2">
                 <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <Icon icon="mdi:filter-variant" className="w-6 h-6" />
                </button>
                 <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <Icon icon="mdi:dots-vertical" className="w-6 h-6" />
                </button>
            </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col overflow-y-auto p-4">
        <div className="flex-shrink-0 mb-4 space-y-3">
             <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
                <div className="pl-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Начало - Окончание</p>
                    <p className="font-semibold">{formattedDateRange}</p>
                </div>
                <div className="flex items-center">
                     <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><Icon icon="mdi:chevron-left" className="w-6 h-6"/></button>
                     <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><Icon icon="mdi:chevron-right" className="w-6 h-6"/></button>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-400/20 text-orange-800 dark:bg-orange-400/30 dark:text-orange-200 text-sm font-medium rounded-full hover:bg-orange-400/30 dark:hover:bg-orange-400/40 transition-colors">
                    <Icon icon="mdi:plus" />
                    <span>Выбрать пространство</span>
                </button>
                 <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-400/20 text-blue-800 dark:bg-blue-400/30 dark:text-blue-200 text-sm font-medium rounded-full hover:bg-blue-400/30 dark:hover:bg-blue-400/40 transition-colors">
                    <Icon icon="mdi:plus" />
                    <span>Выбрать устройство</span>
                </button>

                {device && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-400/20 text-green-800 dark:bg-green-400/30 dark:text-green-200 text-sm font-medium rounded-full">
                        <Icon icon="mdi:thermometer" />
                        <span>{device.name}</span>
                        <button className="ml-1 p-0.5 -mr-1 hover:bg-black/10 rounded-full"><Icon icon="mdi:close" /></button>
                    </div>
                )}
            </div>
        </div>
        
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 min-h-[300px]">
          {loading && (
             <div className="flex items-center justify-center h-full">
                <LoadingSpinner />
             </div>
          )}
          {error && !loading && (
            <div className="flex items-center justify-center h-full text-center text-red-500 dark:text-red-400">
                <div>
                    <p className="font-semibold">Ошибка загрузки графика</p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            </div>
          )}
          {chartData && !loading && !error && (
            <HistoryChart data={chartData} unit={device?.unit || ''} />
          )}
        </div>
      </main>
    </div>
  );
};

export default HistoryPage;