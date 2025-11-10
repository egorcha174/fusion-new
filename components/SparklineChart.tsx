



import React from 'react';

interface SparklineChartProps {
  data: number[]; // Массив числовых значений для построения графика
  width?: number; // Ширина SVG-холста (внутренняя)
  height?: number; // Высота SVG-холста (внутренняя)
  strokeWidth?: number; // Толщина линии
  strokeColor?: string; // Цвет линии и градиента
  styleType?: 'line' | 'gradient'; // Тип графика
}

/**
 * Компактный компонент-график (спарклайн) для отображения истории значений сенсоров.
 * Рендерит SVG-график на основе переданного массива данных.
 */
const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 100,
  height = 30,
  strokeWidth = 1.5,
  strokeColor = '#6B7280', // text-gray-500
  styleType = 'gradient',
}) => {
  // Не рендерим ничего, если данных недостаточно для построения линии.
  if (!data || data.length < 2) {
    return null;
  }

  // Находим минимальное и максимальное значения для масштабирования графика по оси Y.
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  // Добавляем небольшой отступ сверху и снизу, чтобы линия не касалась краев.
  const yPadding = height * 0.1;
  const effectiveHeight = height - (yPadding * 2);

  // Преобразуем массив данных в строку SVG-координат.
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = range === 0 
        ? height / 2 // Если все значения одинаковы, рисуем прямую линию посередине.
        : yPadding + (effectiveHeight - ((point - min) / range) * effectiveHeight);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  // Создаем SVG-путь для линии.
  const linePathData = `M ${points.join(' L ')}`;
  
  // Создаем SVG-путь для области под линией (для градиента).
  const areaPathData = `${linePathData} V ${height} H 0 Z`;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        {/* Определяем градиент для заливки области под графиком. */}
        <linearGradient id="sparkline-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4}/>
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
        </linearGradient>
      </defs>
      
      {styleType === 'gradient' && (
        <path
          d={areaPathData}
          fill="url(#sparkline-gradient)"
          stroke="none"
        />
      )}

      <path
        d={linePathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default SparklineChart;
