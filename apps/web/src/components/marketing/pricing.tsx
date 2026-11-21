'use client';

import Link from 'next/link';
import { ArrowRight, Check, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useSubscription } from '@/features/settings/hooks/use-billing-queries';
import { marketingConfig } from './config';
import { SectionHeading } from './shared';
import { SpotlightCard } from './spotlight-card';

const formatPkr = (price: number) => new Intl.NumberFormat('en-PK').format(price);

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return 'N/A';
  try {
    return new Intl.DateTimeFormat('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
};

export function Pricing() {
  const { user } = useAuth();
  const { data: subscription } = useSubscription({ enabled: !!user });
  const plan = marketingConfig.pricing.plans[0];

  const isSubscriber = Boolean(user && subscription);
  const status = subscription?.status;
  const isTrialing = status === 'TRIALING';
  const isActive = status === 'ACTIVE';
  const isExpired = status === 'EXPIRED' || status === 'PAST_DUE';

  return (
    <section
      id="pricing"
      aria-label="Plans and pricing"
      className="marketing-section border-t px-5 py-20 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          centered
          eyebrow="Simple pricing"
          title={
            isActive
              ? 'Your active pharmacy plan.'
              : isTrialing
                ? 'Your free trial is underway.'
                : isExpired
                  ? 'Reactivate your pharmacy plan.'
                  : 'Your first month is on us.'
          }
          description={
            isActive
              ? 'Everything your counter needs to run smoothly every single day.'
              : isTrialing
                ? `You currently have ${subscription?.daysRemaining ?? 0} days remaining in your free trial.`
                : isExpired
                  ? 'Restore instant access to counter billing, expiry alerts, and stock management.'
                  : 'One Starter plan for your pharmacy. Get settled in, then continue with simple monthly pricing.'
          }
        />

        <div className="mx-auto max-w-3xl">
          <SpotlightCard
            standalone
            className="overflow-hidden border-primary/25 bg-card p-0"
          >
            {/* Top specular teal highlight */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-10 top-0 z-10 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent dark:via-chart-1/70"
            />
            <div className="grid sm:grid-cols-2">
              <div className="flex flex-col p-6 sm:p-8">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold tracking-tight">{plan.name}</h3>

                  {isActive ? (
                    <Badge className="gap-1 border-success/30 bg-success/15 font-medium text-success">
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                      Active Plan
                    </Badge>
                  ) : isTrialing ? (
                    <Badge className="gap-1 border-primary/25 bg-primary/10 font-medium text-primary dark:text-chart-1">
                      <Clock className="size-3" aria-hidden="true" />
                      Trial: {subscription?.daysRemaining ?? 0}d left
                    </Badge>
                  ) : isExpired ? (
                    <Badge variant="destructive" className="gap-1 font-medium">
                      <AlertCircle className="size-3" aria-hidden="true" />
                      Trial Expired
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="border border-primary/20 bg-primary/10 text-primary dark:text-chart-1"
                    >
                      {plan.trialDays}-day free trial
                    </Badge>
                  )}
                </div>

                <p className="text-sm leading-6 text-muted-foreground">{plan.description}</p>

                <div className="mt-8">
                  {isSubscriber && !isTrialing ? (
                    <div>
                      <p className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-muted-foreground">PKR</span>
                        <span className="text-5xl font-semibold tracking-tight tabular-nums">
                          {formatPkr(plan.monthlyPkr)}
                        </span>
                        <span className="text-sm text-muted-foreground">/ month</span>
                      </p>
                      {isActive ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Renews on{' '}
                          <span className="font-semibold text-foreground">
                            {formatDate(subscription?.currentPeriodEnd)}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-3 text-xs font-medium text-destructive">
                          Subscription expired on {formatDate(subscription?.trialEndsAt)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-muted-foreground">PKR</span>
                        <span className="text-6xl font-semibold tracking-tight tabular-nums">
                          {formatPkr(plan.trialPricePkr)}
                        </span>
                        <span className="text-sm text-muted-foreground">/ month</span>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/60 tabular-nums">
                          PKR {formatPkr(plan.monthlyPkr)}
                        </span>
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary dark:text-chart-1">
                          First month free
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Then{' '}
                        <span className="font-medium text-foreground tabular-nums">
                          PKR {formatPkr(plan.monthlyPkr)}/month
                        </span>
                        . Cancel anytime.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-7">
                  {isActive ? (
                    <Button
                      asChild
                      variant="outline"
                      className="marketing-action h-11 w-full gap-2 rounded-lg border-border shadow-none"
                    >
                      <Link prefetch={false} href="/settings?tab=billing">
                        <RefreshCw className="size-4 text-muted-foreground" aria-hidden="true" />
                        Manage Subscription
                      </Link>
                    </Button>
                  ) : isTrialing ? (
                    <Button
                      asChild
                      className="marketing-action marketing-action-primary h-11 w-full rounded-lg shadow-none"
                    >
                      <Link prefetch={false} href="/settings?tab=billing">
                        Activate Full Plan
                        <ArrowRight className="marketing-arrow size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : isExpired ? (
                    <Button
                      asChild
                      className="marketing-action marketing-action-primary h-11 w-full rounded-lg shadow-none"
                    >
                      <Link prefetch={false} href="/settings?tab=billing">
                        Reactivate Plan (PKR {formatPkr(plan.monthlyPkr)})
                        <ArrowRight className="marketing-arrow size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="marketing-action marketing-action-primary h-11 w-full rounded-lg shadow-none"
                    >
                      <Link prefetch={false} href={user ? '/dashboard' : marketingConfig.trialHref}>
                        {user ? 'Go to Dashboard' : plan.cta}
                        <ArrowRight className="marketing-arrow size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  )}
                </div>

                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {isActive
                    ? 'All counter registers and inventory features are active.'
                    : isTrialing
                      ? `Trial ends ${formatDate(subscription?.trialEndsAt)}. Upgrade anytime.`
                      : isExpired
                        ? 'Instant activation. Your catalog and sales records are preserved.'
                        : 'No credit card required.'}
                </p>
              </div>

              <div className="border-t bg-muted/25 p-6 sm:border-t-0 sm:border-l sm:p-8">
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Included with Starter
                </p>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-5">
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary dark:text-chart-1">
                        <Check className="size-3" aria-hidden="true" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </section>
  );
}
