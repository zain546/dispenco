import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@dispenco/ui', '@dispenco/types', '@dispenco/utils'],
  devIndicators: false,
  experimental: {
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
  hideSourceMaps: true,
  disableLogger: true,
});
