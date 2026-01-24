'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useT, translationKeys } from '@/lib/utils/translations';
import { useCategories } from '@/lib/hooks/use-categories';
import type { Category } from '@/lib/api/server';

interface CategoriesListProps {
  initialCategories: Category[];
}

export function CategoriesList({ initialCategories }: CategoriesListProps) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: categories = initialCategories, isLoading } = useCategories(initialCategories);

  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;

  // Flatten categories for pagination (include parent and children)
  const flatCategories = useMemo(() => {
    const flatten = (cats: Category[]): Category[] => {
      const result: Category[] = [];
      for (const cat of cats) {
        result.push(cat);
        if (cat.children && cat.children.length > 0) {
          result.push(...flatten(cat.children));
        }
      }
      return result;
    };
    return flatten(categories);
  }, [categories]);

  const totalPages = Math.ceil(flatCategories.length / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedCategories = flatCategories.slice(startIndex, endIndex);

  if (isLoading && categories.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{t(translationKeys.categories.loading, 'Loading categories...')}</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{t(translationKeys.categories.noCategories, 'No categories found.')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {paginatedCategories.map((category) => (
          <Link 
            key={category.id} 
            href={`/categories/${category.slug}`}
            className="block h-full"
          >
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle>{category.name}</CardTitle>
                {category.description && (
                  <CardDescription>{category.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {category.children && category.children.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">{t(translationKeys.categories.subcategories, 'Subcategories:')}</p>
                    <div className="flex flex-wrap gap-2">
                      {category.children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/categories/${child.slug}`);
                          }}
                          className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors text-left"
                        >
                          {child.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {totalPages > 1 && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          limit={limit}
          baseUrl="/categories"
        />
      )}
    </>
  );
}
