import { Metadata } from 'next';
import Link from 'next/link';
import { fetchProducts, fetchCategories, fetchBrands } from '@/lib/api/server';
import { ProductList } from '@/components/client/products/product-list';
import { ProductFilters } from '@/components/client/products/product-filters';
import { ProductsHeader } from '@/components/client/products/products-header';
import { getServerLanguage } from '@/lib/utils/language';

// Force dynamic rendering to respect language cookie changes
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Products',
  description: 'Browse our complete collection of premium fragrances',
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const language = await getServerLanguage();
  // Filter out "all" values and undefined/empty values
  const brandId = searchParams.brand && searchParams.brand !== 'all' 
    ? (searchParams.brand as string) 
    : undefined;
  
  // Handle multiple categories
  const categoriesParam = searchParams.categories;
  const categoryIds = categoriesParam
    ? (Array.isArray(categoriesParam) 
        ? categoriesParam.filter(c => c && c !== 'all')
        : [categoriesParam].filter(c => c && c !== 'all'))
    : searchParams.category && searchParams.category !== 'all'
    ? [searchParams.category as string]
    : undefined;
  
  const search = searchParams.search ? (searchParams.search as string) : undefined;
  const featured = searchParams.featuredOnly === 'true' ? true : undefined;

  // Server Component fetches initial data with caching
  const [initialData, initialCategories, initialBrands] = await Promise.all([
    fetchProducts({
      page: Number(searchParams.page) || 1,
      limit: 20,
      brandId,
      categoryIds,
      search,
      featured,
    }, language),
    fetchCategories(language),
    fetchBrands(language),
  ]);

  const filters = {
    page: Number(searchParams.page) || 1,
    limit: 20,
    brandId,
    categoryIds,
    search,
    featured,
  };

  return (
    <div className="container py-8">
      <ProductsHeader total={initialData.meta.total} />

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
          {Array.from({ length: initialData.meta.totalPages }, (_, i) => i + 1).map((page) => {
            const params = new URLSearchParams();
            params.set('page', String(page));
            if (searchParams.brand) params.set('brand', searchParams.brand as string);
            if (searchParams.categories) {
              const cats = Array.isArray(searchParams.categories) 
                ? searchParams.categories 
                : [searchParams.categories];
              cats.forEach(cat => params.append('categories', cat as string));
            } else if (searchParams.category) {
              params.set('category', searchParams.category as string);
            }
            if (searchParams.search) params.set('search', searchParams.search as string);
            if (searchParams.featuredOnly) params.set('featuredOnly', searchParams.featuredOnly as string);
            return (
              <Link
                key={page}
                href={`/products?${params.toString()}`}
                className="rounded-md border px-4 py-2 hover:bg-accent"
              >
                {page}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

