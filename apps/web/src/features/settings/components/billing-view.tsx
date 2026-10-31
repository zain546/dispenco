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
    <div className="space-y-6 pb-28 sm:pb-12">
      {/* Top Banner Skeleton */}
      <div className="rounded-2xl bg-card border border-border/80 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Skeleton className="size-9 rounded-xl shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-40 sm:w-48" />
            <Skeleton className="h-3 w-56 sm:w-72" />
          </div>
        </div>
        <Skeleton className="h-7 w-20 rounded-lg shrink-0" />
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border/80 p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
            <Skeleton className="h-3.5 w-full max-w-sm" />
            <Skeleton className="h-8 w-36 mt-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full rounded-md" />
            ))}
          </div>
          <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <Skeleton className="h-4 w-48 mx-auto sm:mx-0" />
            <div className="flex flex-col sm:flex-row gap-2">
              <Skeleton className="h-9 w-full sm:w-32 rounded-xl" />
              <Skeleton className="h-11 sm:h-9 w-full sm:w-44 rounded-xl" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border/80 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="space-y-2 pt-1">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl bg-card border border-border/80 p-5 sm:p-6 space-y-4 shadow-xs">
        <Skeleton className="h-5 w-48" />
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
      if (tracker) {
        billingApi.verifySession(tracker)
          .then((data) => {
            setSubscription(data);
            toast.success('Payment completed successfully! Subscription extended by 30 days.');
          })
          .catch(() => {
            fetchSubscription();
          })
          .finally(() => {
            router.replace('/settings?tab=billing');
          });
      } else {
        toast.success('Payment completed successfully! Subscription renewed.');
        fetchSubscription();
        router.replace('/settings?tab=billing');
      }
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
    <div className="space-y-6 pb-28 sm:pb-12">
      {/* Status Alert Banner */}
      {isExpired ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-xl bg-destructive/20 text-destructive flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <AlertCircle className="size-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive text-sm sm:text-base leading-snug">
                  Subscription Expired - Read-Only Access
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Your 30-day billing period has concluded. You can view all your inventory and past reports, but sales checkout and stock changes are locked until renewed.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
              <Button
                onClick={handleCheckout}
                disabled={isCheckingOut || isRenewing || !canManageBilling}
                className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-xs sm:text-sm h-10 sm:h-9 gap-2 rounded-xl"
              >
                {isCheckingOut ? <RefreshCw className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                Pay via Safepay (PKR 2,500)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRenew}
                disabled={isCheckingOut || isRenewing || !canManageBilling}
                className="w-full sm:w-auto text-[11px] h-8 bg-background/60 border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg"
                title="Simulate renewal instantly for testing"
              >
                {isRenewing ? <RefreshCw className="size-3 animate-spin mr-1" /> : <Zap className="size-3 mr-1" />}
                Instant Sim
              </Button>
            </div>
          </div>
        </div>
      ) : isTrial ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 sm:size-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="size-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base leading-snug truncate">
                30-Day Free Trial
              </h3>
            </div>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-semibold text-[11px] sm:text-xs px-2.5 py-0.5 rounded-lg shrink-0">
              <Clock className="size-3 mr-1" />
              {daysLeft}d left
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            First month is 100% complimentary. No credit card was required to start.
          </p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Trial progress</span>
              <span className="font-medium text-foreground">{30 - daysLeft} / 30 days used</span>
            </div>
            <Progress value={trialProgress} className="h-2 bg-muted/60" />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 sm:size-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-4.5 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base leading-snug truncate">
                Subscription Active
              </h3>
            </div>
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-semibold text-[11px] sm:text-xs px-2.5 py-0.5 rounded-lg shrink-0">
              Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Your monthly subscription is active. All pharmacy point-of-sale, inventory, and AI features are fully unlocked.
          </p>
        </div>
      )}

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Overview Card */}
        <Card className="lg:col-span-2 min-w-0 border-border/80 shadow-xs rounded-2xl">
          <CardHeader className="pb-4">
            <div className="space-y-2.5">
              {/* Plan Title & Status Badge - clean responsive row */}
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base sm:text-xl font-bold text-foreground leading-tight">
                  Standard Pharmacy Plan
                </CardTitle>
                {isExpired ? (
                  <Badge variant="destructive" className="text-xs font-semibold rounded-md shrink-0">
                    Expired
                  </Badge>
                ) : isTrial ? (
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-xs font-semibold rounded-md gap-1 shrink-0">
                    <Clock className="size-3" />
                    30-Day Trial
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs font-semibold rounded-md gap-1 shrink-0">
                    <CheckCircle2 className="size-3" />
                    Active
                  </Badge>
                )}
              </div>

              {/* Subtitle Description */}
              <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                Complete modern pharmacy operations, intelligent inventory control, and multi-user access.
              </CardDescription>

              {/* Prominent Price Block */}
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  PKR 2,500
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                  / month
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Cycle Details - clean responsive metadata box */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-muted/30 border border-border/60 divide-y sm:divide-y-0 sm:grid sm:grid-cols-3 gap-3 divide-border/40 text-xs">
              <div className="flex sm:flex-col justify-between sm:justify-start items-center sm:items-start pb-2.5 sm:pb-0">
                <span className="text-muted-foreground text-[11px]">Billing Cycle</span>
                <span className="font-semibold text-foreground sm:mt-0.5">Monthly (30 Days)</span>
              </div>
              <div className="flex sm:flex-col justify-between sm:justify-start items-center sm:items-start py-2.5 sm:py-0">
                <span className="text-muted-foreground text-[11px]">
                  {isTrial ? 'Trial Concludes' : 'Next Renewal'}
                </span>
                <span className="font-semibold text-foreground sm:mt-0.5">
                  {formatDate(effectiveDate)}
                </span>
              </div>
              <div className="flex flex-col justify-start items-start pt-2.5 sm:pt-0">
                <span className="text-muted-foreground text-[11px] mb-1.5">Supported Channels</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span title="Easypaisa Mobile Wallet" className="h-6 w-9 rounded-md bg-white p-0.5 flex items-center justify-center shadow-xs border border-white/20 transition-transform hover:scale-105 cursor-pointer">
                    <img src="/images/payments/easypaisa.png" alt="Easypaisa" className="h-3.5 w-auto object-contain" />
                  </span>
                  <span title="JazzCash Mobile Wallet" className="h-6 w-9 rounded-md bg-white p-0.5 flex items-center justify-center shadow-xs border border-white/20 transition-transform hover:scale-105 cursor-pointer">
                    <img src="/images/payments/jazzcash.png" alt="JazzCash" className="h-4.5 w-auto object-contain" />
                  </span>
                  <span title="Visa Debit & Credit" className="h-6 w-9 rounded-md bg-white p-0.5 flex items-center justify-center shadow-xs border border-white/20 transition-transform hover:scale-105 cursor-pointer">
                    <img src="/images/payments/visa.svg" alt="Visa" className="h-2.5 w-auto object-contain" />
                  </span>
                  <span title="Mastercard Debit & Credit" className="h-6 w-9 rounded-md bg-white p-0.5 flex items-center justify-center shadow-xs border border-white/20 transition-transform hover:scale-105 cursor-pointer">
                    <img src="/images/payments/mastercard.svg" alt="Mastercard" className="h-3.5 w-auto object-contain" />
                  </span>
                  <span title="PayPak 1Link Domestic Cards" className="h-6 w-9 rounded-md bg-white p-0.5 flex items-center justify-center shadow-xs border border-white/20 transition-transform hover:scale-105 cursor-pointer">
                    <img src="/images/payments/paypak.svg" alt="PayPak" className="h-3 w-auto object-contain" />
                  </span>
                </div>
              </div>
            </div>

            {/* Plan Features Checklist */}
            <div>
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
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

          <CardFooter className="pt-3 border-t border-border/60 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5">
            <div className="text-[11px] text-muted-foreground text-center xl:text-left">
              Need custom multi-branch enterprise terms? <a href="mailto:support@dispenco.com" className="text-primary hover:underline font-medium">Contact Dispenco Sales</a>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full xl:w-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRenew}
                disabled={isRenewing || isCheckingOut || !canManageBilling}
                className="w-full sm:w-auto text-xs h-9 px-3 gap-1.5 text-muted-foreground hover:text-foreground border-border/80 rounded-xl whitespace-nowrap"
                title="Simulate renewal instantly for testing without leaving page"
              >
                {isRenewing ? <RefreshCw className="size-3.5 animate-spin" /> : <Zap className="size-3.5 text-amber-500" />}
                <span>Simulate Renewal (Dev)</span>
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={isCheckingOut || isRenewing || !canManageBilling}
                className="w-full sm:w-auto font-semibold text-xs sm:text-sm h-11 sm:h-9 px-4 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs rounded-xl whitespace-nowrap"
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
        <div className="space-y-6 min-w-0">
          <Card className="border-border/80 min-w-0 shadow-xs rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
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
              <div className="p-3 sm:p-3.5 rounded-xl bg-muted/20 border border-border/70 space-y-2.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="font-semibold text-foreground text-xs sm:text-[11px]">
                    Accepted Payment Methods:
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium shrink-0 ml-2">
                    Instant &amp; Direct Debit
                  </span>
                </div>
                <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40 bg-background/50">
                  {/* Easypaisa */}
                  <div className="px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-6 w-9 rounded-md bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs border border-white/20">
                        <img
                          src="/images/payments/easypaisa.png"
                          alt="Easypaisa"
                          className="h-3.5 w-auto max-w-[95%] object-contain"
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground">Easypaisa</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium shrink-0">Mobile Wallet</span>
                  </div>

                  {/* JazzCash */}
                  <div className="px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-6 w-9 rounded-md bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs border border-white/20">
                        <img
                          src="/images/payments/jazzcash.png"
                          alt="JazzCash"
                          className="h-4.5 w-auto max-w-[95%] object-contain"
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground">JazzCash</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium shrink-0">Mobile Wallet</span>
                  </div>

                  {/* Visa */}
                  <div className="px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-6 w-9 rounded-md bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs border border-white/20">
                        <img
                          src="/images/payments/visa.svg"
                          alt="Visa"
                          className="h-2.5 w-auto max-w-[95%] object-contain"
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground">Visa Card</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium shrink-0">Debit &amp; Credit</span>
                  </div>

                  {/* Mastercard */}
                  <div className="px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-6 w-9 rounded-md bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs border border-white/20">
                        <img
                          src="/images/payments/mastercard.svg"
                          alt="Mastercard"
                          className="h-3.5 w-auto max-w-[95%] object-contain"
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground">Mastercard</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium shrink-0">Debit &amp; Credit</span>
                  </div>

                  {/* PayPak */}
                  <div className="px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-6 w-9 rounded-md bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs border border-white/20">
                        <img
                          src="/images/payments/paypak.svg"
                          alt="PayPak"
                          className="h-3 w-auto max-w-[95%] object-contain"
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground">PayPak</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium shrink-0">1Link Debit</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-muted-foreground text-[11px]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                  <span>256-bit PCI-DSS Level 1 Encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                  <span>No hidden setup fees or cancellation penalties</span>
                </div>
                <div className="flex items-center gap-2">
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Receipt className="size-4 text-primary shrink-0" />
              <CardTitle className="text-sm sm:text-base font-bold truncate">
                Payment History &amp; Tax Invoices
              </CardTitle>
            </div>
            <Badge variant="secondary" className="text-[11px] font-semibold shrink-0 whitespace-nowrap px-2.5 py-0.5">
              {subscription?.invoices?.length || 0} Records
            </Badge>
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
