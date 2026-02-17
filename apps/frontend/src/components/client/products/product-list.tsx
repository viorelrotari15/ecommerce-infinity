'use client';

import { useProducts } from '@/lib/hooks/use-products';
import { ProductCard } from '@/components/server/products/product-card';
import type { ProductsResponse } from '@/lib/api/server';
import type { ProductFilters } from '@/lib/api/queries';
import { useT, translationKeys } from '@/lib/utils/translations';
import { Loader2 } from 'lucide-react';

interface ProductListProps {
  initialData: ProductsResponse;
  filters: ProductFilters;
  /** Language the initialData was fetched with (so we only use it when current language matches) */
  initialDataLanguage?: string;
}

export function ProductList({ initialData, filters, initialDataLanguage }: ProductListProps) {
  const t = useT();
  // Hydrate React Query cache with server data; include language so switching language refetches
  const { data, isLoading, isFetching } = useProducts(filters, initialData, initialDataLanguage);

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{t(translationKeys.products.loading, 'Loading products...')}</p>
      </div>
    );
  }

  let products = data?.data || [];
  
  // Client-side filtering: OR within each filter type, AND between filter types
  
  // Filter by multiple categories (OR logic - product must have ANY selected category)
  const categoryIdsArr = Array.isArray(filters.categoryIds)
    ? filters.categoryIds
    : filters.categoryIds
      ? [filters.categoryIds]
      : [];
  if (categoryIdsArr.length > 0) {
    products = products.filter((product: any) => {
      if (!product.categories || product.categories.length === 0) return false;
      const productCategoryIds = product.categories.map((cat: any) => cat.category?.id || cat.categoryId);
      // Product must have ANY selected category
      return categoryIdsArr.some(selectedCatId => productCategoryIds.includes(selectedCatId));
    });
  }
  
  // Filter by multiple brands (OR logic - product must match ANY selected brand)
  // Note: Since a product can only have one brand, multiple brands use OR logic
  // Backend only supports single brandId, so multiple brands need client-side filtering
  if (filters.brandIds && filters.brandIds.length > 0) {
    products = products.filter((product: any) => {
      const productBrandId = product.brand?.id || product.brandId;
      // Product must match ANY selected brand
      return filters.brandIds!.includes(productBrandId);
    });
  } else if (filters.brandId) {
    // Single brand filter (handled server-side, but ensure consistency)
    products = products.filter((product: any) => {
      const productBrandId = product.brand?.id || product.brandId;
      return productBrandId === filters.brandId;
    });
  }
  
  // Filter by multiple attributes (OR logic - product must have ANY selected attribute)
  if (filters.attributeIds && filters.attributeIds.length > 0) {
    products = products.filter((product: any) => {
      if (!product.attributes || product.attributes.length === 0) return false;
      
      // Get all attribute/subattribute IDs that this product has
      const productAttributeIds: string[] = [];
      product.attributes.forEach((attr: any) => {
        const attrId = attr.attribute?.id || attr.attributeId;
        const attrValue = attr.value;
        
        // Add the attribute ID
        if (attrId) productAttributeIds.push(attrId);
        
        // Add the value if it's an ID
        if (attrValue) productAttributeIds.push(attrValue);
        
        // Add subattribute IDs if they exist
        if (attr.attribute?.subattributes) {
          attr.attribute.subattributes.forEach((subattr: any) => {
            if (subattr.id) productAttributeIds.push(subattr.id);
          });
        }
      });
      
      // Product must have ANY selected attribute/subattribute
      return filters.attributeIds!.some(selectedId => productAttributeIds.includes(selectedId));
    });
  }
  
  const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 0 };

  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{t(translationKeys.products.noProducts, 'No products found')}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Loading overlay when fetching/searching */}
      {isFetching && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              {t(translationKeys.products.loading, 'Loading products...')}
            </p>
          </div>
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

