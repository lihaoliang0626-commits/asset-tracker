import React from 'react';
import { Goal, GoalProgress, GoalStatus } from '@asset-tracker/shared';
import { getGoalStatus, formatGoalAmount, formatGoalMonth } from '@asset-tracker/shared';
import { Card } from '../base/Card';
import { Button } from '../base/Button';
import { cn } from '../../utils/cn';

interface GoalProgressCardProps {
  goal: Goal;
  progress: GoalProgress;
  onEdit?: () => void;
  className?: string;
}

/**
 * 目标进度卡片 - 显示在总览页
 */
export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({
  goal,
  progress,
  onEdit,
  className
}) => {
  const status = getGoalStatus(goal, progress);

  // 状态文案
  const getStatusText = () => {
    if (status === 'achieved') {
      return '🎉 目标已达成';
    }
    if (status === 'overdue') {
      return '⏰ 已过期';
    }

    // 如果时间进度小于 3%，说明刚设定目标，显示友好提示
    if (progress.timeProgress < 3) {
      return '📝 目标已设定，继续记录快照以追踪进度';
    }

    if (status === 'on_track') {
      return '💡 进度良好，超过时间预期';
    }
    if (status === 'behind') {
      return '📊 按当前趋势，可能需要更长时间';
    }
    return '';
  };

  // 预测文案
  const getPredictionText = () => {
    if (!progress.predictedAmount || status === 'achieved') {
      return null;
    }

    // 如果没有足够的历史数据（增长率为0），不显示预测
    if (progress.averageGrowthRate === 0) {
      return null;
    }

    const willAchieve = progress.predictedAmount >= goal.targetAmount;

    if (willAchieve && progress.predictedDate) {
      const predictedDateStr = formatGoalMonth(progress.predictedDate);
      return `按当前趋势，预计 ${predictedDateStr} 达成`;
    }

    return `按当前趋势，到期预计达到 ${formatGoalAmount(progress.predictedAmount, goal.baseCurrency)}`;
  };

  const statusBgColor: Record<GoalStatus, string> = {
    not_started: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-gray-100 text-gray-700',
    achieved: 'bg-blue-50 text-blue-700',
    on_track: 'bg-blue-50 text-blue-700',
    behind: 'bg-gray-100 text-gray-700',
    overdue: 'bg-gray-100 text-gray-700',
  };

  return (
    <Card className={cn('border-l-4 border-l-blue-600', className)}>
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          🎯 {goal.title}
        </h3>
      </div>

      {/* 进度条 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>当前进度</span>
          <span className="font-medium">{progress.progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, progress.progress)}%` }}
          />
        </div>
      </div>

      {/* 金额信息 */}
      <div className="flex justify-between text-sm mb-4">
        <div>
          <div className="text-gray-600 mb-1">当前</div>
          <div className="font-medium text-gray-900">
            {formatGoalAmount(progress.currentAmount, goal.baseCurrency)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-gray-600 mb-1">目标</div>
          <div className="font-medium text-gray-900">
            {formatGoalAmount(goal.targetAmount, goal.baseCurrency)}
          </div>
        </div>
      </div>

      {/* 时间进度 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>时间进度</span>
          <span>{progress.timeProgress.toFixed(0)}%</span>
        </div>
        <div className="text-xs text-gray-500">
          已过 {progress.elapsedDays} / {progress.totalDays} 天
        </div>
      </div>

      {/* 状态提示 */}
      {(status !== 'in_progress' || progress.timeProgress < 3) && getStatusText() && (
        <div className={cn(
          'px-3 py-2 rounded-md text-sm mb-4',
          progress.timeProgress < 3 ? 'bg-gray-100 text-gray-700' : statusBgColor[status]
        )}>
          {getStatusText()}
        </div>
      )}

      {/* 预测 */}
      {getPredictionText() && (
        <div className="text-sm text-gray-600 mb-4">
          <div>📈 {getPredictionText()}</div>
          <div className="text-xs text-gray-500 mt-1">
            （仅供参考，基于近期增长率）
          </div>
        </div>
      )}

      {/* 编辑目标按钮 */}
      {onEdit && (
        <Button
          variant="secondary"
          size="md"
          onClick={onEdit}
          className="w-full"
        >
          编辑目标
        </Button>
      )}
    </Card>
  );
};
