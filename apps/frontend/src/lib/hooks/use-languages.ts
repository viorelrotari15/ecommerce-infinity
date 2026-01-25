import { useQuery } from '@tanstack/react-query';
import { apiService } from '../api/client';

export interface Language {
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LanguagesResponse {
  data: Language[];
}

export function useLanguages(includeInactive = false) {
  return useQuery({
    queryKey: ['languages', includeInactive],
    queryFn: async () => {
      try {
        return apiService.get<Language[]>(
          `/languages${includeInactive ? '?includeInactive=true' : ''}`,
        );
      } catch (error) {
        console.error('Error fetching languages:', error);
        // Return empty array on error instead of throwing
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useDefaultLanguage() {
  return useQuery({
    queryKey: ['languages', 'default'],
    queryFn: async () => {
      try {
        const response = await apiService.get<{ code: string }>('/languages/default');
        return response.code;
      } catch (error) {
        console.error('Error fetching default language:', error);
        // Fallback to 'en' if API fails
        return 'en';
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

