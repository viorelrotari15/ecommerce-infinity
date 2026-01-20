'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAPI, fetchAPIAuth } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth';
import { apiClient } from '@/lib/api/client';
import { brandQueryKeys } from '@/lib/api/queries';
import type { Brand } from '@/lib/api/server';

export interface BrandTranslation {
  id: string;
  brandId: string;
  language: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

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

/**
 * Hook for fetching brand translations
 */
export function useBrandTranslations(brandId: string) {
  const token = getAuthToken();
  return useQuery({
    queryKey: [...brandQueryKeys.list(), 'translations', brandId],
    queryFn: async (): Promise<BrandTranslation[]> => {
      if (!token) throw new Error('Not authenticated');
      return fetchAPIAuth<BrandTranslation[]>(
        `/brands/${brandId}/translations`,
        token,
      );
    },
    enabled: !!brandId && !!token,
  });
}

/**
 * Hook for creating/updating brand translation
 */
export function useUpsertBrandTranslation() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async ({
      brandId,
      language,
      name,
      description,
    }: {
      brandId: string;
      language: string;
      name: string;
      description?: string;
    }) => {
      if (!token) throw new Error('Not authenticated');
      return apiClient.post<BrandTranslation>(
        `/brands/${brandId}/translations/${language}`,
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
        queryKey: [...brandQueryKeys.list(), 'translations', variables.brandId],
      });
      queryClient.invalidateQueries({ queryKey: brandQueryKeys.list() });
    },
  });
}
