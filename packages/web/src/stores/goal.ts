import { create } from 'zustand';
import { Goal, GoalProgress, CreateGoalInput, UpdateGoalInput } from '@asset-tracker/shared';
import { calculateGoalProgress, getGoalStorage } from '@asset-tracker/shared';
import { Snapshot } from '@asset-tracker/shared';

interface GoalState {
  goals: Goal[];
  activeGoal: Goal | null;
  currentProgress: GoalProgress | null;
  isLoading: boolean;
  error: string | null;
  loadGoals: (userId: string) => Promise<void>;
  getActiveGoal: (userId: string) => Promise<Goal | null>;
  createGoal: (input: CreateGoalInput, currentSnapshot: Snapshot) => Promise<Goal>;
  updateGoal: (input: UpdateGoalInput) => Promise<Goal>;
  deleteGoal: (id: string) => Promise<void>;
  toggleGoalActive: (id: string, isActive: boolean) => Promise<void>;
  calculateProgress: (goal: Goal, currentSnapshot: Snapshot, historicalSnapshots: Snapshot[]) => GoalProgress;
  refreshProgress: (userId: string, currentSnapshot: Snapshot, historicalSnapshots: Snapshot[]) => void;
  clearError: () => void;
  reset: () => void;
}

const storage = getGoalStorage();

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  activeGoal: null,
  currentProgress: null,
  isLoading: false,
  error: null,

  loadGoals: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const goals = await storage.getByUserId(userId);
      set({
        goals,
        activeGoal: goals.find(g => g.isActive) || null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load goals',
        isLoading: false,
      });
    }
  },

  getActiveGoal: async (userId: string) => {
    try {
      const activeGoal = await storage.getActive(userId);
      set({ activeGoal });
      return activeGoal;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load active goal' });
      return null;
    }
  },

  createGoal: async (input: CreateGoalInput, currentSnapshot: Snapshot) => {
    set({ isLoading: true, error: null });
    try {
      const goal = await storage.create(input, currentSnapshot.totalAsset, currentSnapshot.baseCurrency);
      const goals = await storage.getByUserId(input.userId);
      set({
        goals,
        activeGoal: goal,
        isLoading: false,
      });
      return goal;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create goal',
        isLoading: false,
      });
      throw error;
    }
  },

  updateGoal: async (input: UpdateGoalInput) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await storage.update(input);
      set(state => ({
        goals: state.goals.map(g => (g.id === updated.id ? updated : g)),
        activeGoal: state.activeGoal?.id === updated.id ? updated : state.activeGoal,
        isLoading: false,
      }));
      return updated;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update goal',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteGoal: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await storage.delete(id);
      set(state => ({
        goals: state.goals.filter(g => g.id !== id),
        activeGoal: state.activeGoal?.id === id ? null : state.activeGoal,
        currentProgress: state.activeGoal?.id === id ? null : state.currentProgress,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete goal',
        isLoading: false,
      });
      throw error;
    }
  },

  toggleGoalActive: async (id: string, isActive: boolean) => {
    const goal = get().goals.find(g => g.id === id);
    if (!goal) return;
    await storage.update({ id, isActive });
    await get().loadGoals(goal.userId);
  },

  calculateProgress: (goal: Goal, currentSnapshot: Snapshot, historicalSnapshots: Snapshot[]) => {
    const progress = calculateGoalProgress(goal, currentSnapshot, historicalSnapshots);
    set({ currentProgress: progress });
    return progress;
  },

  refreshProgress: (userId: string, currentSnapshot: Snapshot, historicalSnapshots: Snapshot[]) => {
    const { activeGoal } = get();
    if (!activeGoal || activeGoal.userId !== userId) return;
    set({
      currentProgress: calculateGoalProgress(activeGoal, currentSnapshot, historicalSnapshots),
    });
  },

  clearError: () => set({ error: null }),

  reset: () => {
    set({
      goals: [],
      activeGoal: null,
      currentProgress: null,
      isLoading: false,
      error: null,
    });
  },
}));
