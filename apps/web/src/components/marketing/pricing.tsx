'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { marketingConfig } from './config';
import { SectionHeading } from './shared';

const formatPkr = (price: number) => new Intl.NumberFormat('en-PK').format(price);

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section
      id="pricing"
      aria-label="Plans and pricing"
      className="marketing-section px-5 py-24 sm:px-8 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          centered
          eyebrow="Room to start. Room to grow."
          title="A plan for your next chapter."
          description="Start with one counter, or bring your stores together. Choose what fits your business."
        />
        <div className="mb-5 flex justify-center">
          <div
            className="marketing-billing inline-flex gap-1 rounded-xl border bg-muted/40 p-1"
            role="group"
            aria-label="Billing period"
          >
            {[
              { label: 'Monthly', value: false },
              { label: 'Yearly', value: true },
            ].map(({ label, value }) => (
              <Button
                key={label}
                variant="ghost"
                size="sm"
                aria-pressed={yearly === value}
                onClick={() => setYearly(value)}
                className={cn(
                  'h-10 px-5',
                  yearly === value
                    ? 'bg-background shadow-xs hover:bg-background'
                    : 'text-muted-foreground',
                )}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        {marketingConfig.pricing.placeholder && (
          <p className="mb-10 text-center text-xs leading-5 text-muted-foreground">
            Illustrative pricing and plan allocations. Final prices and inclusions will be confirmed
            before purchase.
          </p>
        )}
        <div
          className="mx-auto grid max-w-md gap-5 lg:max-w-none lg:grid-cols-3"
          aria-live="polite"
          aria-atomic="true"
        >
          {marketingConfig.pricing.plans.map((plan) => {
            const price = yearly ? plan.yearly : plan.monthly;
            return (
              <Card
                key={plan.name}
                className={cn(
                  'marketing-card relative flex flex-col p-6 shadow-none sm:p-8 md:p-6 lg:p-8',
                  plan.popular && 'marketing-plan-featured border-primary/60 bg-primary/5',
                )}
              >
                <div className="mb-4 flex min-h-6 flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.popular && (
                    <Badge className="h-auto px-2 py-1 text-xs">Most popular · sample</Badge>
                  )}
                </div>
                <p className="min-h-12 text-sm leading-6 text-muted-foreground">
                  {plan.description}
                </p>
                <div className="mt-6 min-h-24">
                  {price === null ? (
                    <>
                      <p className="text-3xl font-semibold tracking-tight">Let’s talk.</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        A plan around your stores
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="flex flex-wrap items-baseline gap-2">
                        <span className="text-xs font-medium text-muted-foreground">PKR</span>
                        <span className="text-4xl font-semibold tracking-tight tabular-nums">
                          {formatPkr(price)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {yearly ? 'year' : 'month'}
                        </span>
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {yearly ? 'Billed annually · placeholder' : 'Billed monthly · placeholder'}
                      </p>
                    </>
                  )}
                </div>
                <Button
                  asChild
                  variant={plan.popular ? 'default' : 'outline'}
                  className={cn(
                    'marketing-action mt-3 h-11 w-full shadow-none',
                    plan.popular && 'marketing-action-primary',
                  )}
                >
                  {price === null ? (
                    <Link href={marketingConfig.contactHref}>
                      {plan.cta}
                      <ArrowRight className="marketing-arrow size-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <Link prefetch={false} href={marketingConfig.trialHref}>
                      {plan.cta}
                      <ArrowRight className="marketing-arrow size-4" aria-hidden="true" />
                    </Link>
                  )}
                </Button>
                <ul className="mt-7 space-y-4 border-t pt-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-5">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-primary dark:text-foreground"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          All amounts in Pakistani rupees. Tax treatment and commercial terms are to be confirmed.
        </p>
      </div>
    </section>
  );
}
