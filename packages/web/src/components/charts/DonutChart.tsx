import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency, formatPercent } from '@asset-tracker/shared';
import { cn } from '../../utils/cn';

export interface DonutChartProps {
  data: {
    name: string;
    value: number;
    percentage: number;
  }[];
  currency?: string;
  height?: number;
  showLegend?: boolean;
  centerContent?: React.ReactNode;
  className?: string;
}

// 配色方案（深浅不同的蓝灰色系）
const COLORS = [
  '#1F3A8A', // 深蓝
  '#3B82F6', // 中蓝
  '#60A5FA', // 浅蓝
  '#93C5FD', // 更浅蓝
  '#DBEAFE', // 极浅蓝
  '#9CA3AF', // 灰色（其他）
];

/**
 * 环形图组件 - 用于展示资产结构分布
 */
export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  currency = 'CNY',
  height = 300,
  showLegend = true,
  centerContent,
  className,
}) => {
  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-[#E5E7EB]">
        <p className="text-sm text-[#6B7280] mb-1">{data.name}</p>
        <p className="text-lg font-semibold text-[#1F3A8A] tabular-nums">
          {formatCurrency(data.value, currency)}
        </p>
        <p className="text-sm text-[#6B7280] mt-1">
          占比: {data.percentage.toFixed(1)}%
        </p>
      </div>
    );
  };

  // 自定义 Legend
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-col gap-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[#1F2933]">{entry.value}</span>
            </div>
            <span className="text-[#6B7280] font-medium tabular-nums">
              {entry.payload.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend content={<CustomLegend />} />}
        </PieChart>
      </ResponsiveContainer>

      {/* 中心内容 */}
      {centerContent && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {centerContent}
        </div>
      )}
    </div>
  );
};
