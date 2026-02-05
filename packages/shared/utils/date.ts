import { AnalysisPeriod } from '../types';

/**
 * 生成唯一ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * 格式化日期
 */
function getDefaultLocale(): string {
  if (typeof document !== 'undefined') {
    return document.documentElement.lang || navigator.language || 'zh-CN';
  }
  if (typeof navigator !== 'undefined') {
    return navigator.language || 'zh-CN';
  }
  return 'zh-CN';
}

export function formatDate(
  timestamp: number,
  format: 'short' | 'long' | 'relative' = 'short'
): string {
  const date = new Date(timestamp);
  const locale = getDefaultLocale();
  const isZh = locale.startsWith('zh');

  if (format === 'relative') {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (isZh) {
      if (days === 0) return '今天';
      if (days === 1) return '昨天';
      if (days < 7) return `${days}天前`;
      if (days < 30) return `${Math.floor(days / 7)}周前`;
      if (days < 365) return `${Math.floor(days / 30)}个月前`;
      return `${Math.floor(days / 365)}年前`;
    }

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  }

  if (format === 'long') {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 格式化为 YYYY-MM-DD
 */
export function formatDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 将日期字符串与当前时间组合为时间戳
 */
export function buildTimestampFromDate(
  dateString: string,
  referenceTime: number = Date.now()
): number {
  const reference = new Date(referenceTime);
  const parts = dateString.split('-').map((value) => Number(value));
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    return referenceTime;
  }
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  date.setHours(
    reference.getHours(),
    reference.getMinutes(),
    reference.getSeconds(),
    reference.getMilliseconds()
  );
  return date.getTime();
}

/**
 * 计算两个时间戳之间的天数
 */
export function daysBetween(timestamp1: number, timestamp2: number): number {
  const diff = Math.abs(timestamp2 - timestamp1);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * 获取一天开始的时间戳
 */
export function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * 获取一天结束的时间戳
 */
export function getEndOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

/**
 * 获取周的开始时间（周一）
 */
export function getStartOfWeek(timestamp: number): number {
  const date = new Date(timestamp);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * 获取月的开始时间
 */
export function getStartOfMonth(timestamp: number): number {
  const date = new Date(timestamp);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * 获取季度的开始时间
 */
export function getStartOfQuarter(timestamp: number): number {
  const date = new Date(timestamp);
  const quarter = Math.floor(date.getMonth() / 3);
  date.setMonth(quarter * 3, 1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * 获取年的开始时间
 */
export function getStartOfYear(timestamp: number): number {
  const date = new Date(timestamp);
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * 获取日期范围（基于周期）
 */
export function getDateRange(
  period: AnalysisPeriod,
  referenceTime: number = Date.now()
): {
  start: number;
  end: number;
} {
  const end = getEndOfDay(referenceTime);
  let start: number;

  switch (period) {
    case 'week':
      start = end - 6 * 24 * 60 * 60 * 1000;
      break;
    case 'month':
      start = end - 29 * 24 * 60 * 60 * 1000;
      break;
    case 'quarter':
      start = end - 89 * 24 * 60 * 60 * 1000;
      break;
    case 'year':
      start = end - 364 * 24 * 60 * 60 * 1000;
      break;
    default:
      start = end - 29 * 24 * 60 * 60 * 1000;
  }

  return { start, end };
}

/**
 * 获取上一个周期的日期范围
 */
export function getPreviousPeriodRange(
  period: AnalysisPeriod,
  referenceTime: number = Date.now()
): {
  start: number;
  end: number;
} {
  const { start: currentStart } = getDateRange(period, referenceTime);
  const previousEnd = currentStart - 1; // 上一个周期的结束时间

  return getDateRange(period, previousEnd);
}

/**
 * 格式化时间范围
 */
export function formatDateRange(start: number, end: number): string {
  const startDate = formatDate(start, 'short');
  const endDate = formatDate(end, 'short');
  return `${startDate} - ${endDate}`;
}

/**
 * 判断是否为同一天
 */
export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  return getStartOfDay(timestamp1) === getStartOfDay(timestamp2);
}

/**
 * 判断是否为同一周
 */
export function isSameWeek(timestamp1: number, timestamp2: number): boolean {
  return getStartOfWeek(timestamp1) === getStartOfWeek(timestamp2);
}

/**
 * 判断是否为同一月
 */
export function isSameMonth(timestamp1: number, timestamp2: number): boolean {
  return getStartOfMonth(timestamp1) === getStartOfMonth(timestamp2);
}
