import { ArrowUpRight } from 'lucide-react';
import { marketingConfig } from './config';
import { Wordmark } from './shared';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Book a demo', href: marketingConfig.demoHref },
      { label: 'Contact us', href: marketingConfig.contactHref },
      {
        label: 'Help & support',
        href: `${marketingConfig.contactHref}?subject=Dispenco%20support`,
      },
    ],
  },
  {
    title: 'Legal',
    links: [
      {
        label: 'Privacy enquiries',
        href: `${marketingConfig.contactHref}?subject=Privacy%20policy%20enquiry`,
      },
      {
        label: 'Terms enquiries',
        href: `${marketingConfig.contactHref}?subject=Terms%20of%20service%20enquiry`,
      },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="marketing-footer border-t bg-muted/10 px-5 pt-16 pb-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <Wordmark />
            <p className="mt-5 max-w-xs text-sm leading-7 text-muted-foreground">
              Modern inventory and business management for pharmacies and medical stores.
            </p>
            <a
              href={marketingConfig.contactHref}
              className="marketing-text-link mt-5 inline-flex items-center gap-1.5 rounded-md py-1 text-sm"
            >
              {marketingConfig.email}
              <ArrowUpRight className="marketing-arrow size-3" aria-hidden="true" />
            </a>
            <p className="mt-2 text-micro text-muted-foreground">
              Placeholder contact · confirm before launch
            </p>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="mb-5 text-xs font-semibold">{column.title}</h2>
                <ul className="space-y-4">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="marketing-text-link inline-block rounded-md py-1 text-xs leading-5 text-muted-foreground hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Dispenco. All rights reserved.</p>
          <p className="flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1.5">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            Made in Pakistan
          </p>
        </div>
      </div>
    </footer>
  );
}
