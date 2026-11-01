import type { MetadataRoute } from 'next';
import { marketingConfig } from '@/components/marketing/config';
import { supportArticles } from '@/components/marketing/support-content';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: marketingConfig.url, changeFrequency: 'monthly', priority: 1 },
    ...[
      '/contact',
      '/support',
      '/privacy',
      '/terms',
      ...supportArticles.map(({ slug }) => `/support/${slug}`),
    ].map((path) => ({
      url: `${marketingConfig.url}${path}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
