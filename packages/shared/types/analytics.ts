import { AssetType } from './asset';
import { AnalysisPeriod, TrendData, ContributionAnalysis, StructureComparison, AssetChange } from './snapshot';

/**
 * Analytics cache type definitions
 */

/**
 * 分析数据缓存
 */
export interface AnalyticsCache {
  userId: string;
  period: AnalysisPeriod;        // 周期
  startTime: number;             // 开始时间
  endTime: number;               // 结束时间

  // 趋势数据
  trend: TrendData;

  // 总体变化
  assetChange?: AssetChange;

  // 变化来源
  contributions: ContributionAnalysis[];

  // 结构对比
  structureComparison?: StructureComparison;

  // AI分析结果
  aiInsight?: string;

  cachedAt: number;              // 缓存时间
}

/**
 * 分析请求参数
 */
export interface AnalyticsRequest {
  userId: string;
  period: AnalysisPeriod;
  startTime?: number;            // 可选的自定义开始时间
  endTime?: number;              // 可选的自定义结束时间
  forceRefresh?: boolean;        // 强制刷新缓存
}

/**
 * 分析结果
 */
export interface AnalyticsResult {
  period: AnalysisPeriod;
  startTime: number;
  endTime: number;

  // 总体变化
  totalChange: number;
  totalChangePercentage: number;

  // 趋势数据
  trend: TrendData;

  // 贡献分析
  contributions: ContributionAnalysis[];

  // 结构对比
  structureComparison: StructureComparison;

  // AI洞察
  aiInsight?: string;
}

/**
 * 数据验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}
