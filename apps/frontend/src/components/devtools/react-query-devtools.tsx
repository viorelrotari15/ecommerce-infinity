'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

/**
 * Safe wrapper for React Query DevTools
 * Uses dynamic import to avoid build-time errors if package isn't installed
 * Handles chunk loading errors gracefully
 */
const ReactQueryDevtools = dynamic(
  () =>
    import('@tanstack/react-query-devtools')
      .then((mod) => mod.ReactQueryDevtools)
      .catch((error) => {
        // Log error in development but don't crash
        if (process.env.NODE_ENV === 'development') {
          console.warn('React Query DevTools failed to load:', error);
        }
        // Return a no-op component if package isn't available or chunk fails to load
        return () => null;
      }),
  { 
    ssr: false,
    loading: () => null, // Don't show loading state
  },
);

export function ReactQueryDevtoolsWrapper(props: { initialIsOpen?: boolean }) {
  const [shouldRender, setShouldRender] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Only render in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Delay rendering to avoid chunk loading issues during hot reload
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  // Handle errors gracefully
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('ChunkLoadError') || event.message?.includes('query-devtools')) {
        setHasError(true);
        event.preventDefault(); // Prevent error from showing in console
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (process.env.NODE_ENV !== 'development' || hasError || !shouldRender) {
    return null;
  }

  try {
    return <ReactQueryDevtools {...props} />;
  } catch (error) {
    // Silently fail if devtools can't be rendered
    console.warn('React Query DevTools render error:', error);
    return null;
  }
}

