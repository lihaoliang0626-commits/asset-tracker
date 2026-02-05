import { ExchangeRate, ExchangeRateTable, CurrencyCode, CURRENCIES } from '../types';

/**
 * 将金额从源币种转换为基准货币
 */
export function convertToBaseCurrency(
  amount: number,
  fromCurrency: string,
  baseCurrency: string,
  exchangeRates: ExchangeRate[]
): number {
  if (fromCurrency === baseCurrency) {
    return amount;
  }

  const rate = exchangeRates.find(
    r => r.fromCurrency === fromCurrency && r.toCurrency === baseCurrency
  );

  if (!rate) {
    throw new Error(`Exchange rate not found for ${fromCurrency} -> ${baseCurrency}`);
  }

  return amount * rate.rate;
}

/**
 * 从汇率表转换（性能优化版本）
 */
export function convertFromRateTable(
  amount: number,
  fromCurrency: string,
  rateTable: ExchangeRateTable
): number {
  if (fromCurrency === rateTable.baseCurrency) {
    return amount;
  }

  const rate = rateTable.rates[fromCurrency];
  if (rate === undefined) {
    console.warn(`Exchange rate not found for ${fromCurrency}, using amount as-is`);
    return amount;
  }

  return amount * rate;
}

/**
 * 格式化货币金额
 */
function getDefaultLocale(): string {
  if (typeof document !== 'undefined') {
    return document.documentElement.lang || navigator.language || 'zh-CN';
  }
  if (typeof navigator !== 'undefined') {
    return navigator.language || 'zh-CN';
  }
  return 'zh-CN';
}

export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = getDefaultLocale()
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // 如果货币代码不支持，回退到简单格式
    return `${getCurrencySymbol(currency)}${formatNumber(amount)}`;
  }
}

/**
 * 格式化数字（千分位分隔）
 */
export function formatNumber(
  value: number,
  decimals: number = 2,
  locale: string = getDefaultLocale()
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * 格式化百分比
 */
export function formatPercent(
  value: number,
  decimals: number = 2
): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * 获取货币符号
 */
export function getCurrencySymbol(currency: string): string {
  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  return currencyInfo?.symbol || currency;
}

/**
 * 获取货币名称
 */
export function getCurrencyName(currency: string, language: 'zh' | 'en' = 'zh'): string {
  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  if (!currencyInfo) return currency;
  return language === 'zh' ? currencyInfo.nameZh : currencyInfo.name;
}

/**
 * 验证货币代码
 */
export function isValidCurrency(currency: string): currency is CurrencyCode {
  return CURRENCIES.some(c => c.code === currency);
}
