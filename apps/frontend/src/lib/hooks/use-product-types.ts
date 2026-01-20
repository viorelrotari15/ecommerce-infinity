'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAPI, fetchAPIAuth } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth';
import { apiClient } from '@/lib/api/client';

export interface ProductType {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface ProductTypeTranslation {
  id: string;
  productTypeId: string;
  language: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
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

/**
 * Hook for fetching product type translations
 */
export function useProductTypeTranslations(productTypeId: string) {
  const token = getAuthToken();
  return useQuery({
    queryKey: [...productTypeQueryKeys.list(), 'translations', productTypeId],
    queryFn: async (): Promise<ProductTypeTranslation[]> => {
      if (!token) throw new Error('Not authenticated');
      return fetchAPIAuth<ProductTypeTranslation[]>(
        `/product-types/${productTypeId}/translations`,
        token,
      );
    },
    enabled: !!productTypeId && !!token,
  });
}

/**
 * Hook for creating/updating product type translation
 */
export function useUpsertProductTypeTranslation() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async ({
      productTypeId,
      language,
      name,
      description,
    }: {
      productTypeId: string;
      language: string;
      name: string;
      description?: string;
    }) => {
      if (!token) throw new Error('Not authenticated');
      return apiClient.post<ProductTypeTranslation>(
        `/product-types/${productTypeId}/translations/${language}`,
        { name, description },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...productTypeQueryKeys.list(), 'translations', variables.productTypeId],
      });
      queryClient.invalidateQueries({ queryKey: productTypeQueryKeys.list() });
    },
  });
}
