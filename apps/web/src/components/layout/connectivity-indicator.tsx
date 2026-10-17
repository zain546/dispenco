'use client';

import React, { useState, useEffect } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { StatusBadge } from '@/components/ui/status-badge';

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
          <div className="cursor-pointer">
            {isOnline ? (
              <StatusBadge
                variant="success"
                pulse
                size="sm"
                className="gap-1.5"
              >
                <span>Online</span>
              </StatusBadge>
            ) : (
              <StatusBadge
                variant="warning"
                pulse
                size="sm"
                className="gap-1.5"
              >
                <span>Offline (Local)</span>
              </StatusBadge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-xs">
          {isOnline ? (
            <p>Cloud connection active. Transactions sync in real-time.</p>
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
