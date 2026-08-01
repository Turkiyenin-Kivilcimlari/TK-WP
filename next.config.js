/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Image optimization
  images: {
    domains: ['api.microlink.io', 'res.cloudinary.com', 'images.unsplash.com', 'ui-avatars.com'],
    unoptimized: process.env.NODE_ENV === 'development',
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Output configuration for Docker
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Experimental features
  experimental: {
    // Add experimental features here if needed
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      // Eski sitenin /home tabanlı URL'leri (Google dizininde kalıntıları var)
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/home/:path*',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // Rewrites for API routes
  async rewrites() {
    return [
      // Add any rewrites here
    ];
  },
  
  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Custom webpack config
    return config;
  },
  
  // Additional configuration can be added here
};

module.exports = nextConfig;
