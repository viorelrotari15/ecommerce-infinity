'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAPI, apiService } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth';
import { productQueryKeys, ProductFilters } from '@/lib/api/queries';
import type { Product, ProductsResponse } from '@/lib/api/server';
import { useLanguage } from '@/lib/contexts/language-context';

/**
 * Query function for fetching products
 */
export function fetchProductsQuery(filters: ProductFilters) {
  return {
    queryKey: productQueryKeys.list(filters),
    queryFn: async (): Promise<ProductsResponse> => {
      const params = new URLSearchParams();
      if (filters.brandId) params.append('brandId', filters.brandId);
      
      // Support both categoryId (single) and categoryIds (multiple); normalize to string[]
      const rawCategories = filters.categoryIds ?? (filters.categoryId ? [filters.categoryId] : []);
      const categoryIdsArr = Array.isArray(rawCategories)
        ? rawCategories.flatMap((id) => (typeof id === 'string' ? [id] : id))
        : [rawCategories];
      if (categoryIdsArr.length > 0) {
        categoryIdsArr.forEach((id) => {
          if (id && id !== 'all') {
            params.append('categoryIds', id);
          }
        });
      }
      
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
 * Accepts initialData from Server Component (with initialDataLanguage so we only use it when language matches).
 * Query key includes current language so switching language refetches with correct content.
 */
export function useProducts(
  filters: ProductFilters,
  initialData?: ProductsResponse,
  initialDataLanguage?: string,
) {
  const { currentLanguage } = useLanguage();
  const useInitialData = initialDataLanguage != null && currentLanguage === initialDataLanguage;
  return useQuery({
    ...fetchProductsQuery(filters),
    queryKey: [...productQueryKeys.list(filters), currentLanguage],
    initialData: useInitialData ? initialData : undefined,
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
      return apiService.post<Product>('/products', data);
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
      return apiService.patch<Product>(`/products/${productId}`, data);
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
      return apiService.delete(`/products/${productId}`);
    },
    onSuccess: () => {
      // Invalidate all product queries
      queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
    },
  });
}

