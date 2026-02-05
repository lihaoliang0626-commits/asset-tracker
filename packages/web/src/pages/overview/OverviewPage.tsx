import React, { useEffect, useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { useSnapshotStore, useAnalyticsStore, useGoalStore, useSettingsStore } from '../../stores';
import { Card, NumberDisplay, Button } from '../../components/base';
import { LineChart, DonutChart } from '../../components/charts';
import { Header } from '../../components/layout';
import { formatDate, AssetGroup, formatCurrency } from '@asset-tracker/shared';
import { SnapshotRecordModal } from './SnapshotRecordModal';
import { AssetDetailModal } from './AssetDetailModal';
import { GoalProgressCard, GoalSetupModal } from '../../components/goal';

const USER_ID = 'default'; // 临时使用默认用户ID

/**
 * 总览页 - 简约大气设计
 */
export const OverviewPage: React.FC = () => {
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showGoalSetupModal, setShowGoalSetupModal] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('month');
  const [selectedAssetGroup, setSelectedAssetGroup] = useState<AssetGroup | null>(null);

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

  const { settings, loadSettings } = useSettingsStore();

  const {
    activeGoal,
    currentProgress,
    loadGoals,
    createGoal,
    updateGoal,
    refreshProgress,
  } = useGoalStore();

  // 加载数据
  useEffect(() => {
    loadSettings(USER_ID);
    getLatestSnapshot(USER_ID);
    loadSnapshots(USER_ID);
    analyze(USER_ID);
    loadGoals(USER_ID);
  }, []);

  // 当快照更新时，刷新目标进度
  useEffect(() => {
    if (currentSnapshot && activeGoal) {
      refreshProgress(USER_ID, currentSnapshot, snapshots);
    }
  }, [currentSnapshot, snapshots, activeGoal]);

  // 切换周期
  const handlePeriodChange = (period: 'week' | 'month') => {
    setSelectedPeriod(period);
    setPeriod(period);
    analyze(USER_ID);
  };

  // 创建或更新目标
  const handleCreateGoal = (input: Omit<import('@asset-tracker/shared').CreateGoalInput, 'userId'>) => {
    if (!currentSnapshot) return;

    if (isEditingGoal && activeGoal) {
      // 编辑模式：更新现有目标
      updateGoal({
        id: activeGoal.id,
        ...input,
      });
    } else {
      // 创建模式：创建新目标
      createGoal(
        {
          userId: USER_ID,
          ...input,
        },
        currentSnapshot
      );
    }

    // 刷新进度
    refreshProgress(USER_ID, currentSnapshot, snapshots);

    // 重置编辑状态
    setIsEditingGoal(false);
  };

  // 打开编辑目标模态框
  const handleEditGoal = () => {
    setIsEditingGoal(true);
    setShowGoalSetupModal(true);
  };

  // 准备趋势图数据
  const chartData = trendData
    ? trendData.timestamps.map((timestamp: number, index: number) => ({
        timestamp,
        value: trendData.values[index],
      }))
    : [];

  // 准备结构图数据
  const structureData = currentSnapshot
    ? currentSnapshot.assets.map((group: AssetGroup) => ({
        name: getAssetTypeName(group.type),
        value: group.totalValue,
        percentage: group.percentage,
      }))
    : [];

  const assetGroups = currentSnapshot?.assets ?? [];
  const baseCurrency = settings?.baseCurrency || currentSnapshot?.baseCurrency || 'CNY';

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
              {formatCurrency(currentSnapshot?.totalAsset || 0, baseCurrency)}
            </div>
            {assetGroups.length === 0 ? (
              <div className="text-sm text-text-tertiary">暂无资产数据</div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-text-tertiary">
                <span>−</span>
                <span className="tabular-nums">
                  {formatCurrency(assetChange?.absoluteChange || 0, baseCurrency)}
                </span>
                <span>(?)</span>
              </div>
            )}
          </div>
        </Card>

        {/* 1.5 目标进度卡片 */}
        {activeGoal && currentProgress ? (
          <GoalProgressCard
            goal={activeGoal}
            progress={currentProgress}
            onEdit={handleEditGoal}
          />
        ) : (
          currentSnapshot && (
            <Card>
              <div className="text-center py-6">
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="text-base font-medium text-gray-900 mb-2">
                  设置资产目标
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  设定目标，追踪进度，让每次记录更有意义
                </p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowGoalSetupModal(true)}
                >
                  <Target className="h-4 w-4 mr-1" />
                  设置目标
                </Button>
              </div>
            </Card>
          )
        )}

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
              currency={baseCurrency}
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
              currency={baseCurrency}
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
              assetGroups.map((group: AssetGroup) => (
                <AssetListItem
                  key={group.type}
                  label={getAssetTypeName(group.type)}
                  value={group.totalValue.toLocaleString()}
                  onClick={() => setSelectedAssetGroup(group)}
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

      {/* 目标设置/编辑模态框 */}
      {showGoalSetupModal && currentSnapshot && (
        <GoalSetupModal
          isOpen={showGoalSetupModal}
          onClose={() => {
            setShowGoalSetupModal(false);
            setIsEditingGoal(false);
          }}
          onSubmit={handleCreateGoal}
          baseCurrency={currentSnapshot.baseCurrency}
          currentAmount={currentSnapshot.totalAsset}
          existingGoal={isEditingGoal ? activeGoal || undefined : undefined}
        />
      )}

      {/* 资产详情模态框 */}
      {selectedAssetGroup && (
        <AssetDetailModal
          isOpen={!!selectedAssetGroup}
          onClose={() => setSelectedAssetGroup(null)}
          assetGroup={selectedAssetGroup}
          baseCurrency={baseCurrency}
        />
      )}
    </div>
  );
};

// 资产列表项组件
function AssetListItem({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  return (
    <Card hoverable>
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between text-left transition-opacity hover:opacity-80"
      >
        <span className="text-sm text-text-secondary font-medium">{label}</span>
        <span className="text-sm text-text-primary font-bold tabular-nums">{value}</span>
      </button>
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
