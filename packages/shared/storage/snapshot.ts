import { Snapshot, CreateSnapshotInput, UpdateSnapshotInput } from '../types';
import { generateId, formatDateKey, buildTimestampFromDate } from '../utils/date';
import { calculatePercentage, fixSnapshot } from '../utils/calculation';
import { getSupabaseStorageClient } from './supabase';

type SnapshotRow = {
  id: string;
  user_id: string;
  date: string;
  timestamp: number;
  base_currency: string;
  total_asset: number;
  assets: unknown;
  note: string | null;
  ai_insight: string | null;
  schema_version: string;
  created_at: number;
  updated_at: number;
};

function fromRow(row: SnapshotRow): Snapshot {
  return {
    id: row.id,
    userId: row.user_id,
    timestamp: row.timestamp,
    date: row.date,
    baseCurrency: row.base_currency,
    totalAsset: row.total_asset,
    assets: row.assets as Snapshot['assets'],
    note: row.note || undefined,
    aiInsight: row.ai_insight || undefined,
    schemaVersion: row.schema_version || '1.0.0',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(snapshot: Snapshot): SnapshotRow {
  return {
    id: snapshot.id,
    user_id: snapshot.userId,
    date: snapshot.date || formatDateKey(snapshot.timestamp),
    timestamp: snapshot.timestamp,
    base_currency: snapshot.baseCurrency,
    total_asset: snapshot.totalAsset,
    assets: snapshot.assets,
    note: snapshot.note || null,
    ai_insight: snapshot.aiInsight || null,
    schema_version: snapshot.schemaVersion || '1.0.0',
    created_at: snapshot.createdAt,
    updated_at: snapshot.updatedAt,
  };
}

export class SnapshotStorage {
  async create(input: CreateSnapshotInput): Promise<Snapshot> {
    const now = Date.now();
    const timestamp = buildTimestampFromDate(input.date, now);
    const totalAsset = input.assets.reduce((sum, group) => sum + group.totalValue, 0);
    const assetsWithPercentage = input.assets.map(group => ({
      ...group,
      percentage: calculatePercentage(group.totalValue, totalAsset),
    }));

    const snapshot = fixSnapshot({
      id: generateId('snap'),
      userId: input.userId,
      timestamp,
      date: input.date || formatDateKey(timestamp),
      baseCurrency: input.baseCurrency,
      totalAsset,
      assets: assetsWithPercentage,
      note: input.note,
      schemaVersion: '1.0.0',
      createdAt: now,
      updatedAt: now,
    });

    const { data, error } = await getSupabaseStorageClient()
      .from('snapshots')
      .insert(toRow(snapshot))
      .select()
      .single();

    if (error) throw error;
    return fromRow(data as SnapshotRow);
  }

  async update(input: UpdateSnapshotInput): Promise<Snapshot> {
    const updates: Partial<SnapshotRow> = {
      updated_at: Date.now(),
    };

    if (input.note !== undefined) updates.note = input.note || null;
    if (input.aiInsight !== undefined) updates.ai_insight = input.aiInsight || null;

    const { data, error } = await getSupabaseStorageClient()
      .from('snapshots')
      .update(updates)
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw error;
    return fromRow(data as SnapshotRow);
  }

  async upsert(snapshot: Snapshot): Promise<Snapshot> {
    const { data, error } = await getSupabaseStorageClient()
      .from('snapshots')
      .upsert(toRow(snapshot))
      .select()
      .single();

    if (error) throw error;
    return fromRow(data as SnapshotRow);
  }

  async get(id: string): Promise<Snapshot | undefined> {
    const { data, error } = await getSupabaseStorageClient()
      .from('snapshots')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? fromRow(data as SnapshotRow) : undefined;
  }

  async getByUserId(userId: string): Promise<Snapshot[]> {
    const { data, error } = await getSupabaseStorageClient()
      .from('snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return ((data || []) as SnapshotRow[]).map(fromRow);
  }

  async getByTimeRange(userId: string, startTime: number, endTime: number): Promise<Snapshot[]> {
    const { data, error } = await getSupabaseStorageClient()
      .from('snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startTime)
      .lte('timestamp', endTime)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return ((data || []) as SnapshotRow[]).map(fromRow);
  }

  async getLatest(userId: string): Promise<Snapshot | undefined> {
    const { data, error } = await getSupabaseStorageClient()
      .from('snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? fromRow(data as SnapshotRow) : undefined;
  }

  async getLatestN(userId: string, count: number): Promise<Snapshot[]> {
    const { data, error } = await getSupabaseStorageClient()
      .from('snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(count);

    if (error) throw error;
    return ((data || []) as SnapshotRow[]).map(fromRow);
  }

  async getPaginated(
    userId: string,
    offset: number,
    limit: number
  ): Promise<{ snapshots: Snapshot[]; total: number; hasMore: boolean }> {
    const end = offset + limit - 1;
    const { data, error, count } = await getSupabaseStorageClient()
      .from('snapshots')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .range(offset, end);

    if (error) throw error;
    const total = count || 0;
    return {
      snapshots: ((data || []) as SnapshotRow[]).map(fromRow),
      total,
      hasMore: offset + limit < total,
    };
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabaseStorageClient()
      .from('snapshots')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    const { error } = await getSupabaseStorageClient()
      .from('snapshots')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }

  async export(userId: string): Promise<{ exportedAt: number; baseCurrency: string; snapshots: Snapshot[] }> {
    const snapshots = await this.getByUserId(userId);
    const latest = snapshots[0];
    return {
      exportedAt: Date.now(),
      baseCurrency: latest?.baseCurrency || 'CNY',
      snapshots: [...snapshots].reverse(),
    };
  }

  async import(userId: string, data: { snapshots: Snapshot[] }): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const snapshot of data.snapshots || []) {
      try {
        const existing = await this.get(snapshot.id);
        if (existing) {
          skipped++;
          continue;
        }

        await this.upsert({
          ...snapshot,
          userId,
          date: snapshot.date || formatDateKey(snapshot.timestamp),
          updatedAt: Date.now(),
        });
        imported++;
      } catch (error) {
        console.error('Failed to import snapshot:', error);
        skipped++;
      }
    }

    return { imported, skipped };
  }
}

let snapshotStorage: SnapshotStorage | null = null;

export function getSnapshotStorage(): SnapshotStorage {
  if (!snapshotStorage) {
    snapshotStorage = new SnapshotStorage();
  }
  return snapshotStorage;
}
