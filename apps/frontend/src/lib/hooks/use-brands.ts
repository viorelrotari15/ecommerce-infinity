'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api/client';
import { brandQueryKeys } from '@/lib/api/queries';
import type { Brand } from '@/lib/api/server';

/**
 * Hook for fetching brands
 */
export function useBrands(initialData?: Brand[]) {
  return useQuery({
    queryKey: brandQueryKeys.list(),
    queryFn: async (): Promise<Brand[]> => {
      const data = await fetchAPI<{ data: Brand[] } | Brand[]>('/brands');
      return Array.isArray(data) ? data : data.data || [];
    },
    initialData,
    staleTime: 0, // Always consider data stale so it refetches after invalidation
    refetchOnMount: true, // Refetch when component mounts if data is stale
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

