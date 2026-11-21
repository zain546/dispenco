import Link from 'next/link';
import { ArrowRight, BellRing, Check, FileSpreadsheet, ScanLine } from 'lucide-react';
import { SectionHeading } from './shared';
import { SpotlightCard, SpotlightGrid } from './spotlight-card';

const steps = [
  {
    icon: FileSpreadsheet,
    title: 'Import your catalog.',
    description:
      'Bring your Excel or CSV file. Get your best-selling medicines in first, then add the rest as you go.',
  },
  {
    icon: ScanLine,
    title: 'Make your first sale.',
    description:
      'Set up your counter, connect your barcode scanner, and start billing with your staff in minutes.',
  },
  {
    icon: BellRing,
    title: 'Know what needs attention.',
    description:
      'Open your dashboard for low stock, near-expiry batches, and a live picture of your day.',
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-label="How to get started"
      className="marketing-section border-t px-5 py-20 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          centered
          eyebrow="A fresh start, without starting over"
          title="Your next working day can be simpler."
          description="Bring what you have. Start with your best sellers. Build the rest as you go."
        />

        <SpotlightGrid className="grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, description }, index) => (
            <SpotlightCard key={title} className="p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3.5">
                <span className="marketing-feature-icon flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 font-mono text-sm font-semibold text-primary tabular-nums dark:text-chart-1">
                  0{index + 1}
                </span>
                <span
                  className="h-px flex-1 bg-gradient-to-r from-primary/30 to-border"
                  aria-hidden="true"
                />
                {index < 2 ? (
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <Check className="size-4 text-primary dark:text-chart-1" aria-hidden="true" />
                )}
              </div>
              <Icon
                className="mb-3.5 size-5 text-primary dark:text-chart-1"
                aria-hidden="true"
              />
              <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2.5 text-sm leading-7 text-muted-foreground">{description}</p>
            </SpotlightCard>
          ))}
        </SpotlightGrid>

        <div className="mt-10 text-center">
          <Link
            href="/#pricing"
            className="marketing-text-link inline-flex items-center gap-2 rounded-md text-sm font-medium text-foreground"
          >
            See transparent pricing
            <ArrowRight className="marketing-arrow size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
