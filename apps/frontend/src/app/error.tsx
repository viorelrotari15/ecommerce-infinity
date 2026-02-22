'use client';

import { ErrorFallbackPage } from '@/components/error-boundary/error-fallback-page';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallbackPage error={error} reset={reset} />;
}
