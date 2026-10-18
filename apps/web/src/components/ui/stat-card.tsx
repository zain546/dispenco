import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  label?: string;
  title?: string;
  value: React.ReactNode;
  caption?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  isLoading?: boolean;
  className?: string;
}

export function StatCard({
  label,
  title,
  value,
  caption,
  icon: Icon,
  variant = 'default',
  isLoading = false,
  className,
}: StatCardProps) {
  const displayLabel = label || title || '';

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
      <CardContent className="p-3.5 sm:p-5 flex items-center justify-between gap-3 h-full">
        <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
          <p className="text-micro sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider text-overline truncate">
            {displayLabel}
          </p>
          {isLoading ? (
            <div className="space-y-1 py-1">
              <Skeleton className="h-6 sm:h-7 w-20 sm:w-28" />
              {caption && <Skeleton className="h-3 sm:h-3.5 w-24 sm:w-36" />}
            </div>
          ) : (
            <>
              <div className={cn('text-xl sm:text-2xl font-bold tracking-tight tabular-nums truncate', valueColorClass)}>
                {value}
              </div>
              {caption && (
                <p className="text-micro sm:text-xs text-muted-foreground truncate leading-normal">
                  {caption}
                </p>
              )}
            </>
          )}
        </div>

        {Icon && (
          <div className={cn('size-9 sm:size-10 rounded-xl flex items-center justify-center shrink-0', iconBgClass)}>
            <Icon className="size-4.5 sm:size-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
