/** @type {import('next').NextConfig} */

// Allow image URLs from app origin (e.g. Cloudflare Tunnel) and MinIO
function getImageDomains() {
  const list = ['localhost'];
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_CDN_URL;
    if (appUrl) {
      const host = new URL(appUrl).hostname;
      if (host && !list.includes(host)) list.push(host);
    }
  } catch (_) {}
  return list;
}

// Use unoptimized images when: dev, tunnel, or no custom domain at build time.
// Avoids "url parameter is not allowed" when the image host isn't in the allow list.
function useUnoptimizedImages() {
  if (process.env.NODE_ENV === 'development') return true;
  if (process.env.NEXT_PUBLIC_IMAGE_UNOPTIMIZED === 'true') return true;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_CDN_URL || '').toLowerCase();
  // Tunnel or local: use unoptimized so product images always work
  if (!appUrl || appUrl.includes('trycloudflare.com') || appUrl.includes('localhost')) return true;
  return false;
}

// Security headers to mitigate XSS, clickjacking, MIME sniffing
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: getImageDomains(),
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/**',
      },
    ],
    unoptimized: useUnoptimizedImages(),
  },
};

module.exports = nextConfig;

