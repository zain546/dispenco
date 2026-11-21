import { FileSpreadsheet, Sparkles, Store, WifiOff } from 'lucide-react';
import { SpotlightCard, SpotlightGrid } from './spotlight-card';

const facts = [
  {
    icon: Sparkles,
    value: 'PKR 0',
    label: 'First month free, no card required',
  },
  {
    icon: WifiOff,
    value: 'Offline POS',
    label: 'Queue sales locally & sync back online',
  },
  {
    icon: FileSpreadsheet,
    value: 'CSV Import',
    label: 'Bring your Excel catalog in minutes',
  },
  {
    icon: Store,
    value: 'Multi-Store',
    label: 'Unified chain view & stock transfers',
  },
] as const;

export function TrustStrip() {
  return (
    <section aria-label="Dispenco at a glance" className="px-5 pb-16 sm:px-8 md:pb-24">
      <SpotlightGrid className="mx-auto grid max-w-6xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map(({ icon: Icon, value, label }) => (
          <SpotlightCard key={value} className="flex items-start gap-3.5 p-5">
            <span className="marketing-feature-icon flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary dark:text-chart-1">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-base font-semibold tracking-tight">{value}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{label}</p>
            </div>
          </SpotlightCard>
        ))}
      </SpotlightGrid>
    </section>
  );
}
