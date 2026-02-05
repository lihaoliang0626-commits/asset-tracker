import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Goal, GoalProgress, CreateGoalInput, UpdateGoalInput } from '@asset-tracker/shared';
import { calculateGoalProgress, getGoalStatus } from '@asset-tracker/shared';
import { Snapshot } from '@asset-tracker/shared';

/**
 * 目标状态接口
 */
interface GoalState {
  // 状态
  goals: Goal[];
  activeGoal: Goal | null;
  currentProgress: GoalProgress | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadGoals: (userId: string) => void;
  getActiveGoal: (userId: string) => Goal | null;
  createGoal: (input: CreateGoalInput, currentSnapshot: Snapshot) => Goal;
  updateGoal: (input: UpdateGoalInput) => Goal;
  deleteGoal: (id: string) => void;
  toggleGoalActive: (id: string, isActive: boolean) => void;
  calculateProgress: (goal: Goal, currentSnapshot: Snapshot, historicalSnapshots: Snapshot[]) => GoalProgress;
  refreshProgress: (userId: string, currentSnapshot: Snapshot, historicalSnapshots: Snapshot[]) => void;
  clearError: () => void;
  reset: () => void;
}

/**
 * 目标状态 Store
 */
export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      // 初始状态
      goals: [],
      activeGoal: null,
      currentProgress: null,
      isLoading: false,
      error: null,

      // 加载目标列表
      loadGoals: (userId: string) => {
        const { goals } = get();
        const userGoals = goals.filter(g => g.userId === userId);
        const active = userGoals.find(g => g.isActive) || null;

        set({
          activeGoal: active,
        });
      },

      // 获取激活的目标
      getActiveGoal: (userId: string) => {
        const { goals } = get();
        return goals.find(g => g.userId === userId && g.isActive) || null;
      },

      // 创建目标
      createGoal: (input: CreateGoalInput, currentSnapshot: Snapshot) => {
        const now = Date.now();

        // 先将其他目标设为非激活
        const updatedGoals = get().goals.map(g => ({
          ...g,
          isActive: g.userId === input.userId ? false : g.isActive,
        }));

        const newGoal: Goal = {
          id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: input.userId,
          title: input.title,
          targetAmount: input.targetAmount,
          baseCurrency: currentSnapshot.baseCurrency,
          deadline: input.deadline,
          startAmount: currentSnapshot.totalAsset,
          startTime: now,
          description: input.description,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        set({
          goals: [...updatedGoals, newGoal],
          activeGoal: newGoal,
        });

        return newGoal;
      },

      // 更新目标
      updateGoal: (input: UpdateGoalInput) => {
        const { goals } = get();
        const goal = goals.find(g => g.id === input.id);

        if (!goal) {
          throw new Error('Goal not found');
        }

        const updated: Goal = {
          ...goal,
          ...(input.title && { title: input.title }),
          ...(input.targetAmount && { targetAmount: input.targetAmount }),
          ...(input.deadline && { deadline: input.deadline }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          updatedAt: Date.now(),
        };

        const updatedGoals = goals.map(g => (g.id === input.id ? updated : g));

        set({
          goals: updatedGoals,
          activeGoal: get().activeGoal?.id === input.id ? updated : get().activeGoal,
        });

        return updated;
      },

      // 删除目标
      deleteGoal: (id: string) => {
        const { goals, activeGoal } = get();

        set({
          goals: goals.filter(g => g.id !== id),
          activeGoal: activeGoal?.id === id ? null : activeGoal,
          currentProgress: activeGoal?.id === id ? null : get().currentProgress,
        });
      },

      // 切换目标激活状态
      toggleGoalActive: (id: string, isActive: boolean) => {
        const { goals } = get();
        const goal = goals.find(g => g.id === id);

        if (!goal) return;

        // 如果激活新目标，需要将其他目标设为非激活
        const updatedGoals = isActive
          ? goals.map(g => ({
              ...g,
              isActive: g.id === id ? true : g.userId === goal.userId ? false : g.isActive,
            }))
          : goals.map(g => (g.id === id ? { ...g, isActive } : g));

        const newActiveGoal = isActive ? { ...goal, isActive: true } : null;

        set({
          goals: updatedGoals,
          activeGoal: newActiveGoal,
        });
      },

      // 计算进度
      calculateProgress: (goal: Goal, currentSnapshot: Snapshot, historicalSnapshots: Snapshot[]) => {
        const progress = calculateGoalProgress(goal, currentSnapshot, historicalSnapshots);

        set({
          currentProgress: progress,
        });

        return progress;
      },

      // 刷新进度
      refreshProgress: (userId: string, currentSnapshot: Snapshot, historicalSnapshots: Snapshot[]) => {
        const { activeGoal } = get();

        if (!activeGoal || activeGoal.userId !== userId) {
          return;
        }

        const progress = calculateGoalProgress(activeGoal, currentSnapshot, historicalSnapshots);

        set({
          currentProgress: progress,
        });
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },

      // 重置状态
      reset: () => {
        set({
          goals: [],
          activeGoal: null,
          currentProgress: null,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'goal-storage', // localStorage key
      partialize: (state) => ({
        goals: state.goals, // 只持久化 goals
      }),
    }
  )
);
