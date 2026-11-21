import { Check } from 'lucide-react';
import { DispencoMark } from '@/components/brand/dispenco-mark';
import { CtaButtons } from './shared';
import { SpotlightCard } from './spotlight-card';

export function FinalCta() {
  return (
    <section
      aria-labelledby="cta-title"
      className="marketing-section border-t px-5 py-20 sm:px-8 md:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <SpotlightCard
          standalone
          className="relative overflow-hidden rounded-3xl border-primary/20 bg-card px-6 py-16 text-center sm:px-12 md:py-24"
        >
          {/* Subtle architectural grid & top teal spotlight */}
          <div
            aria-hidden="true"
            className="marketing-cta-grid pointer-events-none absolute inset-0"
          />
          <div
            aria-hidden="true"
            className="marketing-cta-glow pointer-events-none absolute inset-0"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent dark:via-chart-1/70"
          />

          <div className="relative mx-auto max-w-2xl">
            <div className="mb-7 inline-flex items-center justify-center">
              <DispencoMark className="size-12 rounded-2xl" />
            </div>

            <h2
              id="cta-title"
              className="text-[clamp(2rem,1.4rem+2.2vw,3.25rem)] leading-[1.1] font-semibold tracking-[-0.03em] text-balance"
            >
              Make room for a{' '}
              <span className="hero-accent">better working day.</span>
            </h2>

            <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-pretty text-muted-foreground md:text-lg">
              Bring your stock, sales, and daily decisions into one simple workspace. Start with
              what you have and grow from there.
            </p>

            <div className="mt-9">
              <CtaButtons centered />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {['First month free', 'No credit card required', 'Import your Excel catalog'].map(
                (text) => (
                  <span key={text} className="inline-flex items-center gap-1.5">
                    <Check
                      className="size-3.5 shrink-0 text-primary dark:text-chart-1"
                      aria-hidden="true"
                    />
                    {text}
                  </span>
                ),
              )}
            </div>
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}
