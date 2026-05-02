import { create } from 'zustand';
import {
  AnalysisPeriod,
  TrendData,
  ContributionAnalysis,
  StructureComparison,
  AssetChange,
} from '@asset-tracker/shared';
import {
  buildTrendData,
  calculateChange,
  analyzeContributions,
  compareStructure,
  pickLatestSnapshotsPerDay,
} from '@asset-tracker/shared';
import { getSnapshotStorage, getAnalyticsCacheStorage } from '@asset-tracker/shared';
import { getDateRange, getPreviousPeriodRange } from '@asset-tracker/shared';

/**
 * 分析状态接口
 */
interface AnalyticsState {
  // 状态
  currentPeriod: AnalysisPeriod;
  trendData: TrendData | null;
  assetChange: AssetChange | null;
  contributions: ContributionAnalysis[];
  structureComparison: StructureComparison | null;
  aiInsight: string | null;

  // 加载状态
  isLoading: boolean;
  error: string | null;

  // Actions
  setPeriod: (period: AnalysisPeriod) => void;
  analyze: (userId: string, forceRefresh?: boolean) => Promise<void>;
  analyzeCustomPeriod: (userId: string, startTime: number, endTime: number) => Promise<void>;
  clearCache: (userId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const snapshotStorage = getSnapshotStorage();
const cacheStorage = getAnalyticsCacheStorage();

/**
 * 分析状态 Store
 */
export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  // 初始状态
  currentPeriod: 'month',
  trendData: null,
  assetChange: null,
  contributions: [],
  structureComparison: null,
  aiInsight: null,
  isLoading: false,
  error: null,

  // 设置分析周期
  setPeriod: (period: AnalysisPeriod) => {
    set({ currentPeriod: period });
  },

  // 执行分析
  analyze: async (userId: string, forceRefresh = false) => {
    const { currentPeriod } = get();
    set({ isLoading: true, error: null });

    try {
      const latestSnapshotOverall = await snapshotStorage.getLatest(userId);
      if (!latestSnapshotOverall) {
        set({
          error: '当前周期暂无数据',
          isLoading: false,
        });
        return;
      }

      const { start, end } = getDateRange(currentPeriod, latestSnapshotOverall.timestamp);

      // 检查缓存
      if (!forceRefresh) {
        const cached = await cacheStorage.get(userId, currentPeriod, start, end);
        if (cached) {
          set({
            trendData: cached.trend,
            assetChange: cached.assetChange || null,
            contributions: cached.contributions,
            structureComparison: cached.structureComparison,
            aiInsight: cached.aiInsight,
            isLoading: false,
          });
          return;
        }
      }

      // 获取当前周期的快照
      const currentSnapshots = await snapshotStorage.getByTimeRange(userId, start, end);

      if (currentSnapshots.length === 0) {
        set({
          error: '当前周期暂无数据',
          isLoading: false,
        });
        return;
      }

      // 同一天仅保留最新快照
      const dailySnapshots = pickLatestSnapshotsPerDay(currentSnapshots);

      // 构建趋势数据
      const trendData = buildTrendData(dailySnapshots);

      // 获取最新和最早的快照用于变化计算
      const latestSnapshot = dailySnapshots[dailySnapshots.length - 1];
      const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(
        currentPeriod,
        latestSnapshotOverall.timestamp
      );
      const previousSnapshots = await snapshotStorage.getByTimeRange(
        userId,
        prevStart,
        prevEnd
      );

      let assetChange: AssetChange | null = null;
      let contributions: ContributionAnalysis[] = [];
      let structureComparison: StructureComparison | null = null;

      if (previousSnapshots.length > 0) {
        const previousDailySnapshots = pickLatestSnapshotsPerDay(previousSnapshots);
        const previousSnapshot = previousDailySnapshots[previousDailySnapshots.length - 1];

        // 计算资产变化
        assetChange = calculateChange(latestSnapshot, previousSnapshot);

        // 贡献分析
        contributions = analyzeContributions(latestSnapshot, previousSnapshot);

        // 结构对比
        structureComparison = compareStructure(latestSnapshot, previousSnapshot);
      } else {
        // 若没有上期数据，使用当前周期内最早快照做对比
        const earliestSnapshot = dailySnapshots[0];
        if (dailySnapshots.length > 1) {
          assetChange = calculateChange(latestSnapshot, earliestSnapshot);
          contributions = analyzeContributions(latestSnapshot, earliestSnapshot);
        }

        // 至少展示当前结构
        structureComparison = compareStructure(latestSnapshot, earliestSnapshot);
      }

      // 保存到缓存
      await cacheStorage.save({
        userId,
        period: currentPeriod,
        startTime: start,
        endTime: end,
        trend: trendData,
        assetChange: assetChange || undefined,
        contributions,
        structureComparison: structureComparison || undefined,
        aiInsight: undefined, // AI 洞察需要额外调用 API
        cachedAt: Date.now(),
      });

      set({
        trendData,
        assetChange,
        contributions,
        structureComparison,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to analyze data',
        isLoading: false,
      });
    }
  },

  // 自定义周期分析
  analyzeCustomPeriod: async (userId: string, startTime: number, endTime: number) => {
    set({ isLoading: true, error: null });

    try {
      // 获取快照
      const snapshots = await snapshotStorage.getByTimeRange(userId, startTime, endTime);

      if (snapshots.length === 0) {
        set({
          error: '所选时间范围内暂无数据',
          isLoading: false,
        });
        return;
      }

      // 构建趋势数据
      const dailySnapshots = pickLatestSnapshotsPerDay(snapshots);
      const trendData = buildTrendData(dailySnapshots);

      // 计算与上一个快照的变化
      const latestSnapshot = dailySnapshots[dailySnapshots.length - 1];
      const earliestSnapshot = dailySnapshots[0];

      let assetChange: AssetChange | null = null;
      let contributions: ContributionAnalysis[] = [];

      if (dailySnapshots.length > 1) {
        assetChange = calculateChange(latestSnapshot, earliestSnapshot);
        contributions = analyzeContributions(latestSnapshot, earliestSnapshot);
      }

      set({
        trendData,
        assetChange,
        contributions,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to analyze custom period',
        isLoading: false,
      });
    }
  },

  // 清除缓存
  clearCache: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      await cacheStorage.clearByUserId(userId);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to clear cache',
        isLoading: false,
      });
    }
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },

  // 重置状态
  reset: () => {
    set({
      currentPeriod: 'month',
      trendData: null,
      assetChange: null,
      contributions: [],
      structureComparison: null,
      aiInsight: null,
      isLoading: false,
      error: null,
    });
  },
}));
