import { Metadata } from 'next';
import { fetchCategories } from '@/lib/api/server';
import { CategoriesHeader } from '@/components/client/categories/categories-header';
import { CategoriesList } from '@/components/client/categories/categories-list';

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
      <CategoriesHeader />
      <CategoriesList initialCategories={categories} />
    </div>
  );
}

