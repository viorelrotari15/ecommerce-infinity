'use client';

import { MinimalErrorFallback } from '@/components/error-boundary/minimal-error-fallback';

/**
 * Catches errors in the root layout. Renders a minimal document (replaces entire root).
 * No providers available here, so we use MinimalErrorFallback (no useT / no router).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh' }}>
        <MinimalErrorFallback error={error} reset={reset} />
      </body>
    </html>
  );
}
