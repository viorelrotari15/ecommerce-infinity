'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api/client';

export interface ProductType {
  id: string;
  name: string;
  slug: string;
}

export const productTypeQueryKeys = {
  all: ['product-types'] as const,
  lists: () => [...productTypeQueryKeys.all, 'list'] as const,
  list: () => [...productTypeQueryKeys.lists()] as const,
};

/**
 * Hook for fetching product types
 */
export function useProductTypes(initialData?: ProductType[]) {
  return useQuery({
    queryKey: productTypeQueryKeys.list(),
    queryFn: async (): Promise<ProductType[]> => {
      const data = await fetchAPI<ProductType[]>('/product-types');
      return Array.isArray(data) ? data : [];
    },
    initialData,
    staleTime: 60 * 60 * 1000, // 1 hour (product types don't change often)
  });
}

