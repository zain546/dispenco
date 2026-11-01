import { ArrowUpRight, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CtaButtons } from './shared';
import { DashboardPreview } from './dashboard-preview';

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="px-5 pt-16 pb-12 sm:px-8 md:pt-24 md:pb-16">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="outline"
            className="mb-7 h-auto gap-2 border-border bg-muted/40 px-3 py-1.5 text-xs font-normal"
          >
            <MapPin aria-hidden="true" />
            Built for pharmacies in Pakistan <ArrowUpRight aria-hidden="true" />
          </Badge>
          <h1
            id="hero-title"
            className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            Run your pharmacy,
            <br className="hidden sm:block" />
            <span className="text-primary dark:text-primary-foreground"> not your paperwork.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
            Stay ahead of expiry dates. Keep your shelves stocked. Bill in seconds. One clear
            workspace for your whole pharmacy.
          </p>
          <div className="mx-auto mt-8 max-w-sm sm:max-w-none">
            <CtaButtons centered />
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
