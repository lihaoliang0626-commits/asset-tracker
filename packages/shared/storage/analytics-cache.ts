import { AnalyticsCache, AnalysisPeriod } from '../types';

export class AnalyticsCacheStorage {
  private cache = new Map<string, AnalyticsCache>();

  private key(userId: string, period: AnalysisPeriod, startTime: number, endTime: number): string {
    return `${userId}:${period}:${startTime}:${endTime}`;
  }

  async save(cache: AnalyticsCache): Promise<AnalyticsCache> {
    this.cache.set(this.key(cache.userId, cache.period, cache.startTime, cache.endTime), cache);
    return cache;
  }

  async get(
    userId: string,
    period: AnalysisPeriod,
    startTime: number,
    endTime: number
  ): Promise<AnalyticsCache | null> {
    const cached = this.cache.get(this.key(userId, period, startTime, endTime));
    if (!cached) return null;
    if (Date.now() - cached.cachedAt > 60 * 60 * 1000) {
      this.cache.delete(this.key(userId, period, startTime, endTime));
      return null;
    }
    return cached;
  }

  async clearByUserId(userId: string): Promise<void> {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  async clearAll(): Promise<void> {
    this.cache.clear();
  }
}

let analyticsCacheStorage: AnalyticsCacheStorage | null = null;

export function getAnalyticsCacheStorage(): AnalyticsCacheStorage {
  if (!analyticsCacheStorage) {
    analyticsCacheStorage = new AnalyticsCacheStorage();
  }
  return analyticsCacheStorage;
}
