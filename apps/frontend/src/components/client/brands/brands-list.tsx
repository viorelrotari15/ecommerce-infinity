'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useBrands } from '@/lib/hooks/use-brands';
import type { Brand } from '@/lib/api/server';
import { Loader2 } from 'lucide-react';
import { useT, translationKeys } from '@/lib/utils/translations';

interface BrandsListProps {
  initialBrands: Brand[];
}

export function BrandsList({ initialBrands }: BrandsListProps) {
  const t = useT();
  const searchParams = useSearchParams();
  const { data: brands = initialBrands, isLoading, isFetching } = useBrands(initialBrands);
  const [isSearching, setIsSearching] = useState(false);

  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const searchQuery = searchParams.get('search') || '';

  // Track search param changes to show loading state
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => setIsSearching(false), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, page]);

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

  const showLoading = isLoading || isFetching || isSearching;

  if (isLoading && brands.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{t(translationKeys.common.loading, 'Loading brands...')}</p>
      </div>
    );
  }

  if (filteredBrands.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          {searchQuery 
            ? 'No brands found matching your search.' 
            : 'No brands found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Loading overlay when fetching/searching */}
      {showLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              {t(translationKeys.common.loading, 'Loading brands...')}
            </p>
          </div>
        </div>
      )}
      
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
    </div>
  );
}
