import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export type Translations = Record<string, any>;

export function useTranslations(language?: string) {
  return useQuery({
    queryKey: ['translations', language],
    queryFn: async () => {
      const url = language ? `/translations?lang=${language}` : '/translations';
      const response = await apiClient.get<Translations>(url);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
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

