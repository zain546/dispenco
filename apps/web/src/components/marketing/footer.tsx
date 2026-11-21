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
    <footer className="marketing-footer border-t px-5 pt-14 pb-8 sm:px-8">
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
                <ul className="space-y-2">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        prefetch={false}
                        className="marketing-text-link inline-block rounded-md py-1 text-sm leading-5 text-muted-foreground hover:text-foreground"
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
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Dispenco. All rights reserved.</p>
          <a
            href={marketingConfig.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="marketing-action inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-card"
          >
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            WhatsApp support
            <ArrowUpRight className="marketing-arrow size-3.5 text-muted-foreground" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
