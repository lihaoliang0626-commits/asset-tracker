/**
 * Asset type definitions
 */

// 资产大类
export type AssetType =
  | 'cash'                       // 现金
  | 'bank'                       // 银行账户
  | 'securities'                 // 证券
  | 'crypto'                     // 加密资产
  | 'payment';                   // 日常支付账户

// 基础资产项
export interface BaseAssetItem {
  id: string;                    // 资产项ID
  type: AssetType;               // 资产类型
  name: string;                  // 资产名称
  valueInBase: number;           // 折算为基准货币的价值
  note?: string;                 // 备注
}

// 现金资产
export interface CashAsset extends BaseAssetItem {
  type: 'cash';
  currency: string;              // 币种（如 "CNY", "USD"）
  amount: number;                // 金额
  exchangeRate: number;          // 汇率（相对基准货币）
}

// 银行账户类型
export type BankAccountType = 'current' | 'fixed'; // 活期/定期

// 银行账户
export interface BankAsset extends BaseAssetItem {
  type: 'bank';
  bankName: string;              // 银行名称
  accountType: BankAccountType;  // 活期/定期
  currency: string;              // 币种
  balance: number;               // 余额
  exchangeRate: number;          // 汇率
}

// 证券类型
export type SecurityType = 'stock' | 'etf' | 'fund' | 'bond';

// 证券资产
export interface SecuritiesAsset extends BaseAssetItem {
  type: 'securities';
  brokerName: string;            // 券商名称
  securityTypes: SecurityType[]; // 证券类型
  currency: string;              // 币种
  marketValue: number;           // 市值
  exchangeRate: number;          // 汇率
}

// 加密资产
export interface CryptoAsset extends BaseAssetItem {
  type: 'crypto';
  platform: string;              // 平台或钱包名称
  cryptoType: string;            // 加密货币类型（如 "BTC", "ETH"）
  amount: number;                // 数量
  marketValue: number;           // 市值（基准货币）
  exchangeRate: number;          // 汇率（加密货币 -> 基准货币）
}

// 日常支付平台
export type PaymentPlatform = 'wechat' | 'alipay' | 'paylah';

// 日常支付账户
export interface PaymentAsset extends BaseAssetItem {
  type: 'payment';
  paymentType: PaymentPlatform;  // 支付类型
  balance: number;               // 余额
  currency: string;              // 币种（通常是基准货币）
  exchangeRate: number;          // 汇率
}

// 资产项联合类型
export type AssetItem =
  | CashAsset
  | BankAsset
  | SecuritiesAsset
  | CryptoAsset
  | PaymentAsset;

// 资产分组
export interface AssetGroup {
  type: AssetType;               // 资产大类
  totalValue: number;            // 该类资产总值（基准货币）
  percentage: number;            // 占总资产比例（0-100）
  items: AssetItem[];            // 具体资产项
}
