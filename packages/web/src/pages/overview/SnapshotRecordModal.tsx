import React, { useEffect, useState } from 'react';
import { Modal, Button, Input, Select, Card } from '../../components/base';
import { useSnapshotStore, useSettingsStore, useExchangeRateStore } from '../../stores';
import {
  AssetGroup,
  AssetType,
  CashAsset,
  BankAsset,
  SecuritiesAsset,
  CryptoAsset,
  PaymentAsset,
  SecurityType,
} from '@asset-tracker/shared';
import {
  CURRENCIES,
  CURRENCY_ALIASES,
  EXCHANGE_RATE_API,
  formatCurrency,
  formatDateKey,
  generateId,
} from '@asset-tracker/shared';

const USER_ID = 'default';

interface SnapshotRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 快照记录模态框
 */
export const SnapshotRecordModal: React.FC<SnapshotRecordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createSnapshot, currentSnapshot } = useSnapshotStore();
  const { settings } = useSettingsStore();
  const {
    getRate,
    saveRate,
    isRateUpToDate,
  } = useExchangeRateStore();

  const [recordMode, setRecordMode] = useState<'quick' | 'full'>('quick');
  const [note, setNote] = useState('');
  const [recordDate, setRecordDate] = useState<string>(formatDateKey(Date.now()));
  const [assets, setAssets] = useState<AssetGroup[]>(
    currentSnapshot?.assets || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const baseCurrency = settings?.baseCurrency || 'CNY';
  const exchangeRateMode = settings?.exchangeRateMode || 'auto';

  useEffect(() => {
    if (isOpen) {
      setRecordDate(formatDateKey(Date.now()));
    }
  }, [isOpen]);

  // 添加资产项
  const addAssetItem = (type: AssetType) => {
    const newItem = createEmptyAssetItem(type, baseCurrency);

    setAssets(prev => {
      const existingGroup = prev.find(g => g.type === type);

      if (existingGroup) {
        return prev.map(g =>
          g.type === type
            ? { ...g, items: [...g.items, newItem] }
            : g
        );
      } else {
        return [...prev, {
          type,
          totalValue: 0,
          percentage: 0,
          items: [newItem],
        }];
      }
    });
  };

  // 更新资产项
  const updateAssetItem = (groupType: AssetType, itemId: string, updates: any) => {
    setAssets(prev =>
      prev.map(group =>
        group.type === groupType
          ? {
              ...group,
              items: group.items.map(item =>
                item.id === itemId
                  ? normalizeAssetValue({ ...item, ...updates }, baseCurrency)
                  : item
              ),
            }
          : group
      )
    );
  };

  const fetchExchangeRate = async (fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const isFresh = await isRateUpToDate(fromCurrency, toCurrency);
    if (isFresh) {
      const cached = await getRate(fromCurrency, toCurrency);
      if (cached) {
        return cached.rate;
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

    await saveRate({
      fromCurrency,
      toCurrency,
      rate,
      timestamp: Date.now(),
      source: 'api',
    });

    return rate;
  };

  useEffect(() => {
    if (!isOpen || exchangeRateMode !== 'auto') {
      return;
    }

    const refreshRates = async () => {
      for (const group of assets) {
        for (const item of group.items) {
          if (!('currency' in item)) {
            continue;
          }
          const fromCurrency = item.currency;
          if (!fromCurrency || fromCurrency === baseCurrency) {
            continue;
          }
          try {
            const rate = await fetchExchangeRate(fromCurrency, baseCurrency);
            if (item.exchangeRate !== rate) {
              updateAssetItem(group.type, item.id, { exchangeRate: rate });
            }
          } catch (error) {
            console.error(error);
          }
        }
      }
    };

    refreshRates();
  }, [isOpen, exchangeRateMode, baseCurrency, assets]);

  // 删除资产项
  const deleteAssetItem = (groupType: AssetType, itemId: string) => {
    setAssets(prev =>
      prev.map(group =>
        group.type === groupType
          ? {
              ...group,
              items: group.items.filter(item => item.id !== itemId),
            }
          : group
      ).filter(group => group.items.length > 0)
    );
  };

  // 提交
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      await createSnapshot({
        userId: USER_ID,
        baseCurrency,
        assets,
        date: recordDate,
        note,
      });

      const today = formatDateKey(Date.now());
      if (recordDate && recordDate < today) {
        alert(`已保存快照（日期：${recordDate}）。可在分析页查看历史数据。`);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to create snapshot:', error);
      alert('创建快照失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="记录资产快照"
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            保存快照
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* 记录日期 */}
        <div>
          <h4 className="text-sm font-medium text-[#1F2933] mb-3">记录日期</h4>
          <Input
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
          />
        </div>

        {/* 步骤1: 选择记录方式 */}
        <div>
          <h4 className="text-sm font-medium text-[#1F2933] mb-3">选择记录方式</h4>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setRecordMode('quick')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                recordMode === 'quick'
                  ? 'border-[#1F3A8A] bg-[#1F3A8A]/5'
                  : 'border-[#E5E7EB] hover:border-[#1F3A8A]/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  recordMode === 'quick' ? 'border-[#1F3A8A]' : 'border-[#E5E7EB]'
                }`}>
                  {recordMode === 'quick' && (
                    <div className="w-3 h-3 rounded-full bg-[#1F3A8A]" />
                  )}
                </div>
                <span className="font-semibold text-[#1F2933]">快速记录</span>
              </div>
              <p className="text-sm text-[#6B7280]">继承上次数据</p>
            </button>

            <button
              onClick={() => setRecordMode('full')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                recordMode === 'full'
                  ? 'border-[#1F3A8A] bg-[#1F3A8A]/5'
                  : 'border-[#E5E7EB] hover:border-[#1F3A8A]/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  recordMode === 'full' ? 'border-[#1F3A8A]' : 'border-[#E5E7EB]'
                }`}>
                  {recordMode === 'full' && (
                    <div className="w-3 h-3 rounded-full bg-[#1F3A8A]" />
                  )}
                </div>
                <span className="font-semibold text-[#1F2933]">完整记录</span>
              </div>
              <p className="text-sm text-[#6B7280]">从头开始填写</p>
            </button>
          </div>
        </div>

        {/* 步骤2: 填写资产 */}
        <div>
          <h4 className="text-sm font-medium text-[#1F2933] mb-3">填写资产</h4>

          {/* 添加资产按钮 */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button size="sm" variant="secondary" onClick={() => addAssetItem('cash')}>
              + 现金
            </Button>
            <Button size="sm" variant="secondary" onClick={() => addAssetItem('bank')}>
              + 银行账户
            </Button>
            <Button size="sm" variant="secondary" onClick={() => addAssetItem('securities')}>
              + 证券
            </Button>
            <Button size="sm" variant="secondary" onClick={() => addAssetItem('crypto')}>
              + 加密资产
            </Button>
            <Button size="sm" variant="secondary" onClick={() => addAssetItem('payment')}>
              + 支付账户
            </Button>
          </div>

          {/* 资产列表 */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {assets.map(group =>
              group.items.map(item => (
                <Card key={item.id} className="relative">
                  <button
                    onClick={() => deleteAssetItem(group.type, item.id)}
                    className="absolute top-2 right-2 text-[#6B7280] hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <AssetItemForm
                    item={item}
                    baseCurrency={baseCurrency}
                    exchangeRateMode={exchangeRateMode}
                    onAutoRate={fetchExchangeRate}
                    onChange={(updates) => updateAssetItem(group.type, item.id, updates)}
                  />
                </Card>
              ))
            )}
          </div>

          {assets.length === 0 && (
            <div className="text-center py-8 text-[#6B7280]">
              <p>点击上方按钮添加资产</p>
            </div>
          )}
        </div>

        {/* 步骤3: 添加备注 */}
        <div>
          <h4 className="text-sm font-medium text-[#1F2933] mb-3">添加备注（可选）</h4>
          <Input
            placeholder="例如：工资到账、股票盈利等"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};

// 资产项表单组件
interface AssetItemFormProps {
  item: any;
  baseCurrency: string;
  exchangeRateMode: 'auto' | 'manual';
  onAutoRate: (fromCurrency: string, toCurrency: string) => Promise<number>;
  onChange: (updates: any) => void;
}

const CUSTOM_CURRENCY_VALUE = '__custom__';

type CurrencyCatalogItem = {
  code: string;
  name: string;
  nameZh?: string;
  aliases?: string[];
  names?: string[];
};

const AssetItemForm: React.FC<AssetItemFormProps> = ({
  item,
  baseCurrency,
  exchangeRateMode,
  onAutoRate,
  onChange,
}) => {
  const [currencyCatalog, setCurrencyCatalog] = useState<CurrencyCatalogItem[] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const currencyOptions = CURRENCIES.map(c => ({
    value: c.code,
    label: `${c.code} ${c.nameZh}`,
  }));
  const knownCurrencyCodes = CURRENCIES.map(c => c.code);
  const isCustomCurrency = item.currency && !knownCurrencyCodes.includes(item.currency);
  const [customCurrency, setCustomCurrency] = useState(isCustomCurrency ? item.currency : '');
  const [isCustomSelected, setIsCustomSelected] = useState(Boolean(isCustomCurrency));
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (isCustomCurrency) {
      setCustomCurrency(item.currency || '');
      setIsCustomSelected(true);
    } else if (item.currency && knownCurrencyCodes.includes(item.currency)) {
      setCustomCurrency('');
      setIsCustomSelected(false);
    }
  }, [item.currency]);

  const loadCurrencyCatalog = async () => {
    if (currencyCatalog || catalogLoading) {
      return;
    }
    setCatalogLoading(true);
    setCatalogError(null);

    const buildNames = (item: CurrencyCatalogItem) => {
      const names = new Set<string>();
      if (item.name) names.add(item.name);
      if (item.nameZh) names.add(item.nameZh);
      (item.aliases || []).forEach((alias) => names.add(alias));
      return Array.from(names);
    };

    const localCatalog: CurrencyCatalogItem[] = CURRENCIES.map(c => {
      const item: CurrencyCatalogItem = {
        code: c.code,
        name: c.name,
        nameZh: c.nameZh,
        aliases: CURRENCY_ALIASES[c.code] || [],
      };
      return { ...item, names: buildNames(item) };
    });

    try {
      const response = await fetch(`${EXCHANGE_RATE_API.exchangeRateHost}/symbols`);
      if (!response.ok) {
        throw new Error('Failed to fetch currency symbols');
      }
      const data = await response.json();
      const symbols = data?.symbols || {};
      const locales = typeof navigator !== 'undefined'
        ? navigator.languages
        : ['en-US', 'zh-CN'];
      const displayNames = locales
        .map((locale) => {
          try {
            return new Intl.DisplayNames([locale], { type: 'currency' });
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Intl.DisplayNames[];

      const remoteCatalog: CurrencyCatalogItem[] = Object.keys(symbols).map((code) => {
        const description = symbols[code]?.description || code;
        const localizedNames = displayNames
          .map((dn) => dn.of(code))
          .filter((name): name is string => Boolean(name));
        const item: CurrencyCatalogItem = {
          code,
          name: description,
          names: Array.from(new Set([description, ...localizedNames])),
        };
        return item;
      });

      const merged = new Map<string, CurrencyCatalogItem>();
      for (const item of [...remoteCatalog, ...localCatalog]) {
        const existing = merged.get(item.code);
        merged.set(item.code, {
          ...item,
          nameZh: existing?.nameZh || item.nameZh,
          aliases: existing?.aliases || item.aliases,
          name: existing?.name || item.name,
          names: Array.from(new Set([...(existing?.names || []), ...(item.names || [])])),
        });
      }

      setCurrencyCatalog(Array.from(merged.values()));
    } catch (error) {
      console.error(error);
      setCatalogError('获取币种列表失败');
      setCurrencyCatalog(localCatalog);
    } finally {
      setCatalogLoading(false);
    }
  };

  const resolveCurrencyCode = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) {
      return '';
    }
    if (trimmed.length < 2) {
      return trimmed;
    }
    const upper = trimmed.toUpperCase();
    const matchedByCode = CURRENCIES.find(c => c.code === upper);
    if (matchedByCode) {
      return matchedByCode.code;
    }
    const lower = trimmed.toLowerCase();
    const catalog = currencyCatalog ?? CURRENCIES.map(c => ({
      code: c.code,
      name: c.name,
      nameZh: c.nameZh,
      aliases: CURRENCY_ALIASES[c.code] || [],
      names: [c.name, c.nameZh, ...(CURRENCY_ALIASES[c.code] || [])].filter(Boolean) as string[],
    }));

    const matchedExact = catalog.find((c) =>
      c.code === upper
      || c.nameZh === trimmed
      || c.name === trimmed
      || (c.names || []).some(name => name === trimmed)
    );
    if (matchedExact) {
      return matchedExact.code;
    }

    const aliasMatch = catalog.find(entry =>
      (entry.aliases || []).some(alias => trimmed.includes(alias))
    );
    if (aliasMatch) {
      return aliasMatch.code;
    }

    const fuzzyMatches = catalog.filter((c) => {
      const names = c.names || [c.name, c.nameZh].filter(Boolean) as string[];
      return names.some((name) => {
        const lowerName = name.toLowerCase();
        return lowerName.includes(lower) || lower.includes(lowerName);
      });
    });
    if (fuzzyMatches.length > 0) {
      const best = fuzzyMatches.sort((a, b) => (a.nameZh || a.name).length - (b.nameZh || b.name).length)[0];
      return best.code;
    }

    return upper;
  };

  const handleCurrencyChange = async (currency: string) => {
    if (currency === CUSTOM_CURRENCY_VALUE) {
      setIsCustomSelected(true);
      onChange({ currency: customCurrency || '' });
      return;
    }
    setIsCustomSelected(false);

    try {
      if (exchangeRateMode === 'auto') {
        const rate = await onAutoRate(currency, baseCurrency);
        onChange({ currency, exchangeRate: rate });
      } else {
        onChange({ currency });
      }
    } catch (error) {
      console.error(error);
      onChange({ currency });
      alert('获取汇率失败，请稍后重试');
    }
  };

  const applyResolvedCurrency = async (rawValue: string) => {
    const nextCurrency = resolveCurrencyCode(rawValue);
    onChange({ currency: nextCurrency });

    if (
      exchangeRateMode === 'auto'
      && nextCurrency.length >= 3
      && nextCurrency !== baseCurrency
    ) {
      try {
        const rate = await onAutoRate(nextCurrency, baseCurrency);
        onChange({ exchangeRate: rate });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleCustomCurrencyChange = (value: string) => {
    setCustomCurrency(value);
    if (!isComposing) {
      void applyResolvedCurrency(value);
    }
  };

  const getSuggestions = (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return [];
    }
    const lower = trimmed.toLowerCase();
    const catalog = currencyCatalog ?? [];
    const scored = catalog.map((item) => {
      let score = 0;
      if (item.code === trimmed.toUpperCase()) score += 100;
      if (item.code.startsWith(trimmed.toUpperCase())) score += 50;
      if (item.nameZh && item.nameZh.includes(trimmed)) score += 40;
      if (item.name.toLowerCase().includes(lower)) score += 30;
      if ((item.aliases || []).some(alias => alias.includes(trimmed))) score += 35;
      if ((item.names || []).some(name => name.toLowerCase().includes(lower))) score += 25;
      return { item, score };
    }).filter(entry => entry.score > 0);

    return scored.sort((a, b) => b.score - a.score).slice(0, 6).map(entry => entry.item);
  };

  const renderBaseConversion = (valueInBase?: number) => {
    if (valueInBase === undefined) {
      return null;
    }
    return (
      <div className="text-xs text-muted-foreground tabular-nums">
        ≈ {formatCurrency(valueInBase, baseCurrency)}
      </div>
    );
  };

  if (item.type === 'cash') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="币种"
          value={isCustomSelected ? CUSTOM_CURRENCY_VALUE : item.currency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          options={[...currencyOptions, { value: CUSTOM_CURRENCY_VALUE, label: '自定义' }]}
        />
        {isCustomSelected && (
          <Input
            label="自定义币种"
            value={customCurrency}
            onChange={(e) => handleCustomCurrencyChange(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              void applyResolvedCurrency(e.currentTarget.value);
            }}
            onBlur={(e) => {
              if (!isComposing) {
                void applyResolvedCurrency(e.currentTarget.value);
              }
            }}
            onFocus={() => {
              void loadCurrencyCatalog();
            }}
            placeholder="例如：人民币 / CNY"
          />
        )}
        {isCustomSelected && (
          <div className="col-span-2 space-y-2">
            {catalogLoading && (
              <div className="text-xs text-muted-foreground">正在加载币种列表…</div>
            )}
            {catalogError && (
              <div className="text-xs text-destructive">{catalogError}</div>
            )}
            {!catalogLoading && currencyCatalog && customCurrency.trim().length >= 2 && (
              <div className="flex flex-wrap gap-2">
                {getSuggestions(customCurrency).map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    className="px-2.5 py-1 text-xs rounded-md border border-border hover:bg-accent/40 transition-colors"
                    onClick={() => {
                      setCustomCurrency(item.nameZh || item.name);
                      onChange({ currency: item.code });
                      void applyResolvedCurrency(item.code);
                    }}
                  >
                    {item.code} · {item.nameZh || item.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <Input
          label="金额"
          type="text"
          inputMode="decimal"
          value={item.amount === 0 ? '' : String(item.amount)}
          onChange={(e) => {
            const value = e.target.value;
            onChange({ amount: value === '' ? 0 : Number(value) });
          }}
          placeholder="0"
        />
        <Input
          label={`汇率 (${item.currency} → ${baseCurrency})`}
          type="number"
          value={item.exchangeRate}
          onChange={(e) => onChange({ exchangeRate: Number(e.target.value) })}
          disabled={exchangeRateMode === 'auto'}
          placeholder="1"
        />
        <div className="flex flex-col justify-end">
          {renderBaseConversion(item.valueInBase)}
        </div>
      </div>
    );
  }

  if (item.type === 'bank') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="银行名称"
          value={item.bankName}
          onChange={(e) => onChange({ bankName: e.target.value })}
          placeholder="DBS"
        />
        <Select
          label="账户类型"
          value={item.accountType}
          onChange={(e) => onChange({ accountType: e.target.value })}
          options={[
            { value: 'current', label: '活期' },
            { value: 'fixed', label: '定期' },
          ]}
        />
        <Select
          label="币种"
          value={isCustomSelected ? CUSTOM_CURRENCY_VALUE : item.currency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          options={[...currencyOptions, { value: CUSTOM_CURRENCY_VALUE, label: '自定义' }]}
        />
        {isCustomSelected && (
          <Input
            label="自定义币种"
            value={customCurrency}
            onChange={(e) => handleCustomCurrencyChange(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              void applyResolvedCurrency(e.currentTarget.value);
            }}
            onBlur={(e) => {
              if (!isComposing) {
                void applyResolvedCurrency(e.currentTarget.value);
              }
            }}
            onFocus={() => {
              void loadCurrencyCatalog();
            }}
            placeholder="例如：CHF"
          />
        )}
        {isCustomSelected && (
          <div className="col-span-2 space-y-2">
            {catalogLoading && (
              <div className="text-xs text-muted-foreground">正在加载币种列表…</div>
            )}
            {catalogError && (
              <div className="text-xs text-destructive">{catalogError}</div>
            )}
            {!catalogLoading && currencyCatalog && customCurrency.trim().length >= 2 && (
              <div className="flex flex-wrap gap-2">
                {getSuggestions(customCurrency).map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    className="px-2.5 py-1 text-xs rounded-md border border-border hover:bg-accent/40 transition-colors"
                    onClick={() => {
                      setCustomCurrency(item.nameZh || item.name);
                      onChange({ currency: item.code });
                      void applyResolvedCurrency(item.code);
                    }}
                  >
                    {item.code} · {item.nameZh || item.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <Input
          label="余额"
          type="text"
          inputMode="decimal"
          value={item.balance === 0 ? '' : String(item.balance)}
          onChange={(e) => {
            const value = e.target.value;
            onChange({ balance: value === '' ? 0 : Number(value) });
          }}
          placeholder="0"
        />
        <Input
          label={`汇率 (${item.currency} → ${baseCurrency})`}
          type="number"
          value={item.exchangeRate}
          onChange={(e) => onChange({ exchangeRate: Number(e.target.value) })}
          disabled={exchangeRateMode === 'auto'}
          placeholder="1"
        />
        <div className="flex flex-col justify-end">
          {renderBaseConversion(item.valueInBase)}
        </div>
      </div>
    );
  }

  if (item.type === 'securities') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="券商名称"
          value={item.brokerName}
          onChange={(e) => onChange({ brokerName: e.target.value })}
          placeholder="IBKR"
        />
        <Select
          label="证券类型"
          value={item.securityTypes?.[0] || 'stock'}
          onChange={(e) => onChange({ securityTypes: [e.target.value as SecurityType] })}
          options={[
            { value: 'stock', label: '股票' },
            { value: 'etf', label: 'ETF' },
            { value: 'fund', label: '基金' },
            { value: 'bond', label: '债券' },
          ]}
        />
        <Select
          label="币种"
          value={isCustomSelected ? CUSTOM_CURRENCY_VALUE : item.currency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          options={[...currencyOptions, { value: CUSTOM_CURRENCY_VALUE, label: '自定义' }]}
        />
        {isCustomSelected && (
          <Input
            label="自定义币种"
            value={customCurrency}
            onChange={(e) => handleCustomCurrencyChange(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              void applyResolvedCurrency(e.currentTarget.value);
            }}
            onBlur={(e) => {
              if (!isComposing) {
                void applyResolvedCurrency(e.currentTarget.value);
              }
            }}
            onFocus={() => {
              void loadCurrencyCatalog();
            }}
            placeholder="例如：CHF"
          />
        )}
        {isCustomSelected && (
          <div className="col-span-2 space-y-2">
            {catalogLoading && (
              <div className="text-xs text-muted-foreground">正在加载币种列表…</div>
            )}
            {catalogError && (
              <div className="text-xs text-destructive">{catalogError}</div>
            )}
            {!catalogLoading && currencyCatalog && customCurrency.trim().length >= 2 && (
              <div className="flex flex-wrap gap-2">
                {getSuggestions(customCurrency).map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    className="px-2.5 py-1 text-xs rounded-md border border-border hover:bg-accent/40 transition-colors"
                    onClick={() => {
                      setCustomCurrency(item.nameZh || item.name);
                      onChange({ currency: item.code });
                      void applyResolvedCurrency(item.code);
                    }}
                  >
                    {item.code} · {item.nameZh || item.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <Input
          label="市值"
          type="text"
          inputMode="decimal"
          value={item.marketValue === 0 ? '' : String(item.marketValue)}
          onChange={(e) => {
            const value = e.target.value;
            onChange({ marketValue: value === '' ? 0 : Number(value) });
          }}
          placeholder="0"
        />
        <Input
          label={`汇率 (${item.currency} → ${baseCurrency})`}
          type="number"
          value={item.exchangeRate}
          onChange={(e) => onChange({ exchangeRate: Number(e.target.value) })}
          disabled={exchangeRateMode === 'auto'}
          placeholder="1"
        />
        <div className="flex flex-col justify-end">
          {renderBaseConversion(item.valueInBase)}
        </div>
      </div>
    );
  }

  if (item.type === 'crypto') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="平台/钱包"
          value={item.platform}
          onChange={(e) => onChange({ platform: e.target.value })}
          placeholder="Binance"
        />
        <Input
          label="币种"
          value={item.cryptoType}
          onChange={(e) => onChange({ cryptoType: e.target.value })}
          placeholder="BTC"
        />
        <Input
          label="数量"
          type="text"
          inputMode="decimal"
          value={item.amount === 0 ? '' : String(item.amount)}
          onChange={(e) => {
            const value = e.target.value;
            onChange({ amount: value === '' ? 0 : Number(value) });
          }}
          placeholder="0"
        />
        <Input
          label="市值"
          type="text"
          inputMode="decimal"
          value={item.marketValue === 0 ? '' : String(item.marketValue)}
          onChange={(e) => {
            const value = e.target.value;
            onChange({ marketValue: value === '' ? 0 : Number(value) });
          }}
          placeholder="0"
        />
        <Input
          label="汇率"
          type="number"
          value={item.exchangeRate}
          onChange={(e) => onChange({ exchangeRate: Number(e.target.value) })}
          placeholder="1"
        />
      </div>
    );
  }

  if (item.type === 'payment') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="支付平台"
          value={item.paymentType}
          onChange={(e) => onChange({ paymentType: e.target.value })}
          options={[
            { value: 'wechat', label: '微信' },
            { value: 'alipay', label: '支付宝' },
            { value: 'paylah', label: 'PayLah' },
          ]}
        />
        <Select
          label="币种"
          value={isCustomSelected ? CUSTOM_CURRENCY_VALUE : item.currency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          options={[...currencyOptions, { value: CUSTOM_CURRENCY_VALUE, label: '自定义' }]}
        />
        {isCustomSelected && (
          <Input
            label="自定义币种"
            value={customCurrency}
            onChange={(e) => handleCustomCurrencyChange(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              void applyResolvedCurrency(e.currentTarget.value);
            }}
            onBlur={(e) => {
              if (!isComposing) {
                void applyResolvedCurrency(e.currentTarget.value);
              }
            }}
            onFocus={() => {
              void loadCurrencyCatalog();
            }}
            placeholder="例如：CHF"
          />
        )}
        {isCustomSelected && (
          <div className="col-span-2 space-y-2">
            {catalogLoading && (
              <div className="text-xs text-muted-foreground">正在加载币种列表…</div>
            )}
            {catalogError && (
              <div className="text-xs text-destructive">{catalogError}</div>
            )}
            {!catalogLoading && currencyCatalog && customCurrency.trim().length >= 2 && (
              <div className="flex flex-wrap gap-2">
                {getSuggestions(customCurrency).map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    className="px-2.5 py-1 text-xs rounded-md border border-border hover:bg-accent/40 transition-colors"
                    onClick={() => {
                      setCustomCurrency(item.nameZh || item.name);
                      onChange({ currency: item.code });
                      void applyResolvedCurrency(item.code);
                    }}
                  >
                    {item.code} · {item.nameZh || item.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <Input
          label="余额"
          type="text"
          inputMode="decimal"
          value={item.balance === 0 ? '' : String(item.balance)}
          onChange={(e) => {
            const value = e.target.value;
            onChange({ balance: value === '' ? 0 : Number(value) });
          }}
          placeholder="0"
        />
        <Input
          label={`汇率 (${item.currency} → ${baseCurrency})`}
          type="number"
          value={item.exchangeRate}
          onChange={(e) => onChange({ exchangeRate: Number(e.target.value) })}
          disabled={exchangeRateMode === 'auto'}
          placeholder="1"
        />
        <div className="flex flex-col justify-end">
          {renderBaseConversion(item.valueInBase)}
        </div>
      </div>
    );
  }

  return <div>暂不支持该资产类型</div>;
};

// 创建空资产项
function createEmptyAssetItem(type: AssetType, baseCurrency: string): any {
  const baseItem = {
    id: generateId('asset'),
    type,
    name: '',
    valueInBase: 0,
  };

  switch (type) {
    case 'cash':
      return {
        ...baseItem,
        currency: baseCurrency,
        amount: 0,
        exchangeRate: 1,
      } as CashAsset;

    case 'bank':
      return {
        ...baseItem,
        bankName: '',
        accountType: 'current',
        currency: baseCurrency,
        balance: 0,
        exchangeRate: 1,
      } as BankAsset;

    case 'securities':
      return {
        ...baseItem,
        brokerName: '',
        securityTypes: ['stock'],
        currency: baseCurrency,
        marketValue: 0,
        exchangeRate: 1,
      } as SecuritiesAsset;

    case 'crypto':
      return {
        ...baseItem,
        platform: '',
        cryptoType: '',
        amount: 0,
        marketValue: 0,
        exchangeRate: 1,
      } as CryptoAsset;

    case 'payment':
      return {
        ...baseItem,
        paymentType: 'wechat',
        balance: 0,
        currency: baseCurrency,
        exchangeRate: 1,
      } as PaymentAsset;

    default:
      return baseItem;
  }
}

function normalizeAssetValue(item: any, baseCurrency: string): any {
  if (item.type === 'cash') {
    const exchangeRate = item.currency === baseCurrency ? 1 : Number(item.exchangeRate) || 1;
    const amount = Number(item.amount) || 0;
    return { ...item, valueInBase: amount * exchangeRate };
  }

  if (item.type === 'bank') {
    const exchangeRate = item.currency === baseCurrency ? 1 : Number(item.exchangeRate) || 1;
    const balance = Number(item.balance) || 0;
    return { ...item, valueInBase: balance * exchangeRate };
  }

  if (item.type === 'securities') {
    const exchangeRate = item.currency === baseCurrency ? 1 : Number(item.exchangeRate) || 1;
    const marketValue = Number(item.marketValue) || 0;
    return { ...item, valueInBase: marketValue * exchangeRate };
  }

  if (item.type === 'crypto') {
    const marketValue = Number(item.marketValue) || 0;
    const exchangeRate = Number(item.exchangeRate) || 1;
    const amount = Number(item.amount) || 0;
    const valueInBase = marketValue > 0 ? marketValue : amount * exchangeRate;
    return { ...item, valueInBase };
  }

  if (item.type === 'payment') {
    const exchangeRate = item.currency === baseCurrency ? 1 : Number(item.exchangeRate) || 1;
    const balance = Number(item.balance) || 0;
    return { ...item, valueInBase: balance * exchangeRate };
  }

  return item;
}
