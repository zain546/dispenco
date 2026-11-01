import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { marketingConfig } from './config';
import { SectionHeading } from './shared';

const formatPkr = (price: number) => new Intl.NumberFormat('en-PK').format(price);

export function Pricing() {
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
          title="Your first month is on us."
          description="One Starter plan for your pharmacy. Get settled in, then continue with simple monthly pricing."
        />
        <div className="mx-auto max-w-3xl">
          {marketingConfig.pricing.plans.map((plan) => (
            <Card
              key={plan.code}
              className="marketing-card marketing-plan-featured relative gap-0 overflow-hidden border-primary/30 bg-card p-0 shadow-none"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
              />
              <div className="grid sm:grid-cols-2">
                <div className="flex flex-col p-6 sm:p-8">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold tracking-tight">{plan.name}</h3>
                    <Badge
                      variant="secondary"
                      className="border border-primary/15 bg-primary/10 text-primary dark:text-primary-foreground"
                    >
                      {plan.trialDays}-day free trial
                    </Badge>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{plan.description}</p>
                  <div className="mt-8">
                    <p className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-muted-foreground">PKR</span>
                      <span className="text-6xl font-semibold tracking-tight tabular-nums">
                        {formatPkr(plan.trialPricePkr)}
                      </span>
                      <span className="text-sm text-muted-foreground">/ month</span>
                    </p>
                    <p className="mt-3 text-sm font-medium">Free for your first month.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Then{' '}
                      <span className="font-medium text-foreground tabular-nums">
                        PKR {formatPkr(plan.monthlyPkr)}/month
                      </span>
                      .
                    </p>
                  </div>
                  <Button
                    asChild
                    className="marketing-action marketing-action-primary mt-7 h-11 w-full shadow-none"
                  >
                    <Link prefetch={false} href={marketingConfig.trialHref}>
                      {plan.cta}
                      <ArrowRight className="marketing-arrow size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    No credit card required.
                  </p>
                </div>
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
          ))}
        </div>
      </div>
    </section>
  );
}
