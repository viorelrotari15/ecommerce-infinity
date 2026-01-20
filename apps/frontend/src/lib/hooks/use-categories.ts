'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAPI, fetchAPIAuth } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth';
import { apiClient } from '@/lib/api/client';
import { categoryQueryKeys } from '@/lib/api/queries';
import type { Category } from '@/lib/api/server';

export interface CategoryTranslation {
  id: string;
  categoryId: string;
  language: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

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
    staleTime: 0, // Always consider data stale so it refetches after invalidation
    refetchOnMount: true, // Refetch when component mounts if data is stale
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

/**
 * Hook for fetching category translations
 */
export function useCategoryTranslations(categoryId: string) {
  const token = getAuthToken();
  return useQuery({
    queryKey: [...categoryQueryKeys.list(), 'translations', categoryId],
    queryFn: async (): Promise<CategoryTranslation[]> => {
      if (!token) throw new Error('Not authenticated');
      return fetchAPIAuth<CategoryTranslation[]>(
        `/categories/${categoryId}/translations`,
        token,
      );
    },
    enabled: !!categoryId && !!token,
  });
}

/**
 * Hook for creating/updating category translation
 */
export function useUpsertCategoryTranslation() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async ({
      categoryId,
      language,
      name,
      description,
    }: {
      categoryId: string;
      language: string;
      name: string;
      description?: string;
    }) => {
      if (!token) throw new Error('Not authenticated');
      return apiClient.post<CategoryTranslation>(
        `/categories/${categoryId}/translations/${language}`,
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
        queryKey: [...categoryQueryKeys.list(), 'translations', variables.categoryId],
      });
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.list() });
    },
  });
}

