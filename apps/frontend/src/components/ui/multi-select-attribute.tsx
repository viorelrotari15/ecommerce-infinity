'use client';

import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Attribute } from '@/lib/hooks/use-attributes';

interface MultiSelectAttributeProps {
  attributes: Attribute[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelectAttribute({
  attributes,
  selectedIds,
  onSelectionChange,
  placeholder = 'Select attributes...',
  className,
}: MultiSelectAttributeProps) {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Filter to get only top-level attributes (no parentId)
  const topLevelAttributes = React.useMemo(() => 
    attributes.filter(attr => !attr.parentId),
    [attributes]
  );

  // Get all attribute IDs (including subattributes)
  const getAllAttributeIds = (): string[] => {
    const allIds: string[] = [];
    topLevelAttributes.forEach(attr => {
      allIds.push(attr.id);
      if (attr.subattributes) {
        attr.subattributes.forEach(subattr => {
          allIds.push(subattr.id);
        });
      }
    });
    return allIds;
  };

  const allAttributeIds = React.useMemo(() => getAllAttributeIds(), [topLevelAttributes]);
  const allSelected = allAttributeIds.length > 0 && allAttributeIds.every(id => selectedIds.includes(id));

  // Get attribute name (just the name, no parent prefix)
  const getAttributeName = (attributeId: string): string => {
    for (const attr of topLevelAttributes) {
      if (attr.id === attributeId) {
        return attr.name;
      }
      if (attr.subattributes) {
        for (const subattr of attr.subattributes) {
          if (subattr.id === attributeId) {
            return subattr.name;
          }
        }
      }
    }
    return attributeId;
  };

  // Get subattribute IDs for a given attribute
  const getSubattributeIds = (attributeId: string): string[] => {
    const attribute = topLevelAttributes.find(attr => attr.id === attributeId);
    return attribute?.subattributes?.map(subattr => subattr.id) || [];
  };

  const toggleAttribute = (attributeId: string) => {
    const subattributeIds = getSubattributeIds(attributeId);
    const isSelected = selectedIds.includes(attributeId);
    
    if (isSelected) {
      // Deselect attribute and all its subattributes
      const idsToRemove = [attributeId, ...subattributeIds];
      onSelectionChange(selectedIds.filter(id => !idsToRemove.includes(id)));
    } else {
      // Select attribute and all its subattributes
      const newIds = [...selectedIds, attributeId, ...subattributeIds];
      onSelectionChange(newIds);
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange([...allAttributeIds]);
    }
  };

  const removeAttribute = (attributeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedIds.filter(id => id !== attributeId));
  };

  const selectedAttributes = selectedIds.map(id => ({
    id,
    name: getAttributeName(id),
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
            <span className="text-foreground">{placeholder}</span>
          ) : (
            <>
              {selectedAttributes.slice(0, 1).map((attr) => (
                <span
                  key={attr.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-foreground rounded-md text-sm"
                >
                  <span className="line-clamp-1 max-w-[150px]">{attr.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => removeAttribute(attr.id, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        removeAttribute(attr.id, e as any);
                      }
                    }}
                    className="hover:bg-primary/20 rounded-full p-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))}
              {selectedAttributes.slice(1, 2).map((attr) => (
                <span
                  key={attr.id}
                  className="hidden md:inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-foreground rounded-md text-sm"
                >
                  <span className="line-clamp-1 max-w-[150px]">{attr.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => removeAttribute(attr.id, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        removeAttribute(attr.id, e as any);
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
                    : 'border-border bg-background hover:border-primary'
                )}
              >
                {allSelected && (
                  <Check className="h-4 w-4 text-primary-foreground font-bold" strokeWidth={3} />
                )}
              </div>
              <span className="text-sm font-semibold text-foreground">Select All</span>
            </div>
            
            {topLevelAttributes.map((attribute) => (
              <div key={attribute.id} className="space-y-1">
                <div
                  className={cn(
                    'flex items-center space-x-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent hover:text-white',
                    selectedIds.includes(attribute.id) && 'bg-accent'
                  )}
                  onClick={() => toggleAttribute(attribute.id)}
                >
                  <div
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                      selectedIds.includes(attribute.id)
                        ? 'bg-primary border-primary'
                        : 'border-border bg-background hover:border-primary'
                    )}
                  >
                    {selectedIds.includes(attribute.id) && (
                      <Check className="h-4 w-4 text-primary-foreground font-bold" strokeWidth={3} />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">{attribute.name}</span>
                </div>
                {attribute.subattributes && attribute.subattributes.length > 0 && (
                  <div className="ml-6 space-y-1">
                    {attribute.subattributes.map((subattribute) => (
                      <div
                        key={subattribute.id}
                        className={cn(
                          'flex items-center space-x-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent hover:text-white',
                          selectedIds.includes(subattribute.id) && 'bg-accent'
                        )}
                        onClick={() => toggleAttribute(subattribute.id)}
                      >
                        <div
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                            selectedIds.includes(subattribute.id)
                              ? 'bg-primary border-primary'
                              : 'border-border bg-background hover:border-primary'
                          )}
                        >
                          {selectedIds.includes(subattribute.id) && (
                            <Check className="h-4 w-4 text-primary-foreground font-bold" strokeWidth={3} />
                          )}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {subattribute.name}
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
