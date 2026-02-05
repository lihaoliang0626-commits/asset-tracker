import React from 'react';
import { Goal, GoalProgress, Snapshot } from '@asset-tracker/shared';
import { getGoalStatus, formatGoalAmount, formatGoalDate, formatGoalMonth } from '@asset-tracker/shared';
import { Card } from '../base/Card';
import { Button } from '../base/Button';
import { GoalTrendChart } from './GoalTrendChart';
import { cn } from '../../utils/cn';

interface GoalDetailPageProps {
  goal: Goal;
  progress: GoalProgress;
  snapshots: Snapshot[];
  onEdit?: () => void;
  onPause?: () => void;
  onBack?: () => void;
}

/**
 * 目标详情页
 */
export const GoalDetailPage: React.FC<GoalDetailPageProps> = ({
  goal,
  progress,
  snapshots,
  onEdit,
  onPause,
  onBack
}) => {
  const status = getGoalStatus(goal, progress);

  // 格式化月均增长
  const formatMonthlyGrowth = (amount: number) => {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${formatGoalAmount(amount, goal.baseCurrency)} / 月`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            返回
          </button>
        )}
        <h1 className="text-2xl font-semibold text-gray-900">🎯 目标详情</h1>
        <div className="w-20" /> {/* 占位，保持居中 */}
      </div>

      {/* 基本信息卡片 */}
      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-medium text-gray-900">{goal.title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              设定于 {formatGoalDate(goal.startTime)}
            </p>
          </div>

          {goal.description && (
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
              {goal.description}
            </p>
          )}

          {/* 总体进度条 */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>总体进度</span>
              <span className="font-medium">{progress.progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, progress.progress)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 趋势图 */}
      <Card title="进度趋势图">
        <GoalTrendChart goal={goal} progress={progress} snapshots={snapshots} />
      </Card>

      {/* 进度概览 */}
      <Card title="📊 进度概览">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-600 mb-1">当前资产</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatGoalAmount(progress.currentAmount, goal.baseCurrency)}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-600 mb-1">目标金额</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatGoalAmount(goal.targetAmount, goal.baseCurrency)}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-600 mb-1">起始金额</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatGoalAmount(goal.startAmount, goal.baseCurrency)}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-600 mb-1">已完成</div>
            <div className="text-lg font-semibold text-blue-600">
              {progress.progress.toFixed(1)}%
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md col-span-2">
            <div className="text-sm text-gray-600 mb-1">还需</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatGoalAmount(progress.remaining, goal.baseCurrency)}
            </div>
          </div>
        </div>
      </Card>

      {/* 时间分析 */}
      <Card title="⏱ 时间分析">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-600 mb-1">已过时间</div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.floor(progress.elapsedDays / 30)} 个月
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {progress.elapsedDays} 天
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-600 mb-1">总时长</div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.floor(progress.totalDays / 30)} 个月
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {progress.totalDays} 天
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-600 mb-1">时间进度</div>
            <div className="text-lg font-semibold text-blue-600">
              {progress.timeProgress.toFixed(1)}%
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-600 mb-1">剩余时间</div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.floor((progress.totalDays - progress.elapsedDays) / 30)} 个月
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {progress.totalDays - progress.elapsedDays} 天
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md col-span-2">
            <div className="text-sm text-gray-600 mb-1">截止日期</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatGoalDate(goal.deadline)}
            </div>
          </div>
        </div>
      </Card>

      {/* 趋势预测 */}
      <Card title="📈 趋势预测">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-600 mb-1">月均增长</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatMonthlyGrowth(progress.averageGrowthRate)}
              </div>
            </div>

            {progress.predictedAmount && (
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-sm text-gray-600 mb-1">预计到期金额</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatGoalAmount(progress.predictedAmount, goal.baseCurrency)}
                </div>
              </div>
            )}

            {progress.predictedDate && (
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-sm text-gray-600 mb-1">预测达成日期</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatGoalMonth(progress.predictedDate)}
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              💡 基于最近 {snapshots.length} 个快照的数据推算，仅供参考，实际情况可能有所不同。
            </p>
          </div>
        </div>
      </Card>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        {onPause && (
          <Button
            variant="secondary"
            onClick={onPause}
            className="flex-1"
          >
            {goal.isActive ? '暂停目标' : '恢复目标'}
          </Button>
        )}
        {onEdit && (
          <Button
            variant="primary"
            onClick={onEdit}
            className="flex-1"
          >
            编辑目标
          </Button>
        )}
      </div>
    </div>
  );
};
