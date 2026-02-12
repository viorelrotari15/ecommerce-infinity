import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchCategory, fetchProducts, fetchCategories } from '@/lib/api/server';
import { ProductList } from '@/components/client/products/product-list';
import { ItemsPerPageControl } from '@/components/ui/items-per-page-control';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { getServerLanguage } from '@/lib/utils/language';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

// Force dynamic rendering to respect language cookie changes
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  const language = await getServerLanguage(searchParams);
  const category = await fetchCategory(params.slug, language);

  if (!category) {
    return {
      title: 'Category Not Found',
    };
  }

  return {
    title: category.name,
    description: category.description || `Browse products in ${category.name}`,
  };
}

// Helper function to get all child category IDs recursively
function getAllChildCategoryIds(categories: Array<{ id: string; children?: Array<{ id: string }> }>): string[] {
  const ids: string[] = [];
  for (const cat of categories) {
    ids.push(cat.id);
    if (cat.children && cat.children.length > 0) {
      ids.push(...getAllChildCategoryIds(cat.children));
    }
  }
  return ids;
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const language = await getServerLanguage(searchParams);
  const category = await fetchCategory(params.slug, language);

  if (!category) {
    notFound();
  }

  const isParentCategory = !category.parentId;
  const isChildCategory = !!category.parentId;

  // Determine which category IDs to filter by
  let categoryIds: string[] = [category.id];
  
  // If it's a parent category, include all child category IDs
  if (isParentCategory && category.children && category.children.length > 0) {
    categoryIds = [category.id, ...category.children.map(child => child.id)];
  }

  // Check if a specific subcategory filter is applied
  const subcategoryFilter = searchParams.subcategory;
  if (subcategoryFilter && typeof subcategoryFilter === 'string' && subcategoryFilter !== 'all') {
    // Filter by specific subcategory only
    categoryIds = [subcategoryFilter];
  }

  const limit = Number(searchParams.limit) || 20;

  // Fetch products filtered by category
  const initialData = await fetchProducts(
    {
      page: Number(searchParams.page) || 1,
      limit,
      categoryIds,
    },
    language,
  );

  const filters = {
    page: Number(searchParams.page) || 1,
    limit,
    categoryIds,
  };

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8">
      {/* Breadcrumb for child categories */}
      {isChildCategory && category.parent && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/categories/${category.parent.slug}`} className="hover:text-foreground">
            {category.parent.name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{category.name}</span>
        </div>
      )}

      {/* Category Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground text-lg">{category.description}</p>
        )}
      </div>

      {/* Subcategories (if parent category) */}
      {isParentCategory && category.children && category.children.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Subcategories</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {category.children.map((child) => {
              const isSelected = subcategoryFilter === child.id;
              return (
                <Link key={child.id} href={`/categories/${child.slug}`}>
                  <Card className={`h-full transition-shadow hover:shadow-lg ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                    <CardHeader>
                      <CardTitle>{child.name}</CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Products List */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {isParentCategory && !subcategoryFilter
              ? 'All Products'
              : 'Products'}
          </h2>
          <ItemsPerPageControl
            limit={limit}
            baseUrl={`/categories/${params.slug}`}
            preserveParams={subcategoryFilter && typeof subcategoryFilter === 'string' ? ['subcategory'] : []}
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
          baseUrl={`/categories/${params.slug}`}
          preserveParams={subcategoryFilter && typeof subcategoryFilter === 'string' ? ['subcategory'] : []}
        />
      )}
    </div>
  );
}
