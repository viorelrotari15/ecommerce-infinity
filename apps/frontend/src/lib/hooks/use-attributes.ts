'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAPI, fetchAPIAuth } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth';
import { apiClient } from '@/lib/api/client';
import { useLanguage } from '@/lib/contexts/language-context';

export interface Attribute {
  id: string;
  name: string;
  slug: string;
  productTypeId: string;
  parentId?: string;
  parent?: Attribute;
  subattributes?: Attribute[];
  productType?: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface AttributeTranslation {
  id: string;
  attributeId: string;
  language: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export const attributeQueryKeys = {
  all: ['attributes'] as const,
  lists: () => [...attributeQueryKeys.all, 'list'] as const,
  list: () => [...attributeQueryKeys.lists()] as const,
  details: () => [...attributeQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...attributeQueryKeys.details(), id] as const,
  translations: (id: string) => [...attributeQueryKeys.detail(id), 'translations'] as const,
};

/**
 * Hook for fetching attributes
 */
export function useAttributes(initialData?: Attribute[]) {
  const { currentLanguage } = useLanguage();
  
  return useQuery({
    queryKey: [...attributeQueryKeys.list(), currentLanguage],
    queryFn: async (): Promise<Attribute[]> => {
      const data = await fetchAPI<Attribute[]>(`/attributes?lang=${currentLanguage}`);
      return Array.isArray(data) ? data : [];
    },
    initialData,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook for fetching a single attribute by ID
 */
export function useAttribute(id: string) {
  const { currentLanguage } = useLanguage();
  
  return useQuery({
    queryKey: [...attributeQueryKeys.detail(id), currentLanguage],
    queryFn: async (): Promise<Attribute> => {
      return fetchAPI<Attribute>(`/attributes/id/${id}?lang=${currentLanguage}`);
    },
    enabled: !!id,
  });
}

/**
 * Hook for fetching attribute translations
 */
export function useAttributeTranslations(attributeId: string) {
  const token = getAuthToken();
  return useQuery({
    queryKey: attributeQueryKeys.translations(attributeId),
    queryFn: async (): Promise<AttributeTranslation[]> => {
      if (!token) throw new Error('Not authenticated');
      return fetchAPIAuth<AttributeTranslation[]>(
        `/attributes/${attributeId}/translations`,
        token,
      );
    },
    enabled: !!attributeId && !!token,
  });
}

/**
 * Hook for creating an attribute
 */
export function useCreateAttribute() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async (data: { name: string; parentId?: string }) => {
      if (!token) throw new Error('Not authenticated');
      return apiClient.post<Attribute>('/attributes', data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeQueryKeys.all });
    },
  });
}

/**
 * Hook for updating an attribute
 */
export function useUpdateAttribute() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; parentId?: string };
    }) => {
      if (!token) throw new Error('Not authenticated');
      return apiClient.patch<Attribute>(`/attributes/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeQueryKeys.all });
    },
  });
}

/**
 * Hook for deleting an attribute
 */
export function useDeleteAttribute() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!token) throw new Error('Not authenticated');
      return apiClient.delete(`/attributes/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeQueryKeys.all });
    },
  });
}

/**
 * Hook for creating/updating attribute translation
 */
export function useUpsertAttributeTranslation() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async ({
      attributeId,
      language,
      name,
    }: {
      attributeId: string;
      language: string;
      name: string;
    }) => {
      if (!token) throw new Error('Not authenticated');
      return apiClient.post<AttributeTranslation>(
        `/attributes/${attributeId}/translations/${language}`,
        { name },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate translations query (same pattern as categories)
      queryClient.invalidateQueries({
        queryKey: attributeQueryKeys.translations(variables.attributeId),
      });
      // Also invalidate attributes list to update the UI
      queryClient.invalidateQueries({ queryKey: attributeQueryKeys.all });
    },
  });
}

/**
 * Hook for deleting attribute translation
 */
export function useDeleteAttributeTranslation() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async ({ attributeId, language }: { attributeId: string; language: string }) => {
      if (!token) throw new Error('Not authenticated');
      return apiClient.delete(`/attributes/${attributeId}/translations/${language}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: attributeQueryKeys.translations(variables.attributeId),
      });
      queryClient.invalidateQueries({ queryKey: attributeQueryKeys.all });
    },
  });
}
