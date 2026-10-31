'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
  Receipt,
  Download,
  ExternalLink,
  RefreshCw,
  Zap,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { billingApi, SubscriptionInfo } from '../services/billing-api';
import { usePermissions } from '@/hooks/use-permissions';

// --- Official Vector Payment Brand Logos ---
export function EasyPaisaLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 115 30" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="30" height="30" rx="7" fill="#00A651"/>
      <path d="M15 7C10.58 7 7 10.58 7 15C7 19.42 10.58 23 15 23C18.87 23 22.09 20.26 22.83 16.6H12.6V13.4H22.83C22.09 9.74 18.87 7 15 7Z" fill="white"/>
      <text x="36" y="20" fill="currentColor" fontSize="13" fontWeight="bold" fontFamily="system-ui, sans-serif">easypaisa</text>
    </svg>
  );
}

export function JazzCashLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 110 30" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="30" height="30" rx="7" fill="#E61C24"/>
      <circle cx="15" cy="15" r="7.5" fill="#FFC80A"/>
      <path d="M13 11L17.5 15L13 19" stroke="#E61C24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="36" y="20" fill="currentColor" fontSize="13" fontWeight="bold" fontFamily="system-ui, sans-serif">JazzCash</text>
    </svg>
  );
}

export function VisaLogo({ className = "h-4 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 54 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="54" height="20" rx="4" fill="#0E4595"/>
      <path d="M21.5 16L23.8 4.5H27.3L25 16H21.5ZM36.5 4.8C35.8 4.5 34.7 4.3 33.4 4.3C29.8 4.3 27.3 6.2 27.3 8.8C27.3 10.8 29.1 11.9 30.5 12.6C31.9 13.3 32.4 13.7 32.4 14.3C32.4 15.2 31.3 15.7 30.3 15.7C28.7 15.7 27.8 15.4 26.8 14.9L26.3 14.7L25.8 17.8C26.7 18.2 28.3 18.6 30 18.6C33.9 18.6 36.4 16.7 36.4 13.8C36.4 11.7 35 10.5 33.1 9.5C32 8.9 31.3 8.5 31.3 7.9C31.3 7.2 32.1 6.5 33.5 6.5C34.7 6.5 35.6 6.8 36.3 7.1L36.6 7.3L37.1 4.3C37 4.5 36.7 4.6 36.5 4.8ZM42.8 4.5H40.1C39.2 4.5 38.5 4.8 38.2 5.6L32.6 18.9H36.6L37.4 16.8H42.3L42.7 18.9H46.2L42.8 4.5ZM38.4 14L40.6 8L41.9 14H38.4ZM18.5 4.5L15.1 14.1L14.7 12.2C14.1 10.2 12.1 7.9 10 6.8L13.1 18.9H17.2L22.5 4.5H18.5ZM10.8 4.5H5.2L5.1 4.8C9.4 5.9 12.2 8.5 13.3 11.8L12.1 5.6C11.9 4.8 11.5 4.5 10.8 4.5Z" fill="white"/>
    </svg>
  );
}

export function MastercardLogo({ className = "h-4 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="38" height="24" rx="4" fill="#141414"/>
      <circle cx="15" cy="12" r="7.5" fill="#EB001B"/>
      <circle cx="23" cy="12" r="7.5" fill="#F79E1B"/>
      <path d="M19 6.3A7.5 7.5 0 0 0 19 17.7A7.5 7.5 0 0 0 19 6.3Z" fill="#FF5F00"/>
    </svg>
  );
}

export function PayPakLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 30" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="30" height="30" rx="7" fill="#006838"/>
      <circle cx="15" cy="15" r="7.5" fill="#F37021"/>
      <circle cx="17" cy="13" r="5.5" fill="#006838"/>
      <text x="36" y="20" fill="currentColor" fontSize="13" fontWeight="bold" fontFamily="system-ui, sans-serif">PayPak</text>
    </svg>
  );
}

