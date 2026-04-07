import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  async rewrites() {
    return [
      { source: '/favicon.ico', destination: '/api/favicon' },
      { source: '/icon.png', destination: '/api/favicon' },
    ]
  },
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  // Explicitly use webpack for PWA compatibility with next-pwa
  webpack(config, { isServer }) {
    // Disable webpack caching in production to avoid large cache files on Cloudflare Pages
    if (process.env.NODE_ENV === 'production') {
      config.cache = false;
    }
    return config;
  },
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  customWorkerDir: 'worker',
  fallbacks: {
    document: '/offline.html', // Fallback page when offline and page not cached
  },
  runtimeCaching: [
    // Cache the dynamic manifest so the PWA can launch offline
    {
      urlPattern: /\/api\/manifest/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'manifest-cache',
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    // Cache HTML pages with network-first strategy and offline fallback.
    // TTL kept at 1 day (down from 7) so stale HTML referencing old JS chunk
    // hashes is evicted quickly after a service worker update.
    {
      urlPattern: /^https?:\/\/.*\/(?:dashboard|staff).*$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60 // 1 day
        },
        networkTimeoutSeconds: 5,
      }
    },
    // Cache customer-facing ordering + reservation pages
    {
      urlPattern: /^https?:\/\/[^/]+\/[^/]+\/(?:menu|table|takeaway|book|reservation).*$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'ordering-pages-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60 // 1 day
        },
        networkTimeoutSeconds: 5,
      }
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        },
        networkTimeoutSeconds: 10
      }
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-storage-cache',
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'others',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60
        },
        networkTimeoutSeconds: 10
      }
    }
  ]
});

export default pwaConfig(nextConfig);
