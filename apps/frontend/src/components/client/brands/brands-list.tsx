'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useBrands } from '@/lib/hooks/use-brands';
import type { Brand } from '@/lib/api/server';

interface BrandsListProps {
  initialBrands: Brand[];
}

export function BrandsList({ initialBrands }: BrandsListProps) {
  const searchParams = useSearchParams();
  const { data: brands = initialBrands, isLoading } = useBrands(initialBrands);

  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const searchQuery = searchParams.get('search') || '';

  // Filter brands by search query
  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    const query = searchQuery.toLowerCase().trim();
    return brands.filter(brand => 
      brand.name.toLowerCase().includes(query) ||
      (brand.description && brand.description.toLowerCase().includes(query))
    );
  }, [brands, searchQuery]);

  const totalPages = Math.ceil(filteredBrands.length / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedBrands = filteredBrands.slice(startIndex, endIndex);

  if (isLoading && brands.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Loading brands...</p>
      </div>
    );
  }

  if (filteredBrands.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          {searchQuery ? 'No brands found matching your search.' : 'No brands found.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {paginatedBrands.map((brand) => (
          <Link 
            key={brand.id} 
            href={`/brands/${brand.slug}`}
            className="block h-full"
          >
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
      {totalPages > 1 && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          limit={limit}
          baseUrl="/brands"
        />
      )}
    </>
  );
}
