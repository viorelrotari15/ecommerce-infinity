import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, apiService } from '../api/client';
import {
  getCachedTranslations,
  setCachedTranslations,
  clearCachedTranslations,
} from '../utils/translation-cache';

export type Translations = Record<string, any>;

/**
 * Try to upload built-in Russian translations to the backend so the database is populated.
 * Fire-and-forget: does not block. Succeeds only if user is admin and language "ru" exists in Admin → Languages.
 */
function uploadRussianToBackend(flat: Record<string, string>): void {
  if (!flat || Object.keys(flat).length === 0) return;
  apiService
    .post<{ success: boolean; count: number }>('/translations/bulk', {
      language: 'ru',
      translations: flat,
    })
    .catch(() => {
      // Ignore: user may not be admin, or "ru" may not exist in Languages yet
    });
}

/**
 * Fetch translations for a language from the API and update localStorage cache.
 * Used by useTranslations and by language switch (prefetch + refresh).
 * For Russian (ru), if the API fails or returns empty, built-in Russian translations are used
 * and an attempt is made to upload them to the backend to populate the database.
 */
export async function fetchTranslationsForLanguage(lang: string): Promise<Translations> {
  try {
    const url = `/translations?lang=${lang}`;
    const response = await apiClient.get<Translations>(url);
    const data = response.data;
    const isEmpty =
      !data || typeof data !== 'object' || Object.keys(data).length === 0;
    if (lang === 'ru' && isEmpty) {
      return await getBuiltInRussianTranslations();
    }
    if (typeof window !== 'undefined') {
      setCachedTranslations(lang, data);
    }
    return data;
  } catch (err) {
    if (lang === 'ru') {
      return await getBuiltInRussianTranslations();
    }
    throw err;
  }
}

/**
 * Built-in Russian translations (same as getRussianTemplate + flatToNested).
 * Used when backend has no Russian translations or API fails. Lazy-loaded to avoid circular deps.
 * Also triggers a fire-and-forget upload to the backend so the DB gets populated (if admin and "ru" exists).
 */
async function getBuiltInRussianTranslations(): Promise<Translations> {
  const { getRussianTemplate, flatToNested } = await import('../utils/translations');
  const flat = getRussianTemplate();
  uploadRussianToBackend(flat);
  const nested = flatToNested(flat) as Translations;
  if (typeof window !== 'undefined') {
    setCachedTranslations('ru', nested);
  }
  return nested;
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

