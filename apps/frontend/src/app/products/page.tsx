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
  const language = await getServerLanguage(searchParams);
  // Handle multiple brands
  const brandsParam = searchParams.brands;
  const brandIds = brandsParam
    ? (Array.isArray(brandsParam) 
        ? brandsParam.filter(b => b && b !== 'all')
        : [brandsParam].filter(b => b && b !== 'all'))
    : searchParams.brand && searchParams.brand !== 'all'
    ? [searchParams.brand as string]
    : undefined;
  
  // For backward compatibility, use first brand for backend API
  const brandId = brandIds && brandIds.length > 0 ? brandIds[0] : undefined;
  
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
  
  // Handle multiple attributes
  const attributesParam = searchParams.attributes;
  const attributeIds = attributesParam
    ? (Array.isArray(attributesParam) 
        ? attributesParam.filter(a => a && a !== 'all')
        : [attributesParam].filter(a => a && a !== 'all'))
    : undefined;

  // Server Component fetches initial data with caching
  // If multiple brands are selected, don't filter by brandId on backend
  // (let client-side filtering handle multiple brands)
  const [initialData, initialCategories, initialBrands] = await Promise.all([
    fetchProducts({
      page: Number(searchParams.page) || 1,
      limit,
      brandId: brandIds && brandIds.length > 1 ? undefined : brandId, // Only use brandId if single brand or no brands
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
    brandIds, // Add brandIds for client-side filtering
    categoryIds,
    attributeIds,
    search,
    featured,
  };

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8">
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
          preserveParams={['brand', 'brands', 'categories', 'category', 'attributes', 'search', 'featuredOnly']}
        />
      )}
    </div>
  );
}

