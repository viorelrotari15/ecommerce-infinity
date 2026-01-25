'use client';

import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api/client';
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

export function useAdminOrders() {
  const token = getAuthToken();

  return useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: async (): Promise<AdminOrder[]> => {
      if (!token) throw new Error('Not authenticated');
      return apiService.get<AdminOrder[]>('/orders/admin');
    },
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

