/**
 * Exchange rate type definitions
 */

// 货币代码
export type CurrencyCode =
  | 'CNY'  // 人民币
  | 'USD'  // 美元
  | 'HKD'  // 港币
  | 'EUR'  // 欧元
  | 'GBP'  // 英镑
  | 'JPY'  // 日元
  | 'SGD'  // 新加坡元
  | 'AUD'  // 澳元
  | 'CAD'  // 加元
  | 'MYR'  // 马来西亚令吉
  | 'INR'  // 印度卢比
  | 'VND'  // 越南盾
  | 'KRW'  // 韩元
  | 'TWD'; // 台币

// 货币信息
export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  nameZh: string;              // 中文名称
}

// 汇率数据
export interface ExchangeRate {
  id: string;
  fromCurrency: string;        // 源币种
  toCurrency: string;          // 目标币种
  rate: number;                // 汇率
  timestamp: number;           // 更新时间戳
  source: 'api' | 'manual';    // 来源（API自动/手动设置）
}

// 汇率表（优化查询）
export interface ExchangeRateTable {
  baseCurrency: string;        // 基准货币
  rates: Record<string, number>; // { "USD": 7.25, "HKD": 0.93 }
  timestamp: number;           // 更新时间戳
  lastUpdated: Date;           // 最后更新时间
}

// 货币列表
export const CURRENCIES: CurrencyInfo[] = [
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', nameZh: '人民币' },
  { code: 'USD', name: 'US Dollar', symbol: '$', nameZh: '美元' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', nameZh: '港币' },
  { code: 'EUR', name: 'Euro', symbol: '€', nameZh: '欧元' },
  { code: 'GBP', name: 'British Pound', symbol: '£', nameZh: '英镑' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', nameZh: '日元' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', nameZh: '新加坡元' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', nameZh: '澳元' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', nameZh: '加元' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', nameZh: '马来西亚令吉' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', nameZh: '印度卢比' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', nameZh: '越南盾' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', nameZh: '韩元' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', nameZh: '台币' },
];
