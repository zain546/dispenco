import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCw, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
  action?: React.ReactNode;
}

export function ErrorState({
  title = 'Unable to Load Data',
  description = 'A network or server issue prevented this content from loading. Please try again.',
  icon: Icon = AlertCircle,
  onRetry,
  isRetrying = false,
  className,
  action,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'py-12 sm:py-16 px-4 text-center flex flex-col items-center justify-center gap-3',
        className,
      )}
    >
      <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-1">
        <Icon className="size-6 stroke-[1.75]" aria-hidden="true" />
      </div>

      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action ? (
        <div className="mt-2">{action}</div>
      ) : onRetry ? (
        <div className="mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="text-xs gap-1.5 h-8 font-medium"
          >
            <RefreshCw className={cn('size-3.5', isRetrying && 'animate-spin')} />
            <span>{isRetrying ? 'Retrying...' : 'Try Again'}</span>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
