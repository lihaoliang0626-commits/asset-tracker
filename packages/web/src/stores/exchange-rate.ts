import { create } from 'zustand';
import { ExchangeRate, ExchangeRateTable } from '@asset-tracker/shared';
import { getExchangeRateStorage } from '@asset-tracker/shared';

/**
 * 汇率状态接口
 */
interface ExchangeRateState {
  // 状态
  rates: ExchangeRate[];
  rateTable: ExchangeRateTable | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadRates: () => Promise<void>;
  loadRateTable: (baseCurrency: string) => Promise<void>;
  getRate: (fromCurrency: string, toCurrency: string) => Promise<ExchangeRate | null>;
  saveRate: (rate: Omit<ExchangeRate, 'id'>) => Promise<void>;
  saveRates: (rates: Omit<ExchangeRate, 'id'>[]) => Promise<void>;
  deleteOutdated: () => Promise<void>;
  isRateUpToDate: (fromCurrency: string, toCurrency: string, maxAge?: number) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

const storage = getExchangeRateStorage();

/**
 * 汇率状态 Store
 */
export const useExchangeRateStore = create<ExchangeRateState>((set, get) => ({
  // 初始状态
  rates: [],
  rateTable: null,
  isLoading: false,
  error: null,

  // 加载所有汇率
  loadRates: async () => {
    set({ isLoading: true, error: null });

    try {
      const rates = await storage.getAllRates();
      set({ rates, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load exchange rates',
        isLoading: false,
      });
    }
  },

  // 加载汇率表
  loadRateTable: async (baseCurrency: string) => {
    set({ isLoading: true, error: null });

    try {
      const rateTable = await storage.getRateTable(baseCurrency);
      set({ rateTable, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load rate table',
        isLoading: false,
      });
    }
  },

  // 获取单个汇率
  getRate: async (fromCurrency: string, toCurrency: string) => {
    try {
      return await storage.getRate(fromCurrency, toCurrency);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get exchange rate',
      });
      return null;
    }
  },

  // 保存单个汇率
  saveRate: async (rate: Omit<ExchangeRate, 'id'>) => {
    set({ isLoading: true, error: null });

    try {
      const saved = await storage.save(rate);

      set(state => ({
        rates: [...state.rates.filter(r => !(r.fromCurrency === saved.fromCurrency && r.toCurrency === saved.toCurrency)), saved],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save exchange rate',
        isLoading: false,
      });
      throw error;
    }
  },

  // 批量保存汇率
  saveRates: async (rates: Omit<ExchangeRate, 'id'>[]) => {
    set({ isLoading: true, error: null });

    try {
      const saved = await storage.saveMany(rates);

      set(state => {
        // 移除旧的同货币对汇率
        const filtered = state.rates.filter(existing =>
          !saved.some(
            s => s.fromCurrency === existing.fromCurrency && s.toCurrency === existing.toCurrency
          )
        );

        return {
          rates: [...filtered, ...saved],
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save exchange rates',
        isLoading: false,
      });
      throw error;
    }
  },

  // 删除过期汇率
  deleteOutdated: async () => {
    set({ isLoading: true, error: null });

    try {
      await storage.deleteOutdated();
      await get().loadRates();
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete outdated rates',
        isLoading: false,
      });
      throw error;
    }
  },

  // 检查汇率是否最新
  isRateUpToDate: async (fromCurrency: string, toCurrency: string, maxAge?: number) => {
    try {
      return await storage.isUpToDate(fromCurrency, toCurrency, maxAge);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to check rate status',
      });
      return false;
    }
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },

  // 重置状态
  reset: () => {
    set({
      rates: [],
      rateTable: null,
      isLoading: false,
      error: null,
    });
  },
}));
