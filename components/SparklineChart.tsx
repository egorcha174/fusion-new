

import React from 'react';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  strokeColor?: string;
}

const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 100,
  height = 30,
  strokeWidth = 1.5,
  strokeColor = '#6B7280', // text-gray-500
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

  const pathData = `M ${points.join(' L ')}`;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={pathData}
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