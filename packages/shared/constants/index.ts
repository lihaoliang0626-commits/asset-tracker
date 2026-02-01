import { CurrencyInfo, CurrencyCode } from '../types';
export { CURRENCY_ALIASES } from './currency-aliases';

/**
 * Supported currencies
 */
export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
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
