import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../api/client';
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
      return apiService.get<UiTranslation[]>('/translations/all');
    },
    enabled: !!token,
  });
}

export function useTranslationKeys() {
  const token = getAuthToken();
  
  return useQuery({
    queryKey: ['ui-translations', 'keys'],
    queryFn: async () => {
      return apiService.get<string[]>('/translations/keys');
    },
    enabled: !!token,
  });
}

export function useCreateTranslation() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async (data: CreateTranslationDto) => {
      return apiService.post('/translations', data);
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
      return apiService.patch(`/translations/${key}/${language}`, { value });
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
      return apiService.post('/translations/bulk', data);
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
      return apiService.delete(`/translations/${key}/${language}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ui-translations'] });
      queryClient.invalidateQueries({ queryKey: ['translations'] });
    },
  });
}

