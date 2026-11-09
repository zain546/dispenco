'use client';

import Link from 'next/link';
import { ArrowRight, Check, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { useSubscription } from '@/features/settings/hooks/use-billing-queries';
import { marketingConfig } from './config';
import { SectionHeading } from './shared';

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

  // Dynamic user status logic
  const isSubscriber = Boolean(user && subscription);
  const status = subscription?.status;
  const isTrialing = status === 'TRIALING';
  const isActive = status === 'ACTIVE';
  const isExpired = status === 'EXPIRED' || status === 'PAST_DUE';

  return (
    <section
      id="pricing"
      aria-label="Plans and pricing"
      className="marketing-section px-5 py-24 sm:px-8 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          centered
          eyebrow="A simple place to start"
          title={
            isActive
              ? 'Your active plan & subscription.'
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
          <Card className="marketing-card marketing-plan-featured relative gap-0 overflow-hidden border-primary/30 bg-card p-0 shadow-none">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            />
            <div className="grid sm:grid-cols-2">
              <div className="flex flex-col p-6 sm:p-8">
                {/* Header & Status Badge */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold tracking-tight">{plan.name}</h3>

                  {isActive ? (
                    <Badge className="gap-1 border-success/30 bg-success/15 text-success font-medium">
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                      Active Plan
                    </Badge>
                  ) : isTrialing ? (
                    <Badge className="gap-1 border-primary/20 bg-primary/10 text-primary font-medium">
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
                      className="border border-primary/15 bg-primary/10 text-primary dark:text-primary-foreground"
                    >
                      {plan.trialDays}-day free trial
                    </Badge>
                  )}
                </div>

                <p className="text-sm leading-6 text-muted-foreground">{plan.description}</p>

                {/* Price Display */}
                <div className="mt-8">
                  {isSubscriber && !isTrialing ? (
                    /* Existing Paid or Expired subscriber: Show standard PKR 1,500 */
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
                        <p className="mt-3 text-xs text-destructive font-medium">
                          Subscription expired on {formatDate(subscription?.trialEndsAt)}
                        </p>
                      )}
                    </div>
                  ) : (
                    /* New Visitor or Active Trial: PKR 0 with crossed-out PKR 1,500 underneath */
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-muted-foreground">PKR</span>
                        <span className="text-6xl font-semibold tracking-tight tabular-nums">
                          {formatPkr(plan.trialPricePkr)}
                        </span>
                        <span className="text-sm text-muted-foreground">/ month</span>
                      </div>

                      {/* Crossed out regular price below */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-base text-muted-foreground line-through decoration-muted-foreground/60 decoration-2 tabular-nums">
                          PKR {formatPkr(plan.monthlyPkr)}
                        </span>
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          100% OFF FIRST MONTH
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-medium">Free for your first month.</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Then{' '}
                        <span className="font-medium text-foreground tabular-nums">
                          PKR {formatPkr(plan.monthlyPkr)}/month
                        </span>
                        . Cancel anytime.
                      </p>
                    </div>
                  )}
                </div>

                {/* Dynamic Call to Action Button */}
                <div className="mt-7">
                  {isActive ? (
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 w-full gap-2 border-border shadow-none"
                    >
                      <Link prefetch={false} href="/settings?tab=billing">
                        <RefreshCw className="size-4 text-muted-foreground" aria-hidden="true" />
                        Manage Subscription
                      </Link>
                    </Button>
                  ) : isTrialing ? (
                    <Button
                      asChild
                      className="marketing-action marketing-action-primary h-11 w-full shadow-none"
                    >
                      <Link prefetch={false} href="/settings?tab=billing">
                        Activate Full Plan
                        <ArrowRight className="marketing-arrow size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : isExpired ? (
                    <Button
                      asChild
                      className="marketing-action marketing-action-primary h-11 w-full shadow-none"
                    >
                      <Link prefetch={false} href="/settings?tab=billing">
                        Reactivate Plan (PKR {formatPkr(plan.monthlyPkr)})
                        <ArrowRight className="marketing-arrow size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="marketing-action marketing-action-primary h-11 w-full shadow-none"
                    >
                      <Link prefetch={false} href={user ? '/dashboard' : marketingConfig.trialHref}>
                        {user ? 'Go to Dashboard' : plan.cta}
                        <ArrowRight className="marketing-arrow size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  )}
                </div>

                {/* Dynamic Footer note */}
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

              {/* Inclusions Column */}
              <div className="border-t bg-muted/20 p-6 sm:border-t-0 sm:border-l sm:p-8">
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Included with Starter
                </p>
                <ul className="mt-6 space-y-5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-5">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
