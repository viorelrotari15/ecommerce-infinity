import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { getAuthToken } from '../auth';

export interface UiTranslation {
  key: string;
  translations: Array<{
    language: string;
    value: string;
  }>;
}

export interface CreateTranslationDto {
  key: string;
  language: string;
  value: string;
}

export interface BulkTranslationsDto {
  language: string;
  translations: Record<string, string>;
}

export function useUiTranslations() {
  const token = getAuthToken();
  
  return useQuery({
    queryKey: ['ui-translations', 'all'],
    queryFn: async () => {
      const response = await apiClient.get<UiTranslation[]>('/translations/all', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    },
    enabled: !!token,
  });
}

export function useTranslationKeys() {
  const token = getAuthToken();
  
  return useQuery({
    queryKey: ['ui-translations', 'keys'],
    queryFn: async () => {
      const response = await apiClient.get<string[]>('/translations/keys', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    },
    enabled: !!token,
  });
}

export function useCreateTranslation() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async (data: CreateTranslationDto) => {
      return apiClient.post('/translations', data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ui-translations'] });
      queryClient.invalidateQueries({ queryKey: ['translations'] });
    },
  });
}

export function useUpdateTranslation() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async ({ key, language, value }: { key: string; language: string; value: string }) => {
      return apiClient.patch(`/translations/${key}/${language}`, { value }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ui-translations'] });
      queryClient.invalidateQueries({ queryKey: ['translations'] });
    },
  });
}

export function useBulkUpdateTranslations() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async (data: BulkTranslationsDto) => {
      return apiClient.post('/translations/bulk', data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ui-translations'] });
      queryClient.invalidateQueries({ queryKey: ['translations'] });
    },
  });
}

export function useDeleteTranslation() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async ({ key, language }: { key: string; language: string }) => {
      return apiClient.delete(`/translations/${key}/${language}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ui-translations'] });
      queryClient.invalidateQueries({ queryKey: ['translations'] });
    },
  });
}

