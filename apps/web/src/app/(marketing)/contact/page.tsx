import type { SVGProps } from 'react';
import { ArrowUpRight, Mail } from 'lucide-react';
import { marketingConfig } from '@/components/marketing/config';
import { PublicPage, publicPageMetadata } from '@/components/marketing/public-page';

function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </svg>
  );
}

export const metadata = publicPageMetadata(
  'Contact us',
  'Contact Dispenco directly by email or WhatsApp for product questions and support.',
  '/contact',
);

export default function ContactPage() {
  const channels = [
    {
      label: 'Email',
      value: marketingConfig.email,
      href: `mailto:${marketingConfig.email}`,
      icon: Mail,
      external: false,
    },
    {
      label: 'WhatsApp',
      value: marketingConfig.whatsappNumber,
      href: marketingConfig.whatsappHref,
      icon: WhatsAppIcon,
      external: true,
    },
  ];

  return (
    <PublicPage
      narrow
      eyebrow="Get in touch"
      title="Contact us."
      description="For product questions or support, reach out by email or WhatsApp."
    >
      <div className="max-w-2xl divide-y border-y">
        {channels.map(({ label, value, href, icon: Icon, external }) => (
          <a
            key={label}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            aria-label={external ? `WhatsApp ${value} (opens in a new tab)` : undefined}
            className="group flex items-center gap-4 rounded-lg py-6"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/25 text-primary dark:text-primary-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-medium text-muted-foreground">{label}</h2>
              <p className="mt-1 break-all text-sm font-medium underline-offset-4 group-hover:underline sm:text-base">
                {value}
              </p>
            </div>
            <ArrowUpRight
              className="hidden size-4 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5 sm:block"
              aria-hidden="true"
            />
          </a>
        ))}
      </div>
    </PublicPage>
  );
}
