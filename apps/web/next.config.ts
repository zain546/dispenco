import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@dispenco/ui', '@dispenco/types', '@dispenco/utils'],
  devIndicators: false,
  redirects() {
    return [{ source: '/demo', destination: '/contact', permanent: true }];
  },
};

export default nextConfig;
