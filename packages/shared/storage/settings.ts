import {
  UserSettings,
  AppPreferences,
  DEFAULT_USER_SETTINGS,
  DEFAULT_APP_PREFERENCES,
  AssetAllocationTarget,
} from '../types';
import { getSupabaseStorageClient } from './supabase';

type SettingsRow = {
  user_id: string;
  base_currency: string;
  exchange_rate_mode: 'auto' | 'manual';
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US';
  enable_ai_analysis: boolean;
  data_backup_enabled: boolean;
  last_backup_date: number | null;
  enabled_asset_types: unknown;
  advanced_categories: unknown;
  allocation_target: unknown;
  created_at: number;
  updated_at: number;
};

function fromRow(row: SettingsRow): UserSettings {
  return {
    userId: row.user_id,
    baseCurrency: row.base_currency as UserSettings['baseCurrency'],
    exchangeRateMode: row.exchange_rate_mode,
    theme: row.theme,
    language: row.language,
    enableAIAnalysis: row.enable_ai_analysis,
    dataBackupEnabled: row.data_backup_enabled,
    lastBackupDate: row.last_backup_date || undefined,
    enabledAssetTypes: row.enabled_asset_types as UserSettings['enabledAssetTypes'],
    advancedCategories: row.advanced_categories as UserSettings['advancedCategories'],
    allocationTarget: (row.allocation_target as UserSettings['allocationTarget']) || DEFAULT_USER_SETTINGS.allocationTarget,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(settings: UserSettings): SettingsRow {
  return {
    user_id: settings.userId,
    base_currency: settings.baseCurrency,
    exchange_rate_mode: settings.exchangeRateMode,
    theme: settings.theme,
    language: settings.language,
    enable_ai_analysis: settings.enableAIAnalysis,
    data_backup_enabled: settings.dataBackupEnabled,
    last_backup_date: settings.lastBackupDate || null,
    enabled_asset_types: settings.enabledAssetTypes,
    advanced_categories: settings.advancedCategories,
    allocation_target: settings.allocationTarget || null,
    created_at: settings.createdAt,
    updated_at: settings.updatedAt,
  };
}

export class SettingsStorage {
  async get(userId: string): Promise<UserSettings> {
    const { data, error } = await getSupabaseStorageClient()
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ? fromRow(data as SettingsRow) : this.createDefault(userId);
  }

  private async createDefault(userId: string): Promise<UserSettings> {
    const now = Date.now();
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await getSupabaseStorageClient()
      .from('settings')
      .upsert(toRow(settings))
      .select()
      .single();

    if (error) throw error;
    return fromRow(data as SettingsRow);
  }

  async update(
    userId: string,
    updates: Partial<Omit<UserSettings, 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<UserSettings> {
    const existing = await this.get(userId);
    const updated: UserSettings = {
      ...existing,
      ...updates,
      userId,
      updatedAt: Date.now(),
    };

    const { data, error } = await getSupabaseStorageClient()
      .from('settings')
      .upsert(toRow(updated))
      .select()
      .single();

    if (error) throw error;
    return fromRow(data as SettingsRow);
  }

  async updateBaseCurrency(userId: string, baseCurrency: string): Promise<UserSettings> {
    return this.update(userId, { baseCurrency: baseCurrency as UserSettings['baseCurrency'] });
  }

  async updateExchangeRateMode(userId: string, mode: 'auto' | 'manual'): Promise<UserSettings> {
    return this.update(userId, { exchangeRateMode: mode });
  }

  async updateTheme(userId: string, theme: 'light' | 'dark' | 'system'): Promise<UserSettings> {
    return this.update(userId, { theme });
  }

  async updateLanguage(userId: string, language: 'zh-CN' | 'en-US'): Promise<UserSettings> {
    return this.update(userId, { language });
  }

  async toggleAIAnalysis(userId: string, enabled: boolean): Promise<UserSettings> {
    return this.update(userId, { enableAIAnalysis: enabled });
  }

  async toggleDataBackup(userId: string, enabled: boolean): Promise<UserSettings> {
    return this.update(userId, {
      dataBackupEnabled: enabled,
      lastBackupDate: enabled ? Date.now() : undefined,
    });
  }

  async toggleAssetType(userId: string, assetType: string, enabled: boolean): Promise<UserSettings> {
    const existing = await this.get(userId);
    const enabledTypes = [...existing.enabledAssetTypes];
    const typedAsset = assetType as UserSettings['enabledAssetTypes'][number];

    if (enabled && !enabledTypes.includes(typedAsset)) {
      enabledTypes.push(typedAsset);
    } else if (!enabled) {
      const index = enabledTypes.indexOf(typedAsset);
      if (index > -1) enabledTypes.splice(index, 1);
    }

    return this.update(userId, { enabledAssetTypes: enabledTypes });
  }

  async updateAllocationTarget(userId: string, target: AssetAllocationTarget): Promise<UserSettings> {
    return this.update(userId, { allocationTarget: target });
  }

  async addAdvancedCategory(userId: string, category: string): Promise<UserSettings> {
    const existing = await this.get(userId);
    const categories = [...existing.advancedCategories];
    if (!categories.includes(category)) categories.push(category);
    return this.update(userId, { advancedCategories: categories });
  }

  async removeAdvancedCategory(userId: string, category: string): Promise<UserSettings> {
    const existing = await this.get(userId);
    return this.update(userId, {
      advancedCategories: existing.advancedCategories.filter(c => c !== category),
    });
  }

  async reset(userId: string): Promise<UserSettings> {
    const existing = await this.get(userId);
    const resetSettings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      userId,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };

    const { data, error } = await getSupabaseStorageClient()
      .from('settings')
      .upsert(toRow(resetSettings))
      .select()
      .single();

    if (error) throw error;
    return fromRow(data as SettingsRow);
  }

  async delete(userId: string): Promise<void> {
    const { error } = await getSupabaseStorageClient()
      .from('settings')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }

  async export(userId: string): Promise<UserSettings> {
    return this.get(userId);
  }

  async import(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    const existing = await this.get(userId);
    const { userId: _ignoredUserId, createdAt: _ignoredCreatedAt, updatedAt: _ignoredUpdatedAt, ...allowedSettings } = settings;
    return this.update(userId, {
      ...existing,
      ...allowedSettings,
    });
  }
}

export class PreferencesStorage {
  get(): AppPreferences {
    return { ...DEFAULT_APP_PREFERENCES };
  }

  update(updates: Partial<AppPreferences>): AppPreferences {
    return { ...DEFAULT_APP_PREFERENCES, ...updates };
  }

  reset(): AppPreferences {
    return { ...DEFAULT_APP_PREFERENCES };
  }
}

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
