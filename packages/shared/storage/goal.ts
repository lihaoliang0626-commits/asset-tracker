import { Goal, CreateGoalInput, UpdateGoalInput } from '../types';
import { getSupabaseStorageClient } from './supabase';

type GoalRow = {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  base_currency: string;
  deadline: number;
  start_amount: number;
  start_time: number;
  description: string | null;
  is_active: boolean;
  created_at: number;
  updated_at: number;
};

function fromRow(row: GoalRow): Goal {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    targetAmount: row.target_amount,
    baseCurrency: row.base_currency,
    deadline: row.deadline,
    startAmount: row.start_amount,
    startTime: row.start_time,
    description: row.description || undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(goal: Goal): GoalRow {
  return {
    id: goal.id,
    user_id: goal.userId,
    title: goal.title,
    target_amount: goal.targetAmount,
    base_currency: goal.baseCurrency,
    deadline: goal.deadline,
    start_amount: goal.startAmount,
    start_time: goal.startTime,
    description: goal.description || null,
    is_active: goal.isActive,
    created_at: goal.createdAt,
    updated_at: goal.updatedAt,
  };
}

export class GoalStorage {
  async getByUserId(userId: string): Promise<Goal[]> {
    const { data, error } = await getSupabaseStorageClient()
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return ((data || []) as GoalRow[]).map(fromRow);
  }

  async getActive(userId: string): Promise<Goal | null> {
    const { data, error } = await getSupabaseStorageClient()
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data ? fromRow(data as GoalRow) : null;
  }

  async create(input: CreateGoalInput, currentAmount: number, baseCurrency: string): Promise<Goal> {
    const now = Date.now();
    const client = getSupabaseStorageClient();

    await client
      .from('goals')
      .update({ is_active: false, updated_at: now })
      .eq('user_id', input.userId);

    const goal: Goal = {
      id: `goal_${now}_${Math.random().toString(36).slice(2, 11)}`,
      userId: input.userId,
      title: input.title,
      targetAmount: input.targetAmount,
      baseCurrency,
      deadline: input.deadline,
      startAmount: currentAmount,
      startTime: now,
      description: input.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await client
      .from('goals')
      .insert(toRow(goal))
      .select()
      .single();

    if (error) throw error;
    return fromRow(data as GoalRow);
  }

  async update(input: UpdateGoalInput): Promise<Goal> {
    const updates: Partial<GoalRow> = {
      updated_at: Date.now(),
    };

    if (input.title !== undefined) updates.title = input.title;
    if (input.targetAmount !== undefined) updates.target_amount = input.targetAmount;
    if (input.deadline !== undefined) updates.deadline = input.deadline;
    if (input.description !== undefined) updates.description = input.description || null;
    if (input.isActive !== undefined) updates.is_active = input.isActive;

    const { data, error } = await getSupabaseStorageClient()
      .from('goals')
      .update(updates)
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw error;
    return fromRow(data as GoalRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabaseStorageClient()
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

let goalStorage: GoalStorage | null = null;

export function getGoalStorage(): GoalStorage {
  if (!goalStorage) {
    goalStorage = new GoalStorage();
  }
  return goalStorage;
}
