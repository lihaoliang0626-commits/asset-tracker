import React from 'react';
import { cn } from '../../utils/cn';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface BottomNavProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

/**
 * 底部导航栏组件 - 简约大气设计
 */
export const BottomNav: React.FC<BottomNavProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
}) => {
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-light-0',
        'border-t border-light-3 shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full',
                'transition-colors duration-200',
                isActive
                  ? 'text-accent-primary'
                  : 'text-text-tertiary hover:text-text-secondary'
              )}
            >
              {tab.icon && (
                <div className="mb-1 flex items-center justify-center">
                  {tab.icon}
                </div>
              )}
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
