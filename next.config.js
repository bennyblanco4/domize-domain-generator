/** @type {import('next').NextConfig} */
const path = require('path');
const webpack = require('webpack');

const nextConfig = {
  /* config options here */
  webpack: (config, { dev, isServer }) => {
    // Disable cache in dev mode to prevent "incorrect header check" error
    if (dev) {
      config.cache = false;
    } else {
      // For production builds, use memory cache instead of file cache
      config.cache = {
        type: 'memory',
        maxGenerations: 1,
      };
    }

    // Add fallbacks for problematic modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      module: false,
      path: false,
    };

    // Alias problematic modules to mock implementations
    config.resolve.alias = {
      ...config.resolve.alias,
      'clone-deep': path.resolve(__dirname, './src/mocks/clone-deep.js'),
      'lazy-cache': path.resolve(__dirname, './src/mocks/lazy-cache.js'),
      'kind-of': path.resolve(__dirname, './src/mocks/kind-of.js'),
      'is-plain-object': path.resolve(__dirname, './src/mocks/is-plain-object.js'),
      'shallow-clone': path.resolve(__dirname, './src/mocks/shallow-clone.js'),
      'for-own': path.resolve(__dirname, './src/mocks/for-own.js'),
    };

    // Disable warning for dynamic requires
    config.module.exprContextCritical = false;

    return config;
  },
  // Don't run TypeScript during production builds - we've already checked in development
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Don't run ESLint during production builds
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Add namecheap.com to the allowed domains for images and fetch
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.namecheap.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Add global security headers
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';

    const scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      'https://challenges.cloudflare.com', // Cloudflare Turnstile
    ];
    if (isDev) {
      // Next.js dev server and React Refresh need eval; allow only in dev
      scriptSrc.push("'unsafe-eval'", 'blob:');
    }

    const connectSrc = [
      "'self'",
      'https://challenges.cloudflare.com', // Cloudflare Turnstile
    ];
    if (isDev) {
      // Allow HMR websockets and local connections in dev
      connectSrc.push('ws:', 'http://localhost:*', 'https://localhost:*');
    }

    const csp = [
      "default-src 'self'",
      `script-src ${scriptSrc.join(' ')}`,
      `connect-src ${connectSrc.join(' ')}`,
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "frame-src https://challenges.cloudflare.com", // Cloudflare Turnstile iframe
      "frame-ancestors 'none'",
      'object-src \u0027none\u0027',
      "base-uri 'self'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          // HSTS (1 year; include subdomains; preload)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Clickjacking protection (also covered by CSP frame-ancestors)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Referrer policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict powerful APIs
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()' },
          // Content Security Policy
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 