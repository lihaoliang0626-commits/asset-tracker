/**
 * 目标设定 - 数据模型
 */
export interface Goal {
  id: string;                      // 目标唯一ID
  userId: string;                  // 用户ID
  title: string;                   // 目标标题（如"2027年达到100万"）
  targetAmount: number;            // 目标金额（基准货币）
  baseCurrency: string;            // 基准货币
  deadline: number;                // 目标截止时间（时间戳）
  startAmount: number;             // 起始金额（设定目标时的净资产）
  startTime: number;               // 设定目标的时间（时间戳）
  description?: string;            // 目标描述/备注
  isActive: boolean;               // 是否激活（用户可以暂停目标）
  createdAt: number;               // 创建时间
  updatedAt: number;               // 更新时间
}

/**
 * 目标进度
 */
export interface GoalProgress {
  goalId: string;
  currentAmount: number;           // 当前净资产
  targetAmount: number;            // 目标金额
  startAmount: number;             // 起始金额
  progress: number;                // 进度百分比（0-100）
  remaining: number;               // 剩余金额

  // 时间进度
  elapsedDays: number;             // 已过天数
  totalDays: number;               // 总天数
  timeProgress: number;            // 时间进度百分比（0-100）

  // 趋势分析
  averageGrowthRate: number;       // 平均增长率（每月）
  predictedAmount?: number;        // 预测到期金额
  predictedDate?: number;          // 预测达成日期（如果按当前趋势）
  onTrack: boolean;                // 是否在正轨上

  calculatedAt: number;            // 计算时间
}

/**
 * 目标创建输入
 */
export interface CreateGoalInput {
  userId: string;
  title: string;
  targetAmount: number;
  deadline: number;                // 截止日期（时间戳）
  description?: string;
}

/**
 * 目标更新输入
 */
export interface UpdateGoalInput {
  id: string;
  title?: string;
  targetAmount?: number;
  deadline?: number;
  description?: string;
  isActive?: boolean;
}

/**
 * 目标达成状态
 */
export type GoalStatus =
  | 'not_started'    // 尚未开始（当前金额 < 起始金额）
  | 'in_progress'    // 进行中
  | 'on_track'       // 进行中且在正轨上
  | 'behind'         // 进行中但落后
  | 'achieved'       // 已达成
  | 'overdue';       // 已过期但未达成
