'use client';

import React, { useState, useEffect } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConnectivityIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'h-8 rounded-lg transition-colors cursor-pointer select-none flex items-center justify-center',
              isOnline
                ? 'w-8 sm:w-auto sm:px-2.5 sm:gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 sm:border sm:border-border/60 sm:bg-muted/30'
                : 'px-2.5 gap-1.5 bg-warning/10 text-warning border border-warning/30 animate-pulse'
            )}
            aria-label={isOnline ? 'Cloud connected' : 'Offline local mode'}
          >
            {isOnline ? (
              <>
                <div className="relative flex items-center justify-center">
                  <Wifi className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="sm:hidden absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-500 ring-1.5 ring-background" />
                </div>
                <span className="hidden sm:inline text-xs font-medium text-foreground">
                  Online
                </span>
                <span className="hidden sm:inline-block size-1.5 rounded-full bg-emerald-500 shrink-0" />
              </>
            ) : (
              <>
                <WifiOff className="size-3.5 text-warning shrink-0" />
                <span className="text-xs font-semibold">Offline</span>
              </>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-xs">
          {isOnline ? (
            <p>Cloud sync active. All transactions synced to cloud in real-time.</p>
          ) : (
            <p>
              Offline mode active. POS checkout uses local cache and will sync
              automatically when internet returns.
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
