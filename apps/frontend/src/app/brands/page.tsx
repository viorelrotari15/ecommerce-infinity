import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchBrands } from '@/lib/api/server';

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
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Brands</h1>
        <p className="mt-2 text-muted-foreground">
          Discover products from your favorite brands
        </p>
      </div>

      {brands.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No brands found.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <Link key={brand.id} href={`/brands/${brand.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle>{brand.name}</CardTitle>
                  {brand.description && (
                    <CardDescription>{brand.description}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

