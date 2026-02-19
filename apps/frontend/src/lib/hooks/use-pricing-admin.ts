'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminShippingMethod,
  createAdminShippingRule,
  deleteAdminShippingMethod,
  deleteAdminShippingRule,
  listAdminRegions,
  listAdminShippingMethods,
  listAdminShippingRules,
  updateAdminShippingMethod,
  updateAdminShippingRule,
} from '@/lib/api/client';
import { pricingQueryKeys } from '@/lib/api/queries';

export interface Region {
  id: string;
  code: string;
  name: string;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface ShippingMethod {
  id: string;
  regionId: string;
  code: string;
  name: string;
  carrier: string;
  isExpress: boolean;
  isActive: boolean;
  region?: Region;
}

export interface ShippingRule {
  id: string;
  shippingMethodId: string;
  minSubtotal: number;
  maxSubtotal?: number | null;
  price: number;
  isActive: boolean;
  shippingMethod?: ShippingMethod;
}

export function useAdminRegions() {
  return useQuery({
    queryKey: pricingQueryKeys.regions(),
    queryFn: async (): Promise<Region[]> => {
      const result = await listAdminRegions();
      return result as Region[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminShippingMethods(regionCode?: string) {
  return useQuery({
    queryKey: pricingQueryKeys.shippingMethods(regionCode),
    queryFn: async (): Promise<ShippingMethod[]> => {
      const result = await listAdminShippingMethods(regionCode);
      return result as ShippingMethod[];
    },
  });
}

export function useCreateAdminShippingMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => createAdminShippingMethod(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all }),
  });
}

export function useUpdateAdminShippingMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      updateAdminShippingMethod(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all }),
  });
}

export function useDeleteAdminShippingMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminShippingMethod(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all }),
  });
}

export function useAdminShippingRules(shippingMethodId?: string) {
  return useQuery({
    queryKey: pricingQueryKeys.shippingRules(shippingMethodId),
    queryFn: async (): Promise<ShippingRule[]> => {
      const result = await listAdminShippingRules(shippingMethodId);
      return result as ShippingRule[];
    },
  });
}

export function useCreateAdminShippingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => createAdminShippingRule(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all }),
  });
}

export function useUpdateAdminShippingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      updateAdminShippingRule(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all }),
  });
}

export function useDeleteAdminShippingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminShippingRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all }),
  });
}
