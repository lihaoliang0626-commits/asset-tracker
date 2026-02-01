import React from 'react';
import { cn } from '../../utils/cn';
import {
  Card as ShadcnCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  hoverable?: boolean;
}

/**
 * 卡片组件 - 简约大气设计
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, subtitle, action, hoverable, children, ...props }, ref) => {
    return (
      <ShadcnCard
        ref={ref}
        className={cn(
          hoverable && 'hover:bg-accent/40 transition-colors cursor-pointer',
          className
        )}
        {...props}
      >
        {(title || subtitle || action) && (
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="flex-1 space-y-1">
              {title && (
                <CardTitle className="text-base">{title}</CardTitle>
              )}
              {subtitle && (
                <CardDescription className="text-xs">{subtitle}</CardDescription>
              )}
            </div>
            {action && <div className="ml-4">{action}</div>}
          </CardHeader>
        )}
        <CardContent className={cn((title || subtitle || action) ? 'pt-0' : 'pt-6')}>
          {children}
        </CardContent>
      </ShadcnCard>
    );
  }
);

Card.displayName = 'Card';
