/**
 * 资产配置类型定义
 */

/**
 * 资产配置层级（四层风险模型）
 */
export enum AssetAllocationLevel {
  CASH = 'cash',         // 💰 现金储备 - 日常开销、应急资金
  STABLE = 'stable',     // 📊 稳健理财 - 债券理财、追求稳定
  GROWTH = 'growth',     // 📈 积极投资 - 股票基金、长期增值
  RISKY = 'risky',       // ₿ 高风险资产 - 数字货币、小仓位
}

/**
 * 资产配置层级信息
 */
export interface AssetAllocationLevelInfo {
  key: AssetAllocationLevel;
  label: string;
  icon: string;
  description: string;
  riskLevel: string;
}

/**
 * 资产配置目标（用户设定）
 */
export interface AssetAllocationTarget {
  cash: number;      // 现金储备目标比例 0-100
  stable: number;    // 稳健理财目标比例
  growth: number;    // 积极投资目标比例
  risky: number;     // 高风险资产目标比例
  updatedAt: number; // 更新时间
}

/**
 * 当前资产配置（计算得出）
 */
export interface CurrentAllocation {
  cash: {
    percentage: number;
    amount: number;
  };
  stable: {
    percentage: number;
    amount: number;
  };
  growth: {
    percentage: number;
    amount: number;
  };
  risky: {
    percentage: number;
    amount: number;
  };
  totalAsset: number;
}

/**
 * 资产配置对比（用于UI展示）
 */
export interface AllocationComparison {
  level: AssetAllocationLevel;
  info: AssetAllocationLevelInfo;
  current: {
    percentage: number;
    amount: number;
  };
  target: {
    percentage: number;
    amount: number; // = totalAsset * target%
  };
  deviation: {
    percentage: number; // current% - target%
    amount: number;     // current amount - target amount
  };
}

/**
 * 默认配置目标（均衡型）
 */
export const DEFAULT_ALLOCATION_TARGET: AssetAllocationTarget = {
  cash: 30,      // 30% 现金储备
  stable: 30,    // 30% 稳健理财
  growth: 35,    // 35% 积极投资
  risky: 5,      // 5% 高风险
  updatedAt: 0,
};

/**
 * 资产配置层级信息映射
 */
export const ALLOCATION_LEVEL_INFO: Record<AssetAllocationLevel, AssetAllocationLevelInfo> = {
  [AssetAllocationLevel.CASH]: {
    key: AssetAllocationLevel.CASH,
    label: '现金储备',
    icon: '💰',
    description: '日常开销、应急资金',
    riskLevel: 'R1',
  },
  [AssetAllocationLevel.STABLE]: {
    key: AssetAllocationLevel.STABLE,
    label: '稳健理财',
    icon: '📊',
    description: '债券理财、追求稳定',
    riskLevel: 'R2-R3',
  },
  [AssetAllocationLevel.GROWTH]: {
    key: AssetAllocationLevel.GROWTH,
    label: '积极投资',
    icon: '📈',
    description: '股票基金、长期增值',
    riskLevel: 'R4-R5',
  },
  [AssetAllocationLevel.RISKY]: {
    key: AssetAllocationLevel.RISKY,
    label: '高风险资产',
    icon: '₿',
    description: '数字货币、小仓位',
    riskLevel: 'R6',
  },
};
