import type { MetadataRoute } from 'next';
import { marketingConfig } from '@/components/marketing/config';
import { supportArticles } from '@/components/marketing/support-content';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: marketingConfig.url,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    ...[
      '/features/batch-expiry-tracking',
      '/features/pharmacy-pos-billing',
      '/features/customer-khata-ledger',
      '/contact',
      '/support',
      '/privacy',
      '/terms',
      ...supportArticles.map(({ slug }) => `/support/${slug}`),
    ].map((path) => ({
      url: `${marketingConfig.url}${path}`,
      lastModified,
      changeFrequency: path.startsWith('/features/') ? ('weekly' as const) : ('monthly' as const),
      priority: path.startsWith('/features/') ? 0.9 : path.startsWith('/support/') ? 0.7 : 0.6,
    })),
  ];
}
