import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'E-commerce Infinity - Premium Fragrances',
    template: '%s | E-commerce Infinity',
  },
  description: 'Discover premium fragrances and luxury perfumes. Shop the finest collection of scents for men and women.',
  keywords: ['perfume', 'fragrance', 'luxury', 'e-commerce'],
  authors: [{ name: 'E-commerce Infinity' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: 'E-commerce Infinity',
    title: 'E-commerce Infinity - Premium Fragrances',
    description: 'Discover premium fragrances and luxury perfumes.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'E-commerce Infinity - Premium Fragrances',
    description: 'Discover premium fragrances and luxury perfumes.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}

