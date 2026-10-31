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
  HelpCircle,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { billingApi, SubscriptionInfo } from '../services/billing-api';
import { usePermissions } from '@/hooks/use-permissions';

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

    // Check if returning from Safepay checkout
    const paymentStatus = searchParams.get('payment_status') || searchParams.get('status');
    const tracker = searchParams.get('beacon') || searchParams.get('tracker');

    if (paymentStatus === 'success' || paymentStatus === 'completed') {
      toast.success('Payment completed successfully! Subscription renewed.');
      if (tracker) {
        billingApi.verifySession(tracker).then(setSubscription).catch(() => {});
      }
      // Remove query params from url
      router.replace('/settings?tab=billing');
    }
  }, []);

  const handleCheckout = async () => {
    try {
      setIsCheckingOut(true);
      const session = await billingApi.createCheckoutSession();
      if (session?.checkoutUrl) {
        toast.info('Opening Safepay hosted checkout...');
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
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <RefreshCw className="size-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Loading subscription details...</p>
      </div>
    );
  }

  const isTrial = subscription?.isTrial ?? false;
  const isExpired = subscription?.isExpired ?? false;
  const daysLeft = subscription?.daysRemaining ?? 0;
  const trialProgress = isTrial ? Math.max(0, Math.min(100, Math.round(((30 - daysLeft) / 30) * 100))) : 100;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
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
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-lg bg-destructive/20 text-destructive flex items-center justify-center shrink-0">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive text-sm sm:text-base">
                Subscription Expired - Read-Only Access
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Your 30-day trial or billing period has concluded. You can view all your inventory and past reports, but sales checkout and stock changes are locked until renewed.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              onClick={handleCheckout}
              disabled={isCheckingOut || isRenewing || !canManageBilling}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium text-xs sm:text-sm gap-2"
            >
              {isCheckingOut ? <RefreshCw className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
              Pay via Safepay (PKR 2,500)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRenew}
              disabled={isCheckingOut || isRenewing || !canManageBilling}
              className="text-[11px] h-8 bg-background/50 border-destructive/30 text-destructive hover:bg-destructive/10"
              title="Simulate renewal instantly for testing"
            >
              {isRenewing ? <RefreshCw className="size-3 animate-spin mr-1" /> : <Zap className="size-3 mr-1" />}
              Instant Sim
            </Button>
          </div>
        </div>
      ) : isTrial ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
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
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-semibold text-xs px-2.5 py-1">
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
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">
                Subscription Active &amp; Good Standing
              </h3>
              <p className="text-xs text-muted-foreground">
                Your monthly subscription is active. All pharmacy point-of-sale, inventory, and AI features are fully unlocked.
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-semibold text-xs px-2.5 py-1">
            Active
          </Badge>
        </div>
      )}

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Overview Card */}
        <Card className="lg:col-span-2 border-border/80 shadow-xs">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-bold">Standard Pharmacy Plan</CardTitle>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {subscription?.status === 'ACTIVE' ? 'Active' : isTrial ? 'Free Trial' : 'Expired'}
                  </Badge>
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
                  {formatDate(isTrial ? subscription?.trialEndsAt : subscription?.currentPeriodEnd)}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-muted-foreground block text-[11px] mb-0.5">Payment Method</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <CreditCard className="size-3.5 text-primary" />
                  Safepay PK (Cards &amp; Wallets)
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
                className="text-xs h-9 px-3 gap-1.5 text-muted-foreground hover:text-foreground border-border/80"
                title="Simulate renewal instantly for testing without leaving page"
              >
                {isRenewing ? <RefreshCw className="size-3.5 animate-spin" /> : <Zap className="size-3.5 text-amber-500" />}
                <span>Simulate Renewal (Dev)</span>
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={isCheckingOut || isRenewing || !canManageBilling}
                className="font-medium text-xs sm:text-sm gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
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

        {/* Payment Gateway & Security Info Card */}
        <div className="space-y-6">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Safepay Payment Gateway</CardTitle>
                  <CardDescription className="text-xs">Pakistan Domestic Merchant</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Dispenco uses <span className="font-semibold text-foreground">Safepay</span> (SBP-authorized PSO/PSP) for automated, secure subscription payments in Pakistan.
              </p>

              <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2">
                <span className="font-semibold text-foreground text-[11px] block">
                  Accepted Payment Methods:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['Visa', 'Mastercard', 'PayPak', 'EasyPaisa', 'JazzCash'].map((method) => (
                    <Badge key={method} variant="outline" className="text-[10px] font-medium bg-background">
                      {method}
                    </Badge>
                  ))}
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
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-primary" />
              <CardTitle className="text-sm sm:text-base font-bold">
                Payment History &amp; Tax Invoices
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
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
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]'
                              : 'border-muted text-muted-foreground text-[10px]'
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
                          className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
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
