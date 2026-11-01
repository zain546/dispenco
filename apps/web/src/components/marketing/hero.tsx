import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CtaButtons } from './shared';
import { DashboardPreview } from './dashboard-preview';
import './hero.css';

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="marketing-hero relative isolate px-5 pt-16 pb-12 sm:px-8 md:pt-24 md:pb-16"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="hero-grid absolute inset-0" />
        <div className="hero-ambient hero-ambient-primary" />
        <div className="hero-ambient hero-ambient-secondary" />
      </div>
      <div className="relative mx-auto max-w-6xl">
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <Badge
            variant="outline"
            className="hero-badge mb-7 h-auto gap-2.5 border-border/80 bg-muted/30 px-3.5 py-2 text-xs font-medium text-foreground backdrop-blur-md"
          >
            <span aria-hidden="true" className="relative flex size-2 shrink-0">
              <span className="hero-status-ping absolute inset-0 rounded-full bg-primary motion-reduce:hidden" />
              <span className="hero-status-dot relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Built for pharmacies in Pakistan
            <ArrowUpRight aria-hidden="true" />
          </Badge>
          <h1
            id="hero-title"
            className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Run your pharmacy,
            <br className="hidden sm:block" />
            <span className="hero-accent"> not your paperwork.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
            Stay ahead of expiry dates. Keep your shelves stocked. Bill in seconds. One clear
            workspace for your whole pharmacy.
          </p>
          <div className="mx-auto mt-8 max-w-sm sm:max-w-none">
            <CtaButtons centered appearance="hero" />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            No credit card required{' '}
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>{' '}
            Set up in under a day
          </p>
        </div>
        <DashboardPreview />
      </div>
    </section>
  );
}
