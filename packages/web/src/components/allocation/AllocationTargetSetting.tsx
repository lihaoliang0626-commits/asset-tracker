import React, { useState, useEffect } from 'react';
import { Card, Button } from '../../components/base';
import {
  AssetAllocationTarget,
  AssetAllocationLevel,
  ALLOCATION_LEVEL_INFO,
  DEFAULT_ALLOCATION_TARGET,
  validateAllocationTarget,
} from '@asset-tracker/shared';

interface AllocationTargetSettingProps {
  value?: AssetAllocationTarget;
  onChange: (target: AssetAllocationTarget) => void;
}

/**
 * 资产配置目标设置组件
 */
export const AllocationTargetSetting: React.FC<AllocationTargetSettingProps> = ({
  value,
  onChange,
}) => {
  const [target, setTarget] = useState<AssetAllocationTarget>(
    value || DEFAULT_ALLOCATION_TARGET
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      setTarget(value);
    }
  }, [value]);

  // 更新单个配置项
  const updateLevel = (level: AssetAllocationLevel, percentage: number) => {
    const newTarget = { ...target, [level]: percentage, updatedAt: Date.now() };
    setTarget(newTarget);

    // 验证
    const validation = validateAllocationTarget(newTarget);
    if (validation.valid) {
      setError(null);
    } else {
      setError(validation.error || null);
    }
  };

  // 保存配置
  const handleSave = () => {
    const validation = validateAllocationTarget(target);
    if (!validation.valid) {
      setError(validation.error || '配置无效');
      return;
    }

    onChange(target);
    setError(null);
  };

  // 计算总和
  const sum = target.cash + target.stable + target.growth + target.risky;
  const isValid = Math.abs(sum - 100) < 0.01;

  return (
    <Card title="资产配置目标">
      <div className="space-y-6">
        {/* 说明文案 */}
        <p className="text-sm text-text-tertiary">
          以下比例由你自行设定，用于对比当前资产结构
        </p>

        {/* 配置项列表 */}
        <div className="space-y-5">
          {Object.values(AssetAllocationLevel).map((level) => {
            const info = ALLOCATION_LEVEL_INFO[level];
            const percentage = target[level];

            return (
              <div key={level} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{info.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {info.label}
                        <span className="text-xs text-text-tertiary ml-2">({info.riskLevel})</span>
                      </p>
                      <p className="text-xs text-text-tertiary">{info.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={percentage}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                        updateLevel(level, val);
                      }}
                      className="w-16 px-2 py-1 text-sm text-right border border-light-3 rounded focus:outline-none focus:border-accent-primary"
                    />
                    <span className="text-sm text-text-secondary">%</span>
                  </div>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={percentage}
                  onChange={(e) => updateLevel(level, Number(e.target.value))}
                  className="w-full h-2 bg-light-2 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #1F3A8A ${percentage}%, #E5E7EB ${percentage}%)`,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* 总和显示 */}
        <div className="flex items-center justify-between p-3 bg-light-1 rounded-lg">
          <span className="text-sm font-medium text-text-primary">总计</span>
          <span
            className={`text-base font-bold ${
              isValid ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {sum.toFixed(1)}% {isValid && '✓'}
          </span>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 保存按钮 */}
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!isValid}
          className="w-full"
        >
          保存配置
        </Button>

        {/* 自定义滑块样式 */}
        <style dangerouslySetInnerHTML={{__html: `
          .slider::-webkit-slider-thumb {
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #1F3A8A;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          .slider::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #1F3A8A;
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `}} />
      </div>
    </Card>
  );
};
