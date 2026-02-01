import React from 'react';
import { cn } from '../../utils/cn';

export interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 主布局组件 - 简约大气设计（浅色背景）
 */
export const Layout: React.FC<LayoutProps> = ({ children, className }) => {
  return (
    <div className={cn('min-h-screen bg-light-0', className)}>
      {children}
    </div>
  );
};
