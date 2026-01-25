'use client';

import { ItemsPerPageControl } from '@/components/ui/items-per-page-control';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface ProductsPaginationProps {
  currentPage: number;
  totalPages: number;
  limit: number;
  baseUrl: string;
  preserveParams?: string[];
}

export function ProductsPagination({
  currentPage,
  totalPages,
  limit,
  baseUrl,
  preserveParams = [],
}: ProductsPaginationProps) {
  return (
    <>
      <ItemsPerPageControl
        limit={limit}
        baseUrl={baseUrl}
        preserveParams={preserveParams}
      />
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        limit={limit}
        baseUrl={baseUrl}
        preserveParams={preserveParams}
      />
    </>
  );
}
