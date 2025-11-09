


import React from 'react';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  strokeColor?: string;
  styleType?: 'line' | 'gradient';
}

const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 100,
  height = 30,
  strokeWidth = 1.5,
  strokeColor = '#6B7280', // text-gray-500
  styleType = 'gradient',
}) => {
  if (!data || data.length < 2) {
    return null; // Not enough data to draw a line
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  // Add a small padding to the y-axis to prevent the line from touching the edges
  const yPadding = height * 0.1;
  const effectiveHeight = height - (yPadding * 2);

  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = range === 0 
        ? height / 2 
        : yPadding + (effectiveHeight - ((point - min) / range) * effectiveHeight);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const linePathData = `M ${points.join(' L ')}`;
  
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