import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
  getCachedTranslations,
  setCachedTranslations,
  clearCachedTranslations,
} from '../utils/translation-cache';

export type Translations = Record<string, any>;

export function useTranslations(language?: string) {
  const effectiveLanguage = language || 'en';
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['translations', effectiveLanguage],
    queryFn: async () => {
      // Try to get from browser cache first
      const cached = getCachedTranslations(effectiveLanguage);
      
      // Always fetch fresh data in background if cache exists
      if (cached) {
        // Fetch fresh data in background
        const url = `/translations?lang=${effectiveLanguage}`;
        apiClient.get<Translations>(url)
          .then((response) => {
            // Update browser cache
            setCachedTranslations(effectiveLanguage, response.data);
            // Update React Query cache
            queryClient.setQueryData(['translations', effectiveLanguage], response.data);
          })
          .catch((error) => {
            console.error('Failed to refresh translations:', error);
            // Keep using cached data if fetch fails
          });
        
        // Return cached data immediately
        return cached;
      }
      
      // No cache, fetch from API
      const url = `/translations?lang=${effectiveLanguage}`;
      const response = await apiClient.get<Translations>(url);
      
      // Save to browser cache
      setCachedTranslations(effectiveLanguage, response.data);
      
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes in React Query
    gcTime: 24 * 60 * 60 * 1000, // Keep in memory for 24 hours
    // Use cached data as initial data for instant loading
    initialData: () => getCachedTranslations(effectiveLanguage) || undefined,
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

