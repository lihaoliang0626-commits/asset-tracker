import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@asset-tracker/shared';
import { cn } from '../../utils/cn';

export interface BarChartProps {
  data: {
    name: string;
    value: number;
  }[];
  currency?: string;
  height?: number;
  showGrid?: boolean;
  horizontal?: boolean;
  className?: string;
}

/**
 * 条形图组件 - 用于展示资产变化贡献
 */
export const BarChart: React.FC<BarChartProps> = ({
  data,
  currency = 'CNY',
  height = 300,
  showGrid = false,
  horizontal = false,
  className,
}) => {
  const values = data.map(item => item.value);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const padding = (maxValue - minValue) * 0.1 || 1;
  const domain: [number, number] = [minValue - padding, maxValue + padding];

  // 根据值的正负决定颜色
  const getBarColor = (value: number) => {
    return value >= 0 ? '#1F3A8A' : '#6B7280';
  };

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-[#E5E7EB]">
        <p className="text-sm text-[#6B7280] mb-1">{data.name}</p>
        <p
          className={cn(
            'text-lg font-semibold tabular-nums',
            data.value >= 0 ? 'text-[#1F3A8A]' : 'text-[#6B7280]'
          )}
        >
          {data.value >= 0 ? '+' : ''}
          {formatCurrency(data.value, currency)}
        </p>
      </div>
    );
  };

  if (horizontal) {
    return (
      <div className={cn('w-full', className)}>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E5E7EB"
                strokeOpacity={0.5}
              />
            )}
            <XAxis
              type="number"
              tickFormatter={(value) => formatCurrency(value, currency)}
              tick={{ className: 'tabular-nums' }}
              stroke="#6B7280"
              style={{ fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#6B7280"
              style={{ fontSize: 12 }}
              width={100}
            />
            <ReferenceLine x={0} stroke="#E5E7EB" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB"
              strokeOpacity={0.5}
            />
          )}
          <XAxis
            dataKey="name"
            stroke="#6B7280"
            style={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(value, currency)}
            tick={{ className: 'tabular-nums' }}
            domain={domain}
            tickCount={5}
            stroke="#6B7280"
            style={{ fontSize: 12 }}
            tickLine={false}
          />
          <ReferenceLine y={0} stroke="#E5E7EB" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};
