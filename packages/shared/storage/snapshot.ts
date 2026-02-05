import { Snapshot, CreateSnapshotInput, UpdateSnapshotInput } from '../types';
import { DBStore, STORES } from './db';
import { generateId, formatDateKey, buildTimestampFromDate } from '../utils/date';
import { calculateTotalAsset, calculatePercentage, fixSnapshot } from '../utils/calculation';

/**
 * 快照数据管理器
 */
export class SnapshotStorage {
  private store: DBStore<Snapshot>;

  constructor() {
    this.store = new DBStore<Snapshot>(STORES.SNAPSHOTS);
  }

  /**
   * 创建快照
   */
  async create(input: CreateSnapshotInput): Promise<Snapshot> {
    const now = Date.now();
    const timestamp = buildTimestampFromDate(input.date, now);

    // 计算每个资产组的总值和百分比
    const totalAsset = input.assets.reduce((sum, group) => sum + group.totalValue, 0);
    const assetsWithPercentage = input.assets.map(group => ({
      ...group,
      percentage: calculatePercentage(group.totalValue, totalAsset),
    }));

    const snapshot: Snapshot = {
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
    };

    // 修正快照数据（确保计算准确）
    const fixedSnapshot = fixSnapshot(snapshot);

    await this.store.add(fixedSnapshot);
    return fixedSnapshot;
  }

  /**
   * 更新快照
   */
  async update(input: UpdateSnapshotInput): Promise<Snapshot> {
    const existing = await this.store.get(input.id);
    if (!existing) {
      throw new Error(`Snapshot not found: ${input.id}`);
    }

    const updated: Snapshot = {
      ...existing,
      note: input.note !== undefined ? input.note : existing.note,
      aiInsight: input.aiInsight !== undefined ? input.aiInsight : existing.aiInsight,
      updatedAt: Date.now(),
    };

    await this.store.put(updated);
    return updated;
  }

  /**
   * 覆盖保存快照（用于批量重算）
   */
  async upsert(snapshot: Snapshot): Promise<Snapshot> {
    await this.store.put(snapshot);
    return snapshot;
  }

  /**
   * 获取快照
   */
  async get(id: string): Promise<Snapshot | undefined> {
    return this.store.get(id);
  }

  /**
   * 获取用户的所有快照
   */
  async getByUserId(userId: string): Promise<Snapshot[]> {
    const snapshots = await this.store.getByIndex('userId', userId);
    // 按时间倒序排列
    return snapshots.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 获取用户在指定时间范围内的快照
   */
  async getByTimeRange(
    userId: string,
    startTime: number,
    endTime: number
  ): Promise<Snapshot[]> {
    const allSnapshots = await this.getByUserId(userId);
    return allSnapshots.filter(
      snapshot => snapshot.timestamp >= startTime && snapshot.timestamp <= endTime
    );
  }

  /**
   * 获取用户最新的快照
   */
  async getLatest(userId: string): Promise<Snapshot | undefined> {
    const snapshots = await this.getByUserId(userId);
    return snapshots[0]; // 已经按时间倒序排列
  }

  /**
   * 获取用户最新的N个快照
   */
  async getLatestN(userId: string, count: number): Promise<Snapshot[]> {
    const snapshots = await this.getByUserId(userId);
    return snapshots.slice(0, count);
  }

  /**
   * 获取分页快照
   */
  async getPaginated(
    userId: string,
    offset: number,
    limit: number
  ): Promise<{
    snapshots: Snapshot[];
    total: number;
    hasMore: boolean;
  }> {
    const allSnapshots = await this.getByUserId(userId);
    const total = allSnapshots.length;
    const snapshots = allSnapshots.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return { snapshots, total, hasMore };
  }

  /**
   * 删除快照
   */
  async delete(id: string): Promise<void> {
    await this.store.delete(id);
  }

  /**
   * 删除用户的所有快照
   */
  async deleteAllByUserId(userId: string): Promise<void> {
    const snapshots = await this.getByUserId(userId);
    await Promise.all(snapshots.map(snapshot => this.delete(snapshot.id)));
  }

  /**
   * 获取快照统计信息
   */
  async getStats(userId: string): Promise<{
    total: number;
    earliest?: Snapshot;
    latest?: Snapshot;
    averageInterval?: number; // 平均记录间隔（天）
  }> {
    const snapshots = await this.getByUserId(userId);
    const total = snapshots.length;

    if (total === 0) {
      return { total: 0 };
    }

    const latest = snapshots[0];
    const earliest = snapshots[snapshots.length - 1];

    let averageInterval: number | undefined;
    if (total > 1) {
      const totalDays = (latest.timestamp - earliest.timestamp) / (1000 * 60 * 60 * 24);
      averageInterval = totalDays / (total - 1);
    }

    return {
      total,
      earliest,
      latest,
      averageInterval,
    };
  }

  /**
   * 导出所有快照数据
   */
  async export(userId: string): Promise<{
    exportedAt: number;
    baseCurrency: string;
    snapshots: Snapshot[];
  }> {
    const snapshots = await this.getByUserId(userId);
    const latest = snapshots[0];

    return {
      exportedAt: Date.now(),
      baseCurrency: latest?.baseCurrency || 'CNY',
      snapshots: snapshots.reverse(), // 按时间正序导出
    };
  }

  /**
   * 导入快照数据
   */
  async import(
    userId: string,
    data: { snapshots: Snapshot[] }
  ): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const snapshot of data.snapshots) {
      try {
        // 检查是否已存在
        const existing = await this.get(snapshot.id);
        if (existing) {
          skipped++;
          continue;
        }

        // 更新用户ID
        const importedSnapshot = {
          ...snapshot,
          userId,
          updatedAt: Date.now(),
          date: snapshot.date || formatDateKey(snapshot.timestamp),
        };

        await this.store.add(importedSnapshot);
        imported++;
      } catch (error) {
        console.error('Failed to import snapshot:', error);
        skipped++;
      }
    }

    return { imported, skipped };
  }
}

// 单例实例
let snapshotStorage: SnapshotStorage | null = null;

export function getSnapshotStorage(): SnapshotStorage {
  if (!snapshotStorage) {
    snapshotStorage = new SnapshotStorage();
  }
  return snapshotStorage;
}
