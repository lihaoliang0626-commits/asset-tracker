/**
 * IndexedDB 数据库配置和基础封装
 */

export const DB_NAME = 'AssetTrackerDB';
export const DB_VERSION = 3;

// 数据库表名
export const STORES = {
  SNAPSHOTS: 'snapshots',
  SETTINGS: 'settings',
  EXCHANGE_RATES: 'exchangeRates',
  ANALYTICS_CACHE: 'analyticsCache',
} as const;

/**
 * 数据库表结构配置
 */
export interface StoreConfig {
  name: string;
  keyPath: string | string[];
  autoIncrement?: boolean;
  indexes?: {
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
  }[];
}

/**
 * 数据库结构定义
 */
export const STORE_CONFIGS: StoreConfig[] = [
  {
    name: STORES.SNAPSHOTS,
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'timestamp', keyPath: 'timestamp' },
      { name: 'userTime', keyPath: ['userId', 'timestamp'] },
    ],
  },
  {
    name: STORES.SETTINGS,
    keyPath: 'userId',
  },
  {
    name: STORES.EXCHANGE_RATES,
    keyPath: 'id',
    indexes: [
      { name: 'fromTo', keyPath: ['fromCurrency', 'toCurrency'] },
      { name: 'timestamp', keyPath: 'timestamp' },
    ],
  },
  {
    name: STORES.ANALYTICS_CACHE,
    keyPath: ['userId', 'period', 'startTime', 'endTime'],
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'period', keyPath: 'period' },
      { name: 'cachedAt', keyPath: 'cachedAt' },
    ],
  },
];

/**
 * 初始化数据库
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    console.log('[DB] Opening database...', { name: DB_NAME, version: DB_VERSION });

    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      const errorMsg = `Failed to open database: ${request.error?.message || 'Unknown error'}`;
      console.error('[DB] Error:', errorMsg);
      reject(new Error(errorMsg));
    };

    request.onsuccess = () => {
      console.log('[DB] Database opened successfully');
      resolve(request.result);
    };

    request.onblocked = () => {
      console.warn('[DB] Database upgrade blocked by another connection');
      reject(new Error('数据库被其他标签页占用，请关闭其他标签页后重试'));
    };

    request.onupgradeneeded = (event) => {
      console.log('[DB] Upgrading database...');
      const db = (event.target as IDBOpenDBRequest).result;

      try {
        // 创建对象存储
        STORE_CONFIGS.forEach((config) => {
          // 如果存储已存在，先删除
          if (db.objectStoreNames.contains(config.name)) {
            console.log('[DB] Deleting existing store:', config.name);
            db.deleteObjectStore(config.name);
          }

          // 创建对象存储
          console.log('[DB] Creating store:', config.name);
          const store = db.createObjectStore(config.name, {
            keyPath: config.keyPath,
            autoIncrement: config.autoIncrement,
          });

          // 创建索引
          config.indexes?.forEach((index) => {
            console.log('[DB] Creating index:', index.name, 'on store:', config.name);
            store.createIndex(index.name, index.keyPath, index.options);
          });
        });
        console.log('[DB] Database upgrade completed');
      } catch (error) {
        console.error('[DB] Upgrade error:', error);
        throw error;
      }
    };
  });
}

/**
 * 获取数据库连接
 */
let dbInstance: IDBDatabase | null = null;

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance && dbInstance.version === DB_VERSION) {
    return dbInstance;
  }

  dbInstance = await initDB();
  return dbInstance;
}

/**
 * 关闭数据库连接
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * 通用的数据库操作包装器
 */
export class DBStore<T> {
  constructor(private storeName: string) {}

  /**
   * 添加记录
   */
  async add(data: T): Promise<IDBValidKey> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 更新记录（如果不存在则添加）
   */
  async put(data: T): Promise<IDBValidKey> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取单条记录
   */
  async get(key: IDBValidKey): Promise<T | undefined> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取所有记录
   */
  async getAll(): Promise<T[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 通过索引查询
   */
  async getByIndex(
    indexName: string,
    query: IDBValidKey | IDBKeyRange
  ): Promise<T[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index(indexName);
      const request = index.getAll(query);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除记录
   */
  async delete(key: IDBValidKey): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清空存储
   */
  async clear(): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 计数
   */
  async count(): Promise<number> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
