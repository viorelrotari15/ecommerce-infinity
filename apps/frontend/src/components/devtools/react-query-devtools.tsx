'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

/**
 * Safe wrapper for React Query DevTools
 * Uses dynamic import to avoid build-time errors if package isn't installed
 */
const ReactQueryDevtools = dynamic(
  () =>
    import('@tanstack/react-query-devtools')
      .then((mod) => mod.ReactQueryDevtools)
      .catch(() => {
        // Return a no-op component if package isn't available
        return () => null;
      }),
  { ssr: false },
);

export function ReactQueryDevtoolsWrapper(props: { initialIsOpen?: boolean }) {
  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <ReactQueryDevtools {...props} />;
}

