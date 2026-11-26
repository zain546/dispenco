import type { Metadata } from 'next';
import { marketingConfig } from '@/components/marketing/config';
import { Hero } from '@/components/marketing/hero';
import { TrustStrip } from '@/components/marketing/trust-strip';
import { Features } from '@/components/marketing/features';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { Pricing } from '@/components/marketing/pricing';
import { Faq } from '@/components/marketing/faq';
import { FinalCta } from '@/components/marketing/final-cta';

const title = 'Dispenco — Pharmacy Inventory & Billing Software in Pakistan';
const description =
  'Run your pharmacy, not your paperwork. Track batches and expiry dates, bill faster, and manage stock, purchases, and multiple stores with Dispenco.';

export const metadata: Metadata = {
  metadataBase: new URL(marketingConfig.url),
  title,
  description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    url: '/',
    siteName: 'Dispenco',
    title,
    description,
  },
  twitter: { card: 'summary_large_image', title, description },
};

// Organization + WebSite tell Google which logo and site name to show in Search.
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${marketingConfig.url}/#organization`,
  name: 'Dispenco',
  url: marketingConfig.url,
  logo: {
    '@type': 'ImageObject',
    url: `${marketingConfig.url}/brand/dispenco-logo.png`,
    width: 512,
    height: 512,
  },
  image: `${marketingConfig.url}/brand/dispenco-logo.png`,
  email: marketingConfig.email,
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    telephone: marketingConfig.whatsappNumber,
    email: marketingConfig.email,
    areaServed: 'PK',
    availableLanguage: ['en', 'ur'],
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${marketingConfig.url}/#website`,
  name: 'Dispenco',
  url: marketingConfig.url,
  publisher: { '@id': `${marketingConfig.url}/#organization` },
};

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Dispenco',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, Windows, Android, iOS',
  url: marketingConfig.url,
  image: `${marketingConfig.url}/brand/dispenco-logo.png`,
  publisher: { '@id': `${marketingConfig.url}/#organization` },
  description,
  inLanguage: 'en',
  offers: {
    '@type': 'Offer',
    price: '1500',
    priceCurrency: 'PKR',
    priceValidUntil: '2027-12-31',
    availability: 'https://schema.org/InStock',
    seller: { '@id': `${marketingConfig.url}/#organization` },
  },
  featureList: [
    'FEFO batch and expiry date tracking',
    'Instant barcode POS billing and receipts',
    'Customer Khata ledger accounting',
    'Stock purchase orders and supplier balances',
    'Multi-branch transfer and chain management',
    'AI invoice and receipt scanning',
    'Daily sales and gross profit analytics',
    'Offline POS billing protection',
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does batch and expiry tracking work in Dispenco?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Dispenco uses First-Expiry-First-Out (FEFO) automated batch prioritization. When dispensing, the system automatically selects the nearest-expiry batch to prevent unsellable expired medicine losses.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I import my existing medicine catalog and stock?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. You can import your complete medicine stock list via CSV or Excel, or use Dispenco’s built-in AI invoice scanner to digitize distributor stock delivery sheets directly.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens if the internet connection drops during peak rush hours?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Dispenco features offline POS resilience. Sales continue to be recorded locally in your browser storage and automatically sync to your database as soon as connection is restored.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Dispenco work with thermal receipt printers and barcode scanners?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Dispenco works seamlessly with standard USB and Bluetooth barcode scanners (1D & 2D) as well as 80mm and 58mm thermal receipt printers.',
      },
    },
  ],
};

export default function MarketingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            organizationSchema,
            websiteSchema,
            softwareSchema,
            faqSchema,
          ]).replace(/</g, '\\u003c'),
        }}
      />
      <Hero />
      <TrustStrip />
      <Features />
      <HowItWorks />
      <Pricing />
      <Faq />
      <FinalCta />
    </>
  );
}
