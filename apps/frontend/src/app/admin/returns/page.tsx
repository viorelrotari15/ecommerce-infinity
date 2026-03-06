'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { isAdmin } from '@/lib/auth';
import Link from 'next/link';
import { useAdminReturns } from '@/lib/hooks/use-returns';
import { useT, translationKeys } from '@/lib/utils/translations';
import { ItemsPerPageControl } from '@/components/ui/items-per-page-control';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Search } from 'lucide-react';
import type { ReturnRequestStatus } from '@/lib/api/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_OPTIONS: ReturnRequestStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function AdminReturnsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const statusParam = searchParams.get('status') ?? '';
  const orderNumberParam = searchParams.get('orderNumber') ?? '';
  const emailParam = searchParams.get('email') ?? '';

  const [searchOrderNumber, setSearchOrderNumber] = useState(orderNumberParam);
  const [searchEmail, setSearchEmail] = useState(emailParam);

  const { data, isLoading, error } = useAdminReturns({
    page,
    limit,
    status: statusParam && STATUS_OPTIONS.includes(statusParam as ReturnRequestStatus) ? (statusParam as ReturnRequestStatus) : undefined,
    orderNumber: orderNumberParam || undefined,
    email: emailParam || undefined,
  });

  const returnsList = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth/login');
    }
  }, [router]);

  useEffect(() => {
    setSearchOrderNumber(orderNumberParam);
    setSearchEmail(emailParam);
  }, [orderNumberParam, emailParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('page', '1');
    if (limit !== 20) params.set('limit', String(limit));
    if (statusParam) params.set('status', statusParam);
    if (searchOrderNumber.trim()) params.set('orderNumber', searchOrderNumber.trim());
    if (searchEmail.trim()) params.set('email', searchEmail.trim());
    router.push(`/admin/returns${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleStatusFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') params.set('status', value);
    else params.delete('status');
    params.set('page', '1');
    router.push(`/admin/returns?${params.toString()}`);
  };

  const statusLabel = (status: ReturnRequestStatus) => {
    const key = {
      PENDING: translationKeys.admin.returns.statusPending,
      IN_PROGRESS: translationKeys.admin.returns.statusInProgress,
      APPROVED: translationKeys.admin.returns.statusApproved,
      REJECTED: translationKeys.admin.returns.statusRejected,
      COMPLETED: translationKeys.admin.returns.statusCompleted,
    }[status];
    return t(key, status);
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">{t(translationKeys.admin.returns.loading, 'Loading returns...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{t(translationKeys.common.error, 'Error')}</CardTitle>
            <CardDescription>{t(translationKeys.common.failed, 'Failed')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t(translationKeys.admin.returns.title, 'Returns & requests')}</h1>
        <p className="text-muted-foreground mt-2">
          {t(translationKeys.admin.returns.description, 'View and manage withdrawal, return and cancellation requests')}
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusParam || 'all'} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t(translationKeys.admin.returns.filterByStatus, 'Filter by status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(translationKeys.admin.returns.allStatuses, 'All statuses')}</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 max-w-md">
            <Input
              type="text"
              placeholder={t(translationKeys.admin.returns.searchByOrderNumber, 'Order number')}
              value={searchOrderNumber}
              onChange={(e) => setSearchOrderNumber(e.target.value)}
              className="flex-1 min-w-0"
            />
            <Input
              type="text"
              placeholder={t(translationKeys.admin.returns.searchByEmail, 'Email')}
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="flex-1 min-w-0"
            />
            <Button type="submit" variant="secondary" size="icon" aria-label="Search">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
        <ItemsPerPageControl
          limit={limit}
          baseUrl="/admin/returns"
          preserveParams={['status', 'orderNumber', 'email']}
        />
      </div>

      {returnsList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t(translationKeys.admin.returns.noReturns, 'No return requests yet')}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {returnsList.map((r) => (
              <Card key={r.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {t(translationKeys.admin.returns.orderNumber, 'Order number')}: {r.orderNumber}
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {statusLabel(r.status)}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {t(translationKeys.admin.returns.customer, 'Customer')}: {r.fullName} · {r.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t(translationKeys.admin.returns.requestType, 'Type')}: {r.requestType}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(translationKeys.admin.returns.createdAt, 'Submitted')}: {formatDate(r.createdAt)}
                  </p>
                  <div className="pt-2">
                    <Link className="text-sm text-primary hover:underline" href={`/admin/returns/${r.id}`}>
                      {t(translationKeys.admin.returns.viewDetails, 'View details')}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            limit={limit}
            baseUrl="/admin/returns"
            preserveParams={['status', 'orderNumber', 'email']}
          />
        </>
      )}
    </div>
  );
}

export default function AdminReturnsPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <AdminReturnsContent />
    </Suspense>
  );
}
