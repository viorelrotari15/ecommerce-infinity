'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ReactQueryDevtoolsWrapper } from '@/components/devtools/react-query-devtools';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1, // Only retry once on failure
          },
          mutations: {
            retry: 0, // Don't retry mutations
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query DevTools - only in development, gracefully handles missing package */}
      <ReactQueryDevtoolsWrapper initialIsOpen={false} />
    </QueryClientProvider>
  );
}

