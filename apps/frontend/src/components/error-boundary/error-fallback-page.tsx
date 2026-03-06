'use client';

import type { CSSProperties } from 'react';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getBranding } from '@/lib/branding';
import { Button } from '@/components/ui/button';

const isProduction = process.env.NODE_ENV === 'production';

interface ErrorFallbackPageProps {
  error: Error & { digest?: string };
  reset?: () => void;
}

/**
 * Error fallback for app/error.tsx. Uses only branding + hardcoded copy so it never
 * depends on Router or Language context (avoids "Cannot read properties of null (reading 'useContext')"
 * when those contexts are broken during error state).
 */
export function ErrorFallbackPage({ error, reset }: ErrorFallbackPageProps) {
  const branding = useMemo(() => getBranding(), []);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4"
      style={(branding.cssVars || {}) as CSSProperties}
    >
      <div className="w-full max-w-md flex flex-col items-center text-center gap-6">
        {/* Logo */}
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

        {/* Status + minimal message */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {isProduction ? 'Status' : 'Error boundary'}
          </p>
          <h1 className="text-xl font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            We&apos;ve been notified. Please try again or return to the homepage.
          </p>
        </div>

        {/* Actions */}
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

        {/* Dev-only: expandable details */}
        {!isProduction && error?.message && (
          <div className="w-full max-w-md text-left border border-border rounded-lg overflow-hidden bg-muted/50">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="w-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {showDetails ? 'Hide details' : 'Show error details'}
            </button>
            {showDetails && (
              <pre className="p-4 text-xs text-foreground overflow-auto max-h-40 whitespace-pre-wrap break-words border-t border-border">
                {error.message}
                {error.digest ? `\nDigest: ${error.digest}` : ''}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
