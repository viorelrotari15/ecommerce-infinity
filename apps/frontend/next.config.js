/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for Docker
  // Use PORT from environment or default to 3001
  ...(process.env.PORT && { port: parseInt(process.env.PORT) }),
  images: {
    domains: ['localhost'],
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
      },
    ],
    // Disable image optimization in development to avoid issues with MinIO
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

module.exports = nextConfig;

