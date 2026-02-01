import { UserSettings, AppPreferences, DEFAULT_USER_SETTINGS, DEFAULT_APP_PREFERENCES } from '../types';
import { DBStore, STORES } from './db';

/**
 * 设置数据管理器
 */
export class SettingsStorage {
  private store: DBStore<UserSettings>;

  constructor() {
    this.store = new DBStore<UserSettings>(STORES.SETTINGS);
  }

  /**
   * 获取用户设置
   */
  async get(userId: string): Promise<UserSettings> {
    const settings = await this.store.get(userId);

    if (!settings) {
      // 如果不存在，返回默认设置
      return this.createDefault(userId);
    }

    return settings;
  }

  /**
   * 创建默认设置
   */
  private async createDefault(userId: string): Promise<UserSettings> {
    const now = Date.now();
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    await this.store.put(settings);
    return settings;
  }

  /**
   * 更新用户设置
   */
  async update(
    userId: string,
    updates: Partial<Omit<UserSettings, 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<UserSettings> {
    const existing = await this.get(userId);

    const updated: UserSettings = {
      ...existing,
      ...updates,
      userId, // 确保不被覆盖
      updatedAt: Date.now(),
    };

    await this.store.put(updated);
    return updated;
  }

  /**
   * 更新基准货币
   */
  async updateBaseCurrency(userId: string, baseCurrency: string): Promise<UserSettings> {
    return this.update(userId, { baseCurrency: baseCurrency as any });
  }

  /**
   * 更新汇率模式
   */
  async updateExchangeRateMode(
    userId: string,
    mode: 'auto' | 'manual'
  ): Promise<UserSettings> {
    return this.update(userId, { exchangeRateMode: mode });
  }

  /**
   * 更新主题
   */
  async updateTheme(
    userId: string,
    theme: 'light' | 'dark' | 'system'
  ): Promise<UserSettings> {
    return this.update(userId, { theme });
  }

  /**
   * 更新语言
   */
  async updateLanguage(
    userId: string,
    language: 'zh-CN' | 'en-US'
  ): Promise<UserSettings> {
    return this.update(userId, { language });
  }

  /**
   * 启用/禁用 AI 分析
   */
  async toggleAIAnalysis(userId: string, enabled: boolean): Promise<UserSettings> {
    return this.update(userId, { enableAIAnalysis: enabled });
  }

  /**
   * 启用/禁用数据备份
   */
  async toggleDataBackup(userId: string, enabled: boolean): Promise<UserSettings> {
    const updates: Partial<UserSettings> = { dataBackupEnabled: enabled };

    if (enabled) {
      updates.lastBackupDate = Date.now();
    }

    return this.update(userId, updates);
  }

  /**
   * 更新最后备份时间
   */
  async updateLastBackupDate(userId: string): Promise<UserSettings> {
    return this.update(userId, { lastBackupDate: Date.now() });
  }

  /**
   * 启用/禁用资产类型
   */
  async toggleAssetType(
    userId: string,
    assetType: string,
    enabled: boolean
  ): Promise<UserSettings> {
    const existing = await this.get(userId);
    const enabledTypes = [...existing.enabledAssetTypes];

    if (enabled && !enabledTypes.includes(assetType as any)) {
      enabledTypes.push(assetType as any);
    } else if (!enabled) {
      const index = enabledTypes.indexOf(assetType as any);
      if (index > -1) {
        enabledTypes.splice(index, 1);
      }
    }

    return this.update(userId, { enabledAssetTypes: enabledTypes });
  }

  /**
   * 添加高级分类
   */
  async addAdvancedCategory(userId: string, category: string): Promise<UserSettings> {
    const existing = await this.get(userId);
    const categories = [...existing.advancedCategories];

    if (!categories.includes(category)) {
      categories.push(category);
    }

    return this.update(userId, { advancedCategories: categories });
  }

  /**
   * 移除高级分类
   */
  async removeAdvancedCategory(userId: string, category: string): Promise<UserSettings> {
    const existing = await this.get(userId);
    const categories = existing.advancedCategories.filter(c => c !== category);

    return this.update(userId, { advancedCategories: categories });
  }

  /**
   * 重置为默认设置
   */
  async reset(userId: string): Promise<UserSettings> {
    const existing = await this.get(userId);

    const resetSettings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      userId,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };

    await this.store.put(resetSettings);
    return resetSettings;
  }

  /**
   * 删除用户设置
   */
  async delete(userId: string): Promise<void> {
    await this.store.delete(userId);
  }

  /**
   * 导出设置
   */
  async export(userId: string): Promise<UserSettings> {
    return this.get(userId);
  }

  /**
   * 导入设置
   */
  async import(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    const existing = await this.get(userId);

    const imported: UserSettings = {
      ...existing,
      ...settings,
      userId, // 确保不被覆盖
      createdAt: existing.createdAt, // 保留原创建时间
      updatedAt: Date.now(),
    };

    await this.store.put(imported);
    return imported;
  }
}

/**
 * 应用偏好设置管理（存储在 localStorage）
 */
export class PreferencesStorage {
  private readonly STORAGE_KEY = 'app_preferences';

  /**
   * 获取偏好设置
   */
  get(): AppPreferences {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_APP_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }

    return { ...DEFAULT_APP_PREFERENCES };
  }

  /**
   * 更新偏好设置
   */
  update(updates: Partial<AppPreferences>): AppPreferences {
    const current = this.get();
    const updated = { ...current, ...updates };

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }

    return updated;
  }

  /**
   * 重置为默认设置
   */
  reset(): AppPreferences {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset preferences:', error);
    }

    return { ...DEFAULT_APP_PREFERENCES };
  }
}

// 单例实例
let settingsStorage: SettingsStorage | null = null;
let preferencesStorage: PreferencesStorage | null = null;

export function getSettingsStorage(): SettingsStorage {
  if (!settingsStorage) {
    settingsStorage = new SettingsStorage();
  }
  return settingsStorage;
}

export function getPreferencesStorage(): PreferencesStorage {
  if (!preferencesStorage) {
    preferencesStorage = new PreferencesStorage();
  }
  return preferencesStorage;
}
