'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  limit: number;
  baseUrl: string;
  preserveParams?: string[];
}

export function PaginationControls({
  currentPage,
  totalPages,
  limit,
  baseUrl,
  preserveParams = [],
}: PaginationControlsProps) {
  const searchParams = useSearchParams();

  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams();
    
    // Preserve existing params
    preserveParams.forEach(param => {
      const value = searchParams.get(param);
      if (value) {
        params.set(param, value);
      }
    });
    
    // Also preserve all other params except page
    searchParams.forEach((value, key) => {
      if (!preserveParams.includes(key) && key !== 'page') {
        params.set(key, value);
      }
    });
    
    if (limit !== 20) params.set('limit', String(limit));
    if (page > 1) {
      params.set('page', String(page));
    }
    
    return `${baseUrl}${params.toString() ? `?${params.toString()}` : ''}`;
  };

  if (totalPages <= 1) {
    return null;
  }

  // Calculate which page numbers to show
  const getVisiblePages = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();
  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      {/* Previous Button */}
      {prevPage ? (
        <Link href={buildPageUrl(prevPage)}>
          <Button variant="outline" size="icon" aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
      ) : (
        <Button variant="outline" size="icon" disabled aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Page Numbers */}
      <div className="flex gap-2">
        {visiblePages.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`dots-${index}`} className="px-2 py-2 text-muted-foreground">
                ...
              </span>
            );
          }
          const pageNum = page as number;
          return (
            <Link key={pageNum} href={buildPageUrl(pageNum)}>
              <Button
                variant={pageNum === currentPage ? 'default' : 'outline'}
                size="sm"
                className="min-w-[40px]"
              >
                {pageNum}
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Next Button */}
      {nextPage ? (
        <Link href={buildPageUrl(nextPage)}>
          <Button variant="outline" size="icon" aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      ) : (
        <Button variant="outline" size="icon" disabled aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
