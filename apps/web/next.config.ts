import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@dispenco/ui', '@dispenco/types', '@dispenco/utils'],
};

export default nextConfig;
