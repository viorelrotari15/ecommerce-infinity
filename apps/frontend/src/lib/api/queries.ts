/**
 * Query keys factory for TanStack Query
 * Ensures consistent query key structure across the app
 */

export interface ProductFilters {
  page?: number;
  limit?: number;
  brandId?: string;
  categoryId?: string | string[];
  categoryIds?: string | string[];
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

export const pricingQueryKeys = {
  all: ['pricing'] as const,
  regions: () => [...pricingQueryKeys.all, 'regions'] as const,
  taxRates: (regionCode?: string) => [...pricingQueryKeys.all, 'taxRates', regionCode ?? 'all'] as const,
  shippingMethods: (regionCode?: string) => [...pricingQueryKeys.all, 'shippingMethods', regionCode ?? 'all'] as const,
  shippingRules: (shippingMethodId?: string) =>
    [...pricingQueryKeys.all, 'shippingRules', shippingMethodId ?? 'all'] as const,
};

