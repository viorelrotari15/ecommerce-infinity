'use client';

import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Brand } from '@/lib/api/server';

interface MultiSelectBrandProps {
  brands: Brand[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelectBrand({
  brands,
  selectedIds,
  onSelectionChange,
  placeholder = 'All Brands',
  className,
}: MultiSelectBrandProps) {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Get all brand IDs
  const allBrandIds = React.useMemo(() => brands.map(b => b.id), [brands]);
  const allSelected = allBrandIds.length > 0 && allBrandIds.every(id => selectedIds.includes(id));
  const noneSelected = selectedIds.length === 0;

  // Get brand name by ID
  const getBrandName = (brandId: string): string => {
    const brand = brands.find(b => b.id === brandId);
    return brand?.name || brandId;
  };

  const toggleBrand = (brandId: string) => {
    if (selectedIds.includes(brandId)) {
      onSelectionChange(selectedIds.filter(id => id !== brandId));
    } else {
      onSelectionChange([...selectedIds, brandId]);
    }
  };

  const toggleSelectAll = () => {
    if (allSelected || noneSelected) {
      // If all selected or none selected, select all
      onSelectionChange([...allBrandIds]);
    } else {
      // If some selected, select all
      onSelectionChange([...allBrandIds]);
    }
  };

  const toggleDeselectAll = () => {
    onSelectionChange([]);
  };

  const removeBrand = (brandId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedIds.filter(id => id !== brandId));
  };

  const selectedBrands = selectedIds.map(id => ({
    id,
    name: getBrandName(id),
  }));

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onClick={() => setOpen(!open)}
      >
        <div className="flex flex-wrap gap-1 flex-1 text-left">
          {noneSelected ? (
            <span className="text-foreground">{placeholder}</span>
          ) : (
            <>
              {selectedBrands.slice(0, 1).map((brand) => (
                <span
                  key={brand.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-foreground rounded-md text-sm"
                >
                  <span className="line-clamp-1 max-w-[150px]">{brand.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => removeBrand(brand.id, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        removeBrand(brand.id, e as any);
                      }
                    }}
                    className="hover:bg-primary/20 rounded-full p-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))}
              {selectedBrands.slice(1, 2).map((brand) => (
                <span
                  key={brand.id}
                  className="hidden md:inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-foreground rounded-md text-sm"
                >
                  <span className="line-clamp-1 max-w-[150px]">{brand.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => removeBrand(brand.id, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        removeBrand(brand.id, e as any);
                      }
                    }}
                    className="hover:bg-primary/20 rounded-full p-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))}
              {selectedIds.length > 1 && (
                <span className="md:hidden inline-flex items-center px-2 py-1 text-sm text-foreground">
                  +{selectedIds.length - 1} more
                </span>
              )}
              {selectedIds.length > 2 && (
                <span className="hidden md:inline-flex items-center px-2 py-1 text-sm text-foreground">
                  +{selectedIds.length - 2} more
                </span>
              )}
            </>
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform', open && 'rotate-180')} />
      </button>
      
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-[300px] overflow-y-auto">
          <div className="p-2 space-y-1">
            {/* Select All / All Brands option */}
            <div
              className={cn(
                'flex items-center space-x-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-accent hover:text-white border-b border-border mb-1',
                noneSelected && 'bg-accent'
              )}
              onClick={toggleDeselectAll}
            >
              <div
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                  noneSelected
                    ? 'bg-primary border-primary'
                    : 'border-border bg-background hover:border-primary'
                )}
              >
                {noneSelected && (
                  <Check className="h-4 w-4 text-primary-foreground font-bold" strokeWidth={3} />
                )}
              </div>
              <span className="text-sm font-semibold text-foreground">All Brands</span>
            </div>
            
            {brands.map((brand) => (
              <div
                key={brand.id}
                className={cn(
                  'flex items-center space-x-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent hover:text-white',
                  selectedIds.includes(brand.id) && 'bg-accent'
                )}
                onClick={() => toggleBrand(brand.id)}
              >
                <div
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                    selectedIds.includes(brand.id)
                      ? 'bg-primary border-primary'
                      : 'border-border bg-background hover:border-primary'
                  )}
                >
                  {selectedIds.includes(brand.id) && (
                    <Check className="h-4 w-4 text-primary-foreground font-bold" strokeWidth={3} />
                  )}
                </div>
                <span className="text-sm font-medium text-foreground">{brand.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
