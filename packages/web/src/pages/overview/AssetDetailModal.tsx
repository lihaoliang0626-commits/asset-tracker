import React from 'react';
import { Modal } from '../../components/base';
import {
  AssetGroup,
  AssetItem,
  AssetType,
  CashAsset,
  BankAsset,
  PaymentAsset,
  SecuritiesAsset,
  CryptoAsset,
  formatCurrency,
} from '@asset-tracker/shared';

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetGroup: AssetGroup;
  baseCurrency: string;
}

/**
 * 资产详情模态框
 */
export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  isOpen,
  onClose,
  assetGroup,
  baseCurrency,
}) => {
  // 获取资产类型名称和图标
  const getTypeInfo = () => {
    switch (assetGroup.type) {
      case 'cash':
        return { name: '现金类资产', icon: '💵' };
      case 'bank':
        return { name: '银行账户', icon: '🏦' };
      case 'payment':
        return { name: '支付账户', icon: '💳' };
      case 'securities':
        return { name: '证券资产', icon: '📈' };
      case 'crypto':
        return { name: '加密资产', icon: '₿' };
      default:
        return { name: '资产', icon: '💼' };
    }
  };

  // 按子类型分组
  const groupBySubType = () => {
    const groups: Record<string, AssetItem[]> = {};

    assetGroup.items.forEach(item => {
      let subType = '';

      switch (item.type) {
        case 'cash':
          subType = '实物现金/外币';
          break;
        case 'bank':
          subType = '银行活期';
          break;
        case 'payment':
          const paymentAsset = item as PaymentAsset;
          subType = paymentAsset.paymentType === 'alipay' ? '支付宝'
            : paymentAsset.paymentType === 'wechat' ? '微信支付'
            : 'PayLah';
          break;
        case 'securities':
          const securitiesAsset = item as SecuritiesAsset;
          if (securitiesAsset.securityTypes?.includes('stock')) {
            subType = '股票';
          } else if (securitiesAsset.securityTypes?.includes('fund') || securitiesAsset.securityTypes?.includes('etf')) {
            subType = '基金/ETF';
          } else if (securitiesAsset.securityTypes?.includes('bond')) {
            subType = '债券/理财';
          } else {
            subType = '其他证券';
          }
          break;
        case 'crypto':
          subType = '加密货币';
          break;
        default:
          subType = '其他';
      }

      if (!groups[subType]) {
        groups[subType] = [];
      }
      groups[subType].push(item);
    });

    return groups;
  };

  // 渲染资产项
  const renderAssetItem = (item: AssetItem) => {
    let name = '';
    let amount = 0;
    let currency = baseCurrency;
    let rate: number | undefined;

    switch (item.type) {
      case 'cash':
        const cashAsset = item as CashAsset;
        name = `${cashAsset.currency} 现金`;
        amount = cashAsset.amount;
        currency = cashAsset.currency;
        rate = cashAsset.exchangeRate;
        break;
      case 'bank':
        const bankAsset = item as BankAsset;
        name = bankAsset.bankName || '银行账户';
        amount = bankAsset.balance;
        currency = bankAsset.currency;
        rate = bankAsset.exchangeRate;
        break;
      case 'payment':
        const paymentAsset = item as PaymentAsset;
        name = paymentAsset.paymentType === 'alipay' ? '支付宝'
          : paymentAsset.paymentType === 'wechat' ? '微信支付'
          : 'PayLah';
        amount = paymentAsset.balance;
        currency = paymentAsset.currency;
        rate = paymentAsset.exchangeRate;
        break;
      case 'securities':
        const securitiesAsset = item as SecuritiesAsset;
        name = securitiesAsset.brokerName || '证券账户';
        amount = securitiesAsset.marketValue;
        currency = securitiesAsset.currency;
        rate = securitiesAsset.exchangeRate;
        break;
      case 'crypto':
        const cryptoAsset = item as CryptoAsset;
        name = `${cryptoAsset.cryptoType} (${cryptoAsset.platform})`;
        amount = cryptoAsset.marketValue;
        currency = baseCurrency;
        break;
    }

    const isForex = currency !== baseCurrency && rate && rate !== 1;

    return (
      <div key={item.id} className="p-3 bg-light-1 rounded-md space-y-1">
        <div className="font-medium text-text-primary">{name}</div>
        <div className="text-sm text-text-secondary">
          {item.type === 'bank' ? '余额' : item.type === 'securities' ? '市值' : '金额'}: {amount.toLocaleString()} {currency}
        </div>
        {isForex && (
          <div className="text-xs text-text-tertiary">
            汇率: 1 {currency} = {rate?.toFixed(4)} {baseCurrency}
          </div>
        )}
        <div className="text-sm font-semibold text-accent-primary">
          价值: {formatCurrency(item.valueInBase, baseCurrency)}
        </div>
      </div>
    );
  };

  const typeInfo = getTypeInfo();
  const groupedItems = groupBySubType();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="text-2xl">{typeInfo.icon}</span>
          <span>{typeInfo.name}详情</span>
        </div>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* 总计 */}
        <div className="p-4 bg-accent-primary/5 rounded-lg">
          <div className="text-sm text-text-tertiary mb-1">总计</div>
          <div className="text-2xl font-bold text-text-primary">
            {formatCurrency(assetGroup.totalValue, baseCurrency)}
          </div>
        </div>

        {/* 分组显示 */}
        {Object.entries(groupedItems).map(([subType, items]) => (
          <div key={subType} className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-light-3">
              <h3 className="text-sm font-semibold text-text-primary">{subType}</h3>
              <span className="text-xs text-text-tertiary">({items.length}项)</span>
            </div>
            <div className="space-y-2">
              {items.map(item => renderAssetItem(item))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
