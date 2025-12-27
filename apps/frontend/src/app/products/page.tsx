import { Metadata } from 'next';
import Link from 'next/link';
import { fetchProducts, fetchCategories, fetchBrands } from '@/lib/api/server';
import { ProductList } from '@/components/client/products/product-list';
import { ProductFilters } from '@/components/client/products/product-filters';

export const metadata: Metadata = {
  title: 'Products',
  description: 'Browse our complete collection of premium fragrances',
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Filter out "all" values and undefined/empty values
  const brandId = searchParams.brand && searchParams.brand !== 'all' 
    ? (searchParams.brand as string) 
    : undefined;
  const categoryId = searchParams.category && searchParams.category !== 'all'
    ? (searchParams.category as string)
    : undefined;
  const search = searchParams.search ? (searchParams.search as string) : undefined;

  // Server Component fetches initial data with caching
  const [initialData, initialCategories, initialBrands] = await Promise.all([
    fetchProducts({
      page: Number(searchParams.page) || 1,
      limit: 20,
      brandId,
      categoryId,
      search,
    }),
    fetchCategories(),
    fetchBrands(),
  ]);

  const filters = {
    page: Number(searchParams.page) || 1,
    limit: 20,
    brandId,
    categoryId,
    search,
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">All Products</h1>
        <p className="mt-2 text-muted-foreground">
          {initialData.meta.total} products found
        </p>
      </div>

      {/* Client Component for interactive filters */}
      <ProductFilters
        initialFilters={searchParams}
        initialCategories={initialCategories}
        initialBrands={initialBrands}
      />

      {/* Client Component that hydrates React Query cache */}
      <ProductList initialData={initialData} filters={filters} />

      {/* Pagination */}
      {initialData.meta.totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: initialData.meta.totalPages }, (_, i) => i + 1).map((page) => (
            <Link
              key={page}
              href={`/products?page=${page}${searchParams.brand ? `&brand=${searchParams.brand}` : ''}${searchParams.category ? `&category=${searchParams.category}` : ''}${searchParams.search ? `&search=${searchParams.search}` : ''}`}
              className="rounded-md border px-4 py-2 hover:bg-accent"
            >
              {page}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

