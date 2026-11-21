import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  label?: string;
  title?: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  icon?: LucideIcon;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  isLoading?: boolean;
  className?: string;
}

function renderValue(value: React.ReactNode) {
  if (typeof value === 'string') {
    const match = value.match(/^([+-]?)\s*([A-Z]{3})\s*([+-]?)(.+)$/);
    if (match) {
      const sign = match[1] || match[3] || '';
      const code = match[2];
      const amount = match[4].trim();
      const prefix = sign ? `${sign}${code}` : code;
      return (
        <span className="inline-flex flex-wrap items-baseline gap-x-1 break-words">
          <span className="text-xs font-normal tracking-normal text-muted-foreground shrink-0">{prefix}</span>
          <span className="break-all sm:break-normal">{amount}</span>
        </span>
      );
    }
  }
  return value;
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

  const iconBgClass = {
    default: 'bg-muted/80 text-muted-foreground border-border/40',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
  }[variant];

  const statusDotClass = {
    default: 'bg-muted-foreground/30',
    destructive: 'bg-destructive',
    success: 'bg-success',
    warning: 'bg-warning',
  }[variant];

  return (
    <Card
      className={cn(
        'rounded-2xl border-border/80 bg-card hover:border-border transition-all duration-200 shadow-xs',
        className
      )}
    >
      <CardContent className="p-3.5 sm:p-5 flex flex-col justify-between gap-2.5 sm:gap-3 h-full">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && (
              <div
                className={cn(
                  'size-6.5 rounded-lg flex items-center justify-center shrink-0 border',
                  iconBgClass
                )}
              >
                <Icon className="size-3.5" />
              </div>
            )}
            <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground truncate">
              {displayLabel}
            </p>
          </div>
          {variant !== 'default' && (
            <span className={cn('size-1.5 rounded-full shrink-0', statusDotClass)} />
          )}
        </div>

        {isLoading ? (
          <div className="space-y-1.5 pt-0.5">
            <Skeleton className="h-7 sm:h-8 w-24 sm:w-28" />
            {caption && <Skeleton className="h-3 w-28 sm:w-36" />}
          </div>
        ) : (
          <div className="space-y-1 min-w-0">
            <div className="text-xl xs:text-2xl sm:text-3xl font-semibold tracking-tight text-foreground tabular-nums leading-none break-words">
              {renderValue(value)}
            </div>
            {caption && (
              <div className="text-micro text-muted-foreground/90 leading-tight">
                {caption}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
