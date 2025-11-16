import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export interface SepticTimerWidgetProps {
  daysTotal: number;
  daysLeft: number;
  bgColor: string; // hex или rgba
}

/**
 * Анимированная волна — SVG.
 */
const Wave: React.FC<{ percent: number; color: string }> = ({ percent, color }) => {
  // Высота волны: percent = 0 (0%) — волна внизу, percent = 100 — волна сверху
  const viewHeight = 100;
  const waveHeight = viewHeight * (1 - percent / 100);

  return (
    <svg viewBox="0 0 200 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', position: 'absolute', left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="wave-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.8} />
          <stop offset="100%" stopColor={color} stopOpacity={0.4} />
        </linearGradient>
      </defs>
      <motion.path
        d={`M0 ${waveHeight} Q 50 ${waveHeight-8}, 100 ${waveHeight} T 200 ${waveHeight} V100 H0 Z`}
        fill="url(#wave-grad)"
        animate={{
          d: [`M0 ${waveHeight} Q 50 ${waveHeight-8}, 100 ${waveHeight} T 200 ${waveHeight} V100 H0 Z`,
              `M0 ${waveHeight+6} Q 50 ${waveHeight}, 100 ${waveHeight+6} T 200 ${waveHeight} V100 H0 Z`,
              `M0 ${waveHeight} Q 50 ${waveHeight-8}, 100 ${waveHeight} T 200 ${waveHeight} V100 H0 Z`]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </svg>
  );
};

/**
 * Сбоку как карточка устройства.
 * daysTotal — общее количество дней между событиями
 * daysLeft — сколько дней осталось до следующей откачки
 * bgColor — цвет волны фона
 */
const SepticTimerWidget: React.FC<SepticTimerWidgetProps> = ({ daysTotal, daysLeft, bgColor }) => {
  // Процент заполнения
  const percent = useMemo(() => ((daysTotal - daysLeft) / daysTotal) * 100, [daysTotal, daysLeft]);

  return (
    <div className="relative rounded-2xl shadow-lg ring-1 ring-black/10 overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#f3f6fb', aspectRatio: '1/1', minWidth: 120 }}>
      {/* Анимированная волна идет снизу вверх */}
      <Wave percent={percent} color={bgColor} />
      {/* Цифра дней посередине */}
      <span className="absolute inset-0 flex items-center justify-center font-bold text-4xl select-none" style={{ color: 'rgba(0,0,0,0.95)' }}>{daysLeft}</span>
    </div>
  );
};

export default SepticTimerWidget;
