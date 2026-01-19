import { Metadata } from 'next';
import { fetchBrands } from '@/lib/api/server';
import { BrandsHeader } from '@/components/client/brands/brands-header';
import { BrandsList } from '@/components/client/brands/brands-list';

export const metadata: Metadata = {
  title: 'Brands',
  description: 'Shop by brand',
};

async function getBrands() {
  try {
    const brands = await fetchBrands();
    return brands;
  } catch (error) {
    console.error('Failed to fetch brands:', error);
    return [];
  }
}

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="container py-8">
      <BrandsHeader />
      <BrandsList initialBrands={brands} />
    </div>
  );
}

