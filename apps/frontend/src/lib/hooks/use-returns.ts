'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminReturnById,
  listAdminReturns,
  updateAdminReturnStatus,
  type ReturnRequestStatus,
} from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth';

export interface AdminReturnsParams {
  page?: number;
  limit?: number;
  status?: ReturnRequestStatus;
  orderNumber?: string;
  email?: string;
}

export function useAdminReturns(params?: AdminReturnsParams) {
  const token = getAuthToken();

  return useQuery({
    queryKey: ['admin', 'returns', params],
    queryFn: async () => {
      if (!token) throw new Error('Not authenticated');
      return listAdminReturns(params);
    },
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

export function useAdminReturn(id: string | undefined) {
  const token = getAuthToken();

  return useQuery({
    queryKey: ['admin', 'returns', id],
    queryFn: async () => {
      if (!id) throw new Error('Return ID is required');
      if (!token) throw new Error('Not authenticated');
      return getAdminReturnById(id);
    },
    enabled: !!token && !!id,
    staleTime: 60 * 1000,
  });
}

export function useUpdateAdminReturnStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { id: string; status: ReturnRequestStatus; adminNotes?: string }) =>
      updateAdminReturnStatus(payload.id, {
        status: payload.status,
        adminNotes: payload.adminNotes,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'returns'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'returns', variables.id] });
    },
  });
}
