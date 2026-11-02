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
      <CardContent className="p-3.5 sm:p-5 flex flex-col justify-between gap-1.5 sm:gap-2 h-full">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] sm:text-xs text-muted-foreground font-semibold tracking-normal leading-snug">
            {displayLabel}
          </p>
          {Icon && (
            <div className={cn('size-7 sm:size-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0', iconBgClass)}>
              <Icon className="size-3.5 sm:size-4.5" />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-1.5 pt-0.5">
            <Skeleton className="h-6 sm:h-7 w-24 sm:w-32" />
            {caption && <Skeleton className="h-3 sm:h-3.5 w-28 sm:w-36" />}
          </div>
        ) : (
          <div className="space-y-0.5 min-w-0">
            <div className={cn('text-lg sm:text-2xl font-bold tracking-normal tabular-nums leading-snug break-words', valueColorClass)}>
              {value}
            </div>
            {caption && (
              <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 leading-snug">
                {caption}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
