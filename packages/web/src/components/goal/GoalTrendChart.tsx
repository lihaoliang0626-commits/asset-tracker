import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Goal, GoalProgress, Snapshot } from '@asset-tracker/shared';
import { formatGoalAmount, formatGoalMonth } from '@asset-tracker/shared';

interface GoalTrendChartProps {
  goal: Goal;
  progress: GoalProgress;
  snapshots: Snapshot[];
}

/**
 * 目标趋势图 - 显示实际资产和预测趋势
 */
export const GoalTrendChart: React.FC<GoalTrendChartProps> = ({
  goal,
  progress,
  snapshots
}) => {
  // 准备图表数据
  const chartData = prepareChartData(goal, progress, snapshots);

  // 格式化金额（万元）
  const formatAmount = (value: number) => {
    return (value / 10000).toFixed(1) + '万';
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short'
    });
  };

  // Tooltip 内容
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-md shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {formatDate(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {formatAmount(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />

          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />

          <YAxis
            tickFormatter={formatAmount}
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ fontSize: '12px' }}
          />

          {/* 目标线 */}
          <ReferenceLine
            y={goal.targetAmount}
            stroke="#9CA3AF"
            strokeDasharray="5 5"
            label={{
              value: '目标',
              position: 'right',
              style: { fontSize: '12px', fill: '#6B7280' }
            }}
          />

          {/* 实际资产线 */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#2563EB"
            strokeWidth={2}
            dot={{ fill: '#2563EB', r: 4 }}
            name="实际资产"
            connectNulls
          />

          {/* 预测线 */}
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#93C5FD"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="趋势预测"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * 准备图表数据
 */
function prepareChartData(
  goal: Goal,
  progress: GoalProgress,
  snapshots: Snapshot[]
) {
  const data: Array<{
    date: number;
    actual?: number;
    predicted?: number;
  }> = [];

  // 1. 添加起点
  data.push({
    date: goal.startTime,
    actual: goal.startAmount
  });

  // 2. 添加历史快照
  snapshots
    .filter(s => s.timestamp >= goal.startTime && s.timestamp <= Date.now())
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach(s => {
      data.push({
        date: s.timestamp,
        actual: s.totalAsset
      });
    });

  // 3. 添加预测点（如果有预测数据）
  if (progress.predictedAmount && progress.averageGrowthRate > 0) {
    const now = Date.now();
    const monthsToDeadline = (goal.deadline - now) / (1000 * 60 * 60 * 24 * 30);

    // 当前点开始预测
    data.push({
      date: now,
      predicted: progress.currentAmount
    });

    // 每个月添加一个预测点
    for (let i = 1; i <= Math.ceil(monthsToDeadline); i++) {
      const futureDate = now + (i * 30 * 24 * 60 * 60 * 1000);
      const predictedValue = progress.currentAmount + (progress.averageGrowthRate * i);

      if (futureDate <= goal.deadline + (7 * 24 * 60 * 60 * 1000)) { // 延伸一周
        data.push({
          date: futureDate,
          predicted: predictedValue
        });
      }
    }

    // 添加截止日期的预测点
    if (goal.deadline > now) {
      const remainingMonths = (goal.deadline - now) / (1000 * 60 * 60 * 24 * 30);
      const predictedAtDeadline = progress.currentAmount + (progress.averageGrowthRate * remainingMonths);

      data.push({
        date: goal.deadline,
        predicted: predictedAtDeadline
      });
    }
  }

  return data.sort((a, b) => a.date - b.date);
}
