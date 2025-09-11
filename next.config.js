/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/ssr'],
  },
  
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: true, // For better error tracking
  
  // Image optimization
  images: {
    domains: [
      'images.unsplash.com', 
      'avatars.githubusercontent.com', 
      'lh3.googleusercontent.com',
      'supabase.co'
    ],
    formats: ['image/webp', 'image/avif'],
  },
  
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Bundle analyzer and webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Production optimizations
    if (!dev && !isServer) {
      config.optimization.splitChunks.chunks = 'all'
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      }
    }
    
    // Ignore specific warnings
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
    ]
    
    return config
  },
  
  // Enhanced security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.sentry-cdn.com https://browser.sentry-cdn.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co https://*.sentry.io https://vitals.vercel-insights.com https://api.hunter.io https://api.apollo.io https://maps.googleapis.com",
              "frame-src 'self' https://js.sentry-cdn.com",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
            ].join('; '),
          },
          // Security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
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
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex'
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig