import { STARTER_PLAN } from '@dispenco/types';

/** Shared public destinations and commercial content. */
const whatsappNumber = '+923186942546';

export const marketingConfig = {
  url: 'https://dispenco.com',
  email: 'dispenco@gmail.com',
  whatsappNumber,
  whatsappHref: `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`,
  contactHref: '/contact',
  supportHref: '/support',
  privacyHref: '/privacy',
  termsHref: '/terms',
  trialHref: '/signup',
  pricing: {
    plans: [
      {
        ...STARTER_PLAN,
        description: 'A simpler day for your first store.',
        cta: 'Start free trial',
        features: [
          'One store',
          'POS, billing & receipts',
          'Batch & expiry tracking',
          'Purchases & supplier balances',
          'CSV catalog import',
        ],
      },
    ],
  },
  testimonials: [
    {
      quote: '“I want to know what is close to expiry before it becomes a loss.”',
      role: 'Example owner perspective',
      context: 'Stock & expiry',
    },
    {
      quote: '“At a busy counter, finding the right medicine should take seconds.”',
      role: 'Example counter-staff perspective',
      context: 'Everyday billing',
    },
    {
      quote: '“I need one clear view of my stores, even when I am away.”',
      role: 'Example chain-owner perspective',
      context: 'Business visibility',
    },
  ],
} as const;

export const navigation = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'FAQ', href: '/#faq' },
] as const;
