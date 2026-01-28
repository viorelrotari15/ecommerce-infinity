'use client';

import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/api/server';

interface MultiSelectCategoryProps {
  categories: Category[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelectCategory({
  categories,
  selectedIds,
  onSelectionChange,
  placeholder = 'Select categories...',
  className,
}: MultiSelectCategoryProps) {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Get all category IDs (including subcategories)
  const getAllCategoryIds = (): string[] => {
    const allIds: string[] = [];
    categories.forEach(cat => {
      allIds.push(cat.id);
      if (cat.children) {
        cat.children.forEach(subcat => {
          allIds.push(subcat.id);
        });
      }
    });
    return allIds;
  };

  const allCategoryIds = React.useMemo(() => getAllCategoryIds(), [categories]);
  const allSelected = allCategoryIds.length > 0 && allCategoryIds.every(id => selectedIds.includes(id));

  // Flatten categories to get names
  const getCategoryName = (categoryId: string): string => {
    for (const cat of categories) {
      if (cat.id === categoryId) {
        return cat.name;
      }
      if (cat.children) {
        for (const subcat of cat.children) {
          if (subcat.id === categoryId) {
            return `${cat.name} → ${subcat.name}`;
          }
        }
      }
    }
    return categoryId;
  };

  const toggleCategory = (categoryId: string) => {
    if (selectedIds.includes(categoryId)) {
      onSelectionChange(selectedIds.filter(id => id !== categoryId));
    } else {
      onSelectionChange([...selectedIds, categoryId]);
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange([...allCategoryIds]);
    }
  };

  const removeCategory = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedIds.filter(id => id !== categoryId));
  };

  const selectedCategories = selectedIds.map(id => ({
    id,
    name: getCategoryName(id),
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
          {selectedIds.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <>
              {selectedCategories.slice(0, 2).map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                >
                  <span className="line-clamp-1 max-w-[150px]">{cat.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => removeCategory(cat.id, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        removeCategory(cat.id, e as any);
                      }
                    }}
                    className="hover:bg-primary/20 rounded-full p-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))}
              {selectedIds.length > 2 && (
                <span className="inline-flex items-center px-2 py-1 text-sm text-muted-foreground">
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
            {/* Select All option */}
            <div
              className={cn(
                'flex items-center space-x-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-accent hover:text-white border-b border-border mb-1',
                allSelected && 'bg-accent'
              )}
              onClick={toggleSelectAll}
            >
              <div
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                  allSelected 
                    ? 'bg-primary border-primary' 
                    : 'border-primary/60 bg-background hover:border-primary'
                )}
              >
                {allSelected && (
                  <Check className="h-4 w-4 text-primary-foreground font-bold" strokeWidth={3} />
                )}
              </div>
              <span className="text-sm font-semibold">Select All</span>
            </div>
            
            {categories.map((category) => (
              <div key={category.id} className="space-y-1">
                <div
                  className={cn(
                    'flex items-center space-x-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent hover:text-white',
                    selectedIds.includes(category.id) && 'bg-accent'
                  )}
                  onClick={() => toggleCategory(category.id)}
                >
                  <div
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                      selectedIds.includes(category.id)
                        ? 'bg-primary border-primary'
                        : 'border-primary/60 bg-background hover:border-primary'
                    )}
                  >
                    {selectedIds.includes(category.id) && (
                      <Check className="h-4 w-4 text-primary-foreground font-bold" strokeWidth={3} />
                    )}
                  </div>
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                {category.children && category.children.length > 0 && (
                  <div className="ml-6 space-y-1">
                    {category.children.map((subcategory) => (
                      <div
                        key={subcategory.id}
                        className={cn(
                          'flex items-center space-x-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent hover:text-white',
                          selectedIds.includes(subcategory.id) && 'bg-accent'
                        )}
                        onClick={() => toggleCategory(subcategory.id)}
                      >
                        <div
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                            selectedIds.includes(subcategory.id)
                              ? 'bg-primary border-primary'
                              : 'border-primary/60 bg-background hover:border-primary'
                          )}
                        >
                          {selectedIds.includes(subcategory.id) && (
                            <Check className="h-4 w-4 text-primary-foreground font-bold" strokeWidth={3} />
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {subcategory.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
