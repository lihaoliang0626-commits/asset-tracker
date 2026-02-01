import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Snapshot, CreateSnapshotInput, UpdateSnapshotInput } from '@asset-tracker/shared';
import { getSnapshotStorage } from '@asset-tracker/shared';

/**
 * 快照状态接口
 */
interface SnapshotState {
  // 状态
  snapshots: Snapshot[];
  currentSnapshot: Snapshot | null;
  isLoading: boolean;
  error: string | null;

  // 分页状态
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;

  // Actions
  loadSnapshots: (userId: string) => Promise<void>;
  loadMore: (userId: string) => Promise<void>;
  createSnapshot: (input: CreateSnapshotInput) => Promise<Snapshot>;
  updateSnapshot: (input: UpdateSnapshotInput) => Promise<Snapshot>;
  deleteSnapshot: (id: string) => Promise<void>;
  getSnapshot: (id: string) => Promise<Snapshot | null>;
  getLatestSnapshot: (userId: string) => Promise<Snapshot | null>;
  refreshSnapshots: (userId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const storage = getSnapshotStorage();

/**
 * 快照状态 Store
 */
export const useSnapshotStore = create<SnapshotState>((set, get) => ({
  // 初始状态
  snapshots: [],
  currentSnapshot: null,
  isLoading: false,
  error: null,

  // 分页状态
  page: 0,
  pageSize: 20,
  total: 0,
  hasMore: false,

  // 加载快照列表
  loadSnapshots: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const { page, pageSize } = get();
      const result = await storage.getPaginated(userId, page * pageSize, pageSize);

      set({
        snapshots: result.snapshots,
        total: result.total,
        hasMore: result.hasMore,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load snapshots',
        isLoading: false,
      });
    }
  },

  // 加载更多
  loadMore: async (userId: string) => {
    const { isLoading, hasMore, page } = get();

    if (isLoading || !hasMore) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const nextPage = page + 1;
      const pageSize = get().pageSize;
      const result = await storage.getPaginated(userId, nextPage * pageSize, pageSize);

      set(state => ({
        snapshots: [...state.snapshots, ...result.snapshots],
        total: result.total,
        hasMore: result.hasMore,
        page: nextPage,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load more snapshots',
        isLoading: false,
      });
    }
  },

  // 创建快照
  createSnapshot: async (input: CreateSnapshotInput) => {
    set({ isLoading: true, error: null });

    try {
      const snapshot = await storage.create(input);

      set(state => ({
        snapshots: [snapshot, ...state.snapshots],
        currentSnapshot: snapshot,
        total: state.total + 1,
        isLoading: false,
      }));

      return snapshot;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create snapshot',
        isLoading: false,
      });
      throw error;
    }
  },

  // 更新快照
  updateSnapshot: async (input: UpdateSnapshotInput) => {
    set({ isLoading: true, error: null });

    try {
      const updated = await storage.update(input);

      set(state => ({
        snapshots: state.snapshots.map(s => (s.id === updated.id ? updated : s)),
        currentSnapshot: state.currentSnapshot?.id === updated.id ? updated : state.currentSnapshot,
        isLoading: false,
      }));

      return updated;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update snapshot',
        isLoading: false,
      });
      throw error;
    }
  },

  // 删除快照
  deleteSnapshot: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      await storage.delete(id);

      set(state => ({
        snapshots: state.snapshots.filter(s => s.id !== id),
        currentSnapshot: state.currentSnapshot?.id === id ? null : state.currentSnapshot,
        total: state.total - 1,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete snapshot',
        isLoading: false,
      });
      throw error;
    }
  },

  // 获取单个快照
  getSnapshot: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const snapshot = await storage.get(id);

      if (snapshot) {
        set({ currentSnapshot: snapshot, isLoading: false });
      } else {
        set({ isLoading: false });
      }

      return snapshot || null;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get snapshot',
        isLoading: false,
      });
      return null;
    }
  },

  // 获取最新快照
  getLatestSnapshot: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const snapshot = await storage.getLatest(userId);

      if (snapshot) {
        set({ currentSnapshot: snapshot, isLoading: false });
      } else {
        set({ isLoading: false });
      }

      return snapshot || null;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get latest snapshot',
        isLoading: false,
      });
      return null;
    }
  },

  // 刷新快照列表
  refreshSnapshots: async (userId: string) => {
    set({ page: 0 });
    await get().loadSnapshots(userId);
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },

  // 重置状态
  reset: () => {
    set({
      snapshots: [],
      currentSnapshot: null,
      isLoading: false,
      error: null,
      page: 0,
      total: 0,
      hasMore: false,
    });
  },
}));
