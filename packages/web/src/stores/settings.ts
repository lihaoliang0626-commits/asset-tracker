import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserSettings, AppPreferences, AssetType, AssetAllocationTarget } from '@asset-tracker/shared';
import { getSettingsStorage, getPreferencesStorage } from '@asset-tracker/shared';

/**
 * 设置状态接口
 */
interface SettingsState {
  // 用户设置
  settings: UserSettings | null;
  preferences: AppPreferences;

  // 加载状态
  isLoading: boolean;
  error: string | null;

  // Actions - 用户设置
  loadSettings: (userId: string) => Promise<void>;
  updateBaseCurrency: (userId: string, currency: string) => Promise<void>;
  updateExchangeRateMode: (userId: string, mode: 'auto' | 'manual') => Promise<void>;
  updateTheme: (userId: string, theme: 'light' | 'dark' | 'system') => Promise<void>;
  updateLanguage: (userId: string, language: 'zh-CN' | 'en-US') => Promise<void>;
  toggleAIAnalysis: (userId: string, enabled: boolean) => Promise<void>;
  toggleDataBackup: (userId: string, enabled: boolean) => Promise<void>;
  toggleAssetType: (userId: string, assetType: AssetType, enabled: boolean) => Promise<void>;
  addAdvancedCategory: (userId: string, category: string) => Promise<void>;
  removeAdvancedCategory: (userId: string, category: string) => Promise<void>;
  updateAllocationTarget: (userId: string, target: AssetAllocationTarget) => Promise<void>;
  resetSettings: (userId: string) => Promise<void>;

  // Actions - 应用偏好设置
  loadPreferences: () => void;
  updatePreference: <K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K]
  ) => void;
  resetPreferences: () => void;

  // Utility
  clearError: () => void;
}

const settingsStorage = getSettingsStorage();
const preferencesStorage = getPreferencesStorage();

/**
 * 设置状态 Store
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // 初始状态
      settings: null,
      preferences: preferencesStorage.get(),
      isLoading: false,
      error: null,

      // 加载用户设置
      loadSettings: async (userId: string) => {
        set({ isLoading: true, error: null });

        try {
          const settings = await settingsStorage.get(userId);
          set({ settings, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load settings',
            isLoading: false,
          });
        }
      },

      // 更新基准货币
      updateBaseCurrency: async (userId: string, currency: string) => {
        set({ isLoading: true, error: null });

        try {
          const settings = await settingsStorage.updateBaseCurrency(userId, currency);
          set({ settings, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update base currency',
            isLoading: false,
          });
          throw error;
        }
      },

      // 更新汇率模式
      updateExchangeRateMode: async (userId: string, mode: 'auto' | 'manual') => {
        set({ isLoading: true, error: null });

        try {
          const settings = await settingsStorage.updateExchangeRateMode(userId, mode);
          set({ settings, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update exchange rate mode',
            isLoading: false,
          });
          throw error;
        }
      },

      // 更新主题
      updateTheme: async (userId: string, theme: 'light' | 'dark' | 'system') => {
        set({ isLoading: true, error: null });

        try {
          const settings = await settingsStorage.updateTheme(userId, theme);
          set({ settings, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update theme',
            isLoading: false,
          });
          throw error;
        }
      },

      // 更新语言
      updateLanguage: async (userId: string, language: 'zh-CN' | 'en-US') => {
        set({ isLoading: true, error: null });

        try {
          const settings = await settingsStorage.updateLanguage(userId, language);
          set({ settings, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update language',
            isLoading: false,
          });
          throw error;
        }
      },

      // 切换 AI 分析
      toggleAIAnalysis: async (userId: string, enabled: boolean) => {
        set({ isLoading: true, error: null });

        try {
          const settings = await settingsStorage.toggleAIAnalysis(userId, enabled);
          set({ settings, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to toggle AI analysis',
            isLoading: false,
          });
          throw error;
        }
      },

      // 切换数据备份
      toggleDataBackup: async (userId: string, enabled: boolean) => {
        set({ isLoading: true, error: null });

        try {
          const settings = await settingsStorage.toggleDataBackup(userId, enabled);
          set({ settings, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to toggle data backup',
            isLoading: false,
          });
          throw error;
        }
      },

      // 切换资产类型
      toggleAssetType: async (userId: string, assetType: AssetType, enabled: boolean) => {
        set({ isLoading: true, error: null });

        try {
          const settings = await settingsStorage.toggleAssetType(userId, assetType, enabled);
          set({ settings, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to toggle asset type',
            isLoading: false,
          });
          throw error;
        }
      },

      // 添加高级分类
      addAdvancedCategory: async (userId: string, category: string) => {
        set({ isLoading: true, error: null });

        try {
          const settings = await settingsStorage.addAdvancedCategory(userId, category);
          set({ settings, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add advanced category',
            isLoading: false,
          });
          throw error;
        }
      },

      // 移除高级分类
      removeAdvancedCategory: async (userId: string, category: string) => {
        set({ isLoading: true, error: null });

        try {
          const settings = await settingsStorage.removeAdvancedCategory(userId, category);
          set({ settings, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to remove advanced category',
            isLoading: false,
          });
          throw error;
        }
      },

      // 更新资产配置目标
      updateAllocationTarget: async (userId: string, target: AssetAllocationTarget) => {
        set({ isLoading: true, error: null });

        try {
          const settings = await settingsStorage.updateAllocationTarget(userId, target);
          set({ settings, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update allocation target',
            isLoading: false,
          });
          throw error;
        }
      },

      // 重置设置
      resetSettings: async (userId: string) => {
        set({ isLoading: true, error: null });

        try {
          const settings = await settingsStorage.reset(userId);
          set({ settings, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to reset settings',
            isLoading: false,
          });
          throw error;
        }
      },

      // 加载应用偏好设置
      loadPreferences: () => {
        const preferences = preferencesStorage.get();
        set({ preferences });
      },

      // 更新应用偏好设置
      updatePreference: <K extends keyof AppPreferences>(
        key: K,
        value: AppPreferences[K]
      ) => {
        const currentPreferences = get().preferences;
        const updatedPreferences = preferencesStorage.update({ [key]: value });
        set({ preferences: updatedPreferences });
      },

      // 重置应用偏好设置
      resetPreferences: () => {
        const preferences = preferencesStorage.reset();
        set({ preferences });
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);
