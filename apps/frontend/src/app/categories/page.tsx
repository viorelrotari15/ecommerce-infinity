import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchCategories } from '@/lib/api/server';

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Browse products by category',
};

async function getCategories() {
  try {
    const categories = await fetchCategories();
    return categories;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Categories</h1>
        <p className="mt-2 text-muted-foreground">
          Browse our products by category
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No categories found.</p>
        </div>
      ) : (
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
                  {category.children.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Subcategories:</p>
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
      )}
    </div>
  );
}

