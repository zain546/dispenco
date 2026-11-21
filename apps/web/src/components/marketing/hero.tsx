import { CtaButtons } from './shared';
import { DashboardPreview } from './dashboard-preview';
import './hero.css';

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="marketing-hero relative isolate overflow-x-clip px-5 pt-14 pb-16 sm:px-8 md:pt-24 md:pb-24"
    >
      {/* Atmospheric grid + layered teal/cyan spotlight */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="hero-grid absolute inset-0" />
        <div className="hero-ambient hero-ambient-primary" />
        <div className="hero-ambient hero-ambient-secondary" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="hero-badge mb-7 inline-flex items-center gap-2.5 rounded-full border border-border/80 bg-card/70 px-4 py-1.5 text-xs font-medium text-foreground backdrop-blur-md">
            <span aria-hidden="true" className="relative flex size-2 shrink-0">
              <span className="hero-status-ping absolute inset-0 rounded-full bg-primary motion-reduce:hidden" />
              <span className="hero-status-dot relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Built for pharmacies 
          </p>

          <h1
            id="hero-title"
            className="text-[clamp(2.5rem,1.5rem+3.8vw,4.75rem)] leading-[1.06] font-semibold tracking-[-0.035em] text-balance"
          >
            Run your pharmacy,
            <br className="hidden sm:block" />
            <span className="hero-accent"> not your paperwork.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
            Stay ahead of expiry dates, keep shelves stocked, and bill in seconds. One clear
            workspace for your entire pharmacy.
          </p>

          <div className="mx-auto mt-9 max-w-sm sm:max-w-none">
            <CtaButtons centered />
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            First month free
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            No credit card required
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            Import from Excel
          </p>
        </div>

        <DashboardPreview />
      </div>
    </section>
  );
}
