import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
  getCachedTranslations,
  setCachedTranslations,
  clearCachedTranslations,
} from '../utils/translation-cache';

export type Translations = Record<string, any>;

/**
 * Fetch translations for a language from the API and update localStorage cache.
 * Used by useTranslations and by language switch (prefetch + refresh).
 */
export async function fetchTranslationsForLanguage(lang: string): Promise<Translations> {
  const url = `/translations?lang=${lang}`;
  const response = await apiClient.get<Translations>(url);
  if (typeof window !== 'undefined') {
    setCachedTranslations(lang, response.data);
  }
  return response.data;
}

export function useTranslations(language?: string) {
  const effectiveLanguage = language || 'en';
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['translations', effectiveLanguage],
    queryFn: async () => {
      const cached = getCachedTranslations(effectiveLanguage);
      if (cached) {
        fetchTranslationsForLanguage(effectiveLanguage)
          .then((data) => queryClient.setQueryData(['translations', effectiveLanguage], data))
          .catch((err) => console.error('Failed to refresh translations:', err));
        return cached;
      }
      return fetchTranslationsForLanguage(effectiveLanguage);
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes in React Query
    gcTime: 24 * 60 * 60 * 1000, // Keep in memory for 24 hours
    // Use cached data only for this language so switching language always gets fresh data
    initialData: () => getCachedTranslations(effectiveLanguage) || undefined,
    // Ensure when language changes we refetch if cache was cleared (e.g. after setLanguage)
    refetchOnMount: true,
  });
}

/**
 * Clear translations cache for a language
 */
export function clearTranslationsCache(language: string): void {
  clearCachedTranslations(language);
}

/**
 * Get a nested translation value by key path (e.g., "header.menu.home")
 */
export function useTranslation(language?: string) {
  const { data: translations } = useTranslations(language);

  return (key: string | undefined | null, fallback?: string): string => {
    // Handle undefined or null key first
    if (key === undefined || key === null) {
      return fallback || '';
    }
    
    // Ensure key is a string
    const keyString = String(key);
    if (!keyString || keyString.trim() === '') {
      return fallback || '';
    }
    
    if (!translations) {
      return fallback || keyString;
    }

    try {
      const keys = keyString.split('.');
      let value: any = translations;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return fallback || keyString;
        }
      }

      return typeof value === 'string' ? value : fallback || keyString;
    } catch (error) {
      // If anything goes wrong, return fallback or key
      return fallback || keyString;
    }
  };
}

