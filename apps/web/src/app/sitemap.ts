import type { MetadataRoute } from 'next';
import { marketingConfig } from '@/components/marketing/config';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: marketingConfig.url, changeFrequency: 'monthly', priority: 1 }];
}
