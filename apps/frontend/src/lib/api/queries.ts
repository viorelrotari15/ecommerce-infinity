/**
 * Query keys factory for TanStack Query
 * Ensures consistent query key structure across the app
 */

export interface ProductFilters {
  page?: number;
  limit?: number;
  brandId?: string;
  categoryId?: string;
  search?: string;
  featured?: boolean;
  includeInactive?: boolean;
}

export const productQueryKeys = {
  all: ['products'] as const,
  lists: () => [...productQueryKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productQueryKeys.lists(), filters] as const,
  details: () => [...productQueryKeys.all, 'detail'] as const,
  detail: (slug: string) => [...productQueryKeys.details(), slug] as const,
};

export const categoryQueryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryQueryKeys.all, 'list'] as const,
  list: () => [...categoryQueryKeys.lists()] as const,
};

export const brandQueryKeys = {
  all: ['brands'] as const,
  lists: () => [...brandQueryKeys.all, 'list'] as const,
  list: () => [...brandQueryKeys.lists()] as const,
};

