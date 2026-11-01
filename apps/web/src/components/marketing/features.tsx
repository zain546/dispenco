import {
  ArrowDownUp,
  ArrowUpRight,
  Barcode,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleUserRound,
  FileText,
  Search,
  Store,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SectionHeading } from './shared';

function PosPreview() {
  return (
    <div
      className="mt-8 overflow-hidden rounded-t-xl border bg-background text-xs shadow-sm"
      role="img"
      aria-label="Sample point of sale with three medicines and a total of PKR 1,180"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">
          New sale <span className="ml-2 font-normal text-muted-foreground">#1042</span>
        </span>
        <Barcode className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-muted-foreground">
          <Search className="size-4" aria-hidden="true" />
          <span className="flex-1">Search a medicine or scan barcode</span>
          <kbd className="hidden rounded-sm border bg-background px-1.5 font-sans text-micro sm:inline">
            F2
          </kbd>
        </div>
        <div className="mt-3 divide-y">
          {[
            { name: 'Panadol 500mg', qty: '2 × 60', price: '120' },
            { name: 'Augmentin 625mg', qty: '1 × 820', price: '820' },
            { name: 'Brufen 400mg', qty: '1 × 240', price: '240' },
          ].map((item) => (
            <div key={item.name} className="flex justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="mt-1 text-micro text-muted-foreground">{item.qty}</p>
              </div>
              <span className="tabular-nums">PKR {item.price}</span>
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between rounded-lg bg-primary px-3 py-3 text-primary-foreground">
          <span className="flex items-center gap-2 font-medium">
            <Check className="size-4" aria-hidden="true" />
            Complete sale
          </span>
          <span className="font-semibold tabular-nums">
            PKR 1,180 <ChevronRight className="ml-1 inline size-4" aria-hidden="true" />
          </span>
        </div>
      </div>
    </div>
  );
}

function ExpiryPreview() {
  return (
    <div
      className="mt-8 rounded-t-xl border bg-background p-4 shadow-sm"
      role="img"
      aria-label="Sample expiry alerts with batch and stock details"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold">Expiry watch</span>
        <Badge variant="secondary" className="text-xs">
          Upcoming batches
        </Badge>
      </div>
      {[
        {
          name: 'Augmentin 625mg',
          batch: 'AUG-2411 · 24 packs',
          date: '31 Jan 2027',
          percent: 'w-3/4',
        },
        {
          name: 'Glucophage 500mg',
          batch: 'GLU-2412 · 18 packs',
          date: '28 Feb 2027',
          percent: 'w-1/2',
        },
        {
          name: 'Brufen 400mg',
          batch: 'BRF-2501 · 12 packs',
          date: '31 Mar 2027',
          percent: 'w-1/3',
        },
      ].map((item) => (
        <div key={item.name} className="border-t py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium">{item.name}</span>
            <span className="text-micro text-muted-foreground">{item.date}</span>
          </div>
          <p className="mt-1 text-micro text-muted-foreground">{item.batch}</p>
          <div className="mt-3 h-1 rounded-full bg-muted">
            <div className={`${item.percent} h-1 rounded-full bg-primary/60`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Features() {
  return (
    <section
      id="features"
      aria-label="Dispenco features"
      className="marketing-section border-y bg-muted/30 px-5 py-24 sm:px-8 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="One workspace. Every working day."
            title="Everything your pharmacy needs. Nothing in your way."
            description="From the first delivery to the last sale, your records stay connected."
          />
          <p className="mb-12 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Available today
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-12">
          <Card className="overflow-hidden p-6 pb-0 shadow-none sm:px-8 sm:pt-8 md:col-span-7">
            <div className="mb-5 flex size-10 items-center justify-center rounded-lg border bg-muted/40">
              <Barcode className="size-5" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight">Built for the busy counter.</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Keyboard shortcuts, barcode scanning, and typo-tolerant search keep every sale moving.
            </p>
            <PosPreview />
          </Card>
          <Card className="overflow-hidden bg-muted/40 p-6 pb-0 shadow-none sm:px-8 sm:pt-8 md:col-span-5">
            <div className="mb-5 flex size-10 items-center justify-center rounded-lg border bg-background">
              <ArrowDownUp className="size-5" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight">No batch left behind.</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Track batches and expiry dates, with a clear list of the stock that needs your
              attention.
            </p>
            <ExpiryPreview />
          </Card>
          {[
            {
              icon: FileText,
              title: 'Purchases, connected.',
              description:
                'Keep purchase invoices, returns, and supplier balances in the same place.',
              preview: 'Invoice received',
              detail: 'Stock & balance updated',
              symbol: Check,
            },
            {
              icon: Wallet,
              title: 'Credit, kept clear.',
              description: 'Track customer balances and payments without a separate notebook.',
              preview: 'Customer ledger',
              detail: 'Every payment accounted for',
              symbol: CircleUserRound,
            },
            {
              icon: ChartNoAxesCombined,
              title: 'See the bigger picture.',
              description: 'Check sales reports and business performance, even from your phone.',
              preview: 'Today’s sales',
              detail: 'PKR 48,250',
              symbol: ArrowUpRight,
            },
            {
              icon: Store,
              title: 'More stores. One view.',
              description: 'Move stock between outlets and check every store from your chain view.',
              preview: 'Inter-store transfer',
              detail: 'Main store → Branch 02',
              symbol: ArrowDownUp,
            },
          ].map(({ icon: Icon, title, description, preview, detail, symbol: Symbol }) => (
            <Card key={title} className="flex flex-col p-6 shadow-none md:col-span-6 lg:col-span-3">
              <Icon className="mb-5 size-5 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-base font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 mb-7 text-sm leading-6 text-muted-foreground">{description}</p>
              <div className="mt-auto rounded-lg border bg-muted/30 p-3">
                <div className="mb-2 flex items-center justify-between gap-2 text-micro text-muted-foreground">
                  {preview}
                  <Symbol className="size-4 shrink-0" aria-hidden="true" />
                </div>
                <p className="text-xs font-medium tabular-nums">{detail}</p>
              </div>
            </Card>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Product previews use illustrative records. Also includes prescriptions, a stock ledger,
          and Safepay digital payments.
        </p>
      </div>
    </section>
  );
}
