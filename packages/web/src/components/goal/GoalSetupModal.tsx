import React, { useState, useEffect } from 'react';
import { CreateGoalInput, Goal } from '@asset-tracker/shared';
import { Modal } from '../base/Modal';
import { Button } from '../base/Button';
import { Input } from '../base/Input';

interface GoalSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: Omit<CreateGoalInput, 'userId'>) => void;
  baseCurrency: string;
  currentAmount: number;
  existingGoal?: Goal; // 如果传入现有目标，则为编辑模式
}

/**
 * 设置目标模态框
 */
export const GoalSetupModal: React.FC<GoalSetupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  baseCurrency,
  currentAmount,
  existingGoal
}) => {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!existingGoal;

  // 当打开模态框时，如果是编辑模式，填充现有数据
  useEffect(() => {
    if (isOpen && existingGoal) {
      setTitle(existingGoal.title);
      setTargetAmount(existingGoal.targetAmount.toString());
      setDeadline(new Date(existingGoal.deadline).toISOString().split('T')[0]);
      setDescription(existingGoal.description || '');
    }
  }, [isOpen, existingGoal]);

  // 重置表单
  const resetForm = () => {
    setTitle('');
    setTargetAmount('');
    setDeadline('');
    setDescription('');
    setErrors({});
  };

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = '请输入目标名称';
    }

    const amount = parseFloat(targetAmount);
    if (!targetAmount || isNaN(amount) || amount <= 0) {
      newErrors.targetAmount = '请输入有效的目标金额';
    } else if (!isEditMode && amount <= currentAmount) {
      newErrors.targetAmount = '目标金额应大于当前资产';
    }

    if (!deadline) {
      newErrors.deadline = '请选择截止日期';
    } else {
      const deadlineDate = new Date(deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (deadlineDate <= today) {
        newErrors.deadline = '截止日期必须晚于今天';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const deadlineTimestamp = new Date(deadline).getTime();

    onSubmit({
      title: title.trim(),
      targetAmount: parseFloat(targetAmount),
      deadline: deadlineTimestamp,
      description: description.trim() || undefined
    });

    resetForm();
    onClose();
  };

  // 格式化金额输入
  const handleAmountChange = (value: string) => {
    // 只允许数字和小数点
    const cleaned = value.replace(/[^\d.]/g, '');
    setTargetAmount(cleaned);
  };

  // 获取最小日期（明天）
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title={isEditMode ? "编辑目标" : "设置资产目标"}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 目标名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            目标名称
          </label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：2027年底达到100万"
            className={errors.title ? 'border-red-500' : ''}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-red-600">{errors.title}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            建议格式："年份 + 达到 + 金额"，如"2027年底达到100万"
          </p>
        </div>

        {/* 目标金额 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            目标金额
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={targetAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="1000000"
              className={errors.targetAmount ? 'border-red-500 flex-1' : 'flex-1'}
            />
            <div className="flex items-center px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-700 font-medium">
              {baseCurrency}
            </div>
          </div>
          {errors.targetAmount && (
            <p className="mt-1 text-xs text-red-600">{errors.targetAmount}</p>
          )}
          {currentAmount > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              当前资产：{new Intl.NumberFormat('zh-CN').format(currentAmount)} {baseCurrency}
            </p>
          )}
        </div>

        {/* 截止日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            截止日期
          </label>
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            min={getMinDate()}
            className={errors.deadline ? 'border-red-500' : ''}
          />
          {errors.deadline && (
            <p className="mt-1 text-xs text-red-600">{errors.deadline}</p>
          )}
        </div>

        {/* 描述（可选） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            描述（可选）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="为了..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
          />
        </div>

        {/* 提示信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800 font-medium mb-2">💡 提示：</p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• 目标只是参考，不会打扰你</li>
            <li>• 你可以随时修改或暂停目标</li>
            <li>• 我们会基于历史数据预测趋势</li>
          </ul>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="flex-1"
          >
            取消
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
          >
            {isEditMode ? '保存修改' : '设置目标'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
