import { CurrencyInfo, CurrencyCode } from '../types';
export { CURRENCY_ALIASES } from './currency-aliases';

/**
 * Supported currencies
 */
export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
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
];

/**
 * Default base currency
 */
export const DEFAULT_BASE_CURRENCY: CurrencyCode = 'CNY';

/**
 * Asset category names (Chinese)
 */
export const ASSET_CATEGORY_NAMES = {
  cash: '现金',
  bankAccounts: '银行账户',
  securities: '证券',
  crypto: '加密资产',
  dailyPayment: '日常支付',
} as const;

/**
 * Asset category colors for charts
 */
export const ASSET_CATEGORY_COLORS = {
  cash: '#10B981',        // Green
  bankAccounts: '#3B82F6', // Blue
  securities: '#8B5CF6',   // Purple
  crypto: '#F59E0B',       // Amber
  dailyPayment: '#EC4899', // Pink
} as const;

/**
 * Chart time periods
 */
export const CHART_PERIODS = {
  week: { label: '周', days: 7 },
  month: { label: '月', days: 30 },
  quarter: { label: '季', days: 90 },
  year: { label: '年', days: 365 },
} as const;

/**
 * Exchange rate API endpoints
 */
export const EXCHANGE_RATE_API = {
  frankfurter: 'https://api.frankfurter.app/latest',
  exchangeRateApi: 'https://api.exchangerate-api.com/v4/latest',
  exchangeRateHost: 'https://api.exchangerate.host',
} as const;

/**
 * Small asset threshold (percentage)
 */
export const SMALL_ASSET_THRESHOLD_PERCENT = 5;
