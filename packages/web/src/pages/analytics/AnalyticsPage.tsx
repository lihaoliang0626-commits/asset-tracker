import React, { useEffect, useRef, useState } from 'react';
import { useAnalyticsStore, useSnapshotStore, useSettingsStore, useGoalStore, useAuthStore } from '../../stores';
import { Card, Button } from '../../components/base';
import { LineChart, BarChart, DonutChart } from '../../components/charts';
import { GoalTrendChart } from '../../components/goal';
import { AllocationComparisonCard } from '../../components/allocation';
import { Header } from '../../components/layout';
import {
  formatDate,
  formatCurrency,
  AnalysisPeriod,
  ContributionAnalysis,
  StructureComparison,
  Snapshot,
  calculateCurrentAllocation,
  generateAllocationComparison,
} from '@asset-tracker/shared';
import { getGoalStatus, formatGoalAmount, formatGoalMonth } from '@asset-tracker/shared';
import { generateAssetSummary, AssetSummaryResult } from '../../utils/ai-summary';

/**
 * 数据分析页
 */
export const AnalyticsPage: React.FC = () => {
  const userId = useAuthStore(state => state.user?.id);
  const [selectedPeriod, setSelectedPeriod] = useState<AnalysisPeriod>('month');
  const [comparisonMode] = useState<'previous'>('previous');

  const {
    trendData,
    assetChange,
    contributions,
    structureComparison,
    aiInsight,
    isLoading,
    setPeriod,
    analyze,
  } = useAnalyticsStore();

  const { snapshots } = useSnapshotStore();
  const { settings, loadSettings } = useSettingsStore();
  const { activeGoal, currentProgress } = useGoalStore();
  const [summary, setSummary] = useState<AssetSummaryResult | null>(null);
  const baseCurrency = settings?.baseCurrency || 'CNY';
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const summaryKeyRef = useRef<string | null>(null);
  const summaryAbortRef = useRef<AbortController | null>(null);

  // 加载数据
  useEffect(() => {
    if (!userId) return;
    loadSettings(userId);
    setPeriod(selectedPeriod);
    analyze(userId);
  }, [userId, selectedPeriod]);

  // 切换周期
  const handlePeriodChange = (period: AnalysisPeriod) => {
    setSelectedPeriod(period);
  };

  // 准备趋势图数据
  const chartData = trendData
    ? trendData.timestamps.map((timestamp: number, index: number) => ({
        timestamp,
        value: trendData.values[index],
      }))
    : [];

  // 准备贡献分析数据
  const contributionData = contributions.map((c: ContributionAnalysis) => ({
    name: getAssetTypeName(c.assetType),
    value: c.change,
  }));

  // 准备当前结构数据
  const currentStructureData = structureComparison?.current.map((item: StructureComparison['current'][number]) => ({
    name: getAssetTypeName(item.assetType),
    value: item.value,
    percentage: item.percentage,
  })) || [];

  // 准备对比数据
  const comparisonData = structureComparison
    ? structureComparison.current.map((item: StructureComparison['current'][number]) => {
        const previous = structureComparison.previous.find((p: StructureComparison['previous'][number]) => p.assetType === item.assetType);
        return {
          name: getAssetTypeName(item.assetType),
          current: item.percentage,
          previous: previous?.percentage || 0,
        };
      })
    : [];

  const maxContribution = contributions.length > 0
    ? contributions.reduce((max, item) => (Math.abs(item.change) > Math.abs(max.change) ? item : max), contributions[0])
    : null;

  const latestSnapshot = snapshots[0] || null;
  const previousSnapshot = snapshots[1] || null;
  const lastIntervalDays = latestSnapshot && previousSnapshot
    ? Math.floor((latestSnapshot.timestamp - previousSnapshot.timestamp) / (1000 * 60 * 60 * 24))
    : null;

  const recentNotes = snapshots
    .filter((s: Snapshot) => s.note)
    .slice(0, 5)
    .map((s: Snapshot) => ({
      date: formatDate(s.timestamp, 'short'),
      note: s.note || '',
    }));

  // 计算资产配置对比
  const allocationComparisons = latestSnapshot && settings?.allocationTarget
    ? generateAllocationComparison(
        calculateCurrentAllocation(latestSnapshot),
        settings.allocationTarget
      )
    : null;

  const handleGenerateSummary = async () => {
    if (!assetChange || contributions.length === 0) {
      setSummaryError('暂无可分析的数据');
      return;
    }

    const key = JSON.stringify({
      assetChange,
      contributions,
      baseCurrency,
    });
    if (summaryKeyRef.current === key && summary) {
      return;
    }

    summaryKeyRef.current = key;
    summaryAbortRef.current?.abort();
    const controller = new AbortController();
    summaryAbortRef.current = controller;

    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const result = await generateAssetSummary(
        {
          baseCurrency,
          assetChange,
          contributions,
          notes: recentNotes,
        },
        controller.signal
      );
      setSummary(result);
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        setSummaryError(error instanceof Error ? error.message : 'AI 分析失败');
        setSummary(null);
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="pb-20">
      <Header
        title="数据分析"
        subtitle="看清资产变化趋势"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => userId && analyze(userId, true)}
            isLoading={isLoading}
          >
            刷新
          </Button>
        }
      />

      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* 分析维度选择 */}
        <Card>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-[#1F2933] mb-3">分析周期</h4>
              <div className="flex gap-2">
                {(['week', 'month', 'quarter'] as AnalysisPeriod[]).map((period: AnalysisPeriod) => (
                  <button
                    key={period}
                    onClick={() => handlePeriodChange(period)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedPeriod === period
                        ? 'bg-[#1F3A8A] text-white'
                        : 'bg-[#F6F7F9] text-[#6B7280] hover:bg-[#E5E7EB]'
                    }`}
                  >
                    {period === 'week' ? '周' : period === 'month' ? '月' : '季度'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-[#1F2933] mb-3">对比对象</h4>
              <div className="flex gap-2">
                <button
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    comparisonMode === 'previous'
                      ? 'bg-[#1F3A8A] text-white'
                      : 'bg-[#F6F7F9] text-[#6B7280] hover:bg-[#E5E7EB]'
                  }`}
                >
                  上一周期
                </button>
                <button
                  disabled
                  className="px-4 py-2 rounded-lg bg-[#F6F7F9] text-[#9CA3AF] cursor-not-allowed"
                >
                  自定义（暂未开放）
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* 模块一：资产变化总结 */}
        <Card title="资产变化总结">
          {assetChange ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#6B7280]">本期资产变化总结</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerateSummary}
                  disabled={summaryLoading || !settings?.enableAIAnalysis}
                  isLoading={summaryLoading}
                >
                  AI 总结
                </Button>
              </div>
              {!settings?.enableAIAnalysis && (
                <div className="text-xs text-[#9CA3AF]">请在设置中开启 AI 分析</div>
              )}
              {summaryError && (
                <div className="text-sm text-red-500">AI 分析失败：{summaryError}</div>
              )}
              {summary && (
                <div className="space-y-2">
                  <p className="text-base font-semibold text-[#1F2933]">
                    {summary.highlight}
                  </p>
                  <p className="text-sm text-[#6B7280]">
                    {summary.reason}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-[#6B7280]">
              <p>暂无变化数据</p>
            </div>
          )}
        </Card>

        {/* 资产配置对比 */}
        {allocationComparisons && (
          <AllocationComparisonCard
            comparisons={allocationComparisons}
            baseCurrency={baseCurrency}
          />
        )}

        {/* KPI 小卡 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="space-y-1">
              <p className="text-xs text-[#6B7280]">本期总资产变化</p>
              <p className="text-lg font-semibold text-[#1F2933] tabular-nums">
                {assetChange
                  ? `${assetChange.absoluteChange >= 0 ? '+' : ''}${assetChange.absoluteChange.toFixed(2)}`
                  : '—'}
              </p>
              <p className="text-xs text-[#9CA3AF] tabular-nums">
                {assetChange ? `${assetChange.percentageChange.toFixed(1)}%` : '—'}
              </p>
            </div>
          </Card>
          <Card>
            <div className="space-y-1">
              <p className="text-xs text-[#6B7280]">最大单项变动</p>
              <p className="text-lg font-semibold text-[#1F2933] tabular-nums">
                {maxContribution
                  ? `${maxContribution.change >= 0 ? '+' : ''}${maxContribution.change.toFixed(2)}`
                  : '—'}
              </p>
              <p className="text-xs text-[#9CA3AF]">
                {maxContribution ? getAssetTypeName(maxContribution.assetType) : '—'}
              </p>
            </div>
          </Card>
          <Card>
            <div className="space-y-1">
              <p className="text-xs text-[#6B7280]">最近记录间隔</p>
              <p className="text-lg font-semibold text-[#1F2933] tabular-nums">
                {lastIntervalDays !== null ? `${lastIntervalDays} 天` : '—'}
              </p>
              <p className="text-xs text-[#9CA3AF]">
                {latestSnapshot ? formatDate(latestSnapshot.timestamp, 'short') : '—'}
              </p>
            </div>
          </Card>
        </div>

        {/* 目标进度分析模块 */}
        {activeGoal && currentProgress && (
          <Card title="🎯 目标进度分析">
            <div className="space-y-6">
              {/* 目标基本信息 */}
              <div className="bg-[#F6F7F9] p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-medium text-[#1F2933]">
                    {activeGoal.title}
                  </h3>
                  <span className={`text-sm px-2 py-1 rounded ${
                    getGoalStatus(activeGoal, currentProgress) === 'on_track'
                      ? 'bg-blue-100 text-blue-700'
                      : getGoalStatus(activeGoal, currentProgress) === 'achieved'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {getGoalStatus(activeGoal, currentProgress) === 'achieved' && '已达成'}
                    {getGoalStatus(activeGoal, currentProgress) === 'on_track' && '在正轨上'}
                    {getGoalStatus(activeGoal, currentProgress) === 'behind' && '需努力'}
                    {getGoalStatus(activeGoal, currentProgress) === 'overdue' && '已过期'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-[#6B7280] mb-1">当前进度</p>
                    <p className="text-lg font-semibold text-[#1F2933]">
                      {currentProgress.progress.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6B7280] mb-1">当前资产</p>
                    <p className="text-lg font-semibold text-[#1F2933]">
                      {formatGoalAmount(currentProgress.currentAmount, activeGoal.baseCurrency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6B7280] mb-1">目标金额</p>
                    <p className="text-lg font-semibold text-[#1F2933]">
                      {formatGoalAmount(activeGoal.targetAmount, activeGoal.baseCurrency)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 趋势预测图 */}
              <div>
                <h4 className="text-sm font-medium text-[#1F2933] mb-3">目标达成趋势预测</h4>
                <GoalTrendChart
                  goal={activeGoal}
                  progress={currentProgress}
                  snapshots={snapshots}
                />
              </div>

              {/* 预测信息 */}
              {currentProgress.averageGrowthRate !== 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#F6F7F9] p-4 rounded-lg">
                    <p className="text-xs text-[#6B7280] mb-1">月均增长</p>
                    <p className="text-base font-semibold text-[#1F2933]">
                      {currentProgress.averageGrowthRate >= 0 ? '+' : ''}
                      {formatGoalAmount(currentProgress.averageGrowthRate, activeGoal.baseCurrency)}
                    </p>
                  </div>
                  {currentProgress.predictedAmount && (
                    <div className="bg-[#F6F7F9] p-4 rounded-lg">
                      <p className="text-xs text-[#6B7280] mb-1">预计到期金额</p>
                      <p className="text-base font-semibold text-[#1F2933]">
                        {formatGoalAmount(currentProgress.predictedAmount, activeGoal.baseCurrency)}
                      </p>
                    </div>
                  )}
                  {currentProgress.predictedDate && (
                    <div className="bg-[#F6F7F9] p-4 rounded-lg">
                      <p className="text-xs text-[#6B7280] mb-1">预测达成时间</p>
                      <p className="text-base font-semibold text-[#1F2933]">
                        {formatGoalMonth(currentProgress.predictedDate)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 说明 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  💡 预测基于近期资产增长趋势计算，实际情况可能因市场变化、收支变动等因素而有所不同，仅供参考。
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 模块二：变化来源拆解 */}
        <Card title="变化来源拆解">
          {contributionData.length > 0 ? (
            <BarChart
              data={contributionData}
              currency={baseCurrency}
              height={300}
            />
          ) : (
            <div className="text-center py-8 text-[#6B7280]">
              <p>暂无贡献数据</p>
            </div>
          )}
        </Card>

        {/* 模块三：资产结构分布 */}
        <Card title="资产结构分布">
          {currentStructureData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DonutChart
                data={currentStructureData}
                currency={baseCurrency}
                height={250}
                showLegend={false}
              />
              <div className="space-y-3">
                {currentStructureData.map((item: { name: string; value: number; percentage: number }, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#F6F7F9]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: ['#1F3A8A', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE'][index % 5],
                        }}
                      />
                      <span className="text-[#1F2933] font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[#1F2933] font-semibold tabular-nums">
                        {item.percentage.toFixed(1)}%
                      </p>
                      <p className="text-sm text-[#6B7280] tabular-nums">
                        {formatCurrency(item.value, baseCurrency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-[#6B7280]">
              <p>暂无结构数据</p>
            </div>
          )}
        </Card>

        {/* 模块四：结构变化对比 */}
        <Card title="结构变化对比">
          {comparisonData.length > 0 ? (
            <div className="space-y-4">
              {comparisonData.map((item: { name: string; current: number; previous: number }, index: number) => {
                const change = item.current - item.previous;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#1F2933]">{item.name}</span>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-[#6B7280]">本期</p>
                          <p className="text-base font-semibold text-[#1F2933] tabular-nums">
                            {item.current.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-[#6B7280]">上期</p>
                          <p className="text-base font-semibold text-[#6B7280] tabular-nums">
                            {item.previous.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-right min-w-[60px]">
                          <p className="text-sm text-[#6B7280]">变化</p>
                          <p
                            className={`text-base font-semibold tabular-nums ${
                              change > 0 ? 'text-[#1F3A8A]' : change < 0 ? 'text-[#6B7280]' : 'text-[#9CA3AF]'
                            }`}
                          >
                            {change > 0 ? '+' : ''}
                            {change.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* 进度条 */}
                    <div className="relative h-2 bg-[#F6F7F9] rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-[#1F3A8A] rounded-full transition-all"
                        style={{ width: `${item.current}%` }}
                      />
                      <div
                        className="absolute top-0 left-0 h-full border-2 border-[#6B7280] border-dashed rounded-full"
                        style={{ width: `${item.previous}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-[#6B7280]">
              <p>暂无对比数据</p>
            </div>
          )}
        </Card>

        {/* 模块五：记录备注回顾 */}
        <Card title="记录备注回顾">
          {snapshots.length > 0 ? (
            <div className="space-y-3">
              {snapshots
                .filter((s: Snapshot) => s.note)
                .slice(0, 5)
                .map((snapshot: Snapshot) => (
                  <div
                    key={snapshot.id}
                    className="p-3 bg-[#F6F7F9] rounded-lg hover:bg-[#E5E7EB] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#1F2933] mb-1">
                          📝 {formatDate(snapshot.timestamp, 'short')}
                        </p>
                        <p className="text-sm text-[#6B7280]">{snapshot.note}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#1F2933] tabular-nums">
                          {formatCurrency(snapshot.totalAsset, baseCurrency)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#6B7280]">
              <p>暂无备注记录</p>
              <p className="text-sm text-[#9CA3AF] mt-1">在记录快照时添加备注，方便日后回顾</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

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
