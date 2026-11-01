import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { marketingConfig } from './config';
import { Wordmark } from './shared';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Contact us', href: marketingConfig.contactHref },
      {
        label: 'Help & support',
        href: marketingConfig.supportHref,
      },
    ],
  },
  {
    title: 'Legal',
    links: [
      {
        label: 'Privacy Policy',
        href: marketingConfig.privacyHref,
      },
      {
        label: 'Terms of Service',
        href: marketingConfig.termsHref,
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
              href={`mailto:${marketingConfig.email}`}
              className="marketing-text-link mt-5 inline-flex max-w-full items-center gap-1.5 rounded-md py-1 text-sm"
            >
              <span className="min-w-0 break-all">{marketingConfig.email}</span>
              <ArrowUpRight className="marketing-arrow size-3 shrink-0" aria-hidden="true" />
            </a>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="mb-5 text-xs font-semibold">{column.title}</h2>
                <ul className="space-y-4">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        prefetch={false}
                        className="marketing-text-link inline-block rounded-md py-1 text-xs leading-5 text-muted-foreground hover:text-foreground"
                      >
                        {link.label}
                      </Link>
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
