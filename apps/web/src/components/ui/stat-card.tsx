import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  caption?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  className?: string;
}

export function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  variant = 'default',
  className,
}: StatCardProps) {
  const valueColorClass = {
    default: 'text-foreground',
    destructive: 'text-destructive',
    success: 'text-success',
    warning: 'text-warning',
  }[variant];

  const iconBgClass = {
    default: 'bg-primary/10 text-primary',
    destructive: 'bg-destructive/10 text-destructive',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  }[variant];

  return (
    <Card className={cn('border-border/80 shadow-2xs hover:border-border transition-colors', className)}>
      <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider text-overline truncate">
            {label}
          </p>
          <div className={cn('text-xl sm:text-2xl font-bold tracking-tight tabular-nums', valueColorClass)}>
            {value}
          </div>
          {caption && (
            <p className="text-xs text-muted-foreground truncate leading-normal">
              {caption}
            </p>
          )}
        </div>

        {Icon && (
          <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', iconBgClass)}>
            <Icon className="size-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
