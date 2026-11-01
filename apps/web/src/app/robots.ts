import type { MetadataRoute } from 'next';
import { marketingConfig } from '@/components/marketing/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/login',
        '/signup',
        '/onboarding',
        '/dashboard',
        '/inventory',
        '/pos',
        '/prescriptions',
        '/purchases',
        '/suppliers',
        '/sales',
        '/customers',
        '/reports',
        '/returns',
        '/transfers',
        '/settings',
        '/chain',
        '/integrations',
        '/team',
      ],
    },
    sitemap: `${marketingConfig.url}/sitemap.xml`,
    host: marketingConfig.url,
  };
}
