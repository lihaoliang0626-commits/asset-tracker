import React, { useEffect, useState } from 'react';
import { Modal, Button, Input, Select, Card } from '../../components/base';
import { useSnapshotStore, useSettingsStore, useExchangeRateStore, useAuthStore } from '../../stores';
import {
  AssetGroup,
  AssetType,
  AssetItem,
  CashAsset,
  BankAsset,
  BankAccountType,
  SecuritiesAsset,
  CryptoAsset,
  PaymentAsset,
  PaymentPlatform,
  SecurityType,
  CURRENCIES,
  EXCHANGE_RATE_API,
  ExchangeRate,
  formatCurrency,
  formatDateKey,
  generateId,
  CurrencyInfo,
} from '@asset-tracker/shared';

type ExchangeRateHelpers = {
  getRate: (fromCurrency: string, toCurrency: string) => Promise<ExchangeRate | null>;
  isRateUpToDate: (fromCurrency: string, toCurrency: string, maxAge?: number) => Promise<boolean>;
  saveRate: (rate: Omit<ExchangeRate, 'id'>) => Promise<void>;
};

const fetchExchangeRateWithCache = async (
  fromCurrency: string,
  toCurrency: string,
  helpers: ExchangeRateHelpers
) => {
  console.log('[ExchangeRate] Fetching rate:', { fromCurrency, toCurrency });

  if (fromCurrency === toCurrency) {
    console.log('[ExchangeRate] Same currency, rate = 1');
    return 1;
  }

  const isFresh = await helpers.isRateUpToDate(fromCurrency, toCurrency);
  console.log('[ExchangeRate] Cache status:', { isFresh });

  if (isFresh) {
    const cached = await helpers.getRate(fromCurrency, toCurrency);
    if (cached) {
      console.log('[ExchangeRate] Using cached rate:', cached.rate);
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
    console.log('[ExchangeRate] Fetching from exchangerate.host...');
    rate = await fetchFromHost();
    console.log('[ExchangeRate] Got rate from host:', rate);
  } catch (error) {
    console.warn('[ExchangeRate] Host failed, trying frankfurter:', error);
    rate = await fetchFromFrankfurter();
    console.log('[ExchangeRate] Got rate from frankfurter:', rate);
  }

  await helpers.saveRate({
    fromCurrency,
    toCurrency,
    rate,
    timestamp: Date.now(),
    source: 'api',
  });

  console.log('[ExchangeRate] Saved rate to cache:', rate);
  return rate;
};

interface SnapshotRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AssetCategory = 'cash' | 'investment' | 'crypto';

/**
 * 快照记录模态框 - 方案C：展开式布局
 */
export const SnapshotRecordModal: React.FC<SnapshotRecordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const userId = useAuthStore(state => state.user?.id);
  const { createSnapshot, currentSnapshot, snapshots } = useSnapshotStore();
  const { settings } = useSettingsStore();
  const { getRate, isRateUpToDate, saveRate } = useExchangeRateStore();

  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);
  const [note, setNote] = useState('');
  const [recordDate, setRecordDate] = useState<string>(formatDateKey(Date.now()));
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const baseCurrency = settings?.baseCurrency || 'CNY';
  const exchangeRateMode = settings?.exchangeRateMode || 'auto';

  // 加载最新快照的资产
  useEffect(() => {
    if (isOpen) {
      setRecordDate(formatDateKey(Date.now()));
      setSelectedCategory(null);

      // 获取最新快照的资产
      if (snapshots.length > 0) {
        const latestSnapshot = snapshots[0]; // snapshots 已按时间降序排列
        const allAssets: AssetItem[] = [];

        // 展开所有资产组的资产项
        latestSnapshot.assets.forEach(group => {
          allAssets.push(...group.items);
        });

        console.log('[SnapshotModal] Loaded assets from latest snapshot:', allAssets.length);
        setAssets(allAssets);
      } else {
        console.log('[SnapshotModal] No previous snapshot, starting fresh');
        setAssets([]);
      }
    }
  }, [isOpen, snapshots]);

  // 添加资产项
  const addAssetItem = (item: AssetItem) => {
    setAssets([...assets, item]);
  };

  // 更新资产项
  const updateAssetItem = (id: string, updatedItem: AssetItem) => {
    setAssets(assets.map(item => item.id === id ? updatedItem : item));
  };

  // 删除资产项
  const deleteAssetItem = (id: string) => {
    setAssets(assets.filter(item => item.id !== id));
  };

  // 清空所有资产
  const clearAllAssets = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAssets = () => {
    setAssets([]);
    setShowClearConfirm(false);
  };

  const cancelClearAssets = () => {
    setShowClearConfirm(false);
  };

  // 保存快照
  const handleSubmit = async () => {
    if (!userId) {
      alert('请先登录');
      return;
    }

    if (assets.length === 0) {
      alert('请至少添加一个资产');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('[SnapshotModal] Updating exchange rates for all foreign currency assets...');

      // 批量更新所有外币资产的汇率
      const updatedAssets = await Promise.all(
        assets.map(async (item) => {
          // 获取资产的币种
          let currency: string | undefined;
          if ('currency' in item) {
            currency = item.currency;
          }

          // 如果是基准货币或没有币种，不需要更新汇率
          if (!currency || currency === baseCurrency) {
            return item;
          }

          // 如果是自动汇率模式，更新汇率
          if (exchangeRateMode === 'auto') {
            try {
              const rate = await fetchExchangeRateWithCache(currency, baseCurrency, {
                getRate,
                isRateUpToDate,
                saveRate,
              });

              console.log(`[SnapshotModal] Updated rate for ${currency}: ${rate}`);

              // 根据资产类型计算新的 valueInBase
              let valueInBase: number;
              if (item.type === 'cash') {
                valueInBase = (item as CashAsset).amount * rate;
              } else if (item.type === 'bank') {
                valueInBase = (item as BankAsset).balance * rate;
              } else if (item.type === 'payment') {
                valueInBase = (item as PaymentAsset).balance * rate;
              } else if (item.type === 'securities') {
                valueInBase = (item as SecuritiesAsset).marketValue * rate;
              } else {
                valueInBase = item.valueInBase;
              }

              return {
                ...item,
                exchangeRate: rate,
                valueInBase,
              };
            } catch (error) {
              console.error(`[SnapshotModal] Failed to update rate for ${currency}:`, error);
              // 如果更新失败，使用原有汇率
              return item;
            }
          }

          return item;
        })
      );

      console.log('[SnapshotModal] All exchange rates updated');

      // 按资产类型分组
      const groupedAssets: Map<AssetType, AssetItem[]> = new Map();
      updatedAssets.forEach(item => {
        const existing = groupedAssets.get(item.type) || [];
        groupedAssets.set(item.type, [...existing, item]);
      });

      // 构建AssetGroup数组
      const assetGroups: AssetGroup[] = Array.from(groupedAssets.entries()).map(([type, items]) => {
        const totalValue = items.reduce((sum, item) => sum + item.valueInBase, 0);
        return {
          type,
          totalValue,
          percentage: 0, // 会在createSnapshot中重新计算
          items,
        };
      });

      await createSnapshot({
        userId,
        baseCurrency,
        assets: assetGroups,
        date: recordDate,
        note,
      });

      onSuccess();
    } catch (error) {
      console.error('Failed to create snapshot:', error);
      alert('创建快照失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 计算已添加的资产总价值
  const totalValue = assets.reduce((sum, item) => sum + item.valueInBase, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="记录资产快照"
      headerAside={assets.length > 0 ? (
        <button
          onClick={clearAllAssets}
          className="text-xs text-text-tertiary hover:text-red-500 transition-colors"
        >
          清空
        </button>
      ) : null}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={assets.length === 0}>
            保存快照 {assets.length > 0 && `(${assets.length}项)`}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* 记录日期 */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            记录日期
          </label>
          <Input
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            lang="en-CA"
          />
        </div>

        {/* 资产大类选择 */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            选择资产类型
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedCategory(selectedCategory === 'cash' ? null : 'cash')}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${selectedCategory === 'cash'
                  ? 'border-accent-primary bg-accent-primary/5'
                  : 'border-light-3 hover:border-accent-primary/50 bg-white'
                }
              `}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">💵</div>
                <div className="text-sm font-medium text-text-primary">现金</div>
                <div className="text-xs text-text-tertiary mt-1">
                  {assets.filter(a => a.type === 'cash' || a.type === 'bank' || a.type === 'payment').length}项
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedCategory(selectedCategory === 'investment' ? null : 'investment')}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${selectedCategory === 'investment'
                  ? 'border-accent-primary bg-accent-primary/5'
                  : 'border-light-3 hover:border-accent-primary/50 bg-white'
                }
              `}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">📈</div>
                <div className="text-sm font-medium text-text-primary">投资资产</div>
                <div className="text-xs text-text-tertiary mt-1">
                  {assets.filter(a => a.type === 'securities').length}项
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedCategory(selectedCategory === 'crypto' ? null : 'crypto')}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${selectedCategory === 'crypto'
                  ? 'border-accent-primary bg-accent-primary/5'
                  : 'border-light-3 hover:border-accent-primary/50 bg-white'
                }
              `}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">₿</div>
                <div className="text-sm font-medium text-text-primary">数字资产</div>
                <div className="text-xs text-text-tertiary mt-1">
                  {assets.filter(a => a.type === 'crypto').length}项
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 展开的资产录入区域 */}
        {selectedCategory === 'cash' && (
          <CashCategoryPanel
            assets={assets}
            baseCurrency={baseCurrency}
            exchangeRateMode={exchangeRateMode}
            onAddAsset={addAssetItem}
            onUpdateAsset={updateAssetItem}
            onDeleteAsset={deleteAssetItem}
          />
        )}

        {selectedCategory === 'investment' && (
          <InvestmentCategoryPanel
            assets={assets}
            baseCurrency={baseCurrency}
            exchangeRateMode={exchangeRateMode}
            onAddAsset={addAssetItem}
            onUpdateAsset={updateAssetItem}
            onDeleteAsset={deleteAssetItem}
          />
        )}

        {selectedCategory === 'crypto' && (
          <CryptoCategoryPanel
            assets={assets}
            baseCurrency={baseCurrency}
            exchangeRateMode={exchangeRateMode}
            onAddAsset={addAssetItem}
            onUpdateAsset={updateAssetItem}
            onDeleteAsset={deleteAssetItem}
          />
        )}

        {/* 已添加资产汇总 */}
        {assets.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-secondary">
                已添加 {assets.length} 项资产
              </span>
              <span className="text-lg font-semibold text-text-primary">
                {formatCurrency(totalValue, baseCurrency)}
              </span>
            </div>
          </div>
        )}

        {/* 备注 */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            备注（可选）
          </label>
          <Input
            placeholder="例如：工资到账、股票盈利等"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <Modal
        isOpen={showClearConfirm}
        onClose={cancelClearAssets}
        title="确认清空"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={cancelClearAssets}>
              取消
            </Button>
            <Button variant="primary" onClick={confirmClearAssets}>
              清空
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          清空后将移除当前已添加的所有资产项，且无法恢复。
        </p>
      </Modal>
    </Modal>
  );
};

// ==================== 现金类资产面板 ====================
interface CategoryPanelProps {
  assets: AssetItem[];
  baseCurrency: string;
  exchangeRateMode: 'auto' | 'manual';
  onAddAsset: (item: AssetItem) => void;
  onUpdateAsset: (id: string, item: AssetItem) => void;
  onDeleteAsset: (id: string) => void;
}

const CashCategoryPanel: React.FC<CategoryPanelProps> = ({
  assets,
  baseCurrency,
  exchangeRateMode,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
}) => {
  return (
    <Card className="space-y-4">
      <h3 className="text-base font-semibold text-text-primary">💵 现金类资产</h3>

      {/* 实物现金/外币 */}
      <SubTypeSection
        title="💵 实物现金/外币"
        description="手头现金、外币"
        assets={assets.filter(a => a.type === 'cash')}
        onUpdate={onUpdateAsset}
        onDelete={onDeleteAsset}
        baseCurrency={baseCurrency}
        addForm={
          <CashForm
            baseCurrency={baseCurrency}
            exchangeRateMode={exchangeRateMode}
            onSubmit={(item) => onAddAsset(item)}
          />
        }
      />

      {/* 银行活期 */}
      <SubTypeSection
        title="🏦 银行活期"
        description="银行卡、储蓄账户"
        assets={assets.filter(a => a.type === 'bank')}
        onUpdate={onUpdateAsset}
        onDelete={onDeleteAsset}
        baseCurrency={baseCurrency}
        addForm={
          <BankForm
            baseCurrency={baseCurrency}
            exchangeRateMode={exchangeRateMode}
            onSubmit={(item) => onAddAsset(item)}
          />
        }
      />

      {/* 支付账户 */}
      <SubTypeSection
        title="💳 支付账户"
        description="微信/支付宝/PayLah"
        assets={assets.filter(a => a.type === 'payment')}
        onUpdate={onUpdateAsset}
        onDelete={onDeleteAsset}
        baseCurrency={baseCurrency}
        addForm={
          <PaymentForm
            baseCurrency={baseCurrency}
            exchangeRateMode={exchangeRateMode}
            onSubmit={(item) => onAddAsset(item)}
          />
        }
      />
    </Card>
  );
};

// ==================== 投资资产面板 ====================
const InvestmentCategoryPanel: React.FC<CategoryPanelProps> = ({
  assets,
  baseCurrency,
  exchangeRateMode,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
}) => {
  return (
    <Card className="space-y-4">
      <h3 className="text-base font-semibold text-text-primary">📈 投资资产</h3>

      {/* 股票 */}
      <SubTypeSection
        title="📊 股票"
        description="单只股票持仓"
        assets={assets.filter(a => a.type === 'securities' && (a as SecuritiesAsset).securityTypes?.includes('stock'))}
        onUpdate={onUpdateAsset}
        onDelete={onDeleteAsset}
        baseCurrency={baseCurrency}
        addForm={
          <SecuritiesForm
            baseCurrency={baseCurrency}
            exchangeRateMode={exchangeRateMode}
            securityType="stock"
            onSubmit={(item) => onAddAsset(item)}
          />
        }
      />

      {/* 基金/ETF */}
      <SubTypeSection
        title="📈 基金/ETF"
        description="公募基金、指数基金"
        assets={assets.filter(a => a.type === 'securities' && ((a as SecuritiesAsset).securityTypes?.includes('fund') || (a as SecuritiesAsset).securityTypes?.includes('etf')))}
        onUpdate={onUpdateAsset}
        onDelete={onDeleteAsset}
        baseCurrency={baseCurrency}
        addForm={
          <SecuritiesForm
            baseCurrency={baseCurrency}
            exchangeRateMode={exchangeRateMode}
            securityType="fund"
            onSubmit={(item) => onAddAsset(item)}
          />
        }
      />

      {/* 债券/理财 */}
      <SubTypeSection
        title="📉 债券/理财"
        description="债券、定期、低风险理财"
        assets={assets.filter(a => a.type === 'securities' && (a as SecuritiesAsset).securityTypes?.includes('bond'))}
        onUpdate={onUpdateAsset}
        onDelete={onDeleteAsset}
        baseCurrency={baseCurrency}
        addForm={
          <SecuritiesForm
            baseCurrency={baseCurrency}
            exchangeRateMode={exchangeRateMode}
            securityType="bond"
            onSubmit={(item) => onAddAsset(item)}
          />
        }
      />
    </Card>
  );
};

// ==================== 数字资产面板 ====================
const CryptoCategoryPanel: React.FC<CategoryPanelProps> = ({
  assets,
  baseCurrency,
  exchangeRateMode,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
}) => {
  return (
    <Card className="space-y-4">
      <h3 className="text-base font-semibold text-text-primary">₿ 数字资产</h3>

      <SubTypeSection
        title="₿ 加密货币"
        description="BTC/ETH/USDT等"
        assets={assets.filter(a => a.type === 'crypto')}
        onUpdate={onUpdateAsset}
        onDelete={onDeleteAsset}
        baseCurrency={baseCurrency}
        addForm={
          <CryptoForm
            baseCurrency={baseCurrency}
            exchangeRateMode={exchangeRateMode}
            onSubmit={(item) => onAddAsset(item)}
          />
        }
      />
    </Card>
  );
};

// ==================== 子类型区域组件 ====================
interface SubTypeSectionProps {
  title: string;
  description: string;
  assets: AssetItem[];
  onUpdate: (id: string, updatedAsset: AssetItem) => void;
  onDelete: (id: string) => void;
  addForm: React.ReactNode;
  baseCurrency: string;
}

const SubTypeSection: React.FC<SubTypeSectionProps> = ({
  title,
  description,
  assets,
  onUpdate,
  onDelete,
  addForm,
  baseCurrency,
}) => {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="border border-light-3 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-text-primary">{title}</h4>
          <p className="text-xs text-text-tertiary">{description}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-accent-primary hover:text-accent-primary/80 font-medium"
        >
          {showForm ? '− 收起' : '+ 添加'}
        </button>
      </div>

      {/* 添加表单 */}
      {showForm && (
        <div className="pt-3 border-t border-light-2">
          {addForm}
        </div>
      )}

      {/* 已添加列表 */}
      {assets.length > 0 && (
        <div className="space-y-2">
          {assets.map((asset) => (
            <AssetItemDisplay
              key={asset.id}
              asset={asset}
              baseCurrency={baseCurrency}
              onUpdate={(updatedAsset) => onUpdate(asset.id, updatedAsset)}
              onDelete={() => onDelete(asset.id)}
            />
          ))}
        </div>
      )}

      {assets.length === 0 && !showForm && (
        <div className="text-center py-4 text-xs text-text-tertiary">
          暂无记录，点击"+ 添加"开始录入
        </div>
      )}
    </div>
  );
};

// ==================== 资产项编辑组件 ====================
interface AssetItemDisplayProps {
  asset: AssetItem;
  baseCurrency: string;
  onUpdate: (updatedAsset: AssetItem) => void;
  onDelete: () => void;
}

const AssetItemDisplay: React.FC<AssetItemDisplayProps> = ({ asset, baseCurrency, onUpdate, onDelete }) => {
  const getAssetLabel = () => {
    switch (asset.type) {
      case 'cash':
        return `${(asset as CashAsset).currency} 现金`;
      case 'bank':
        return (asset as BankAsset).bankName || '银行账户';
      case 'payment':
        const paymentType = (asset as PaymentAsset).paymentType;
        return paymentType === 'alipay' ? '支付宝' : paymentType === 'wechat' ? '微信支付' : 'PayLah';
      case 'securities':
        return (asset as SecuritiesAsset).brokerName || '证券账户';
      case 'crypto':
        return `${(asset as CryptoAsset).cryptoType}`;
      default:
        return '资产';
    }
  };

  // 获取金额字段的值
  const getAmount = () => {
    switch (asset.type) {
      case 'cash':
        return (asset as CashAsset).amount;
      case 'bank':
        return (asset as BankAsset).balance;
      case 'payment':
        return (asset as PaymentAsset).balance;
      case 'securities':
        return (asset as SecuritiesAsset).marketValue;
      case 'crypto':
        return (asset as CryptoAsset).marketValue;
      default:
        return 0;
    }
  };

  // 更新金额
  const handleAmountChange = (newAmount: string) => {
    const amount = Number(newAmount);
    if (isNaN(amount)) return;

    const rate = asset.exchangeRate || 1;
    const valueInBase = amount * rate;

    let updatedAsset: AssetItem;

    switch (asset.type) {
      case 'cash':
        updatedAsset = { ...asset, amount, valueInBase } as CashAsset;
        break;
      case 'bank':
        updatedAsset = { ...asset, balance: amount, valueInBase } as BankAsset;
        break;
      case 'payment':
        updatedAsset = { ...asset, balance: amount, valueInBase } as PaymentAsset;
        break;
      case 'securities':
        updatedAsset = { ...asset, marketValue: amount, valueInBase } as SecuritiesAsset;
        break;
      case 'crypto':
        updatedAsset = { ...asset, marketValue: amount, valueInBase } as CryptoAsset;
        break;
      default:
        updatedAsset = asset;
    }

    onUpdate(updatedAsset);
  };

  // 更新账户名称
  const handleNameChange = (newName: string) => {
    let updatedAsset: AssetItem;

    switch (asset.type) {
      case 'bank':
        updatedAsset = { ...asset, bankName: newName } as BankAsset;
        break;
      case 'securities':
        updatedAsset = { ...asset, brokerName: newName } as SecuritiesAsset;
        break;
      case 'crypto':
        updatedAsset = { ...asset, platform: newName } as CryptoAsset;
        break;
      default:
        return;
    }

    onUpdate(updatedAsset);
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-light-1 rounded-md">
      <div className="flex-1 grid grid-cols-2 gap-2">
        {/* 左侧：账户名称（可编辑） */}
        {(asset.type === 'bank' || asset.type === 'securities' || asset.type === 'crypto') && (
          <input
            type="text"
            value={
              asset.type === 'bank'
                ? (asset as BankAsset).bankName
                : asset.type === 'securities'
                ? (asset as SecuritiesAsset).brokerName
                : (asset as CryptoAsset).platform
            }
            onChange={(e) => handleNameChange(e.target.value)}
            className="text-sm font-medium text-text-primary bg-transparent border-b border-transparent hover:border-light-3 focus:border-accent-primary focus:outline-none transition-colors"
            placeholder="账户名称"
          />
        )}
        {asset.type === 'cash' && (
          <p className="text-sm font-medium text-text-primary">{getAssetLabel()}</p>
        )}
        {asset.type === 'payment' && (
          <p className="text-sm font-medium text-text-primary">{getAssetLabel()}</p>
        )}

        {/* 右侧：金额（可编辑） */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={getAmount()}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="w-full text-sm text-text-primary bg-transparent border-b border-transparent hover:border-light-3 focus:border-accent-primary focus:outline-none transition-colors text-right"
            placeholder="0"
            step="0.01"
          />
          <span className="text-xs text-text-tertiary">
            {'currency' in asset ? asset.currency : baseCurrency}
          </span>
        </div>
      </div>

      {/* 基准货币价值 */}
      <div className="text-xs text-text-tertiary whitespace-nowrap">
        {formatCurrency(asset.valueInBase, baseCurrency)}
      </div>

      {/* 删除按钮 */}
      <button
        onClick={onDelete}
        className="text-text-tertiary hover:text-red-500 transition-colors p-1 flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// ==================== 各类型资产表单 ====================
interface AssetFormProps {
  baseCurrency: string;
  exchangeRateMode: 'auto' | 'manual';
  onSubmit: (item: AssetItem) => void;
}

// 现金表单
const CashForm: React.FC<AssetFormProps> = ({ baseCurrency, exchangeRateMode, onSubmit }) => {
  const [currency, setCurrency] = useState(baseCurrency);
  const [amount, setAmount] = useState('');
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const { getRate, isRateUpToDate, saveRate } = useExchangeRateStore();

  const handleSubmit = async () => {
    if (!amount) return;

    console.log('[CashForm] Submitting:', { currency, amount, baseCurrency, exchangeRateMode });

    let rate = 1;
    if (exchangeRateMode === 'auto' && currency !== baseCurrency) {
      setIsFetchingRate(true);
      try {
        rate = await fetchExchangeRateWithCache(currency, baseCurrency, { getRate, isRateUpToDate, saveRate });
        console.log('[CashForm] Got exchange rate:', rate);
      } catch (error) {
        console.error('[CashForm] Failed to fetch exchange rate:', error);
        alert(`无法获取汇率 ${currency} -> ${baseCurrency}，请检查网络连接或稍后重试`);
        setIsFetchingRate(false);
        return;
      } finally {
        setIsFetchingRate(false);
      }
    }

    const valueInBase = Number(amount) * rate;
    console.log('[CashForm] Calculated valueInBase:', { amount, rate, valueInBase });

    const item: CashAsset = {
      id: generateId('asset'),
      type: 'cash',
      name: '',
      currency,
      amount: Number(amount),
      exchangeRate: rate,
      valueInBase,
    };

    onSubmit(item);
    setAmount('');
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select
        label="币种"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        options={CURRENCIES.map((c: CurrencyInfo) => ({
          value: c.code,
          label: c.code,
        }))}
      />
      <Input
        label="金额"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0"
      />
      <div className="flex items-end">
        <Button size="sm" onClick={handleSubmit} disabled={!amount || isFetchingRate}>
          添加
        </Button>
      </div>
    </div>
  );
};

// 银行表单
const BankForm: React.FC<AssetFormProps> = ({ baseCurrency, exchangeRateMode, onSubmit }) => {
  const [bankName, setBankName] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [balance, setBalance] = useState('');
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const { getRate, isRateUpToDate, saveRate } = useExchangeRateStore();

  const handleSubmit = async () => {
    if (!bankName || !balance) return;

    let rate = 1;
    if (exchangeRateMode === 'auto' && currency !== baseCurrency) {
      setIsFetchingRate(true);
      try {
        rate = await fetchExchangeRateWithCache(currency, baseCurrency, { getRate, isRateUpToDate, saveRate });
      } catch (error) {
        console.error('[BankForm] Failed to fetch exchange rate:', error);
        alert(`无法获取汇率 ${currency} -> ${baseCurrency}，请检查网络连接或稍后重试`);
        setIsFetchingRate(false);
        return;
      } finally {
        setIsFetchingRate(false);
      }
    }

    const item: BankAsset = {
      id: generateId('asset'),
      type: 'bank',
      name: '',
      bankName,
      accountType: 'current',
      currency,
      balance: Number(balance),
      exchangeRate: rate,
      valueInBase: Number(balance) * rate,
    };

    onSubmit(item);
    setBankName('');
    setBalance('');
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      <Input
        label="银行名称"
        value={bankName}
        onChange={(e) => setBankName(e.target.value)}
        placeholder="招商银行"
      />
      <Select
        label="币种"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        options={CURRENCIES.map((c: CurrencyInfo) => ({
          value: c.code,
          label: c.code,
        }))}
      />
      <Input
        label="余额"
        type="number"
        value={balance}
        onChange={(e) => setBalance(e.target.value)}
        placeholder="0"
      />
      <div className="flex items-end">
        <Button size="sm" onClick={handleSubmit} disabled={!bankName || !balance || isFetchingRate}>
          添加
        </Button>
      </div>
    </div>
  );
};

// 支付账户表单
const PaymentForm: React.FC<AssetFormProps> = ({ baseCurrency, exchangeRateMode, onSubmit }) => {
  const [paymentType, setPaymentType] = useState<PaymentPlatform>('alipay');
  const [currency, setCurrency] = useState(baseCurrency);
  const [balance, setBalance] = useState('');
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const { getRate, isRateUpToDate, saveRate } = useExchangeRateStore();

  const handleSubmit = async () => {
    if (!balance) return;

    let rate = 1;
    if (exchangeRateMode === 'auto' && currency !== baseCurrency) {
      setIsFetchingRate(true);
      try {
        rate = await fetchExchangeRateWithCache(currency, baseCurrency, { getRate, isRateUpToDate, saveRate });
      } catch (error) {
        console.error('[PaymentForm] Failed to fetch exchange rate:', error);
        alert(`无法获取汇率 ${currency} -> ${baseCurrency}，请检查网络连接或稍后重试`);
        setIsFetchingRate(false);
        return;
      } finally {
        setIsFetchingRate(false);
      }
    }

    const item: PaymentAsset = {
      id: generateId('asset'),
      type: 'payment',
      name: '',
      paymentType,
      currency,
      balance: Number(balance),
      exchangeRate: rate,
      valueInBase: Number(balance) * rate,
    };

    onSubmit(item);
    setBalance('');
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      <Select
        label="平台"
        value={paymentType}
        onChange={(e) => setPaymentType(e.target.value as PaymentPlatform)}
        options={[
          { value: 'alipay', label: '支付宝' },
          { value: 'wechat', label: '微信' },
          { value: 'paylah', label: 'PayLah' },
        ]}
      />
      <Select
        label="币种"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        options={CURRENCIES.map((c: CurrencyInfo) => ({
          value: c.code,
          label: c.code,
        }))}
      />
      <Input
        label="余额"
        type="number"
        value={balance}
        onChange={(e) => setBalance(e.target.value)}
        placeholder="0"
      />
      <div className="flex items-end">
        <Button size="sm" onClick={handleSubmit} disabled={!balance || isFetchingRate}>
          添加
        </Button>
      </div>
    </div>
  );
};

// 证券表单
interface SecuritiesFormProps extends AssetFormProps {
  securityType: SecurityType;
}

const SecuritiesForm: React.FC<SecuritiesFormProps> = ({ baseCurrency, exchangeRateMode, securityType, onSubmit }) => {
  const [brokerName, setBrokerName] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [marketValue, setMarketValue] = useState('');
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const { getRate, isRateUpToDate, saveRate } = useExchangeRateStore();

  const handleSubmit = async () => {
    if (!brokerName || !marketValue) return;

    let rate = 1;
    if (exchangeRateMode === 'auto' && currency !== baseCurrency) {
      setIsFetchingRate(true);
      try {
        rate = await fetchExchangeRateWithCache(currency, baseCurrency, { getRate, isRateUpToDate, saveRate });
      } catch (error) {
        console.error('[SecuritiesForm] Failed to fetch exchange rate:', error);
        alert(`无法获取汇率 ${currency} -> ${baseCurrency}，请检查网络连接或稍后重试`);
        setIsFetchingRate(false);
        return;
      } finally {
        setIsFetchingRate(false);
      }
    }

    const item: SecuritiesAsset = {
      id: generateId('asset'),
      type: 'securities',
      name: '',
      brokerName,
      securityTypes: [securityType],
      currency,
      marketValue: Number(marketValue),
      exchangeRate: rate,
      valueInBase: Number(marketValue) * rate,
    };

    onSubmit(item);
    setBrokerName('');
    setMarketValue('');
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      <Input
        label="券商/平台"
        value={brokerName}
        onChange={(e) => setBrokerName(e.target.value)}
        placeholder="moomoo"
      />
      <Select
        label="币种"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        options={CURRENCIES.map((c: CurrencyInfo) => ({
          value: c.code,
          label: c.code,
        }))}
      />
      <Input
        label="市值"
        type="number"
        value={marketValue}
        onChange={(e) => setMarketValue(e.target.value)}
        placeholder="0"
      />
      <div className="flex items-end">
        <Button size="sm" onClick={handleSubmit} disabled={!brokerName || !marketValue || isFetchingRate}>
          添加
        </Button>
      </div>
    </div>
  );
};

// 加密货币表单
const CryptoForm: React.FC<AssetFormProps> = ({ baseCurrency, onSubmit }) => {
  const [platform, setPlatform] = useState('');
  const [cryptoType, setCryptoType] = useState('');
  const [marketValue, setMarketValue] = useState('');

  const handleSubmit = () => {
    if (!platform || !cryptoType || !marketValue) return;

    const item: CryptoAsset = {
      id: generateId('asset'),
      type: 'crypto',
      name: '',
      platform,
      cryptoType,
      amount: 0,
      marketValue: Number(marketValue),
      exchangeRate: 1,
      valueInBase: Number(marketValue),
    };

    onSubmit(item);
    setPlatform('');
    setCryptoType('');
    setMarketValue('');
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      <Input
        label="平台/钱包"
        value={platform}
        onChange={(e) => setPlatform(e.target.value)}
        placeholder="Binance"
      />
      <Input
        label="币种"
        value={cryptoType}
        onChange={(e) => setCryptoType(e.target.value)}
        placeholder="BTC"
      />
      <Input
        label={`市值(${baseCurrency})`}
        type="number"
        value={marketValue}
        onChange={(e) => setMarketValue(e.target.value)}
        placeholder="0"
      />
      <div className="flex items-end">
        <Button size="sm" onClick={handleSubmit} disabled={!platform || !cryptoType || !marketValue}>
          添加
        </Button>
      </div>
    </div>
  );
};
