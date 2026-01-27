import { Metadata } from 'next';
import { fetchCategories } from '@/lib/api/server';
import { CategoriesHeader } from '@/components/client/categories/categories-header';
import { CategoriesList } from '@/components/client/categories/categories-list';
import { CategoriesControls } from '@/components/client/categories/categories-controls';
import { getServerLanguage } from '@/lib/utils/language';

// Force dynamic rendering to respect language cookie changes
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Browse products by category',
};

async function getCategories(language?: string) {
  try {
    const categories = await fetchCategories(language);
    return categories;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}

export default async function CategoriesPage() {
  const language = await getServerLanguage();
  const categories = await getCategories(language);

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8">
      <CategoriesHeader />
      <CategoriesControls />
      <CategoriesList initialCategories={categories} />
    </div>
  );
}

