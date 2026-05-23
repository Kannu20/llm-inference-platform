// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // Docker-friendly output
  experimental: {
    turbo: {}, // Enable Turbopack in dev
  },
  async rewrites() {
    return [
      // Proxy API calls to backend in production to avoid CORS
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
