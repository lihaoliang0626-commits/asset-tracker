import React from 'react';
import { formatCurrency, formatNumber, formatPercent } from '@asset-tracker/shared';
import { cn } from '../../utils/cn';

export interface NumberDisplayProps {
  value: number;
  type?: 'currency' | 'number' | 'percent';
  currency?: string;
  decimals?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showChange?: boolean;
  change?: number;
  className?: string;
}

/**
 * 数字展示组件
 */
export const NumberDisplay: React.FC<NumberDisplayProps> = ({
  value,
  type = 'number',
  currency = 'CNY',
  decimals = 2,
  size = 'md',
  showChange = false,
  change = 0,
  className,
}) => {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl',
  };

  const formatValue = () => {
    switch (type) {
      case 'currency':
        return formatCurrency(value, currency);
      case 'percent':
        return formatPercent(value, decimals);
      case 'number':
      default:
        return formatNumber(value, decimals);
    }
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <div
        className={cn(
          'font-bold text-[#1F3A8A] tabular-nums',
          sizes[size]
        )}
      >
        {formatValue()}
      </div>
      {showChange && change !== 0 && (
        <div
          className={cn(
            'mt-1 text-sm font-medium tabular-nums',
            change > 0 ? 'text-[#1F3A8A]' : 'text-[#6B7280]'
          )}
        >
          {change > 0 ? '+' : ''}
          {formatNumber(change, decimals)}
          <span className="ml-1 text-xs">
            ({formatPercent((change / (value - change)) * 100, 1)})
          </span>
        </div>
      )}
    </div>
  );
};
