import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { ru } from 'date-fns/locale';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Title, Tooltip, Legend, Filler
);

interface HistoryChartProps {
  data: any; // Chart.js data object
  unit: string;
  decimalPlaces?: number;
}

const HistoryChart: React.FC<HistoryChartProps> = ({ data, unit, decimalPlaces }) => {
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                  color: textColor,
                  usePointStyle: true,
                  boxWidth: 8,
                }
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                callbacks: {
                    label: function(context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            const value = typeof decimalPlaces === 'number'
                                ? context.parsed.y.toFixed(decimalPlaces)
                                : context.parsed.y.toFixed(1);
                            label += `${value} ${unit}`;
                        }
                        return label;
                    }
                }
            },
        },
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        scales: {
            x: {
                type: 'time' as const,
                time: {
                    unit: 'hour' as const,
                    tooltipFormat: 'dd MMM, HH:mm',
                    displayFormats: {
                        hour: 'HH:mm',
                        day: 'dd MMM',
                    },
                },
                adapters: {
                    date: {
                        locale: ru,
                    },
                },
                grid: {
                    color: gridColor,
                },
                ticks: {
                    color: textColor,
                },
            },
            y: {
                grid: {
                    color: gridColor,
                },
                ticks: {
                    color: textColor,
                    callback: function(value: number | string) {
                        const numericValue = typeof value === 'string' ? parseFloat(value) : value;
                        const formattedValue = typeof decimalPlaces === 'number'
                            ? numericValue.toFixed(decimalPlaces)
                            : numericValue.toFixed(1);
                        return `${formattedValue}${unit ? ` ${unit}` : ''}`;
                    },
                },
                title: {
                    display: true,
                    text: unit,
                    color: textColor,
                }
            },
        },
    };

    return <Line options={options as any} data={data} />;
};

export default React.memo(HistoryChart);