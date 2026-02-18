import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { CookieConsentBanner } from '@/components/cookie-consent-banner';
import { getBranding } from '@/lib/branding';
import { WebVitalsReporter } from '@/components/monitoring/web-vitals-reporter';

const inter = Inter({ subsets: ['latin'] });
const branding = getBranding();

export const metadata: Metadata = {
  title: {
    default: `${branding.name} - ${branding.tagline}`,
    template: `%s | ${branding.name}`,
  },
  description: branding.description,
  keywords: branding.keywords,
  authors: [{ name: branding.name }],
  metadataBase: new URL(branding.siteUrl),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: branding.siteUrl,
    siteName: branding.name,
    title: `${branding.name} - ${branding.tagline}`,
    description: branding.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${branding.name} - ${branding.tagline}`,
    description: branding.description,
  },
  icons: {
    icon: branding.logo.favicon,
    apple: branding.logo.appleTouch,
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
      <body className={inter.className} style={branding.cssVars as CSSProperties}>
        <Providers>
          <WebVitalsReporter />
          <div className="flex min-h-screen flex-col">
            <Suspense
              fallback={
                <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <div className="container mx-auto px-4 flex h-16 items-center justify-between max-w-full" />
                </header>
              }
            >
              <Header />
            </Suspense>
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster />
          <CookieConsentBanner />
        </Providers>
      </body>
    </html>
  );
}

