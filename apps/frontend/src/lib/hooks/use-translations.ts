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
 * Flatten nested translation object to flat key-value (e.g. { footer: { legal: { title: 'X' } } } -> { 'footer.legal.title': 'X' }).
 */
function nestedToFlat(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, nestedToFlat(value, fullKey));
    } else if (typeof value === 'string') {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Fetch translations for a language from the API and update localStorage cache.
 * Used by useTranslations and by language switch (prefetch + refresh).
 * For Russian (ru) and German (de), if the API fails or returns empty, built-in translations are used.
 * When API returns partial data for ru/de, it is merged with built-in so missing keys get the correct translation.
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
    if (lang === 'de' && isEmpty) {
      return await getBuiltInGermanTranslations();
    }
    if (lang === 'ru' && data && typeof data === 'object') {
      const { getRussianTemplate, flatToNested } = await import('../utils/translations');
      const builtInFlat = getRussianTemplate();
      const apiFlat = nestedToFlat(data);
      const mergedFlat = { ...apiFlat, ...builtInFlat };
      const merged = flatToNested(mergedFlat) as Translations;
      if (typeof window !== 'undefined') {
        setCachedTranslations(lang, merged);
      }
      return merged;
    }
    if (lang === 'de' && data && typeof data === 'object') {
      const { getGermanTemplate, flatToNested } = await import('../utils/translations');
      const builtInFlat = getGermanTemplate();
      const apiFlat = nestedToFlat(data);
      const mergedFlat = { ...apiFlat, ...builtInFlat };
      const merged = flatToNested(mergedFlat) as Translations;
      if (typeof window !== 'undefined') {
        setCachedTranslations(lang, merged);
      }
      return merged;
    }
    if (typeof window !== 'undefined') {
      setCachedTranslations(lang, data);
    }
    return data;
  } catch (err) {
    if (lang === 'ru') {
      return await getBuiltInRussianTranslations();
    }
    if (lang === 'de') {
      return await getBuiltInGermanTranslations();
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

/**
 * Built-in German translations (same as getGermanTemplate + flatToNested).
 * Used when backend has no German translations or API fails.
 */
async function getBuiltInGermanTranslations(): Promise<Translations> {
  const { getGermanTemplate, flatToNested } = await import('../utils/translations');
  const flat = getGermanTemplate();
  const nested = flatToNested(flat) as Translations;
  if (typeof window !== 'undefined') {
    setCachedTranslations('de', nested);
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

