'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { ItemsPerPageControl } from '@/components/ui/items-per-page-control';
import { useT, translationKeys } from '@/lib/utils/translations';

export function BrandsControls() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const limit = Number(searchParams.get('limit')) || 20;
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    }
    if (limit !== 20) params.set('limit', String(limit));
    params.set('page', '1');
    router.push(`/brands?${params.toString()}`);
  };

  const clearSearch = () => {
    setSearchQuery('');
    const params = new URLSearchParams();
    if (limit !== 20) params.set('limit', String(limit));
    router.push(`/brands?${params.toString()}`);
  };

  return (
    <div className="mb-6 space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Input
            type="text"
            placeholder={t(translationKeys.brands.searchPlaceholder, 'Search brands...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          <div className="absolute right-0 top-0 h-full flex items-center">
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-full px-3"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="h-full px-3"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
      <ItemsPerPageControl
        limit={limit}
        baseUrl="/brands"
      />
    </div>
  );
}
