import Link from 'next/link';
import { ArrowRight, Zap, ScanBarcode, Printer, WifiOff, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { PublicPage, publicPageMetadata } from '@/components/marketing/public-page';
import { marketingConfig } from '@/components/marketing/config';

export const metadata = publicPageMetadata(
  'Pharmacy POS & Medical Store Billing Software in Pakistan',
  'High-speed barcode pharmacy POS software. Bill customers in seconds, print 80mm/58mm thermal receipts, manage walk-in sales, and keep selling even when internet disconnects.',
  '/features/pharmacy-pos-billing',
);

export default function PharmacyPosBillingPage() {
  const highlights = [
    {
      title: '5-Second Rapid Barcode Billing',
      description:
        'Designed specifically for peak clinic and hospital rush hours. Scan barcodes or start typing a medicine name — the POS fetches stock, batches, and prices with zero lag.',
      icon: Zap,
    },
    {
      title: 'Works with Any Thermal Printer & Scanner',
      description:
        'Seamless compatibility with standard 1D/2D USB or Bluetooth barcode scanners, and all 58mm & 80mm thermal receipt printers without needing proprietary drivers.',
      icon: Printer,
    },
    {
      title: 'Offline POS Billing Resilience',
      description:
        'Never let load-shedding or internet disconnects halt your sales counter. Dispenco queues transactions locally in your browser and syncs automatically when reconnected.',
      icon: WifiOff,
    },
    {
      title: 'Item Returns & Proportional Discounts',
      description:
        'Process single-item medicine returns against past receipt numbers with automated proportional refund calculations and stock restoration.',
      icon: ShoppingBag,
    },
  ];

  return (
    <PublicPage
      eyebrow="Counter Operations & POS"
      title="High-Speed Point of Sale Built for Busy Pakistani Pharmacies"
      description="Long customer queues during evening doctor hours require a POS that is lightning-fast, keyboard-driven, and resilient against internet outages."
    >
      <div className="space-y-16">
        {/* Features Grid */}
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

        {/* Counter Speed Benefits */}
        <div className="rounded-3xl border border-border/80 bg-muted/40 p-8 sm:p-12">
          <h2 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
            Engineered for the Real-World Pharmacy Counter
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                100% Keyboard-Friendly
              </div>
              <p className="text-sm text-muted-foreground">
                Speed up billing with keyboard shortcuts. Add items, apply bill discounts, and print without reaching for the mouse.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                Professional Receipts
              </div>
              <p className="text-sm text-muted-foreground">
                Print crisp receipts featuring your pharmacy name, phone number, batch numbers, and expiry dates.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                Multi-Payment Support
              </div>
              <p className="text-sm text-muted-foreground">
                Accept Cash, Debit/Credit Card, EasyPaisa, JazzCash, or record transactions directly to a customer's Khata.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Strip */}
        <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-primary px-8 py-10 text-primary-foreground sm:flex-row sm:px-12">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-xl font-bold sm:text-2xl">Upgrade your counter speed today</h3>
            <p className="text-sm text-primary-foreground/80">
              Only Rs. 1,500/month per store. Free 14-day trial with full barcode POS capabilities.
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
