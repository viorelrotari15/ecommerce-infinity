'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  defaultShippingAddress?: Record<string, any> | null;
  defaultBillingAddress?: Record<string, any> | null;
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
      return apiService.get<UserProfile>('/auth/profile');
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const token = getAuthToken();  return useMutation({
    mutationFn: async (
      payload: Partial<
        Pick<
          UserProfile,
          'firstName' | 'lastName' | 'phone' | 'defaultShippingAddress' | 'defaultBillingAddress'
        >
      >,
    ) => {
      if (!token) {
        throw new Error('Not authenticated');
      }
      return apiService.patch<UserProfile>('/auth/profile', payload);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user', 'profile'], data);
    },
  });
}
