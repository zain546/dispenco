import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@dispenco/ui', '@dispenco/types', '@dispenco/utils'],
  devIndicators: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    inlineCss: true,
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  redirects() {
    return [{ source: '/demo', destination: '/contact', permanent: true }];
  },
};

export default withSentryConfig(nextConfig, {
  org: 'dispenco',
  project: 'dispenco-web',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
