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
                <span className="text-muted-foreground block text-[11px] mb-1.5">Supported Channels</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/70 bg-background/60 text-[10px] font-semibold text-foreground shadow-2xs">
                    <span className="h-4.5 w-6 rounded bg-white p-0.5 flex items-center justify-center shrink-0 shadow-2xs border border-white/20">
                      <img src="/images/payments/easypaisa.png" alt="Easypaisa" className="h-2.5 w-auto object-contain" />
                    </span>
                    Easypaisa
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/70 bg-background/60 text-[10px] font-semibold text-foreground shadow-2xs">
                    <span className="h-4.5 w-6 rounded bg-white p-0.5 flex items-center justify-center shrink-0 shadow-2xs border border-white/20">
                      <img src="/images/payments/jazzcash.png" alt="JazzCash" className="h-3.5 w-auto object-contain" />
                    </span>
                    JazzCash
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/70 bg-background/60 text-[10px] font-semibold text-foreground shadow-2xs">
                    <span className="h-4.5 w-6 rounded bg-white p-0.5 flex items-center justify-center shrink-0 shadow-2xs border border-white/20">
                      <img src="/images/payments/visa.svg" alt="Visa" className="h-2 w-auto object-contain" />
                    </span>
                    Visa
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/70 bg-background/60 text-[10px] font-semibold text-foreground shadow-2xs">
                    <span className="h-4.5 w-6 rounded bg-white p-0.5 flex items-center justify-center shrink-0 shadow-2xs border border-white/20">
                      <img src="/images/payments/mastercard.svg" alt="Mastercard" className="h-2.5 w-auto object-contain" />
                    </span>
                    Mastercard
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/70 bg-background/60 text-[10px] font-semibold text-foreground shadow-2xs">
                    <span className="h-4.5 w-6 rounded bg-white p-0.5 flex items-center justify-center shrink-0 shadow-2xs border border-white/20">
                      <img src="/images/payments/paypak.svg" alt="PayPak" className="h-2 w-auto object-contain" />
                    </span>
                    PayPak
                  </span>
                </div>
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

              {/* Official Payment Partner Logos & Badges */}
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/70 space-y-2.5">
                <span className="font-semibold text-foreground text-[11px] block">
                  Accepted Payment Methods:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {/* Easypaisa */}
                  <div className="h-13 rounded-xl border border-border/70 bg-background/60 hover:bg-background/90 hover:border-emerald-500/50 transition-all px-3 py-2 flex items-center gap-3 cursor-default shadow-2xs">
                    <div className="h-7.5 w-11 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-2xs border border-white/20">
                      <img
                        src="/images/payments/easypaisa.png"
                        alt="Easypaisa"
                        className="h-4.5 w-auto max-w-[95%] object-contain"
                      />
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-xs font-bold tracking-tight text-foreground leading-tight truncate">Easypaisa</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">Mobile Wallet</span>
                    </div>
                  </div>

                  {/* JazzCash */}
                  <div className="h-13 rounded-xl border border-border/70 bg-background/60 hover:bg-background/90 hover:border-red-500/50 transition-all px-3 py-2 flex items-center gap-3 cursor-default shadow-2xs">
                    <div className="h-7.5 w-11 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-2xs border border-white/20">
                      <img
                        src="/images/payments/jazzcash.png"
                        alt="JazzCash"
                        className="h-5.5 w-auto max-w-[95%] object-contain"
                      />
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-xs font-bold tracking-tight text-foreground leading-tight truncate">JazzCash</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">Mobile Wallet</span>
                    </div>
                  </div>

                  {/* Visa */}
                  <div className="h-13 rounded-xl border border-border/70 bg-background/60 hover:bg-background/90 hover:border-blue-500/50 transition-all px-3 py-2 flex items-center gap-3 cursor-default shadow-2xs">
                    <div className="h-7.5 w-11 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-2xs border border-white/20">
                      <img
                        src="/images/payments/visa.svg"
                        alt="Visa"
                        className="h-3.5 w-auto max-w-[95%] object-contain"
                      />
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-xs font-bold tracking-tight text-foreground leading-tight truncate">Visa</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">Debit / Credit</span>
                    </div>
                  </div>

                  {/* Mastercard */}
                  <div className="h-13 rounded-xl border border-border/70 bg-background/60 hover:bg-background/90 hover:border-amber-500/50 transition-all px-3 py-2 flex items-center gap-3 cursor-default shadow-2xs">
                    <div className="h-7.5 w-11 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-2xs border border-white/20">
                      <img
                        src="/images/payments/mastercard.svg"
                        alt="Mastercard"
                        className="h-4.5 w-auto max-w-[95%] object-contain"
                      />
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-xs font-bold tracking-tight text-foreground leading-tight truncate">Mastercard</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">Debit / Credit</span>
                    </div>
                  </div>

                  {/* PayPak */}
                  <div className="col-span-2 h-12 rounded-xl border border-border/70 bg-background/60 hover:bg-background/90 hover:border-teal-500/50 transition-all px-3 py-2 flex items-center gap-3 cursor-default shadow-2xs">
                    <div className="h-7 w-12 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-2xs border border-white/20">
                      <img
                        src="/images/payments/paypak.svg"
                        alt="PayPak"
                        className="h-4 w-auto max-w-[95%] object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-foreground">PayPak</span>
                      <span className="text-[11px] text-muted-foreground truncate">• Pakistan Domestic 1Link Debit Cards</span>
                    </div>
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
