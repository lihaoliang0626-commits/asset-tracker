import { CurrencyCode } from './exchange';
import { AssetType } from './asset';
import { AssetAllocationTarget } from './allocation';

/**
 * User settings type definition
 */
export interface UserSettings {
  userId: string;
  baseCurrency: CurrencyCode;    // 基准货币
  exchangeRateMode: 'auto' | 'manual'; // 汇率模式
  enabledAssetTypes: AssetType[]; // 启用的资产类型
  advancedCategories: string[];  // 高级分类（房产、负债等）
  theme: 'light' | 'dark' | 'system'; // 主题
  language: 'zh-CN' | 'en-US';   // 语言
  enableAIAnalysis: boolean;     // 是否启用AI分析
  dataBackupEnabled: boolean;    // 是否启用数据备份
  lastBackupDate?: number;       // 最后备份时间
  allocationTarget?: AssetAllocationTarget; // 资产配置目标
  createdAt: number;             // 创建时间
  updatedAt: number;             // 更新时间
}

/**
 * App preferences
 */
export interface AppPreferences {
  defaultChartPeriod: 'week' | 'month' | 'quarter' | 'year'; // 默认图表周期
  showPercentageChange: boolean; // 显示百分比变化
  hideSmallAssets: boolean;      // 隐藏小额资产
  smallAssetThreshold: number;   // 小额资产阈值
  enableNotifications: boolean;  // 启用通知
  notificationFrequency: 'daily' | 'weekly' | 'monthly' | 'never'; // 通知频率
}

/**
 * 默认用户设置
 */
export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'userId' | 'createdAt' | 'updatedAt'> = {
  baseCurrency: 'CNY',
  exchangeRateMode: 'auto',
  enabledAssetTypes: ['cash', 'bank', 'securities', 'crypto', 'payment'],
  advancedCategories: [],
  theme: 'system',
  language: 'zh-CN',
  enableAIAnalysis: true,
  dataBackupEnabled: false,
};

/**
 * 默认应用偏好设置
 */
export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  defaultChartPeriod: 'month',
  showPercentageChange: true,
  hideSmallAssets: false,
  smallAssetThreshold: 100,
  enableNotifications: false,
  notificationFrequency: 'never',
};
