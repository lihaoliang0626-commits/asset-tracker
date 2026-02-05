import {
  Snapshot,
  AssetItem,
  SecuritiesAsset,
  AssetAllocationLevel,
  CurrentAllocation,
  AssetAllocationTarget,
  AllocationComparison,
  ALLOCATION_LEVEL_INFO,
} from '../types';

/**
 * 根据资产项判断其所属的配置层级
 */
export function getAssetAllocationLevel(asset: AssetItem): AssetAllocationLevel {
  switch (asset.type) {
    case 'cash':
    case 'bank':
    case 'payment':
      return AssetAllocationLevel.CASH;

    case 'securities': {
      const sec = asset as SecuritiesAsset;
      // 债券 -> 稳健理财
      if (sec.securityTypes?.includes('bond')) {
        return AssetAllocationLevel.STABLE;
      }
      // 股票 -> 积极投资
      if (sec.securityTypes?.includes('stock')) {
        return AssetAllocationLevel.GROWTH;
      }
      // 基金/ETF -> 积极投资（默认归为积极投资）
      // 注：如果未来需要更细分，可以根据基金类型进一步判断
      return AssetAllocationLevel.GROWTH;
    }

    case 'crypto':
      return AssetAllocationLevel.RISKY;

    default:
      return AssetAllocationLevel.CASH; // 默认归为现金
  }
}

/**
 * 计算当前资产配置
 */
export function calculateCurrentAllocation(snapshot: Snapshot): CurrentAllocation {
  const totals = {
    cash: 0,
    stable: 0,
    growth: 0,
    risky: 0,
  };

  // 遍历所有资产，累加到对应的配置层级
  snapshot.assets.forEach((group) => {
    group.items.forEach((item) => {
      const level = getAssetAllocationLevel(item);
      totals[level] += item.valueInBase;
    });
  });

  const total = snapshot.totalAsset;

  // 避免除以0
  if (total === 0) {
    return {
      cash: { amount: 0, percentage: 0 },
      stable: { amount: 0, percentage: 0 },
      growth: { amount: 0, percentage: 0 },
      risky: { amount: 0, percentage: 0 },
      totalAsset: 0,
    };
  }

  return {
    cash: {
      amount: totals.cash,
      percentage: (totals.cash / total) * 100,
    },
    stable: {
      amount: totals.stable,
      percentage: (totals.stable / total) * 100,
    },
    growth: {
      amount: totals.growth,
      percentage: (totals.growth / total) * 100,
    },
    risky: {
      amount: totals.risky,
      percentage: (totals.risky / total) * 100,
    },
    totalAsset: total,
  };
}

/**
 * 生成资产配置对比数据
 */
export function generateAllocationComparison(
  current: CurrentAllocation,
  target: AssetAllocationTarget
): AllocationComparison[] {
  const levels: AssetAllocationLevel[] = [
    AssetAllocationLevel.CASH,
    AssetAllocationLevel.STABLE,
    AssetAllocationLevel.GROWTH,
    AssetAllocationLevel.RISKY,
  ];

  return levels.map((level) => {
    const currentData = current[level];
    const targetPercentage = target[level];
    const targetAmount = (current.totalAsset * targetPercentage) / 100;

    return {
      level,
      info: ALLOCATION_LEVEL_INFO[level],
      current: {
        percentage: currentData.percentage,
        amount: currentData.amount,
      },
      target: {
        percentage: targetPercentage,
        amount: targetAmount,
      },
      deviation: {
        percentage: currentData.percentage - targetPercentage,
        amount: currentData.amount - targetAmount,
      },
    };
  });
}

/**
 * 验证配置目标是否有效
 * 总和必须为 100%，每项必须 >= 0
 */
export function validateAllocationTarget(target: AssetAllocationTarget): {
  valid: boolean;
  error?: string;
} {
  const { cash, stable, growth, risky } = target;

  // 检查是否为有效数字
  if (
    typeof cash !== 'number' ||
    typeof stable !== 'number' ||
    typeof growth !== 'number' ||
    typeof risky !== 'number'
  ) {
    return { valid: false, error: '配置比例必须为数字' };
  }

  // 检查是否为负数
  if (cash < 0 || stable < 0 || growth < 0 || risky < 0) {
    return { valid: false, error: '配置比例不能为负数' };
  }

  // 检查是否超过 100
  if (cash > 100 || stable > 100 || growth > 100 || risky > 100) {
    return { valid: false, error: '单项配置比例不能超过 100%' };
  }

  // 检查总和是否为 100
  const sum = cash + stable + growth + risky;
  if (Math.abs(sum - 100) > 0.01) {
    // 允许 0.01 的浮点误差
    return { valid: false, error: `总和必须为 100%（当前为 ${sum.toFixed(2)}%）` };
  }

  return { valid: true };
}
