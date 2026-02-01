import React from 'react';
import { cn } from '../../utils/cn';
import { Button as ShadcnButton } from '../ui/button';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

/**
 * 按钮组件 - 简约大气设计
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const variants = {
      primary: 'default',
      secondary: 'secondary',
      ghost: 'ghost',
    };

    const sizes = {
      sm: 'sm',
      md: 'default',
      lg: 'lg',
    };

    return (
      <ShadcnButton
        ref={ref}
        className={cn(
          className
        )}
        variant={variants[variant] as any}
        size={sizes[size] as any}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>加载中...</span>
          </>
        ) : (
          children
        )}
      </ShadcnButton>
    );
  }
);

Button.displayName = 'Button';
