import { ExchangeRate, ExchangeRateTable } from '../types';
import { DBStore, STORES } from './db';
import { generateId } from '../utils/date';

/**
 * 汇率数据管理器
 */
export class ExchangeRateStorage {
  private store: DBStore<ExchangeRate>;

  constructor() {
    this.store = new DBStore<ExchangeRate>(STORES.EXCHANGE_RATES);
  }

  private async getRatesForPair(
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRate[]> {
    try {
      return await this.store.getByIndex('fromTo', [fromCurrency, toCurrency]);
    } catch {
      const allRates = await this.store.getAll();
      return allRates.filter(
        r => r.fromCurrency === fromCurrency && r.toCurrency === toCurrency
      );
    }
  }

  /**
   * 保存汇率
   */
  async save(exchangeRate: Omit<ExchangeRate, 'id'>): Promise<ExchangeRate> {
    const rate: ExchangeRate = {
      id: generateId('rate'),
      ...exchangeRate,
    };

    await this.store.put(rate);
    return rate;
  }

  /**
   * 批量保存汇率
   */
  async saveMany(rates: Omit<ExchangeRate, 'id'>[]): Promise<ExchangeRate[]> {
    const results: ExchangeRate[] = [];

    for (const rate of rates) {
      const saved = await this.save(rate);
      results.push(saved);
    }

    return results;
  }

  /**
   * 获取汇率
   */
  async getRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    const rates = await this.getRatesForPair(fromCurrency, toCurrency);
    if (rates.length === 0) {
      return null;
    }

    return rates.reduce((latest, current) => (
      current.timestamp > latest.timestamp ? current : latest
    ));
  }

  /**
   * 获取最新的汇率
   */
  async getLatestRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    const rate = await this.getRate(fromCurrency, toCurrency);
    return rate;
  }

  /**
   * 获取所有汇率
   */
  async getAllRates(): Promise<ExchangeRate[]> {
    return this.store.getAll();
  }

  /**
   * 获取汇率表（优化查询性能）
   */
  async getRateTable(baseCurrency: string): Promise<ExchangeRateTable> {
    const allRates = await this.store.getAll();
    const rates: Record<string, number> = {};

    // 收集所有相关汇率
    for (const rate of allRates) {
      if (rate.fromCurrency === baseCurrency) {
        rates[rate.toCurrency] = rate.rate;
      }
    }

    const latestRate = allRates
      .filter(r => r.fromCurrency === baseCurrency)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    return {
      baseCurrency,
      rates,
      timestamp: latestRate?.timestamp || Date.now(),
      lastUpdated: new Date(latestRate?.timestamp || Date.now()),
    };
  }

  /**
   * 删除过期汇率（保留最近30天）
   */
  async deleteOutdated(): Promise<number> {
    const allRates = await this.store.getAll();
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    let deleted = 0;

    for (const rate of allRates) {
      if (rate.timestamp < thirtyDaysAgo) {
        await this.store.delete(rate.id);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * 清空所有汇率
   */
  async clear(): Promise<void> {
    await this.store.clear();
  }

  /**
   * 检查汇率是否最新（距离现在的时间）
   */
  async isUpToDate(
    fromCurrency: string,
    toCurrency: string,
    maxAge: number = 24 * 60 * 60 * 1000 // 默认24小时
  ): Promise<boolean> {
    const rate = await this.getRate(fromCurrency, toCurrency);

    if (!rate) {
      return false;
    }

    const age = Date.now() - rate.timestamp;
    return age < maxAge;
  }

  /**
   * 导出汇率数据
   */
  async export(): Promise<{
    exportedAt: number;
    rates: ExchangeRate[];
  }> {
    const rates = await this.store.getAll();

    return {
      exportedAt: Date.now(),
      rates,
    };
  }

  /**
   * 导入汇率数据
   */
  async import(data: { rates: ExchangeRate[] }): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const rate of data.rates) {
      try {
        // 检查是否已存在更新的数据
        const existing = await this.getRate(rate.fromCurrency, rate.toCurrency);

        if (existing && existing.timestamp >= rate.timestamp) {
          skipped++;
          continue;
        }

        await this.save({
          fromCurrency: rate.fromCurrency,
          toCurrency: rate.toCurrency,
          rate: rate.rate,
          timestamp: rate.timestamp,
          source: rate.source,
        });

        imported++;
      } catch (error) {
        console.error('Failed to import exchange rate:', error);
        skipped++;
      }
    }

    return { imported, skipped };
  }

  /**
   * 获取汇率统计信息
   */
  async getStats(): Promise<{
    total: number;
    oldestRate?: ExchangeRate;
    newestRate?: ExchangeRate;
    currencies: Set<string>;
  }> {
    const rates = await this.store.getAll();
    const total = rates.length;
    const currencies = new Set<string>();

    if (total === 0) {
      return { total: 0, currencies };
    }

    const sorted = [...rates].sort((a, b) => a.timestamp - b.timestamp);
    const oldestRate = sorted[0];
    const newestRate = sorted[sorted.length - 1];

    // 收集所有货币
    for (const rate of rates) {
      currencies.add(rate.fromCurrency);
      currencies.add(rate.toCurrency);
    }

    return {
      total,
      oldestRate,
      newestRate,
      currencies,
    };
  }
}

// 单例实例
let exchangeRateStorage: ExchangeRateStorage | null = null;

export function getExchangeRateStorage(): ExchangeRateStorage {
  if (!exchangeRateStorage) {
    exchangeRateStorage = new ExchangeRateStorage();
  }
  return exchangeRateStorage;
}
