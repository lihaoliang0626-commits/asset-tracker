import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { formatCurrency, formatDate } from '@asset-tracker/shared';
import { cn } from '../../utils/cn';

export interface LineChartProps {
  data: {
    timestamp: number;
    value: number;
  }[];
  currency?: string;
  height?: number;
  showGrid?: boolean;
  className?: string;
}

/**
 * 折线图组件 - 用于展示资产趋势
 */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  currency = 'CNY',
  height = 300,
  showGrid = false,
  className,
}) => {
  // 自定义 Tooltip
  const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-[#E5E7EB]">
        <p className="text-sm text-[#6B7280] mb-1">
          {formatDate(data.timestamp, 'short')}
        </p>
        <p className="text-lg font-semibold text-[#1F3A8A] tabular-nums">
          {formatCurrency(data.value, currency)}
        </p>
      </div>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB"
              strokeOpacity={0.5}
            />
          )}
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => formatDate(value, 'short')}
            stroke="#6B7280"
            style={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(value, currency)}
            tick={{ className: 'tabular-nums' }}
            stroke="#6B7280"
            style={{ fontSize: 12 }}
            tickLine={false}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#1F3A8A"
            strokeWidth={2}
            dot={{
              fill: '#1F3A8A',
              r: 4,
            }}
            activeDot={{
              r: 6,
              fill: '#1F3A8A',
            }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};
