'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAPIAuth } from '@/lib/api/client';
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
  shippingAddress: any;
  billingAddress: any;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payment: Payment | null;
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
      return fetchAPIAuth<Order[]>('/orders', token);
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

