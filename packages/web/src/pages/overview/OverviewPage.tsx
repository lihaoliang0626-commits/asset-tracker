import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useSnapshotStore, useAnalyticsStore } from '../../stores';
import { Card, NumberDisplay, Button } from '../../components/base';
import { LineChart, DonutChart } from '../../components/charts';
import { Header } from '../../components/layout';
import { formatDate } from '@asset-tracker/shared';
import { SnapshotRecordModal } from './SnapshotRecordModal';

const USER_ID = 'default'; // 临时使用默认用户ID

/**
 * 总览页 - 简约大气设计
 */
export const OverviewPage: React.FC = () => {
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('month');

  const {
    currentSnapshot,
    snapshots,
    isLoading,
    getLatestSnapshot,
    loadSnapshots,
  } = useSnapshotStore();

  const {
    trendData,
    assetChange,
    currentPeriod,
    setPeriod,
    analyze,
  } = useAnalyticsStore();

  // 加载数据
  useEffect(() => {
    getLatestSnapshot(USER_ID);
    loadSnapshots(USER_ID);
    analyze(USER_ID);
  }, []);

  // 切换周期
  const handlePeriodChange = (period: 'week' | 'month') => {
    setSelectedPeriod(period);
    setPeriod(period);
    analyze(USER_ID);
  };

  // 准备趋势图数据
  const chartData = trendData
    ? trendData.timestamps.map((timestamp, index) => ({
        timestamp,
        value: trendData.values[index],
      }))
    : [];

  // 准备结构图数据
  const structureData = currentSnapshot
    ? currentSnapshot.assets.map(group => ({
        name: getAssetTypeName(group.type),
        value: group.totalValue,
        percentage: group.percentage,
      }))
    : [];

  const assetGroups = currentSnapshot?.assets ?? [];

  return (
    <div className="pb-20">
      <Header
        title="资产统计"
        subtitle={currentSnapshot ? formatDate(currentSnapshot.timestamp, 'relative') : ''}
        action={(
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowRecordModal(true)}
          >
            <Plus className="h-4 w-4" />
            创建快照
          </Button>
        )}
      />

      <div className="max-w-screen-xl mx-auto px-4 py-4 space-y-4">
        {/* 1. 净资产 - 大数字展示 */}
        <Card>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-tertiary">净资产</p>
              <svg className="w-5 h-5 text-text-tertiary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-4xl font-bold text-text-primary tabular-nums">
              ¥{currentSnapshot?.totalAsset?.toLocaleString() || '0'}
            </div>
            {assetGroups.length === 0 ? (
              <div className="text-sm text-text-tertiary">暂无资产数据</div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-text-tertiary">
                <span>−</span>
                <span className="tabular-nums">¥{assetChange?.absoluteChange.toFixed(2) || '0.00'}</span>
                <span>(?)</span>
              </div>
            )}
          </div>
        </Card>

        {/* 2. 趋势图 */}
        {chartData.length > 0 ? (
          <Card title="资产趋势">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handlePeriodChange('week')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  selectedPeriod === 'week'
                    ? 'bg-accent-primary text-white'
                    : 'bg-light-2 text-text-secondary hover:bg-light-3'
                }`}
              >
                周
              </button>
              <button
                onClick={() => handlePeriodChange('month')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  selectedPeriod === 'month'
                    ? 'bg-accent-primary text-white'
                    : 'bg-light-2 text-text-secondary hover:bg-light-3'
                }`}
              >
                月
              </button>
            </div>
            <LineChart
              data={chartData}
              currency={currentSnapshot?.baseCurrency || 'CNY'}
              height={200}
            />
          </Card>
        ) : (
          <Card title="资产趋势">
            <div className="text-sm text-text-tertiary text-center py-6">
              再记录几次，就能看到趋势了
            </div>
          </Card>
        )}

        {/* 4. 资产结构速览（饼图） */}
        <Card title="资产结构速览">
          {structureData.length > 0 ? (
            <DonutChart
              data={structureData}
              currency={currentSnapshot?.baseCurrency || 'CNY'}
              height={260}
              className="relative"
            />
          ) : (
            <div className="text-sm text-text-tertiary text-center py-6">
              暂无资产结构数据
            </div>
          )}
        </Card>

        {/* 5. 资产列表（标题置于资产框内） */}
        <Card title="资产类型">
          <div className="space-y-2">
            {assetGroups.length > 0 ? (
              assetGroups.map(group => (
                <AssetListItem
                  key={group.type}
                  label={getAssetTypeName(group.type)}
                  value={group.totalValue.toLocaleString()}
                />
              ))
            ) : (
              <div className="text-sm text-text-tertiary text-center py-2">
                暂无资产数据
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 快照记录模态框 */}
      {showRecordModal && (
        <SnapshotRecordModal
          isOpen={showRecordModal}
          onClose={() => setShowRecordModal(false)}
          onSuccess={() => {
            setShowRecordModal(false);
            getLatestSnapshot(USER_ID);
            loadSnapshots(USER_ID);
            analyze(USER_ID, true);
          }}
        />
      )}
    </div>
  );
};

// 资产列表项组件
function AssetListItem({ label, value }: { label: string; value: string }) {
  return (
    <Card hoverable>
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary font-medium">{label}</span>
        <span className="text-sm text-text-primary font-bold tabular-nums">{value}</span>
      </div>
    </Card>
  );
}

// 资产类型名称映射
function getAssetTypeName(type: string): string {
  const names: Record<string, string> = {
    cash: '现金',
    bank: '银行账户',
    securities: '证券',
    crypto: '加密资产',
    payment: '支付账户',
  };
  return names[type] || type;
}
