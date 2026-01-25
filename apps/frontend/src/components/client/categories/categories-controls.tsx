'use client';

import { useSearchParams } from 'next/navigation';
import { ItemsPerPageControl } from '@/components/ui/items-per-page-control';

export function CategoriesControls() {
  const searchParams = useSearchParams();
  const limit = Number(searchParams.get('limit')) || 20;

  return (
    <ItemsPerPageControl
      limit={limit}
      baseUrl="/categories"
    />
  );
}
