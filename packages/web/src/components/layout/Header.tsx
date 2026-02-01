import React from 'react';
import { cn } from '../../utils/cn';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  backButton?: boolean;
  onBack?: () => void;
  className?: string;
}

/**
 * 页面头部组件 - 简约大气设计
 */
export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  action,
  backButton,
  onBack,
  className,
}) => {
  return (
    <header
      className={cn(
        'bg-light-0 border-b border-light-3',
        'px-4 py-4 mb-4',
        className
      )}
    >
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3">
          {backButton && (
            <button
              onClick={onBack}
              className="text-text-tertiary hover:text-text-primary transition-colors duration-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
            {subtitle && (
              <p className="text-xs text-text-tertiary mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </header>
  );
};
