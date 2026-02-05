import React from 'react';
import { Card } from '../../components/base';
import {
  AllocationComparison,
  formatCurrency,
} from '@asset-tracker/shared';

interface AllocationComparisonCardProps {
  comparisons: AllocationComparison[];
  baseCurrency: string;
}

/**
 * 资产配置对比卡片组件
 */
export const AllocationComparisonCard: React.FC<AllocationComparisonCardProps> = ({
  comparisons,
  baseCurrency,
}) => {
  return (
    <Card title="📊 资产配置对比">
      <div className="space-y-6">
        {comparisons.map((comparison) => {
          const { info, current, target, deviation } = comparison;

          // 计算横条上的标记位置（百分比）
          const currentPosition = Math.min(100, Math.max(0, current.percentage));
          const targetPosition = Math.min(100, Math.max(0, target.percentage));

          return (
            <div key={info.key} className="space-y-2">
              {/* 标题行 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{info.icon}</span>
                  <div>
                    <span className="text-sm font-medium text-text-primary">
                      {info.label}
                    </span>
                    <span className="text-xs text-text-tertiary ml-2">
                      ({info.riskLevel})
                    </span>
                  </div>
                </div>
              </div>

              {/* 数值行 */}
              <div className="flex items-baseline justify-between text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-semibold text-text-primary">
                    {current.percentage.toFixed(1)}%
                  </span>
                  <span className="text-text-tertiary">
                    {formatCurrency(current.amount, baseCurrency)}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-text-tertiary">目标</span>
                  <span className="text-sm font-medium text-text-secondary">
                    {target.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* 横条对比图 */}
              <div className="relative h-2 bg-light-2 rounded-full overflow-hidden">
                {/* 目标位置标记线 */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-accent-primary opacity-50 z-10"
                  style={{ left: `${targetPosition}%` }}
                />

                {/* 当前值填充条 */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-accent-primary rounded-full transition-all duration-300"
                  style={{ width: `${currentPosition}%` }}
                />

                {/* 当前位置圆点标记 */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-accent-primary rounded-full border-2 border-white shadow-md transition-all duration-300 z-20"
                  style={{ left: `${currentPosition}%`, marginLeft: '-6px' }}
                />
              </div>

              {/* 偏离提示（如果偏离较大） */}
              {Math.abs(deviation.percentage) > 5 && (
                <div className="text-xs text-text-tertiary">
                  {deviation.percentage > 0 ? (
                    <span>
                      超配 {Math.abs(deviation.percentage).toFixed(1)}%
                      （约 {formatCurrency(Math.abs(deviation.amount), baseCurrency)}）
                    </span>
                  ) : (
                    <span>
                      欠配 {Math.abs(deviation.percentage).toFixed(1)}%
                      （约 {formatCurrency(Math.abs(deviation.amount), baseCurrency)}）
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* 底部说明 */}
        <div className="pt-4 border-t border-light-2">
          <p className="text-xs text-text-tertiary leading-relaxed">
            基于你当前资产与目标配置的结构对比，仅用于展示，不构成任何建议。
          </p>
        </div>
      </div>
    </Card>
  );
};
