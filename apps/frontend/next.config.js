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

const nextConfig = {
  reactStrictMode: true,
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
    // Disable image optimization in development to avoid issues with MinIO
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

module.exports = nextConfig;

