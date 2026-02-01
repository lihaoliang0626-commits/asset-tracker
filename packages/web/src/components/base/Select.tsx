import React from 'react';
import { cn } from '../../utils/cn';
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export interface SelectProps {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onChange?: (event: { target: { value: string } }) => void;
  onValueChange?: (value: string) => void;
}

/**
 * 下拉选择组件
 */
export const Select: React.FC<SelectProps> = ({
  className,
  label,
  error,
  options,
  value,
  placeholder,
  disabled,
  onChange,
  onValueChange,
}) => {
  const handleValueChange = (nextValue: string) => {
    onValueChange?.(nextValue);
    onChange?.({ target: { value: nextValue } });
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2">
          {label}
        </label>
      )}
      <ShadcnSelect
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger className={cn(error && 'border-destructive', className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </ShadcnSelect>
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};
