import { Barcode, LaptopMinimal, PackageCheck, ShieldCheck } from 'lucide-react';

export function TrustStrip() {
  return (
    <section
      aria-label="Built around the way your pharmacy works"
      className="border-b px-5 pb-10 sm:px-8"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 rounded-2xl border bg-muted/15 p-4 md:grid-cols-4 sm:p-5">
        {[
          { icon: PackageCheck, label: 'Batch & expiry tracking' },
          { icon: Barcode, label: 'Barcode-ready POS' },
          { icon: ShieldCheck, label: 'Access by staff role' },
          { icon: LaptopMinimal, label: 'Works on any device' },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center justify-center gap-2.5 py-2 text-xs text-muted-foreground sm:text-sm"
          >
            <Icon
              className="size-4 shrink-0 text-primary dark:text-primary-foreground"
              aria-hidden="true"
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
