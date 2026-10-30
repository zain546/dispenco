'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AlertCircle, Clock, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { billingApi, SubscriptionInfo } from '@/features/settings/services/billing-api';
import { useAuth } from '@/context/auth-context';

export function SubscriptionBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    billingApi
      .getSubscription()
      .then((data) => {
        if (isMounted) setSub(data);
      })
      .catch(() => {
        // Silently fail if unauthenticated or offline
      });

    return () => {
      isMounted = false;
    };
  }, [user, pathname]);

  if (!sub || isDismissed) return null;

  // If already on the billing settings tab, hide the duplicate banner
  if (pathname.includes('/settings') && typeof window !== 'undefined' && window.location.search.includes('tab=billing')) {
    return null;
  }

  const isExpired = sub.isExpired;
  const isTrialEndingSoon = sub.isTrial && sub.daysRemaining <= 7;

  if (!isExpired && !isTrialEndingSoon) {
    return null;
  }

  const handleAction = () => {
    router.push('/settings?tab=billing');
  };

  if (isExpired) {
    return (
      <div className="w-full bg-destructive text-destructive-foreground px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs shrink-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="size-4 shrink-0" />
          <span className="truncate">
            <strong>Subscription Expired:</strong> Your account is currently in Read-Only mode. Point-of-sale checkout and inventory updates are locked until renewed.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleAction}
            className="h-7 px-3 bg-white text-destructive hover:bg-white/90 text-xs font-bold rounded-md"
          >
            Renew Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs font-medium flex items-center justify-between gap-3 shrink-0 z-20">
      <div className="flex items-center gap-2 min-w-0">
        <Clock className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="truncate">
          <strong>Free Trial Ending Soon:</strong> You have {sub.daysRemaining} {sub.daysRemaining === 1 ? 'day' : 'days'} remaining in your 30-day complimentary trial.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={handleAction}
          className="h-7 px-2.5 border-amber-500/40 text-amber-900 dark:text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold rounded-md"
        >
          <Zap className="size-3 mr-1" />
          Subscribe
        </Button>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
