'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBrands } from '@/lib/hooks/use-brands';
import type { Brand } from '@/lib/api/server';

interface BrandsListProps {
  initialBrands: Brand[];
}

export function BrandsList({ initialBrands }: BrandsListProps) {
  const { data: brands = initialBrands, isLoading } = useBrands(initialBrands);

  if (isLoading && brands.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Loading brands...</p>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No brands found.</p>
      </div>
    );
  }

  return (
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
  );
}
