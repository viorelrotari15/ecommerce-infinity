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
import { MultiSelectBrand } from '@/components/ui/multi-select-brand';
import { MultiSelectAttribute } from '@/components/ui/multi-select-attribute';
import { ItemsPerPageSelector } from '@/components/ui/items-per-page-selector';
import { useCategories } from '@/lib/hooks/use-categories';
import { useBrands } from '@/lib/hooks/use-brands';
import { useAttributes } from '@/lib/hooks/use-attributes';
import type { Category, Brand } from '@/lib/api/server';
import { useT, translationKeys } from '@/lib/utils/translations';
import { cn } from '@/lib/utils';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';

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

  const getInitialBrands = () => {
    const brand = initialFilters.brand;
    const brands = initialFilters.brands;
    if (brands && Array.isArray(brands)) {
      return brands.filter((b: string) => b && b !== 'all');
    }
    if (brand && brand !== 'all' && typeof brand === 'string') {
      return [brand];
    }
    return []; // Empty means "All brands"
  };

  const getInitialAttributes = () => {
    const attributes = initialFilters.attributes;
    if (attributes && Array.isArray(attributes)) {
      return attributes.filter((a: string) => a && a !== 'all');
    }
    return [];
  };

  const [selectedCategories, setSelectedCategories] = useState<string[]>(getInitialCategories());
  const [selectedBrands, setSelectedBrands] = useState<string[]>(getInitialBrands());
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>(getInitialAttributes());
  const featuredOnlyParam = (initialFilters.featuredOnly as string) === 'true';
  const [featuredOnly, setFeaturedOnly] = useState(featuredOnlyParam);
  const [limit, setLimit] = useState(initialLimit);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Fetch categories, brands, and attributes for filter dropdowns
  const { data: categoriesData } = useCategories(initialCategories);
  const { data: brandsData } = useBrands(initialBrands);
  const { data: attributesData = [] } = useAttributes();

  const categories = categoriesData || [];
  const brands = brandsData || [];
  const attributes = attributesData || [];

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

  const urlBrands = useMemo(() => {
    const brand = initialFilters.brand;
    const brands = initialFilters.brands;
    return brands && Array.isArray(brands)
      ? brands.filter((b: string) => b && b !== 'all')
      : brand && brand !== 'all' && typeof brand === 'string'
      ? [brand]
      : [];
  }, [initialFilters.brand, initialFilters.brands]);

  const urlAttributes = useMemo(() => {
    const attributes = initialFilters.attributes;
    return attributes && Array.isArray(attributes)
      ? attributes.filter((a: string) => a && a !== 'all')
      : [];
  }, [initialFilters.attributes]);

  const prevUrlCategoriesRef = useRef<string>('');
  const prevUrlBrandsRef = useRef<string>('');
  const prevUrlAttributesRef = useRef<string>('');

  // Sync selectedCategories with URL params
  useEffect(() => {
    const urlCategoriesStr = JSON.stringify([...urlCategories].sort());
    if (urlCategoriesStr !== prevUrlCategoriesRef.current) {
      prevUrlCategoriesRef.current = urlCategoriesStr;
      setSelectedCategories(urlCategories);
    }
  }, [urlCategories]);

  // Sync selectedBrands with URL params
  useEffect(() => {
    const urlBrandsStr = JSON.stringify([...urlBrands].sort());
    if (urlBrandsStr !== prevUrlBrandsRef.current) {
      prevUrlBrandsRef.current = urlBrandsStr;
      setSelectedBrands(urlBrands);
    }
  }, [urlBrands]);

  // Sync selectedAttributes with URL params
  useEffect(() => {
    const urlAttributesStr = JSON.stringify([...urlAttributes].sort());
    if (urlAttributesStr !== prevUrlAttributesRef.current) {
      prevUrlAttributesRef.current = urlAttributesStr;
      setSelectedAttributes(urlAttributes);
    }
  }, [urlAttributes]);

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    const params = new URLSearchParams();
    const searchParam = searchParams.get('search');
    if (searchParam) params.set('search', searchParam);
    if (selectedBrands.length > 0) {
      selectedBrands.forEach(brandId => {
        params.append('brands', brandId);
      });
    }
    if (selectedCategories.length > 0) {
      selectedCategories.forEach(catId => {
        params.append('categories', catId);
      });
    }
    if (selectedAttributes.length > 0) {
      selectedAttributes.forEach(attrId => {
        params.append('attributes', attrId);
      });
    }
    if (featuredOnly) params.set('featuredOnly', 'true');
    if (newLimit !== 20) params.set('limit', String(newLimit));
    params.set('page', '1'); // Reset to first page
    router.push(`/products?${params.toString()}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    const searchParam = searchParams.get('search');
    if (searchParam) params.set('search', searchParam);
    if (selectedBrands.length > 0) {
      selectedBrands.forEach(brandId => {
        params.append('brands', brandId);
      });
    }
    if (selectedCategories.length > 0) {
      selectedCategories.forEach(catId => {
        params.append('categories', catId);
      });
    }
    if (selectedAttributes.length > 0) {
      selectedAttributes.forEach(attrId => {
        params.append('attributes', attrId);
      });
    }
    if (featuredOnly) params.set('featuredOnly', 'true');
    if (limit !== 20) params.set('limit', String(limit));
    params.set('page', '1'); // Reset to first page

    router.push(`/products?${params.toString()}`);
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedCategories([]);
    setSelectedAttributes([]);
    setFeaturedOnly(false);
    const searchParam = searchParams.get('search');
    if (searchParam) {
      router.push(`/products?search=${encodeURIComponent(searchParam)}`);
    } else {
      router.push('/products');
    }
  };

  return (
    <div className="mb-8">
      {/* Filter Toggle Button */}
      <Button
        variant="outline"
        onClick={() => setIsFiltersOpen(!isFiltersOpen)}
        className="w-full md:w-auto mb-4"
      >
        <Filter className="h-4 w-4 mr-2" />
        {t(translationKeys.products.filters, 'Filters')}
        {isFiltersOpen ? (
          <ChevronUp className="h-4 w-4 ml-2" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-2" />
        )}
      </Button>

      {/* Filters Section */}
      {isFiltersOpen && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="grid gap-4 md:grid-cols-3">
        <MultiSelectCategory
          categories={categories}
          selectedIds={selectedCategories}
          onSelectionChange={setSelectedCategories}
          placeholder={t(translationKeys.products.selectCategories, 'Select categories...')}
        />

        <MultiSelectBrand
          brands={brands}
          selectedIds={selectedBrands}
          onSelectionChange={setSelectedBrands}
          placeholder={t(translationKeys.products.allBrands, 'All Brands')}
        />

        <MultiSelectAttribute
          attributes={attributes}
          selectedIds={selectedAttributes}
          onSelectionChange={setSelectedAttributes}
          placeholder={t(translationKeys.products.selectAttributes, 'Select attributes...')}
        />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-6">
          <div
            className={cn(
              'flex items-center space-x-2 rounded-md px-2 py-1 transition-colors',
              featuredOnly
                ? 'bg-accent text-white'
                : 'text-foreground hover:bg-accent hover:text-white'
            )}
          >
            <input
              type="checkbox"
              id="featuredOnly"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <Label htmlFor="featuredOnly" className="font-normal cursor-pointer text-inherit">
              {t(translationKeys.products.showFeaturedProducts, 'Show featured products')}
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
      )}
    </div>
  );
}

