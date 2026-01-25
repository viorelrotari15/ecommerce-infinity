'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelectCategory } from '@/components/ui/multi-select-category';
import { ItemsPerPageSelector } from '@/components/ui/items-per-page-selector';
import { useCategories } from '@/lib/hooks/use-categories';
import { useBrands } from '@/lib/hooks/use-brands';
import type { Category, Brand } from '@/lib/api/server';
import { useT, translationKeys } from '@/lib/utils/translations';

interface ProductFiltersProps {
  initialFilters: { [key: string]: string | string[] | undefined };
  initialCategories?: Category[];
  initialBrands?: Brand[];
  initialLimit?: number;
}

export function ProductFilters({
  initialFilters,
  initialCategories,
  initialBrands,
  initialLimit = 20,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const [search, setSearch] = useState((initialFilters.search as string) || '');
  // Use "all" as a special value instead of empty string
  // Convert undefined/empty to "all" for proper Select component behavior
  const getInitialBrand = () => {
    const brand = initialFilters.brand as string;
    return brand && brand !== 'all' ? brand : 'all';
  };
  const getInitialCategories = () => {
    const category = initialFilters.category;
    const categories = initialFilters.categories;
    if (categories && Array.isArray(categories)) {
      return categories.filter((c: string) => c && c !== 'all');
    }
    if (category && category !== 'all' && typeof category === 'string') {
      return [category];
    }
    return [];
  };
  const [selectedBrand, setSelectedBrand] = useState(getInitialBrand());
  const [selectedCategories, setSelectedCategories] = useState<string[]>(getInitialCategories());
  const featuredOnlyParam = (initialFilters.featuredOnly as string) === 'true';
  const [featuredOnly, setFeaturedOnly] = useState(featuredOnlyParam);
  const [limit, setLimit] = useState(initialLimit);

  // Fetch categories and brands for filter dropdowns
  const { data: categoriesData } = useCategories(initialCategories);
  const { data: brandsData } = useBrands(initialBrands);

  const categories = categoriesData || [];
  const brands = brandsData || [];

  // Sync featuredOnly with URL params
  useEffect(() => {
    const featured = (initialFilters.featuredOnly as string) === 'true';
    setFeaturedOnly(featured);
  }, [initialFilters.featuredOnly]);

  // Sync limit with URL params
  useEffect(() => {
    const urlLimit = Number(initialFilters.limit) || 20;
    setLimit(urlLimit);
  }, [initialFilters.limit]);

  // Memoize categories from URL to prevent infinite loops
  const urlCategories = useMemo(() => {
    const category = initialFilters.category;
    const categories = initialFilters.categories;
    return categories && Array.isArray(categories)
      ? categories.filter((c: string) => c && c !== 'all')
      : category && category !== 'all' && typeof category === 'string'
      ? [category]
      : [];
  }, [initialFilters.category, initialFilters.categories]);

  const prevUrlCategoriesRef = useRef<string>('');

  // Sync selectedCategories with URL params
  useEffect(() => {
    const urlCategoriesStr = JSON.stringify([...urlCategories].sort());
    
    // Only update if the categories actually changed
    if (urlCategoriesStr !== prevUrlCategoriesRef.current) {
      prevUrlCategoriesRef.current = urlCategoriesStr;
      setSelectedCategories(urlCategories);
    }
  }, [urlCategories]);

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedBrand && selectedBrand !== 'all') {
      params.set('brand', selectedBrand);
    }
    if (selectedCategories.length > 0) {
      selectedCategories.forEach(catId => {
        params.append('categories', catId);
      });
    }
    if (featuredOnly) params.set('featuredOnly', 'true');
    if (newLimit !== 20) params.set('limit', String(newLimit));
    params.set('page', '1'); // Reset to first page
    router.push(`/products?${params.toString()}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    // Only add to params if not "all"
    if (selectedBrand && selectedBrand !== 'all') {
      params.set('brand', selectedBrand);
    }
    // Add multiple categories
    if (selectedCategories.length > 0) {
      selectedCategories.forEach(catId => {
        params.append('categories', catId);
      });
    }
    if (featuredOnly) params.set('featuredOnly', 'true');
    if (limit !== 20) params.set('limit', String(limit));
    params.set('page', '1'); // Reset to first page

    router.push(`/products?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedBrand('all');
    setSelectedCategories([]);
    setFeaturedOnly(false);
    router.push('/products');
  };

  return (
    <div className="mb-8 space-y-4 rounded-lg border p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Input
          placeholder={t(translationKeys.products.searchPlaceholder, 'Search products...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
        />

        <MultiSelectCategory
          categories={categories}
          selectedIds={selectedCategories}
          onSelectionChange={setSelectedCategories}
          placeholder={t(translationKeys.products.selectCategories, 'Select categories...')}
        />

        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger>
            <SelectValue placeholder={t(translationKeys.products.allBrands, 'All Brands')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t(translationKeys.products.allBrands, 'All Brands')}</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-6">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="featuredOnly"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="featuredOnly" className="font-normal cursor-pointer">
              {t(translationKeys.products.showFeaturedOnly, 'Show featured only')}
            </Label>
          </div>
        </div>
        <ItemsPerPageSelector
          value={limit}
          onChange={handleLimitChange}
          label={t(translationKeys.common.itemsPerPage, 'Items per page')}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={applyFilters}>{t(translationKeys.products.applyFilters, 'Apply Filters')}</Button>
        <Button variant="outline" onClick={clearFilters}>
          {t(translationKeys.common.clear, 'Clear')}
        </Button>
      </div>
    </div>
  );
}

