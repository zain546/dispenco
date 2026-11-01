/** Shared public destinations and commercial content. */
const whatsappNumber = '+923424912546';

export const marketingConfig = {
  url: 'https://dispenco.com',
  email: 'zainali546official@gmail.com',
  whatsappNumber,
  whatsappHref: `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`,
  contactHref: '/contact',
  supportHref: '/support',
  privacyHref: '/privacy',
  termsHref: '/terms',
  trialHref: '/signup',
  pricing: {
    placeholder: true,
    plans: [
      {
        name: 'Starter',
        description: 'A simpler day for your first store.',
        monthly: 2500,
        yearly: 25000,
        popular: false,
        cta: 'Start free trial',
        features: [
          'One store',
          'POS, billing & receipts',
          'Batch & expiry tracking',
          'Purchases & supplier balances',
          'CSV catalog import',
        ],
      },
      {
        name: 'Growth',
        description: 'More clarity as your business grows.',
        monthly: 4500,
        yearly: 45000,
        popular: true,
        cta: 'Start free trial',
        features: [
          'Everything in Starter',
          'Low-stock & expiry alerts',
          'Customers & credit ledger',
          'Sales reports & prescriptions',
          'Digital payments via Safepay',
        ],
      },
      {
        name: 'Chain',
        description: 'Your stores, working together.',
        monthly: null,
        yearly: null,
        popular: false,
        cta: 'Contact sales',
        features: [
          'For 2–10 outlets and beyond',
          'A shared view across stores',
          'Inter-store stock transfers',
          'Store-level reporting',
          'Discuss your rollout with us',
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
