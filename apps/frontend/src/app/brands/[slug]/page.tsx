import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchBrand, fetchProducts } from '@/lib/api/server';
import { ProductList } from '@/components/client/products/product-list';
import { ItemsPerPageControl } from '@/components/ui/items-per-page-control';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { getServerLanguage } from '@/lib/utils/language';

// Force dynamic rendering to respect language cookie changes
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const language = await getServerLanguage();
  const brand = await fetchBrand(params.slug, language);

  if (!brand) {
    return {
      title: 'Brand Not Found',
    };
  }

  return {
    title: brand.name,
    description: brand.description || `Browse products from ${brand.name}`,
  };
}

export default async function BrandDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const language = await getServerLanguage();
  const brand = await fetchBrand(params.slug, language);

  if (!brand) {
    notFound();
  }

  const limit = Number(searchParams.limit) || 20;

  // Fetch products filtered by this brand
  const initialData = await fetchProducts(
    {
      page: Number(searchParams.page) || 1,
      limit,
      brandId: brand.id,
    },
    language,
  );

  const filters = {
    page: Number(searchParams.page) || 1,
    limit,
    brandId: brand.id,
  };

  return (
    <div className="container py-8">
      {/* Brand Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{brand.name}</h1>
        {brand.description && (
          <p className="text-muted-foreground text-lg">{brand.description}</p>
        )}
      </div>

      {/* Products List */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Products</h2>
          <ItemsPerPageControl
            limit={limit}
            baseUrl={`/brands/${params.slug}`}
          />
        </div>
      </div>
      <ProductList initialData={initialData} filters={filters} />

      {/* Pagination */}
      {initialData.meta.totalPages > 1 && (
        <PaginationControls
          currentPage={Number(searchParams.page) || 1}
          totalPages={initialData.meta.totalPages}
          limit={limit}
          baseUrl={`/brands/${params.slug}`}
        />
      )}
    </div>
  );
}
