/**
 * Storage module - unified access to all storage layers
 */

// Database
export * from './db';

// Snapshot storage
export * from './snapshot';

// Settings storage
export * from './settings';

// Exchange rate storage
export * from './exchange-rate';

// Analytics cache storage
export * from './analytics-cache';

// Re-export storage instances
import { getSnapshotStorage } from './snapshot';
import { getSettingsStorage, getPreferencesStorage } from './settings';
import { getExchangeRateStorage } from './exchange-rate';
import { getAnalyticsCacheStorage } from './analytics-cache';

/**
 * 存储层统一接口
 */
export interface Storage {
  snapshots: ReturnType<typeof getSnapshotStorage>;
  settings: ReturnType<typeof getSettingsStorage>;
  preferences: ReturnType<typeof getPreferencesStorage>;
  exchangeRates: ReturnType<typeof getExchangeRateStorage>;
  analyticsCache: ReturnType<typeof getAnalyticsCacheStorage>;
}

/**
 * 获取存储层实例
 */
export function getStorage(): Storage {
  return {
    snapshots: getSnapshotStorage(),
    settings: getSettingsStorage(),
    preferences: getPreferencesStorage(),
    exchangeRates: getExchangeRateStorage(),
    analyticsCache: getAnalyticsCacheStorage(),
  };
}

/**
 * 初始化存储层
 */
export async function initStorage(): Promise<void> {
  const { initDB } = await import('./db');
  await initDB();
}

/**
 * 清空所有数据（慎用！）
 */
export async function clearAllData(): Promise<void> {
  const storage = getStorage();

  await storage.snapshots.deleteAllByUserId('default');
  await storage.settings.delete('default');
  await storage.exchangeRates.clear();
  await storage.analyticsCache.clearAll();
}

/**
 * 导出所有数据
 */
export async function exportAllData(userId: string): Promise<{
  exportedAt: number;
  snapshots: any;
  settings: any;
  exchangeRates: any;
}> {
  const storage = getStorage();

  const [snapshots, settings, exchangeRates] = await Promise.all([
    storage.snapshots.export(userId),
    storage.settings.export(userId),
    storage.exchangeRates.export(),
  ]);

  return {
    exportedAt: Date.now(),
    snapshots,
    settings,
    exchangeRates,
  };
}

/**
 * 导入所有数据
 */
export async function importAllData(
  userId: string,
  data: any
): Promise<{
  snapshots: { imported: number; skipped: number };
  settings: boolean;
  exchangeRates: { imported: number; skipped: number };
}> {
  const storage = getStorage();

  const results = {
    snapshots: { imported: 0, skipped: 0 },
    settings: false,
    exchangeRates: { imported: 0, skipped: 0 },
  };

  // 导入快照
  if (data.snapshots) {
    results.snapshots = await storage.snapshots.import(userId, data.snapshots);
  }

  // 导入设置
  if (data.settings) {
    await storage.settings.import(userId, data.settings);
    results.settings = true;
  }

  // 导入汇率
  if (data.exchangeRates) {
    results.exchangeRates = await storage.exchangeRates.import(data.exchangeRates);
  }

  return results;
}
