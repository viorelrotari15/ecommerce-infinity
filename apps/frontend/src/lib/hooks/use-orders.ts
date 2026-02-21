'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  apiService,
  getAdminOrderById,
  getUserOrderById,
  listAdminOrders,
  listStripePayments,
  updateAdminOrderStatus,
  type AdminOrderResponse,
  type UserOrderResponse,
} from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth';

export interface OrderItem {
  id: string;
  quantity: number;
  price: string;
  productVariant: {
    id: string;
    name: string | null;
    sku: string;
    product: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export interface Payment {
  id: string;
  amount: string;
  status: string;
  method: string;
  transactionId: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  status: string;
  total: string;
  subtotal: string;
  tax: string;
  shipping: string;
  guestEmail?: string | null;
  trackingNumber?: string | null;
  shippingAddress: any;
  billingAddress: any;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payment: Payment | null;
}

export interface AdminOrder extends Order {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

/**
 * Hook for fetching user orders
 */
export function useUserOrders() {
  const token = getAuthToken();

  return useQuery({
    queryKey: ['user', 'orders'],
    queryFn: async (): Promise<Order[]> => {
      if (!token) throw new Error('Not authenticated');
      return apiService.get<Order[]>('/orders');
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export interface AdminOrdersParams {
  orderId?: string;
  page?: number;
  limit?: number;
}

export function useAdminOrders(params?: AdminOrdersParams) {
  const token = getAuthToken();

  return useQuery({
    queryKey: ['admin', 'orders', params],
    queryFn: async () => {
      if (!token) throw new Error('Not authenticated');
      return listAdminOrders(params);
    },
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

export function useAdminOrder(orderId?: string) {
  const token = getAuthToken();

  return useQuery<AdminOrderResponse>({
    queryKey: ['admin', 'orders', orderId],
    queryFn: async () => {
      if (!orderId) {
        throw new Error('Order ID is required');
      }
      if (!token) throw new Error('Not authenticated');
      return getAdminOrderById(orderId);
    },
    enabled: !!token && !!orderId,
    staleTime: 60 * 1000,
  });
}

export function useUserOrder(orderId?: string) {
  const token = getAuthToken();

  return useQuery<UserOrderResponse>({
    queryKey: ['user', 'orders', orderId],
    queryFn: async (): Promise<UserOrderResponse> => {
      if (!orderId) {
        throw new Error('Order ID is required');
      }
      if (!token) throw new Error('Not authenticated');
      return getUserOrderById(orderId);
    },
    enabled: !!token && !!orderId,
    staleTime: 60 * 1000,
  });
}

export function useUpdateAdminOrderStatus() {
  return useMutation({
    mutationFn: (payload: { orderId: string; status: string; trackingNumber?: string }) =>
      updateAdminOrderStatus(payload.orderId, {
        status: payload.status,
        trackingNumber: payload.trackingNumber,
      }),
  });
}

export function useStripePaymentHistory(params?: { orderId?: string; email?: string; limit?: number }) {
  const token = getAuthToken();

  return useQuery({
    queryKey: ['admin', 'payments', params],
    queryFn: async () => {
      if (!token) throw new Error('Not authenticated');
      return listStripePayments(params);
    },
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}
