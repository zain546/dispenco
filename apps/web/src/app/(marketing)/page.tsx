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
  twitter: { card: 'summary', title, description },
};

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Dispenco',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: marketingConfig.url,
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
          __html: JSON.stringify(softwareSchema).replace(/</g, '\\u003c'),
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
