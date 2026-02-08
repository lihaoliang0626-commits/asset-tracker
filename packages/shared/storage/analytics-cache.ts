import { AnalyticsCache, AnalysisPeriod, TrendData, ContributionAnalysis, StructureComparison } from '../types';
import { DBStore, STORES } from './db';
import { generateId } from '../utils/date';

/**
 * 分析数据缓存管理器
 */
export class AnalyticsCacheStorage {
  private store: DBStore<AnalyticsCache>;
  private cacheDuration = 60 * 60 * 1000; // 1小时缓存时间

  constructor() {
    this.store = new DBStore<AnalyticsCache>(STORES.ANALYTICS_CACHE);
  }

  /**
   * 保存分析缓存
   */
  async save(cache: Omit<AnalyticsCache, 'cachedAt'>): Promise<AnalyticsCache> {
    const savedCache: AnalyticsCache = {
      ...cache,
      cachedAt: Date.now(),
    };

    await this.store.put(savedCache);
    return savedCache;
  }

  /**
   * 获取分析缓存
   */
  async get(
    userId: string,
    period: AnalysisPeriod,
    startTime: number,
    endTime: number
  ): Promise<AnalyticsCache | null> {
    const existing = await this.store.get([userId, period, startTime, endTime]);

    if (!existing) {
      return null;
    }

    // 检查缓存是否过期
    if (this.isExpired(existing)) {
      await this.store.delete([userId, period, startTime, endTime]);
      return null;
    }

    return existing;
  }

  /**
   * 检查缓存是否过期
   */
  private isExpired(cache: AnalyticsCache): boolean {
    const age = Date.now() - cache.cachedAt;
    return age > this.cacheDuration;
  }

  /**
   * 清除过期缓存
   */
  async clearExpired(): Promise<number> {
    const allCaches = await this.store.getAll();
    let cleared = 0;

    for (const cache of allCaches) {
      if (this.isExpired(cache)) {
        await this.store.delete([cache.userId, cache.period, cache.startTime, cache.endTime]);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * 清除用户的所有缓存
   */
  async clearByUserId(userId: string): Promise<void> {
    const caches = await this.store.getByIndex('userId', userId);
    await Promise.all(
      caches.map(cache =>
        this.store.delete([cache.userId, cache.period, cache.startTime, cache.endTime])
      )
    );
  }

  /**
   * 清除所有缓存
   */
  async clearAll(): Promise<void> {
    await this.store.clear();
  }

  /**
   * 更新缓存时间戳（保持缓存有效）
   */
  async refresh(
    userId: string,
    period: AnalysisPeriod,
    startTime: number,
    endTime: number
  ): Promise<AnalyticsCache | null> {
    const cache = await this.get(userId, period, startTime, endTime);

    if (!cache) {
      return null;
    }

    const refreshed: AnalyticsCache = {
      ...cache,
      cachedAt: Date.now(),
    };

    await this.store.put(refreshed);
    return refreshed;
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{
    total: number;
    expired: number;
    fresh: number;
  }> {
    const allCaches = await this.store.getAll();

    const expired = allCaches.filter(cache => this.isExpired(cache)).length;
    const fresh = allCaches.length - expired;

    return {
      total: allCaches.length,
      expired,
      fresh,
    };
  }

  /**
   * 导出缓存数据
   */
  async export(): Promise<{
    exportedAt: number;
    caches: AnalyticsCache[];
  }> {
    const caches = await this.store.getAll();

    return {
      exportedAt: Date.now(),
      caches,
    };
  }

  /**
   * 导入缓存数据
   */
  async import(data: { caches: AnalyticsCache[] }): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const cache of data.caches) {
      try {
        // 只导入非过期的缓存
        if (!this.isExpired(cache)) {
          await this.save(cache);
          imported++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error('Failed to import analytics cache:', error);
        skipped++;
      }
    }

    return { imported, skipped };
  }

  /**
   * 设置缓存时间（用于测试）
   */
  setCacheDuration(duration: number): void {
    this.cacheDuration = duration;
  }
}

// 单例实例
let analyticsCacheStorage: AnalyticsCacheStorage | null = null;

export function getAnalyticsCacheStorage(): AnalyticsCacheStorage {
  if (!analyticsCacheStorage) {
    analyticsCacheStorage = new AnalyticsCacheStorage();
  }
  return analyticsCacheStorage;
}
