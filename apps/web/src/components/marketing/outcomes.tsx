import { Clock3, PackageCheck, ScanLine } from 'lucide-react';
import { SectionHeading } from './shared';

export function Outcomes() {
  return (
    <section
      aria-label="A healthier pharmacy business"
      className="marketing-section px-5 py-24 sm:px-8 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div id="outcomes-title">
          <SectionHeading
            eyebrow="Less busywork. More breathing room."
            title="A healthier business starts here."
            description="Your day is already full. Managing stock and sales shouldn’t make it harder."
          />
        </div>
        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {[
            {
              icon: Clock3,
              number: '01',
              title: 'Catch expiry before it costs you.',
              description:
                'See the batches nearing expiry, so you can act while there’s still time. Less stock forgotten at the back of a shelf.',
            },
            {
              icon: PackageCheck,
              number: '02',
              title: 'Keep your best sellers in stock.',
              description:
                'Spot low stock in one place. Know what needs attention before a customer leaves empty-handed.',
            },
            {
              icon: ScanLine,
              number: '03',
              title: 'Keep the counter moving.',
              description:
                'Scan a barcode, find the right medicine, and print a receipt. Give your staff a simpler way to get through the queue.',
            },
          ].map(({ icon: Icon, number, title, description }) => (
            <article key={number} className="border-t pt-6">
              <div className="mb-6 flex items-center justify-between">
                <Icon className="size-5 text-primary dark:text-foreground" aria-hidden="true" />
                <span className="text-overline text-muted-foreground">{number}</span>
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
