import type { Metadata } from 'next';
import { marketingConfig } from '@/components/marketing/config';
import { Hero } from '@/components/marketing/hero';
import { TrustStrip } from '@/components/marketing/trust-strip';
import { Outcomes } from '@/components/marketing/outcomes';
import { Features } from '@/components/marketing/features';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { AiSection } from '@/components/marketing/ai-section';
import { Pricing } from '@/components/marketing/pricing';
import { Testimonials } from '@/components/marketing/testimonials';
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
  operatingSystem: 'Web',
  url: marketingConfig.url,
  image: `${marketingConfig.url}/brand/dispenco-logo.png`,
  publisher: { '@id': `${marketingConfig.url}/#organization` },
  description,
  inLanguage: 'en',
  featureList: [
    'Batch and expiry tracking',
    'Barcode point of sale',
    'Stock ledger',
    'Sales reports',
    'Multi-store transfers',
    'Supplier balances',
    'CSV import',
  ],
};

export default function MarketingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationSchema, websiteSchema, softwareSchema]).replace(
            /</g,
            '\\u003c',
          ),
        }}
      />
      <Hero />
      <TrustStrip />
      <Outcomes />
      <Features />
      <HowItWorks />
      <AiSection />
      <Pricing />
      <Testimonials />
      <Faq />
      <FinalCta />
    </>
  );
}
