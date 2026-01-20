'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useT, translationKeys } from '@/lib/utils/translations';
import { useCategories } from '@/lib/hooks/use-categories';
import type { Category } from '@/lib/api/server';

interface CategoriesListProps {
  initialCategories: Category[];
}

export function CategoriesList({ initialCategories }: CategoriesListProps) {
  const t = useT();
  const { data: categories = initialCategories, isLoading } = useCategories(initialCategories);

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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <Link key={category.id} href={`/categories/${category.slug}`}>
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
                      <span
                        key={child.id}
                        className="text-xs bg-muted px-2 py-1 rounded"
                      >
                        {child.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
