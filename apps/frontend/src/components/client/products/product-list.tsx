'use client';

import { useProducts } from '@/lib/hooks/use-products';
import { ProductCard } from '@/components/server/products/product-card';
import type { ProductsResponse } from '@/lib/api/server';
import type { ProductFilters } from '@/lib/api/queries';
import { useT, translationKeys } from '@/lib/utils/translations';

interface ProductListProps {
  initialData: ProductsResponse;
  filters: ProductFilters;
}

export function ProductList({ initialData, filters }: ProductListProps) {
  const t = useT();
  // Hydrate React Query cache with server data
  const { data, isLoading, isFetching } = useProducts(filters, initialData);

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
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    products = products.filter((product: any) => {
      if (!product.categories || product.categories.length === 0) return false;
      const productCategoryIds = product.categories.map((cat: any) => cat.category?.id || cat.categoryId);
      // Product must have ANY selected category
      return filters.categoryIds!.some(selectedCatId => productCategoryIds.includes(selectedCatId));
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
    <>
      {isFetching && (
        <div className="mb-4 text-center text-sm text-muted-foreground">
          {t(translationKeys.products.refreshing, 'Refreshing...')}
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}

