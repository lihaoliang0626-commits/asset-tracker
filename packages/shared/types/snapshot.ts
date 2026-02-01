import { AssetGroup, AssetType } from './asset';

/**
 * 资产快照 - 核心数据结构
 */
export interface Snapshot {
  id: string;                    // 快照唯一ID
  userId: string;                // 用户ID
  timestamp: number;             // 记录时间戳（毫秒）
  date: string;                  // 记录日期（YYYY-MM-DD）
  baseCurrency: string;          // 基准货币（如 "CNY"）
  totalAsset: number;            // 总资产（基准货币）
  assets: AssetGroup[];          // 资产分组
  note?: string;                 // 用户备注
  aiInsight?: string;            // AI分析结果
  schemaVersion: string;         // 数据模型版本
  createdAt: number;             // 创建时间
  updatedAt: number;             // 更新时间
}

/**
 * 资产变化分析
 */
export interface AssetChange {
  absoluteChange: number;        // 绝对变化值
  percentageChange: number;      // 百分比变化
  totalCurrent: number;          // 当前总资产
  totalPrevious: number;         // 上期总资产
}

/**
 * 分类贡献分析
 */
export interface ContributionAnalysis {
  assetType: AssetType;          // 资产类型
  change: number;                // 变化值
  changePercentage: number;      // 占总变化的百分比
  currentValue: number;          // 当前值
  previousValue: number;         // 上期值
}

/**
 * 资产结构对比
 */
export interface StructureComparison {
  current: {
    assetType: AssetType;
    value: number;
    percentage: number;
  }[];
  previous: {
    assetType: AssetType;
    value: number;
    percentage: number;
  }[];
}

/**
 * 趋势数据
 */
export interface TrendData {
  timestamps: number[];          // 时间点数组
  values: number[];              // 资产值数组
  changes: number[];             // 变化值数组
  changePercentages: number[];   // 变化百分比数组
}

/**
 * 分析周期
 */
export type AnalysisPeriod = 'week' | 'month' | 'quarter' | 'year';

/**
 * 快照创建输入
 */
export interface CreateSnapshotInput {
  userId: string;
  baseCurrency: string;
  assets: AssetGroup[];
  date: string;                  // 记录日期（YYYY-MM-DD）
  note?: string;
}

/**
 * 快照更新输入
 */
export interface UpdateSnapshotInput {
  id: string;
  note?: string;
  aiInsight?: string;
}
