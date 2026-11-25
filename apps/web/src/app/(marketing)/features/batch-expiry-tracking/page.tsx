import Link from 'next/link';
import { ArrowRight, AlertTriangle, CalendarCheck, ShieldCheck, RefreshCw, BarChart3, CheckCircle2 } from 'lucide-react';
import { PublicPage, publicPageMetadata } from '@/components/marketing/public-page';
import { marketingConfig } from '@/components/marketing/config';

export const metadata = publicPageMetadata(
  'Medicine Expiry Tracking Software for Pharmacies',
  'Automated FEFO batch tracking software for pharmacies in Pakistan. Prevent expired medicine losses, receive timely distributor return alerts, and protect pharmacy margins.',
  '/features/batch-expiry-tracking',
);

export default function BatchExpiryTrackingPage() {
  const highlights = [
    {
      title: 'Automated FEFO Dispensing',
      description:
        'When selling medicine at the counter, Dispenco automatically selects the batch with the nearest expiry date first (First-Expiry-First-Out), ensuring older stock leaves your shelves before newer shipments.',
      icon: CalendarCheck,
    },
    {
      title: 'Early Distributor Return Warnings',
      description:
        'Get clear 30, 60, and 90-day expiry risk alerts so you can return near-expiry medicines to pharmaceutical distributors within their return policy deadlines without losing money.',
      icon: AlertTriangle,
    },
    {
      title: 'Audited Expired Stock Write-Offs',
      description:
        'Maintain a tamper-proof regulatory audit trail. Write off expired batches with 1-click while automatically recording cost impacts in your pharmacy profit & loss statement.',
      icon: ShieldCheck,
    },
    {
      title: 'Batch-Specific Margin & Cost Tracking',
      description:
        'Track purchase cost fluctuations across distributor batches. Calculate exact gross profit margins per batch when wholesale prices change.',
      icon: BarChart3,
    },
  ];

  return (
    <PublicPage
      eyebrow="Inventory & Expiry Control"
      title="Stop Medicine Expiry Losses Before They Hit Your Bottom Line"
      description="Medical stores in Pakistan lose up to 5–8% of their gross revenue to expired medicine write-offs. Dispenco replaces guesswork with automated FEFO batch prioritization and timely distributor return alerts."
    >
      <div className="space-y-16">
        {/* Key Features Grid */}
        <div className="grid gap-8 md:grid-cols-2">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs sm:p-8"
            >
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="size-6" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">{item.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Why Pakistani Pharmacies Choose Dispenco */}
        <div className="rounded-3xl border border-border/80 bg-muted/40 p-8 sm:p-12">
          <h2 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
            Why FEFO Expiry Tracking Is Vital For Pakistani Medical Stores
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                Zero Expired Medicine at Counter
              </div>
              <p className="text-sm text-muted-foreground">
                Eliminate the risk of mistakenly dispensing an expired syrup or tablet to a patient.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                Distributor Return Recovery
              </div>
              <p className="text-sm text-muted-foreground">
                Identify near-expiry batches 90 days in advance to secure 100% distributor credit or replacement.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                Physical Audit Ready
              </div>
              <p className="text-sm text-muted-foreground">
                Export instant stock taking sheets grouped by shelf location, rack number, and batch expiry.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Strip */}
        <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-primary px-8 py-10 text-primary-foreground sm:flex-row sm:px-12">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-xl font-bold sm:text-2xl">Ready to protect your pharmacy inventory?</h3>
            <p className="text-sm text-primary-foreground/80">
              Start your 14-day free trial today. We will migrate your existing stock list for free.
            </p>
          </div>
          <Link
            href={marketingConfig.trialHref}
            className="inline-flex items-center gap-2 rounded-xl bg-background px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-background/90"
          >
            Start Free Trial
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </PublicPage>
  );
}
