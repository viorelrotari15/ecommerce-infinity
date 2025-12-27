'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api/client';
import { categoryQueryKeys } from '@/lib/api/queries';
import type { Category } from '@/lib/api/server';

/**
 * Hook for fetching categories
 */
export function useCategories(initialData?: Category[]) {
  return useQuery({
    queryKey: categoryQueryKeys.list(),
    queryFn: async (): Promise<Category[]> => {
      const data = await fetchAPI<{ data: Category[] } | Category[]>('/categories');
      return Array.isArray(data) ? data : data.data || [];
    },
    initialData,
    staleTime: 60 * 60 * 1000, // 1 hour (categories don't change often)
  });
}

