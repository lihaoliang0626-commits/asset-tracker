import { Goal, GoalProgress, GoalStatus } from '../types/goal';
import { Snapshot } from '../types/snapshot';

/**
 * 计算目标进度
 */
export function calculateGoalProgress(
  goal: Goal,
  currentSnapshot: Snapshot,
  historicalSnapshots: Snapshot[]
): GoalProgress {
  const currentAmount = currentSnapshot.totalAsset;
  const { targetAmount, startAmount, startTime, deadline } = goal;

  // 1. 基础进度计算
  const totalChange = targetAmount - startAmount;
  const currentChange = currentAmount - startAmount;
  const progress = totalChange === 0
    ? 100
    : Math.min(100, Math.max(0, (currentChange / totalChange) * 100));

  const remaining = Math.max(0, targetAmount - currentAmount);

  // 2. 时间进度
  const now = Date.now();
  const elapsedDays = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
  const totalDays = Math.floor((deadline - startTime) / (1000 * 60 * 60 * 24));
  const timeProgress = totalDays === 0
    ? 100
    : Math.min(100, (elapsedDays / totalDays) * 100);

  // 3. 趋势预测
  const prediction = predictGoalAchievement(
    goal,
    currentAmount,
    historicalSnapshots
  );

  // 4. 判断是否在正轨上
  // 如果实际进度 >= 时间进度的 90%，认为在正轨上
  // 但如果时间进度小于 1%，认为刚开始，不做判断
  const onTrack = timeProgress < 1 ? true : progress >= timeProgress * 0.9;

  return {
    goalId: goal.id,
    currentAmount,
    targetAmount,
    startAmount,
    progress,
    remaining,
    elapsedDays,
    totalDays,
    timeProgress,
    averageGrowthRate: prediction.averageMonthlyGrowth,
    predictedAmount: prediction.predictedAmount,
    predictedDate: prediction.predictedDate,
    onTrack,
    calculatedAt: now
  };
}

/**
 * 预测目标达成情况
 */
function predictGoalAchievement(
  goal: Goal,
  currentAmount: number,
  historicalSnapshots: Snapshot[]
): {
  averageMonthlyGrowth: number;
  predictedAmount: number;
  predictedDate?: number;
} {
  // 1. 筛选目标设定后的快照
  const relevantSnapshots = historicalSnapshots
    .filter(s => s.timestamp >= goal.startTime)
    .sort((a, b) => a.timestamp - b.timestamp);

  // 如果数据不足（少于2个快照），无法预测
  if (relevantSnapshots.length < 2) {
    return {
      averageMonthlyGrowth: 0,
      predictedAmount: currentAmount,
      predictedDate: undefined
    };
  }

  // 2. 计算月均增长率（线性回归）
  const growthRates = calculateGrowthRates(relevantSnapshots);
  const averageMonthlyGrowth = calculateAverageMonthlyGrowth(growthRates);

  // 3. 预测到截止日期的金额
  const now = Date.now();
  const remainingMonths = (goal.deadline - now) / (1000 * 60 * 60 * 24 * 30);
  const predictedGrowth = averageMonthlyGrowth * remainingMonths;
  const predictedAmount = currentAmount + predictedGrowth;

  // 4. 预测达成日期（如果趋势持续）
  let predictedDate: number | undefined;
  if (averageMonthlyGrowth > 0) {
    const remainingAmount = goal.targetAmount - currentAmount;
    const monthsNeeded = remainingAmount / averageMonthlyGrowth;
    predictedDate = now + (monthsNeeded * 30 * 24 * 60 * 60 * 1000);
  }

  return {
    averageMonthlyGrowth,
    predictedAmount,
    predictedDate
  };
}

/**
 * 计算增长率数组
 */
function calculateGrowthRates(snapshots: Snapshot[]): number[] {
  const growthRates: number[] = [];

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];

    const timeDiff = curr.timestamp - prev.timestamp;
    const monthsDiff = timeDiff / (1000 * 60 * 60 * 24 * 30);

    if (monthsDiff > 0) {
      const absoluteGrowth = curr.totalAsset - prev.totalAsset;
      const monthlyGrowth = absoluteGrowth / monthsDiff;
      growthRates.push(monthlyGrowth);
    }
  }

  return growthRates;
}

/**
 * 计算平均月增长率（加权平均，近期权重更高）
 */
function calculateAverageMonthlyGrowth(growthRates: number[]): number {
  if (growthRates.length === 0) return 0;

  // 使用指数加权移动平均（EWMA）
  // 近期数据权重更高
  const alpha = 0.3; // 平滑系数
  let ewma = growthRates[0];

  for (let i = 1; i < growthRates.length; i++) {
    ewma = alpha * growthRates[i] + (1 - alpha) * ewma;
  }

  return ewma;
}

/**
 * 获取目标状态
 */
export function getGoalStatus(
  goal: Goal,
  progress: GoalProgress
): GoalStatus {
  const now = Date.now();

  // 已达成
  if (progress.currentAmount >= goal.targetAmount) {
    return 'achieved';
  }

  // 已过期但未达成
  if (now > goal.deadline) {
    return 'overdue';
  }

  // 尚未开始
  if (progress.currentAmount < goal.startAmount) {
    return 'not_started';
  }

  // 进行中 - 判断是否在正轨上
  if (progress.onTrack) {
    return 'on_track';
  } else {
    return 'behind';
  }
}

/**
 * 格式化目标金额
 */
export function formatGoalAmount(amount: number, currency: string): string {
  const locale = typeof document !== 'undefined'
    ? (document.documentElement.lang || navigator.language || 'zh-CN')
    : (typeof navigator !== 'undefined' ? navigator.language : 'zh-CN');
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * 格式化目标日期
 */
export function formatGoalDate(timestamp: number): string {
  const locale = typeof document !== 'undefined'
    ? (document.documentElement.lang || navigator.language || 'zh-CN')
    : (typeof navigator !== 'undefined' ? navigator.language : 'zh-CN');
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(timestamp));
}

/**
 * 格式化目标月份
 */
export function formatGoalMonth(timestamp: number): string {
  const locale = typeof document !== 'undefined'
    ? (document.documentElement.lang || navigator.language || 'zh-CN')
    : (typeof navigator !== 'undefined' ? navigator.language : 'zh-CN');
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long'
  }).format(new Date(timestamp));
}
