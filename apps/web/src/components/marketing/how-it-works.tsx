import { ArrowRight, BellRing, Check, FileSpreadsheet, ScanLine } from 'lucide-react';
import { SectionHeading } from './shared';

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-label="How to get started"
      className="marketing-section px-5 py-24 sm:px-8 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          centered
          eyebrow="A fresh start, without starting over"
          title="Your next working day can be simpler."
          description="Bring what you have. Start with your best sellers. Build the rest as you go."
        />
        <ol className="grid gap-4 pt-4 md:grid-cols-3">
          {[
            {
              icon: FileSpreadsheet,
              title: 'Import your catalog.',
              description:
                'Bring your Excel or CSV file. Get your core products in first, then add the rest over time.',
            },
            {
              icon: ScanLine,
              title: 'Make your first sale.',
              description:
                'Set up your counter, connect your barcode scanner, and start billing with your team.',
            },
            {
              icon: BellRing,
              title: 'Know what needs attention.',
              description:
                'Open your dashboard for low stock, near-expiry batches, and a clear picture of the day.',
            },
          ].map(({ icon: Icon, title, description }, index) => (
            <li
              key={title}
              className="marketing-card relative rounded-2xl border bg-muted/15 p-6 sm:p-8 md:p-6 lg:p-8"
            >
              <div className="mb-6 flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 font-mono text-sm font-medium text-primary tabular-nums dark:text-primary-foreground">
                  0{index + 1}
                </span>
                <span
                  className="h-px flex-1 bg-gradient-to-r from-primary/25 to-border"
                  aria-hidden="true"
                />
                {index < 2 ? (
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <Check
                    className="size-4 text-primary dark:text-primary-foreground"
                    aria-hidden="true"
                  />
                )}
              </div>
              <Icon className="mb-4 size-5 text-primary dark:text-foreground" aria-hidden="true" />
              <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
