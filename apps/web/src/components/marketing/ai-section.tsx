import { Check, CircleCheck, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeading } from './shared';

export function AiSection() {
  return (
    <section
      aria-label="Upcoming AI features"
      className="marketing-section border-y bg-muted/30 px-5 py-24 sm:px-8 md:py-32"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <Badge variant="outline" className="mb-6 h-auto bg-background px-3 py-1 text-xs">
            Coming soon
          </Badge>
          <SectionHeading
            eyebrow="A second pair of eyes. You stay in charge."
            title="Helpful suggestions. Clear reasoning. Your call."
            description="We’re building AI that shows its work. It will suggest a next step, explain why, and wait for you to approve it."
          />
          <p className="-mt-5 flex items-start gap-3 text-sm leading-6">
            <CircleCheck
              className="mt-0.5 size-5 shrink-0 text-primary dark:text-foreground"
              aria-hidden="true"
            />
            AI will never change your stock or financial records on its own.
          </p>
          <p className="mt-6 text-xs leading-6 text-muted-foreground">
            Also planned: invoice OCR, expiry-risk forecasting, natural-language analytics, and
            WhatsApp/SMS alerts. All coming soon.
          </p>
        </div>
        <div className="rounded-2xl border bg-muted/40 p-4 sm:p-8">
          <Card className="p-5 shadow-none sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="size-4 text-primary dark:text-foreground" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">A little ahead of your next stockout.</h3>
                <p className="mt-1 text-micro text-muted-foreground">
                  Reorder suggestion · concept preview
                </p>
              </div>
            </div>
            <div className="my-5 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Panadol 500mg</p>
                  <p className="mt-1 text-xs text-muted-foreground">Suggested order</p>
                </div>
                <span className="text-xl font-semibold tabular-nums">
                  48 <span className="text-xs font-normal text-muted-foreground">packs</span>
                </span>
              </div>
            </div>
            <p className="text-overline text-muted-foreground">Here’s the reasoning</p>
            <dl className="mt-3 space-y-3 text-xs">
              {[
                ['Average daily sales', '6 packs / day'],
                ['Supplier lead time', '5 days'],
                ['Safety stock', '4 days'],
                ['Currently on your shelf', '6 packs'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-t pt-3 text-micro leading-5 text-muted-foreground">
              6 × (5 + 4) − 6 = 48 packs. Cover the lead time, plus a small buffer.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button disabled size="sm" className="shadow-none disabled:opacity-75">
                <Check className="size-4" aria-hidden="true" />
                Approve
              </Button>
              <Button disabled variant="outline" size="sm" className="disabled:opacity-75">
                <X className="size-4" aria-hidden="true" />
                Dismiss
              </Button>
            </div>
            <p className="mt-3 text-center text-micro text-muted-foreground">
              Preview only. No order will be placed.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
