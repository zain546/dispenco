import { ArrowUpRight, Mail, MessageCircle } from 'lucide-react';
import { marketingConfig } from '@/components/marketing/config';
import { PublicPage, publicPageMetadata } from '@/components/marketing/public-page';

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
      icon: MessageCircle,
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
