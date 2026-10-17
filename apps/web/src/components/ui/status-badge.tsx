import React from 'react';
import { cn } from '@/lib/utils';

export type StatusBadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'destructive'
  | 'info'
  | 'neutral';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusBadgeVariant;
  status?: StatusBadgeVariant;
  dot?: boolean;
  pulse?: boolean;
  size?: 'xs' | 'sm' | 'md';
  label?: React.ReactNode;
  children?: React.ReactNode;
}

const VARIANT_STYLES: Record<StatusBadgeVariant, { badge: string; dot: string }> = {
  success: {
    badge: 'bg-success/10 text-success border-success/25 dark:border-success/30',
    dot: 'bg-success',
  },
  warning: {
    badge: 'bg-warning/10 text-warning border-warning/25 dark:border-warning/30',
    dot: 'bg-warning',
  },
  danger: {
    badge: 'bg-destructive/10 text-destructive border-destructive/25 dark:border-destructive/30',
    dot: 'bg-destructive',
  },
  destructive: {
    badge: 'bg-destructive/10 text-destructive border-destructive/25 dark:border-destructive/30',
    dot: 'bg-destructive',
  },
  info: {
    badge: 'bg-primary/10 text-primary border-primary/25 dark:border-primary/30',
    dot: 'bg-primary',
  },
  neutral: {
    badge: 'bg-muted/70 text-muted-foreground border-border',
    dot: 'bg-muted-foreground/60',
  },
};

const SIZE_STYLES = {
  xs: 'text-overline px-1.5 py-0 gap-1 tracking-wider',
  sm: 'text-xs px-2 py-0.5 gap-1.5 font-medium',
  md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
};

export function StatusBadge({
  variant,
  status,
  dot = true,
  pulse = false,
  size = 'sm',
  className,
  label,
  children,
  ...props
}: StatusBadgeProps) {
  const effectiveVariant = status || variant || 'neutral';
  const styles = VARIANT_STYLES[effectiveVariant] || VARIANT_STYLES.neutral;
  const content = children ?? label;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-sans select-none shrink-0 transition-colors',
        styles.badge,
        SIZE_STYLES[size],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'size-1.5 rounded-full shrink-0',
            styles.dot,
            pulse && 'animate-pulse',
          )}
          aria-hidden="true"
        />
      )}
      <span>{content}</span>
    </span>
  );
}
