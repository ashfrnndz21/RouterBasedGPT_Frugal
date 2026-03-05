/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use 'standalone' in production builds (adds tracing overhead in dev)
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),

  images: {
    remotePatterns: [
      { hostname: 's2.googleusercontent.com' },
    ],
  },

  // Keep native / heavy server-only packages out of the webpack bundle
  serverExternalPackages: [
    'pdf-parse',
    'better-sqlite3',
    'bcryptjs',
    '@xenova/transformers',
    'winston',
    'mammoth',
    'xlsx',
    'mysql2',
    'pg',
  ],

  compress: true,

  experimental: {
    webpackBuildWorker: true,
    // Turbopack is much faster for dev compilation (Next 15+)
    // Uncomment if compatible with all project deps:
    // turbo: {},
  },
};

export default nextConfig;
