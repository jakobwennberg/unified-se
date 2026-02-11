import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@arcim-sync/dashboard', '@arcim-sync/core'],
};

export default nextConfig;
