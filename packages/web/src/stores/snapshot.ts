import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Snapshot, CreateSnapshotInput, UpdateSnapshotInput } from '@asset-tracker/shared';
import { AssetGroup, AssetItem, CashAsset, BankAsset, SecuritiesAsset, PaymentAsset, CryptoAsset } from '@asset-tracker/shared';
import { EXCHANGE_RATE_API, fixSnapshot } from '@asset-tracker/shared';
import { getSnapshotStorage, getExchangeRateStorage } from '@asset-tracker/shared';

/**
 * 快照状态接口
 */
interface SnapshotState {
  // 状态
  snapshots: Snapshot[];
  currentSnapshot: Snapshot | null;
  isLoading: boolean;
  error: string | null;

  // 分页状态
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;

  // Actions
  loadSnapshots: (userId: string) => Promise<void>;
  loadMore: (userId: string) => Promise<void>;
  createSnapshot: (input: CreateSnapshotInput) => Promise<Snapshot>;
  updateSnapshot: (input: UpdateSnapshotInput) => Promise<Snapshot>;
  deleteSnapshot: (id: string) => Promise<void>;
  getSnapshot: (id: string) => Promise<Snapshot | null>;
  getLatestSnapshot: (userId: string) => Promise<Snapshot | null>;
  refreshSnapshots: (userId: string) => Promise<void>;
  recalculateBaseCurrency: (userId: string, baseCurrency: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const storage = getSnapshotStorage();
const exchangeRateStorage = getExchangeRateStorage();

type CurrencyAsset = CashAsset | BankAsset | SecuritiesAsset | PaymentAsset;

const hasCurrency = (item: AssetItem): item is CurrencyAsset => item.type !== 'crypto';

const fetchLatestRate = async (
  fromCurrency: string,
  toCurrency: string,
  forceRefresh: boolean = false
): Promise<number> => {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  if (!forceRefresh) {
    const isFresh = await exchangeRateStorage.isUpToDate(fromCurrency, toCurrency);
    if (isFresh) {
      const cached = await exchangeRateStorage.getRate(fromCurrency, toCurrency);
      if (cached) {
        return cached.rate;
      }
    }
  }

  const computeCrossRate = (
    base: string,
    from: string,
    to: string,
    rates: Record<string, number>
  ) => {
    if (from === to) return 1;
    if (from === base) {
      const direct = rates[to];
      if (typeof direct !== 'number') throw new Error('Missing target rate');
      return direct;
    }
    if (to === base) {
      const direct = rates[from];
      if (typeof direct !== 'number') throw new Error('Missing source rate');
      return 1 / direct;
    }
    const rateFrom = rates[from];
    const rateTo = rates[to];
    if (typeof rateFrom !== 'number' || typeof rateTo !== 'number') {
      throw new Error('Missing cross rates');
    }
    return rateTo / rateFrom;
  };

  const fetchFromHost = async () => {
    const base = 'USD';
    const url = `${EXCHANGE_RATE_API.exchangeRateHost}/latest?base=${base}&symbols=${fromCurrency},${toCurrency}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('exchange-rate-host failed');
    }
    const data = await response.json();
    const rates = data?.rates;
    if (!rates || typeof rates !== 'object') {
      throw new Error('Invalid exchange-rate-host response');
    }
    return computeCrossRate(base, fromCurrency, toCurrency, rates);
  };

  const fetchFromFrankfurter = async () => {
    const base = 'USD';
    const url = `${EXCHANGE_RATE_API.frankfurter}?from=${base}&to=${fromCurrency},${toCurrency}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('frankfurter failed');
    }
    const data = await response.json();
    const rates = data?.rates;
    if (!rates || typeof rates !== 'object') {
      throw new Error('Invalid frankfurter response');
    }
    return computeCrossRate(base, fromCurrency, toCurrency, rates);
  };

  let rate: number;
  try {
    rate = await fetchFromHost();
  } catch (error) {
    console.warn(error);
    rate = await fetchFromFrankfurter();
  }

  await exchangeRateStorage.save({
    fromCurrency,
    toCurrency,
    rate,
    timestamp: Date.now(),
    source: 'api',
  });

  return rate;
};

const recalcItemValue = (
  item: AssetItem,
  rate: number,
  baseConversionRate: number
): AssetItem => {
  if (item.type === 'cash') {
    return { ...item, exchangeRate: rate, valueInBase: (item.amount || 0) * rate };
  }
  if (item.type === 'bank') {
    return { ...item, exchangeRate: rate, valueInBase: (item.balance || 0) * rate };
  }
  if (item.type === 'securities') {
    return { ...item, exchangeRate: rate, valueInBase: (item.marketValue || 0) * rate };
  }
  if (item.type === 'payment') {
    return { ...item, exchangeRate: rate, valueInBase: (item.balance || 0) * rate };
  }
  if (item.type === 'crypto') {
    const converted = (item.valueInBase || 0) * baseConversionRate;
    const updatedMarketValue = item.marketValue ? item.marketValue * baseConversionRate : item.marketValue;
    return {
      ...item,
      marketValue: updatedMarketValue,
      valueInBase: converted,
    } as CryptoAsset;
  }
  return item;
};

/**
 * 快照状态 Store
 */
export const useSnapshotStore = create<SnapshotState>((set, get) => ({
  // 初始状态
  snapshots: [],
  currentSnapshot: null,
  isLoading: false,
  error: null,

  // 分页状态
  page: 0,
  pageSize: 20,
  total: 0,
  hasMore: false,

  // 加载快照列表
  loadSnapshots: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const { page, pageSize } = get();
      const result = await storage.getPaginated(userId, page * pageSize, pageSize);

      set({
        snapshots: result.snapshots,
        total: result.total,
        hasMore: result.hasMore,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load snapshots',
        isLoading: false,
      });
    }
  },

  // 加载更多
  loadMore: async (userId: string) => {
    const { isLoading, hasMore, page } = get();

    if (isLoading || !hasMore) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const nextPage = page + 1;
      const pageSize = get().pageSize;
      const result = await storage.getPaginated(userId, nextPage * pageSize, pageSize);

      set(state => ({
        snapshots: [...state.snapshots, ...result.snapshots],
        total: result.total,
        hasMore: result.hasMore,
        page: nextPage,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load more snapshots',
        isLoading: false,
      });
    }
  },

  // 创建快照
  createSnapshot: async (input: CreateSnapshotInput) => {
    set({ isLoading: true, error: null });

    try {
      const snapshot = await storage.create(input);

      set(state => ({
        snapshots: [snapshot, ...state.snapshots],
        currentSnapshot: snapshot,
        total: state.total + 1,
        isLoading: false,
      }));

      return snapshot;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create snapshot',
        isLoading: false,
      });
      throw error;
    }
  },

  // 更新快照
  updateSnapshot: async (input: UpdateSnapshotInput) => {
    set({ isLoading: true, error: null });

    try {
      const updated = await storage.update(input);

      set(state => ({
        snapshots: state.snapshots.map(s => (s.id === updated.id ? updated : s)),
        currentSnapshot: state.currentSnapshot?.id === updated.id ? updated : state.currentSnapshot,
        isLoading: false,
      }));

      return updated;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update snapshot',
        isLoading: false,
      });
      throw error;
    }
  },

  // 删除快照
  deleteSnapshot: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      await storage.delete(id);

      set(state => ({
        snapshots: state.snapshots.filter(s => s.id !== id),
        currentSnapshot: state.currentSnapshot?.id === id ? null : state.currentSnapshot,
        total: state.total - 1,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete snapshot',
        isLoading: false,
      });
      throw error;
    }
  },

  // 获取单个快照
  getSnapshot: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const snapshot = await storage.get(id);

      if (snapshot) {
        set({ currentSnapshot: snapshot, isLoading: false });
      } else {
        set({ isLoading: false });
      }

      return snapshot || null;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get snapshot',
        isLoading: false,
      });
      return null;
    }
  },

  // 获取最新快照
  getLatestSnapshot: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const snapshot = await storage.getLatest(userId);

      if (snapshot) {
        set({ currentSnapshot: snapshot, isLoading: false });
      } else {
        set({ isLoading: false });
      }

      return snapshot || null;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get latest snapshot',
        isLoading: false,
      });
      return null;
    }
  },

  // 刷新快照列表
  refreshSnapshots: async (userId: string) => {
    set({ page: 0 });
    await get().loadSnapshots(userId);
  },

  // 切换基准货币时，重新计算快照
  recalculateBaseCurrency: async (userId: string, baseCurrency: string) => {
    set({ isLoading: true, error: null });

    try {
      const snapshots = await storage.getByUserId(userId);
      if (snapshots.length === 0) {
        set({ isLoading: false });
        return;
      }

      const currencies = new Set<string>();
      const basePairs = new Set<string>();

      for (const snapshot of snapshots) {
        if (snapshot.baseCurrency && snapshot.baseCurrency !== baseCurrency) {
          basePairs.add(snapshot.baseCurrency);
        }
        for (const group of snapshot.assets) {
          for (const item of group.items) {
            if (hasCurrency(item)) {
              currencies.add(item.currency);
            }
          }
        }
      }

      const rateCache = new Map<string, number>();
      const ensureRate = async (from: string, to: string) => {
        const key = `${from}->${to}`;
        if (rateCache.has(key)) {
          return rateCache.get(key) as number;
        }
      const rate = await fetchLatestRate(from, to, true);
        rateCache.set(key, rate);
        return rate;
      };

      for (const currency of currencies) {
        await ensureRate(currency, baseCurrency);
      }
      for (const fromBase of basePairs) {
        await ensureRate(fromBase, baseCurrency);
      }

      const updatedSnapshots: Snapshot[] = [];

      for (const snapshot of snapshots) {
        const baseConversionRate = snapshot.baseCurrency === baseCurrency
          ? 1
          : await ensureRate(snapshot.baseCurrency, baseCurrency);

        const updatedAssets: AssetGroup[] = snapshot.assets.map(group => ({
          ...group,
          items: group.items.map((item) => {
            if (hasCurrency(item)) {
              const rate = rateCache.get(`${item.currency}->${baseCurrency}`) ?? baseConversionRate;
              return recalcItemValue(item, rate, baseConversionRate);
            }
            return recalcItemValue(item, baseConversionRate, baseConversionRate);
          }),
        }));

        const fixed = fixSnapshot({
          ...snapshot,
          baseCurrency,
          assets: updatedAssets,
          updatedAt: Date.now(),
        });

        await storage.upsert(fixed);
        updatedSnapshots.push(fixed);
      }

      const sorted = updatedSnapshots.sort((a, b) => b.timestamp - a.timestamp);
      set({
        snapshots: sorted,
        currentSnapshot: sorted[0] || null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to recalculate snapshots',
        isLoading: false,
      });
      throw error;
    }
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },

  // 重置状态
  reset: () => {
    set({
      snapshots: [],
      currentSnapshot: null,
      isLoading: false,
      error: null,
      page: 0,
      total: 0,
      hasMore: false,
    });
  },
}));
