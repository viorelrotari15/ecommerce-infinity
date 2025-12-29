'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAPI, fetchAPIAuth } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth';
import { productQueryKeys, ProductFilters } from '@/lib/api/queries';
import type { Product, ProductsResponse } from '@/lib/api/server';

/**
 * Query function for fetching products
 */
export function fetchProductsQuery(filters: ProductFilters) {
  return {
    queryKey: productQueryKeys.list(filters),
    queryFn: async (): Promise<ProductsResponse> => {
      const params = new URLSearchParams();
      if (filters.brandId) params.append('brandId', filters.brandId);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.search) params.append('search', filters.search);
      if (filters.featured) params.append('featured', 'true');
      if (filters.includeInactive) params.append('includeInactive', 'true');
      params.append('page', String(filters.page || 1));
      params.append('limit', String(filters.limit || 20));

      return fetchAPI<ProductsResponse>(`/products?${params.toString()}`);
    },
  };
}

/**
 * Hook for fetching products
 * Accepts initialData from Server Component
 */
export function useProducts(filters: ProductFilters, initialData?: ProductsResponse) {
  return useQuery({
    ...fetchProductsQuery(filters),
    initialData,
    staleTime: 60 * 1000, // Consider data fresh for 60 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

/**
 * Query function for fetching a single product
 */
export function fetchProductQuery(slug: string) {
  return {
    queryKey: productQueryKeys.detail(slug),
    queryFn: async (): Promise<Product> => {
      return fetchAPI<Product>(`/products/${slug}`);
    },
  };
}

/**
 * Hook for fetching a single product
 */
export function useProduct(slug: string, initialData?: Product | null) {
  return useQuery({
    ...fetchProductQuery(slug),
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!slug,
  });
}

/**
 * Create Product DTO
 */
export interface CreateProductDto {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  sku: string;
  brandId: string;
  productTypeId: string;
  categoryIds: string[];
  isActive?: boolean;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  variants: Array<{
    name: string;
    sku: string;
    price: number;
    stock: number;
    isActive?: boolean;
  }>;
  attributes: Array<{
    attributeId: string;
    value: string;
  }>;
}

/**
 * Update Product DTO
 */
export interface UpdateProductDto {
  name?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  sku?: string;
  brandId?: string;
  productTypeId?: string;
  categoryIds?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  variants?: Array<{
    name: string;
    sku: string;
    price: number;
    stock: number;
    isActive?: boolean;
  }>;
  attributes?: Array<{
    attributeId: string;
    value: string;
  }>;
}

/**
 * Hook for creating a product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async (data: CreateProductDto) => {
      if (!token) throw new Error('Not authenticated');
      return fetchAPIAuth<Product>('/products', token, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      // Invalidate and refetch products list
      queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });
    },
  });
}

/**
 * Hook for updating a product
 */
export function useUpdateProduct(productId: string) {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async (data: UpdateProductDto) => {
      if (!token) throw new Error('Not authenticated');
      return fetchAPIAuth<Product>(`/products/${productId}`, token, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      // Update the specific product in cache
      queryClient.setQueryData(productQueryKeys.detail(data.slug), data);
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });
    },
  });
}

/**
 * Hook for deleting a product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async (productId: string) => {
      if (!token) throw new Error('Not authenticated');
      return fetchAPIAuth(`/products/${productId}`, token, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Invalidate all product queries
      queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
    },
  });
}

