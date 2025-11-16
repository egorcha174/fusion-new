import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { ColorThemeSet } from '../types';

interface SepticTimerCardProps {
  colorScheme: ColorThemeSet;
}

const SepticTimerCard: React.FC<SepticTimerCardProps> = ({ colorScheme }) => {
  const [lastServiceDate, setLastServiceDate] = useState<Date | null>(() => {
    const stored = localStorage.getItem('septicLastServiceDate');
    return stored ? new Date(stored) : null;
  });

  const [cycleDays, setCycleDays] = useState<number>(() => {
    const stored = localStorage.getItem('septicCycleDays');
    return stored ? parseInt(stored) : 14;
  });

  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempCycleDays, setTempCycleDays] = useState(cycleDays);

  // Вычисляем оставшиеся дни
  useEffect(() => {
    if (!lastServiceDate) {
      setDaysRemaining(cycleDays);
      return;
    }

    const now = new Date();
    const nextServiceDate = new Date(lastServiceDate);
    nextServiceDate.setDate(nextServiceDate.getDate() + cycleDays);
    
    const timeDiff = nextServiceDate.getTime() - now.getTime();
    const remaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    setDaysRemaining(Math.max(0, remaining));
  }, [lastServiceDate, cycleDays]);

  // Сохраняем cycleDays в localStorage
  useEffect(() => {
    localStorage.setItem('septicCycleDays', cycleDays.toString());
  }, [cycleDays]);

  // Сохраняем lastServiceDate в localStorage
  useEffect(() => {
    if (lastServiceDate) {
      localStorage.setItem('septicLastServiceDate', lastServiceDate.toISOString());
    }
  }, [lastServiceDate]);

  const fillPercentage = lastServiceDate 
    ? ((cycleDays - daysRemaining) / cycleDays) * 100 
    : 0;

  const handleServiceToday = () => {
    setLastServiceDate(new Date());
    setDaysRemaining(cycleDays);
  };

  const handleCycleDaysChange = () => {
    setCycleDays(tempCycleDays);
    setIsSettingsOpen(false);
  };

  // Определяем цвет в зависимости от заполнения
  const getGradientColor = () => {
    if (daysRemaining === 0) return 'from-red-600 to-red-500';
    if (fillPercentage < 30) return 'from-green-500 to-green-400';
    if (fillPercentage < 60) return 'from-yellow-500 to-yellow-400';
    return 'from-orange-600 to-red-500';
  };

  return (
    <div className="w-full h-full flex flex-col p-4 gap-4">
      {/* Заголовок */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon icon="mdi:water-pump" className="w-6 h-6" style={{ color: colorScheme.statusTextColor }} />
          <h3 className="font-semibold" style={{ color: colorScheme.valueTextColor }}>Ассенизатор</h3>
        </div>
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        >
          <Icon icon="mdi:cog" className="w-5 h-5" style={{ color: colorScheme.statusTextColor }} />
        </button>
      </div>

      {/* Прогресс-бар с визуализацией */}
      <div className="flex-grow flex flex-col relative" style={{ minHeight: '120px' }}>
        <div className="flex-grow relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border" style={{ borderColor: colorScheme.borderColor }}>
          {/* Заливка снизу вверх */}
          <div
            className={`absolute bottom-0 w-full bg-gradient-to-t ${getGradientColor()} transition-all duration-300`}
            style={{
              height: `${fillPercentage}%`,
              opacity: 0.7,
            }}
          />

          {/* Содержимое поверх заливки */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            {lastServiceDate ? (
              <>
                <div className="text-3xl font-bold" style={{ color: colorScheme.valueTextColor }}>
                  {daysRemaining}
                </div>
                <div className="text-sm" style={{ color: colorScheme.statusTextColor }}>
                  дней осталось
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="text-lg font-semibold" style={{ color: colorScheme.statusTextColor }}>
                  Нет данных
                </div>
                <div className="text-xs" style={{ color: colorScheme.statusTextColor }}>
                  Нажмите кнопку ниже
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Кнопка сброса */}
      <button
        onClick={handleServiceToday}
        className="flex-shrink-0 px-3 py-2 rounded font-semibold text-sm transition-all"
        style={{
          backgroundColor: colorScheme.accentColor || '#3b82f6',
          color: '#ffffff',
        }}
      >
        <Icon icon="mdi:check-circle" className="inline w-4 h-4 mr-2" />
        Ассенизатор был сегодня
      </button>

      {/* Настройки */}
      {isSettingsOpen && (
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border" style={{ borderColor: colorScheme.borderColor }}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colorScheme.nameTextColor }}>
                Дней между циклами
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="7"
                  max="60"
                  value={tempCycleDays}
                  onChange={(e) => setTempCycleDays(Math.max(7, Math.min(60, parseInt(e.target.value) || 14)))}
                  className="flex-grow px-2 py-1 border rounded text-sm"
                  style={{
                    borderColor: colorScheme.borderColor,
                    backgroundColor: colorScheme.backgroundColor,
                    color: colorScheme.valueTextColor,
                  }}
                />
                <span className="text-sm" style={{ color: colorScheme.statusTextColor }}>дн.</span>
              </div>
            </div>
            <button
              onClick={handleCycleDaysChange}
              className="w-full px-2 py-1 rounded text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: colorScheme.accentColor || '#10b981' }}
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Информация */}
      {lastServiceDate && (
        <div className="flex-shrink-0 text-xs" style={{ color: colorScheme.statusTextColor }}>
          <span>
            Последняя откачка: {lastServiceDate.toLocaleDateString('ru-RU')}
          </span>
        </div>
      )}
    </div>
  );
};

export default SepticTimerCard;
