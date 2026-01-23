import { Metadata } from 'next';
import { fetchBrands } from '@/lib/api/server';
import { BrandsHeader } from '@/components/client/brands/brands-header';
import { BrandsList } from '@/components/client/brands/brands-list';
import { getServerLanguage } from '@/lib/utils/language';

// Force dynamic rendering to respect language cookie changes
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Brands',
  description: 'Shop by brand',
};

async function getBrands(language?: string) {
  try {
    const brands = await fetchBrands(language);
    return brands;
  } catch (error) {
    console.error('Failed to fetch brands:', error);
    return [];
  }
}

export default async function BrandsPage() {
  const language = await getServerLanguage();
  const brands = await getBrands(language);

  return (
    <div className="container py-8">
      <BrandsHeader />
      <BrandsList initialBrands={brands} />
    </div>
  );
}

