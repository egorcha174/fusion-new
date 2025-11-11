import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
// FIX: Module '"date-fns/locale"' has no exported member 'ru'. The correct import is from the specific sub-path.
import { ru } from 'date-fns/locale/ru';

interface HistoryChartProps {
  data: { x: number; y: number }[];
  unit: string;
  decimalPlaces?: number;
  deviceName: string;
}

const HistoryChart: React.FC<HistoryChartProps> = ({ data, unit, decimalPlaces, deviceName }) => {
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';

    const tickFormatter = (timestamp: number) => {
        return format(new Date(timestamp), 'HH:mm');
    };

    const tooltipFormatter = (value: number, name: string, props: any) => {
        const dp = typeof decimalPlaces === 'number' && decimalPlaces >= 0 ? decimalPlaces : 1;
        return [`${value.toFixed(dp)} ${unit}`, deviceName];
    };
    
    const tooltipLabelFormatter = (label: number) => {
        return format(new Date(label), 'dd MMM, HH:mm', { locale: ru });
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgb(59, 130, 246)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="rgb(59, 130, 246)" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="x"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={tickFormatter}
                    stroke={textColor}
                    tick={{ fontSize: 12 }}
                />
                <YAxis
                    tickFormatter={(value) => `${value.toFixed(typeof decimalPlaces === 'number' && decimalPlaces >= 0 ? decimalPlaces : 1)}`}
                    stroke={textColor}
                    tick={{ fontSize: 12 }}
                    domain={['auto', 'auto']}
                    width={50}
                />
                <Tooltip
                    formatter={tooltipFormatter}
                    labelFormatter={tooltipLabelFormatter}
                    contentStyle={{
                        backgroundColor: isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                        borderColor: gridColor,
                        backdropFilter: 'blur(4px)',
                    }}
                    labelStyle={{ color: textColor }}
                    cursor={{ stroke: 'rgb(59, 130, 246)', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area
                    type="monotone"
                    dataKey="y"
                    name={deviceName}
                    stroke="rgb(59, 130, 246)"
                    strokeWidth={2}
                    dot={false}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};

export default React.memo(HistoryChart);