// --- Skeleton Loading State ---
function BillingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top Banner Skeleton */}
      <div className="h-24 rounded-2xl bg-card border border-border/80 p-5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3.5 w-72" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border/80 p-6 space-y-6 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-3.5 w-80" />
            </div>
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-muted/40">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full rounded-md" />
            ))}
          </div>
          <div className="pt-4 border-t border-border/60 flex justify-between items-center">
            <Skeleton className="h-4 w-44" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-9 w-44 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border/80 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="space-y-2.5 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl bg-card border border-border/80 p-6 space-y-4 shadow-xs">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function BillingView() {
  const { canManageBilling } = usePermissions();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRenewing, setIsRenewing] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const fetchSubscription = async () => {
    try {
      setIsLoading(true);
      const data = await billingApi.getSubscription();
      setSubscription(data);
    } catch (err: any) {
      toast.error('Failed to load subscription details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();

    // Check if returning from Safepay hosted checkout
    const paymentStatus = searchParams.get('payment_status') || searchParams.get('status');
    const tracker = searchParams.get('beacon') || searchParams.get('tracker');

    if (paymentStatus === 'success' || paymentStatus === 'completed') {
      toast.success('Payment completed successfully! Subscription renewed.');
      if (tracker) {
        billingApi.verifySession(tracker).then(setSubscription).catch(() => {});
      }
      router.replace('/settings?tab=billing');
    }
  }, []);

  const handleCheckout = async () => {
    try {
      setIsCheckingOut(true);
      const session = await billingApi.createCheckoutSession();
      if (session?.checkoutUrl) {
        toast.info('Opening Safepay secure checkout...');
        window.location.href = session.checkoutUrl;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to initialize Safepay checkout');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleRenew = async () => {
    try {
      setIsRenewing(true);
      const res = await billingApi.mockRenew();
      toast.success(res.message || 'Subscription successfully extended by 30 days!');
      await fetchSubscription();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process payment renewal');
    } finally {
      setIsRenewing(false);
    }
  };

  if (isLoading) {
    return <BillingSkeleton />;
  }

  // --- Strict, Synchronized Subscription State Calculation ---
  const rawStatus = (subscription?.status || '').toUpperCase();
  const isExpired = subscription?.isExpired || rawStatus === 'EXPIRED';
  const isTrial = (subscription?.isTrial || rawStatus === 'TRIALING') && !isExpired;
  const isActive = (rawStatus === 'ACTIVE' || (!isTrial && !isExpired)) && !isExpired;
  const daysLeft = subscription?.daysRemaining ?? 0;
  const trialProgress = isTrial ? Math.max(0, Math.min(100, Math.round(((30 - daysLeft) / 30) * 100))) : 100;

  // Next Renewal or Trial End Date (Never returns N/A if date exists)
  const effectiveDate = isTrial
    ? (subscription?.trialEndsAt || subscription?.currentPeriodEnd)
    : (subscription?.currentPeriodEnd || subscription?.trialEndsAt);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Active Rolling Period';
    try {
      return new Date(dateStr).toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Alert Banner */}
      {isExpired ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-destructive/20 text-destructive flex items-center justify-center shrink-0">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive text-sm sm:text-base">
                Subscription Expired - Read-Only Access
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Your 30-day billing period has concluded. You can view all your inventory and past reports, but sales checkout and stock changes are locked until renewed.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              onClick={handleCheckout}
              disabled={isCheckingOut || isRenewing || !canManageBilling}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-xs sm:text-sm gap-2 rounded-xl"
            >
              {isCheckingOut ? <RefreshCw className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
              Pay via Safepay (PKR 2,500)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRenew}
              disabled={isCheckingOut || isRenewing || !canManageBilling}
              className="text-[11px] h-8 bg-background/60 border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg"
              title="Simulate renewal instantly for testing"
            >
              {isRenewing ? <RefreshCw className="size-3 animate-spin mr-1" /> : <Zap className="size-3 mr-1" />}
              Instant Sim
            </Button>
          </div>
        </div>
      ) : isTrial ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="size-4" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  30-Day Free Trial Active
                </h3>
                <p className="text-xs text-muted-foreground">
                  First month is 100% complimentary. No credit card was required to start.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-semibold text-xs px-2.5 py-1 rounded-lg">
              <Clock className="size-3 mr-1" />
              {daysLeft} {daysLeft === 1 ? 'day' : 'days'} remaining
            </Badge>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Trial progress</span>
              <span className="font-medium text-foreground">{30 - daysLeft} / 30 days used</span>
            </div>
            <Progress value={trialProgress} className="h-2 bg-muted/60" />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base">
                Subscription Active &amp; Good Standing
              </h3>
              <p className="text-xs text-muted-foreground">
                Your monthly subscription is active. All pharmacy point-of-sale, inventory, and AI features are fully unlocked.
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-semibold text-xs px-3 py-1 rounded-lg">
            Active
          </Badge>
        </div>
      )}

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Overview Card */}
        <Card className="lg:col-span-2 border-border/80 shadow-xs rounded-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-bold">Standard Pharmacy Plan</CardTitle>
                  {isExpired ? (
                    <Badge variant="destructive" className="text-xs font-semibold rounded-md">
                      Expired
                    </Badge>
                  ) : isTrial ? (
                    <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-xs font-semibold rounded-md gap-1">
                      <Clock className="size-3" />
                      30-Day Free Trial
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs font-semibold rounded-md gap-1">
                      <CheckCircle2 className="size-3" />
                      Active
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs mt-1">
                  Complete modern pharmacy operations, intelligent inventory control, and multi-user access.
                </CardDescription>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-black text-foreground">PKR 2,500</span>
                <span className="text-xs text-muted-foreground block">/ month</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Cycle Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px] mb-0.5">Billing Cycle</span>
                <span className="font-semibold text-foreground">Monthly (30 Days)</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] mb-0.5">
                  {isTrial ? 'Trial Concludes' : 'Next Renewal'}
                </span>
                <span className="font-semibold text-foreground">
                  {formatDate(effectiveDate)}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-muted-foreground block text-[11px] mb-0.5">Payment Method</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" />
                  Safepay PK (EasyPaisa / Cards)
                </span>
              </div>
            </div>

            {/* Plan Features Checklist */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2.5">
                Features Included in Plan
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  'Unlimited Point-of-Sale Transactions',
                  'FEFO & FIFO Batch Expiration Tracking',
                  'AI Automated Invoice & Slip Extraction',
                  'WhatsApp & Thermal Receipt Printing',
                  'Multi-Store & Role-Based Permissions',
                  'Secure Developer API & Webhooks',
                  'Automated Daily Business Backups',
                  'Real-time Low Stock & Expiry Alerts',
                ].map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                    <span className="text-foreground">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-[11px] text-muted-foreground">
              Need custom multi-branch enterprise terms? <a href="mailto:support@dispenco.com" className="text-primary hover:underline font-medium">Contact Dispenco Sales</a>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRenew}
                disabled={isRenewing || isCheckingOut || !canManageBilling}
                className="text-xs h-9 px-3 gap-1.5 text-muted-foreground hover:text-foreground border-border/80 rounded-xl"
                title="Simulate renewal instantly for testing without leaving page"
              >
                {isRenewing ? <RefreshCw className="size-3.5 animate-spin" /> : <Zap className="size-3.5 text-amber-500" />}
                <span>Simulate Renewal (Dev)</span>
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={isCheckingOut || isRenewing || !canManageBilling}
                className="font-medium text-xs sm:text-sm gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs rounded-xl"
              >
                {isCheckingOut ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <CreditCard className="size-4" />
                )}
                {isTrial ? 'Subscribe via Safepay (PKR 2,500)' : 'Renew via Safepay (PKR 2,500)'}
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Payment Gateway & Authentic Logos Card */}
        <div className="space-y-6">
          <Card className="border-border/80 shadow-xs rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Safepay Payment Gateway</CardTitle>
                  <CardDescription className="text-xs">Pakistan Domestic Merchant</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Dispenco uses <span className="font-semibold text-foreground">Safepay</span> (SBP-authorized PSO/PSP) for automated, instant subscription payments in Pakistan.
              </p>

              {/* Vector Brand Icons */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2.5">
                <span className="font-semibold text-foreground text-[11px] block">
                  Accepted Payment Methods:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border/60 shadow-2xs hover:border-emerald-500/40 transition-colors">
                    <EasyPaisaLogo className="h-4 w-auto shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border/60 shadow-2xs hover:border-red-500/40 transition-colors">
                    <JazzCashLogo className="h-4 w-auto shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border/60 shadow-2xs hover:border-blue-500/40 transition-colors">
                    <VisaLogo className="h-3.5 w-auto shrink-0" />
                    <span className="text-[11px] font-semibold text-foreground">Debit / Credit</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border/60 shadow-2xs hover:border-amber-500/40 transition-colors">
                    <MastercardLogo className="h-4 w-auto shrink-0" />
                    <span className="text-[11px] font-semibold text-foreground">Mastercard</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border/60 shadow-2xs hover:border-emerald-600/40 transition-colors">
                    <PayPakLogo className="h-4 w-auto shrink-0" />
                    <span className="text-[11px] font-semibold text-foreground">PayPak Debit (All Pakistani Banks)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-muted-foreground text-[11px]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                  <span>256-bit PCI-DSS Level 1 Encrypted</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                  <span>No hidden setup fees or cancellation penalties</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                  <span>Early renewals preserve all remaining trial days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoice & Payment History */}
      <Card className="border-border/80 shadow-xs rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-primary" />
              <CardTitle className="text-sm sm:text-base font-bold">
                Payment History &amp; Tax Invoices
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {subscription?.invoices?.length || 0} Records
            </span>
          </div>
          <CardDescription className="text-xs">
            Review official monthly payment receipts and tax statements for your pharmacy accounting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscription?.invoices && subscription.invoices.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-y border-border/60">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Invoice #</th>
                    <th className="py-2.5 px-3 font-semibold">Date Paid</th>
                    <th className="py-2.5 px-3 font-semibold">Coverage Period</th>
                    <th className="py-2.5 px-3 font-semibold">Amount</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {subscription.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-foreground">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {formatDate(inv.paidAt || inv.createdAt)}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {formatDate(inv.billingPeriodStart)} - {formatDate(inv.billingPeriodEnd)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-foreground">
                        PKR {inv.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant="outline"
                          className={
                            inv.status === 'PAID'
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] rounded-md'
                              : 'border-muted text-muted-foreground text-[10px] rounded-md'
                          }
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            window.print();
                          }}
                          className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10 rounded-md"
                        >
                          <Download className="size-3" />
                          <span>PDF</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
              <Receipt className="size-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-medium text-foreground">No payment history yet</p>
              <p>Your complimentary 30-day trial is currently underway. Invoices will populate upon your first monthly renewal.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
