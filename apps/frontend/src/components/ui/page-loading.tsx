'use client';

import { Loader2 } from 'lucide-react';
import { useT, translationKeys } from '@/lib/utils/translations';

/**
 * Full-page loading state shown during route transitions (e.g. when user navigates to another page).
 * Used by app/loading.tsx and can be reused in route-level loading.tsx files.
 */
export function PageLoading() {
  const t = useT();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16">
      <Loader2
        className="h-10 w-10 animate-spin text-primary"
        aria-hidden
      />
      <p className="text-sm font-medium text-muted-foreground">
        {t(translationKeys.common.loading, 'Loading...')}
      </p>
    </div>
  );
}
