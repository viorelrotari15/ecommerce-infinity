'use client';

import { ItemsPerPageControl } from '@/components/ui/items-per-page-control';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface ClientPaginationProps {
  currentPage: number;
  totalPages: number;
  limit: number;
  baseUrl: string;
  onLimitChange?: (limit: number) => void;
  showItemsPerPage?: boolean;
}

export function ClientPagination({
  currentPage,
  totalPages,
  limit,
  baseUrl,
  onLimitChange,
  showItemsPerPage = true,
}: ClientPaginationProps) {
  return (
    <>
      {showItemsPerPage && (
        <ItemsPerPageControl
          limit={limit}
          baseUrl={baseUrl}
          onLimitChange={onLimitChange}
        />
      )}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        limit={limit}
        baseUrl={baseUrl}
      />
    </>
  );
}
