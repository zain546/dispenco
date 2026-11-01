import { Pill } from 'lucide-react';
import { CtaButtons } from './shared';

export function FinalCta() {
  return (
    <section
      aria-labelledby="cta-title"
      className="marketing-section border-t bg-muted/30 px-5 py-24 sm:px-8 md:py-32"
    >
      <div className="mx-auto max-w-2xl text-center">
        <span className="mx-auto mb-7 flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Pill className="size-5 text-primary dark:text-foreground" aria-hidden="true" />
        </span>
        <p className="mb-4 text-overline text-muted-foreground">
          Your pharmacy. A little more in hand.
        </p>
        <h2
          id="cta-title"
          className="text-3xl font-semibold tracking-tight text-balance md:text-4xl"
        >
          Make room for a better working day.
        </h2>
        <p className="mt-5 mb-8 text-base leading-relaxed text-muted-foreground">
          Bring your stock, sales, and daily decisions into one simple workspace.
        </p>
        <div className="mx-auto max-w-sm sm:max-w-none">
          <CtaButtons centered />
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          No credit card required. Start with what you have.
        </p>
      </div>
    </section>
  );
}
