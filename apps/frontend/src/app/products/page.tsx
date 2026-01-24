import { Metadata } from 'next';
import Link from 'next/link';
import { fetchProducts, fetchCategories, fetchBrands } from '@/lib/api/server';
import { ProductList } from '@/components/client/products/product-list';
import { ProductFilters } from '@/components/client/products/product-filters';
import { ProductsHeader } from '@/components/client/products/products-header';
import { PaginationControls } from '@/components/ui/pagination-controls';
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
  const limit = Number(searchParams.limit) || 20;

  // Server Component fetches initial data with caching
  const [initialData, initialCategories, initialBrands] = await Promise.all([
    fetchProducts({
      page: Number(searchParams.page) || 1,
      limit,
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
    limit,
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
        initialLimit={limit}
      />

      {/* Client Component that hydrates React Query cache */}
      <ProductList initialData={initialData} filters={filters} />

      {/* Pagination */}
      {initialData.meta.totalPages > 1 && (
        <PaginationControls
          currentPage={Number(searchParams.page) || 1}
          totalPages={initialData.meta.totalPages}
          limit={limit}
          baseUrl="/products"
          preserveParams={['brand', 'categories', 'category', 'search', 'featuredOnly']}
        />
      )}
    </div>
  );
}

