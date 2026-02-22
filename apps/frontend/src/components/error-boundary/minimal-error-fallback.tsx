'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getBranding } from '@/lib/branding';
import { Button } from '@/components/ui/button';

/**
 * Minimal error UI for global-error.tsx (no providers: no useT, no router).
 * Uses branding only; copy is hardcoded English.
 */
export function MinimalErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  const branding = getBranding();
  const isProduction = process.env.NODE_ENV === 'production';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        ...((branding.cssVars || {}) as CSSProperties),
        background: branding.palette?.background ?? '#ffffff',
        color: branding.palette?.foreground ?? '#1B0A1A',
      }}
    >
      <div className="w-full max-w-md flex flex-col items-center text-center gap-6">
        <Link href="/" className="shrink-0">
          <Image
            src={branding.logo.primary}
            alt={branding.name}
            width={120}
            height={48}
            className="h-12 w-auto object-contain"
            unoptimized={branding.logo.primary.startsWith('/')}
          />
        </Link>
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wider opacity-70">Status</p>
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm opacity-80 max-w-sm mx-auto">
            We&apos;ve been notified. Please try again or return to the homepage.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {reset && (
            <Button onClick={reset} variant="default" size="lg">
              Try again
            </Button>
          )}
          <Button asChild variant="outline" size="lg">
            <Link href="/">Home</Link>
          </Button>
        </div>
        {!isProduction && error?.message && (
          <pre className="w-full max-w-md p-4 text-xs text-left overflow-auto max-h-32 whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/50">
            {error.message}
            {error.digest ? `\nDigest: ${error.digest}` : ''}
          </pre>
        )}
      </div>
    </div>
  );
}
