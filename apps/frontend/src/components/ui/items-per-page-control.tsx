'use client';

import { ItemsPerPageSelector } from '@/components/ui/items-per-page-selector';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT, translationKeys } from '@/lib/utils/translations';

interface ItemsPerPageControlProps {
  limit: number;
  baseUrl: string;
  preserveParams?: string[];
  onLimitChange?: (limit: number) => void;
}

export function ItemsPerPageControl({
  limit,
  baseUrl,
  preserveParams = [],
  onLimitChange,
}: ItemsPerPageControlProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();

  const handleLimitChange = (newLimit: number) => {
    if (onLimitChange) {
      onLimitChange(newLimit);
    } else {
      const params = new URLSearchParams();
      
      // Preserve existing params
      preserveParams.forEach(param => {
        const value = searchParams.get(param);
        if (value) {
          params.set(param, value);
        }
      });
      
      // Also preserve all other params except page and limit
      searchParams.forEach((value, key) => {
        if (!preserveParams.includes(key) && key !== 'page' && key !== 'limit') {
          params.set(key, value);
        }
      });
      
      if (newLimit !== 20) params.set('limit', String(newLimit));
      params.set('page', '1'); // Reset to first page
      
      router.push(`${baseUrl}?${params.toString()}`);
    }
  };

  return (
    <div className="mb-4 flex justify-end">
      <ItemsPerPageSelector
        value={limit}
        onChange={handleLimitChange}
        label={t(translationKeys.common.itemsPerPage, 'Items per page')}
      />
    </div>
  );
}
