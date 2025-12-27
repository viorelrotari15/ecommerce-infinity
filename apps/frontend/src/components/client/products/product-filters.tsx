'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories } from '@/lib/hooks/use-categories';
import { useBrands } from '@/lib/hooks/use-brands';
import type { Category, Brand } from '@/lib/api/server';

interface ProductFiltersProps {
  initialFilters: { [key: string]: string | string[] | undefined };
  initialCategories?: Category[];
  initialBrands?: Brand[];
}

export function ProductFilters({
  initialFilters,
  initialCategories,
  initialBrands,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState((initialFilters.search as string) || '');
  // Use "all" as a special value instead of empty string
  // Convert undefined/empty to "all" for proper Select component behavior
  const getInitialBrand = () => {
    const brand = initialFilters.brand as string;
    return brand && brand !== 'all' ? brand : 'all';
  };
  const getInitialCategory = () => {
    const category = initialFilters.category as string;
    return category && category !== 'all' ? category : 'all';
  };
  const [selectedBrand, setSelectedBrand] = useState(getInitialBrand());
  const [selectedCategory, setSelectedCategory] = useState(getInitialCategory());

  // Fetch categories and brands for filter dropdowns
  const { data: categoriesData } = useCategories(initialCategories);
  const { data: brandsData } = useBrands(initialBrands);

  const categories = categoriesData || [];
  const brands = brandsData || [];

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    // Only add to params if not "all"
    if (selectedBrand && selectedBrand !== 'all') {
      params.set('brand', selectedBrand);
    }
    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory);
    }
    params.set('page', '1'); // Reset to first page

    router.push(`/products?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedBrand('all');
    setSelectedCategory('all');
    router.push('/products');
  };

  return (
    <div className="mb-8 space-y-4 rounded-lg border p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
        />

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger>
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button onClick={applyFilters}>Apply Filters</Button>
        <Button variant="outline" onClick={clearFilters}>
          Clear
        </Button>
      </div>
    </div>
  );
}

