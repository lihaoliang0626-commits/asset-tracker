import {
  Snapshot,
  AssetGroup,
  AssetType,
  AssetChange,
  ContributionAnalysis,
  StructureComparison,
  TrendData,
  ValidationResult,
} from '../types';
import { formatDateKey } from './date';

/**
 * 计算快照的总资产
 */
export function calculateTotalAsset(snapshot: Snapshot): number {
  return snapshot.assets.reduce((total, group) => {
    return total + group.totalValue;
  }, 0);
}

/**
 * 计算资产组的总值
 */
export function calculateGroupTotal(group: AssetGroup): number {
  return group.items.reduce((total, item) => total + item.valueInBase, 0);
}

/**
 * 计算资产占比
 */
export function calculatePercentage(
  groupValue: number,
  totalAsset: number
): number {
  if (totalAsset === 0) return 0;
  return (groupValue / totalAsset) * 100;
}

/**
 * 计算资产变化
 */
export function calculateChange(
  currentSnapshot: Snapshot,
  previousSnapshot: Snapshot
): AssetChange {
  const current = currentSnapshot.totalAsset;
  const previous = previousSnapshot.totalAsset;

  const absoluteChange = current - previous;
  const percentageChange = previous === 0
    ? 0
    : (absoluteChange / previous) * 100;

  return {
    absoluteChange,
    percentageChange,
    totalCurrent: current,
    totalPrevious: previous,
  };
}

/**
 * 贡献分析
 */
export function analyzeContributions(
  currentSnapshot: Snapshot,
  previousSnapshot: Snapshot
): ContributionAnalysis[] {
  const contributions: Map<AssetType, {
    change: number;
    current: number;
    previous: number;
  }> = new Map();

  // 计算每个资产类型的变化
  for (const currentGroup of currentSnapshot.assets) {
    const previousGroup = previousSnapshot.assets.find(
      g => g.type === currentGroup.type
    );

    const previousValue = previousGroup?.totalValue || 0;
    const currentValue = currentGroup.totalValue;
    const change = currentValue - previousValue;

    contributions.set(currentGroup.type, {
      change,
      current: currentValue,
      previous: previousValue,
    });
  }

  // 处理在当前快照中不存在但在上一个快照中存在的资产类型
  for (const previousGroup of previousSnapshot.assets) {
    if (!contributions.has(previousGroup.type)) {
      contributions.set(previousGroup.type, {
        change: -previousGroup.totalValue,
        current: 0,
        previous: previousGroup.totalValue,
      });
    }
  }

  // 转换为数组并计算百分比
  const totalChange = currentSnapshot.totalAsset - previousSnapshot.totalAsset;

  return Array.from(contributions.entries()).map(([assetType, data]) => ({
    assetType,
    change: data.change,
    changePercentage: totalChange === 0 ? 0 : (data.change / Math.abs(totalChange)) * 100,
    currentValue: data.current,
    previousValue: data.previous,
  }));
}

/**
 * 结构对比
 */
export function compareStructure(
  currentSnapshot: Snapshot,
  previousSnapshot: Snapshot
): StructureComparison {
  return {
    current: currentSnapshot.assets.map(group => ({
      assetType: group.type,
      value: group.totalValue,
      percentage: group.percentage,
    })),
    previous: previousSnapshot.assets.map(group => ({
      assetType: group.type,
      value: group.totalValue,
      percentage: group.percentage,
    })),
  };
}

/**
 * 构建趋势数据
 */
export function buildTrendData(snapshots: Snapshot[]): TrendData {
  const sorted = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);

  const timestamps: number[] = [];
  const values: number[] = [];
  const changes: number[] = [];
  const changePercentages: number[] = [];

  sorted.forEach((snapshot, index) => {
    timestamps.push(snapshot.timestamp);
    values.push(snapshot.totalAsset);

    if (index === 0) {
      changes.push(0);
      changePercentages.push(0);
    } else {
      const prev = sorted[index - 1];
      const change = snapshot.totalAsset - prev.totalAsset;
      const changePercentage = prev.totalAsset === 0
        ? 0
        : (change / prev.totalAsset) * 100;

      changes.push(change);
      changePercentages.push(changePercentage);
    }
  });

  return {
    timestamps,
    values,
    changes,
    changePercentages,
  };
}

/**
 * 同一天仅保留最新快照
 */
export function pickLatestSnapshotsPerDay(snapshots: Snapshot[]): Snapshot[] {
  const latestByDay = new Map<string, Snapshot>();

  for (const snapshot of snapshots) {
    const key = snapshot.date || formatDateKey(snapshot.timestamp);
    const existing = latestByDay.get(key);
    if (!existing || snapshot.timestamp > existing.timestamp) {
      latestByDay.set(key, snapshot);
    }
  }

  return Array.from(latestByDay.values()).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * 验证快照数据
 */
export function validateSnapshot(snapshot: Snapshot): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 必填字段检查
  if (!snapshot.id) errors.push('Snapshot ID is required');
  if (!snapshot.userId) errors.push('User ID is required');
  if (!snapshot.baseCurrency) errors.push('Base currency is required');

  // 2. 总资产必须非负
  if (snapshot.totalAsset < 0) {
    errors.push('Total asset cannot be negative');
  }

  // 3. 资产组验证
  for (const group of snapshot.assets) {
    if (group.totalValue < 0) {
      errors.push(`Asset group ${group.type} value cannot be negative`);
    }

    // 验证资产项
    for (const item of group.items) {
      if (item.valueInBase < 0) {
        errors.push(`Asset item ${item.name} value cannot be negative`);
      }

      // 验证汇率
      if ('exchangeRate' in item && item.exchangeRate <= 0) {
        errors.push(`Invalid exchange rate for ${item.name}`);
      }
    }
  }

  // 4. 验证百分比之和
  const sumOfPercentages = snapshot.assets.reduce(
    (sum, g) => sum + g.percentage, 0
  );

  if (Math.abs(sumOfPercentages - 100) > 0.1) {
    warnings.push(`Sum of percentages is ${sumOfPercentages.toFixed(2)}%, expected 100%`);
  }

  // 5. 验证计算的总资产是否匹配
  const calculatedTotal = calculateTotalAsset(snapshot);
  if (Math.abs(calculatedTotal - snapshot.totalAsset) > 0.01) {
    warnings.push(
      `Calculated total (${calculatedTotal}) doesn't match stored total (${snapshot.totalAsset})`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * 修正快照数据（自动修复一些问题）
 */
export function fixSnapshot(snapshot: Snapshot): Snapshot {
  // 重新计算每个资产组的总值和百分比
  const fixedAssets = snapshot.assets.map(group => {
    const totalValue = calculateGroupTotal(group);
    return {
      ...group,
      totalValue,
      // 百分比稍后统一计算
      percentage: 0,
    };
  });

  // 计算新的总资产
  const totalAsset = fixedAssets.reduce((sum, g) => sum + g.totalValue, 0);

  // 重新计算百分比
  const assetsWithPercentage = fixedAssets.map(group => ({
    ...group,
    percentage: calculatePercentage(group.totalValue, totalAsset),
  }));

  return {
    ...snapshot,
    totalAsset,
    assets: assetsWithPercentage,
    date: snapshot.date || formatDateKey(snapshot.timestamp),
    updatedAt: Date.now(),
  };
}
