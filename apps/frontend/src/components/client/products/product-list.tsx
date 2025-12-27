'use client';

import { useProducts } from '@/lib/hooks/use-products';
import { ProductCard } from '@/components/server/products/product-card';
import type { ProductsResponse } from '@/lib/api/server';
import type { ProductFilters } from '@/lib/api/queries';

interface ProductListProps {
  initialData: ProductsResponse;
  filters: ProductFilters;
}

export function ProductList({ initialData, filters }: ProductListProps) {
  // Hydrate React Query cache with server data
  const { data, isLoading, isFetching } = useProducts(filters, initialData);

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  const products = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 0 };

  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No products found.</p>
      </div>
    );
  }

  return (
    <>
      {isFetching && (
        <div className="mb-4 text-center text-sm text-muted-foreground">
          Refreshing...
        </div>
      )}
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}

