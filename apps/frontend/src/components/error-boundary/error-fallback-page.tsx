'use client';

import type { CSSProperties } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getBranding } from '@/lib/branding';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/utils/translations';
import { translationKeys } from '@/lib/utils/translations';

const isProduction = process.env.NODE_ENV === 'production';

interface ErrorFallbackPageProps {
  error: Error & { digest?: string };
  reset?: () => void;
}

export function ErrorFallbackPage({ error, reset }: ErrorFallbackPageProps) {
  const t = useT();
  const branding = getBranding();
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
            {isProduction ? t(translationKeys.common.status, 'Status') : 'Error boundary'}
          </p>
          <h1 className="text-xl font-semibold text-foreground">
            {t(translationKeys.common.somethingWentWrong, 'Something went wrong')}
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {t(translationKeys.errorPage.description, "We've been notified. Please try again or return to the homepage.")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {reset && (
            <Button onClick={reset} variant="default" size="lg">
              {t(translationKeys.common.tryAgain, 'Try again')}
            </Button>
          )}
          <Button asChild variant="outline" size="lg">
            <Link href="/">{t(translationKeys.header.menu.home, 'Home')}</Link>
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
