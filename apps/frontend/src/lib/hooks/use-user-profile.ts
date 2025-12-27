'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAPIAuth } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook for fetching current user profile
 */
export function useUserProfile() {
  const token = getAuthToken();

  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async (): Promise<UserProfile> => {
      if (!token) throw new Error('Not authenticated');
      return fetchAPIAuth<UserProfile>('/auth/profile', token);
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

