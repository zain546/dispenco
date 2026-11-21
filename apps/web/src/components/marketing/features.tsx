import {
  ArrowDownUp,
  ArrowUpRight,
  Barcode,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  FileText,
  Search,
  Sparkles,
  Store,
  Wallet,
} from 'lucide-react';
import { SectionHeading } from './shared';
import { SpotlightCard, SpotlightGrid } from './spotlight-card';

function PosPreview() {
  return (
    <div
      className="mt-7 overflow-hidden rounded-t-xl border border-b-0 bg-background/90 text-xs"
      role="img"
      aria-label="Sample point of sale with three medicines and a total of PKR 1,180"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">
          New sale <span className="ml-2 font-mono font-normal text-muted-foreground">#1042</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Scanner ready
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-muted-foreground">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 truncate">Search a medicine or scan barcode</span>
          <kbd className="hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] sm:inline">
            F2
          </kbd>
        </div>
        <div className="mt-3 divide-y">
          {[
            { name: 'Panadol 500mg', qty: '2 × 60', price: '120' },
            { name: 'Augmentin 625mg', qty: '1 × 820', price: '820' },
            { name: 'Brufen 400mg', qty: '1 × 240', price: '240' },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-4 py-2.5">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">{item.qty}</p>
              </div>
              <span className="font-medium tabular-nums">PKR {item.price}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-primary px-3.5 py-3 text-primary-foreground">
          <span className="flex items-center gap-2 font-medium">
            <Check className="size-4" aria-hidden="true" />
            Complete sale
          </span>
          <span className="font-semibold tabular-nums">
            PKR 1,180 <ChevronRight className="ml-0.5 inline size-4" aria-hidden="true" />
          </span>
        </div>
      </div>
    </div>
  );
}

function ExpiryPreview() {
  return (
    <div
      className="mt-7 rounded-t-xl border border-b-0 bg-background/90 p-4"
      role="img"
      aria-label="Sample expiry alerts with batch and stock details"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold">FEFO Expiry Watch</span>
        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
          3 batches tracked
        </span>
      </div>
      {[
        {
          name: 'Augmentin 625mg',
          batch: 'AUG-2411 · 24 packs',
          badge: '13 days left',
          tone: 'text-amber-600 dark:text-amber-400',
          bar: 'w-4/5 bg-amber-500/80',
        },
        {
          name: 'Glucophage 500mg',
          batch: 'GLU-2412 · 18 packs',
          badge: '45 days left',
          tone: 'text-primary dark:text-chart-1',
          bar: 'w-1/2 bg-primary/75',
        },
        {
          name: 'Brufen 400mg',
          batch: 'BRF-2501 · 12 packs',
          badge: '90+ days',
          tone: 'text-muted-foreground',
          bar: 'w-1/3 bg-foreground/30',
        },
      ].map((item) => (
        <div key={item.name} className="border-t py-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium">{item.name}</span>
            <span className={`text-[11px] font-medium tabular-nums ${item.tone}`}>
              {item.badge}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{item.batch}</p>
          <div className="mt-2.5 h-1.5 rounded-full bg-muted">
            <div className={`${item.bar} h-1.5 rounded-full`} />
          </div>
        </div>
      ))}
    </div>
  );
}

const compactTiles = [
  {
    icon: FileText,
    title: 'Purchases, connected.',
    description: 'Keep purchase invoices, returns, and supplier balances in one place.',
    preview: 'Invoice received',
    detail: 'Stock & balance updated',
    symbol: Check,
  },
  {
    icon: Wallet,
    title: 'Khata & credit, kept clear.',
    description: 'Track customer balances and payments without a separate notebook.',
    preview: 'Customer ledger',
    detail: 'Every payment accounted for',
    symbol: CircleUserRound,
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Sales & profit analytics.',
    description: 'Check daily profit, margins, and performance even from your phone.',
    preview: 'Today’s sales',
    detail: 'PKR 48,250 · +14%',
    symbol: ArrowUpRight,
  },
  {
    icon: Store,
    title: 'More stores. One view.',
    description: 'Move stock between branches and monitor every outlet in real time.',
    preview: 'Inter-store transfer',
    detail: 'Main store → Branch 02',
    symbol: ArrowDownUp,
  },
];

export function Features() {
  return (
    <section
      id="features"
      aria-label="Dispenco features"
      className="marketing-section border-t px-5 py-20 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between [&>div]:mb-0">
          <SectionHeading
            eyebrow="One workspace. Every working day."
            title="Everything your pharmacy needs. Nothing in your way."
            description="From the first supplier delivery to the last counter receipt, every record stays connected."
          />
          <p className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            Available today
          </p>
        </div>

        <SpotlightGrid className="grid gap-4 md:grid-cols-12">
          {/* Large Bento 1: POS */}
          <SpotlightCard className="overflow-hidden p-6 pb-0 sm:px-8 sm:pt-8 md:col-span-7">
            <div className="marketing-feature-icon mb-5 flex size-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary dark:text-chart-1">
              <Barcode className="size-5" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight">Keep the counter moving.</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Keyboard shortcuts, barcode scanning, and typo-tolerant search keep every queue moving
              without slowdowns.
            </p>
            <PosPreview />
          </SpotlightCard>

          {/* Large Bento 2: Batch & Expiry */}
          <SpotlightCard className="overflow-hidden p-6 pb-0 sm:px-8 sm:pt-8 md:col-span-5">
            <div className="marketing-feature-icon mb-5 flex size-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary dark:text-chart-1">
              <Clock3 className="size-5" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight">
              Catch expiry before it costs you.
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              FEFO batch tracking highlights near-expiry stock early so you sell or return it before
              it turns into dead loss.
            </p>
            <ExpiryPreview />
          </SpotlightCard>

          {/* 4 Compact Bento Tiles */}
          {compactTiles.map(({ icon: Icon, title, description, preview, detail, symbol: Symbol }) => (
            <SpotlightCard
              key={title}
              className="flex flex-col p-6 md:col-span-6 lg:col-span-3"
            >
              <span className="marketing-feature-icon mb-5 flex size-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary dark:text-chart-1">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <h3 className="text-base font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 mb-6 text-sm leading-6 text-muted-foreground">{description}</p>
              <div className="mt-auto rounded-xl border bg-muted/35 p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  {preview}
                  <Symbol className="size-3.5 shrink-0" aria-hidden="true" />
                </div>
                <p className="text-xs font-medium tabular-nums">{detail}</p>
              </div>
            </SpotlightCard>
          ))}

          {/* Full-width AI Copilot & Roadmap Highlight */}
          <SpotlightCard className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center sm:px-8 md:col-span-12">
            <div className="flex items-start gap-4">
              <span className="marketing-feature-icon mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary dark:text-chart-1">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-sm font-semibold tracking-tight">
                    AI Copilot & upcoming intelligence
                  </h3>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary dark:text-chart-1">
                    In progress
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Invoice OCR, expiry-risk forecasting, natural-language analytics, and WhatsApp/SMS
                  alerts. AI only suggests — nothing changes without your approval.
                </p>
              </div>
            </div>
          </SpotlightCard>
        </SpotlightGrid>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Product previews use illustrative records. Also includes prescriptions, a stock ledger,
          and Safepay digital payments.
        </p>
      </div>
    </section>
  );
}
