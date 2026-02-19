'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice, formatOrderIdDisplay } from '@/lib/utils';
import type { StripePaymentHistoryItem } from '@/lib/api/client';
import { useStripePaymentHistory } from '@/lib/hooks/use-orders';
import { useToast } from '@/hooks/use-toast';
import { useT, translationKeys } from '@/lib/utils/translations';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const formatAddress = (address: any) => {
  if (!address) return 'N/A';
  const parts = [
    address.firstName,
    address.lastName,
    address.street,
    address.houseNumber,
    address.city,
    address.postalCode,
    address.country,
    address.phone,
  ].filter(Boolean);
  return parts.join(', ');
};

export default function AdminPaymentsPage() {
  const { toast } = useToast();
  const t = useT();
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [appliedOrderId, setAppliedOrderId] = useState<string | undefined>(undefined);
  const [appliedEmail, setAppliedEmail] = useState<string | undefined>(undefined);
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
  const ANALYTICS_PAGE_SIZE = 10;
  const FETCH_LIMIT = 500;
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [analyticsPage, setAnalyticsPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<StripePaymentHistoryItem | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created', desc: true },
  ]);

  const queryParams = useMemo(
    () => ({
      orderId: appliedOrderId,
      email: appliedEmail,
      limit: FETCH_LIMIT,
    }),
    [appliedOrderId, appliedEmail],
  );

  const { data: payments = [], isLoading, error } = useStripePaymentHistory(queryParams);

  const handleSearch = () => {
    setAppliedOrderId(orderId.trim() || undefined);
    setAppliedEmail(email.trim() || undefined);
    setPaymentsPage(1);
    setAnalyticsPage(1);
  };

  const handleClearFilters = () => {
    setOrderId('');
    setEmail('');
    setAppliedOrderId(undefined);
    setAppliedEmail(undefined);
    setPaymentsPage(1);
    setAnalyticsPage(1);
  };

  useEffect(() => {
    setPaymentsPage(1);
    setAnalyticsPage(1);
  }, [itemsPerPage]);

  const totalPaymentsPages = Math.max(1, Math.ceil(payments.length / itemsPerPage));
  const paginatedPayments = useMemo(
    () =>
      payments.slice(
        (paymentsPage - 1) * itemsPerPage,
        paymentsPage * itemsPerPage,
      ),
    [payments, paymentsPage, itemsPerPage],
  );

  const analyticsByEmail = useMemo(() => {
    const map = new Map<
      string,
      { email: string; count: number; total: number; lastPayment?: number }
    >();
    payments.forEach((payment) => {
      const key = payment.metadata?.customerEmail || 'unknown';
      const entry = map.get(key) || {
        email: key,
        count: 0,
        total: 0,
        lastPayment: undefined,
      };
      entry.count += 1;
      entry.total += payment.amount || 0;
      entry.lastPayment = Math.max(entry.lastPayment || 0, payment.created || 0);
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [payments]);

  const totalAnalyticsPages = Math.max(1, Math.ceil(analyticsByEmail.length / ANALYTICS_PAGE_SIZE));
  const paginatedAnalytics = useMemo(
    () =>
      analyticsByEmail.slice(
        (analyticsPage - 1) * ANALYTICS_PAGE_SIZE,
        analyticsPage * ANALYTICS_PAGE_SIZE,
      ),
    [analyticsByEmail, analyticsPage],
  );

  const paymentStatusKeyMap: Record<string, string> = useMemo(
    () => ({
      succeeded: translationKeys.admin.payments.paymentStatusSucceeded,
      pending: translationKeys.admin.payments.paymentStatusPending,
      processing: translationKeys.admin.payments.paymentStatusProcessing,
      failed: translationKeys.admin.payments.paymentStatusFailed,
      canceled: translationKeys.admin.payments.paymentStatusCanceled,
      requires_action: translationKeys.admin.payments.paymentStatusRequiresAction,
      requires_payment_method: translationKeys.admin.payments.paymentStatusRequiresPaymentMethod,
      requires_confirmation: translationKeys.admin.payments.paymentStatusRequiresConfirmation,
      requires_capture: translationKeys.admin.payments.paymentStatusRequiresCapture,
    }),
    [],
  );

  const columns = useMemo<ColumnDef<StripePaymentHistoryItem>[]>(
    () => [
      {
        accessorKey: 'id',
        header: t(translationKeys.admin.payments.paymentIdLabel, 'Payment ID'),
        cell: ({ row }) => (
          <span className="text-xs font-mono text-muted-foreground">{row.original.id}</span>
        ),
      },
      {
        id: 'orderId',
        header: t(translationKeys.admin.payments.orderIdLabel, 'Order ID'),
        accessorFn: (row) => (row.metadata?.orderId ? formatOrderIdDisplay(row.metadata.orderId) : 'N/A'),
      },
      {
        id: 'email',
        header: t(translationKeys.admin.payments.emailLabel, 'Customer email'),
        accessorFn: (row) => row.metadata?.customerEmail || 'N/A',
      },
      {
        accessorKey: 'amount',
        header: t(translationKeys.admin.payments.amountLabel, 'Amount'),
        cell: ({ row }) => formatPrice(row.original.amount / 100),
      },
      {
        accessorKey: 'currency',
        header: t(translationKeys.admin.payments.currencyLabel, 'Currency'),
        cell: ({ row }) => row.original.currency?.toUpperCase(),
      },
      {
        accessorKey: 'status',
        header: t(translationKeys.admin.payments.statusLabel, 'Status'),
        cell: ({ row }) => {
          const status = row.original.status ?? '';
          const key = paymentStatusKeyMap[status] ?? '';
          const label = key ? t(key, status) : status;
          return (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {label}
            </span>
          );
        },
      },
      {
        accessorKey: 'created',
        header: t(translationKeys.admin.payments.createdLabel, 'Created'),
        cell: ({ row }) => new Date(row.original.created * 1000).toLocaleString(),
      },
      {
        id: 'details',
        header: t(translationKeys.common.details, 'Details'),
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedPayment(row.original)}
          >
            {t(translationKeys.admin.payments.view, 'View')}
          </Button>
        ),
      },
    ],
    [t, paymentStatusKeyMap],
  );

  const table = useReactTable({
    data: paginatedPayments,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!error) return;
    toast({
      variant: 'destructive',
      title: t(translationKeys.admin.payments.loading, 'Failed to load payments'),
      description: (error instanceof Error ? error.message : String(error)) || t(translationKeys.common.tryAgain, 'Please try again.'),
    });
  }, [error, isMounted, t, toast]);

  const showLoading = !isMounted || isLoading;

  if (!isMounted) {
    return null;
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t(translationKeys.admin.payments.title, 'Payments')}</h1>
        <p className="text-muted-foreground mt-2">
          {t(translationKeys.admin.payments.description, 'Stripe payment history and order details')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.admin.payments.filtersTitle, 'Filters')}</CardTitle>
          <CardDescription>
            {t(translationKeys.admin.payments.filtersDescription, 'Filter payments by order or email')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t(translationKeys.admin.payments.orderIdLabel, 'Order ID')}
            </label>
            <Input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder={t(translationKeys.admin.payments.orderIdPlaceholder, 'e.g. 550E8400 or full ID')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t(translationKeys.admin.payments.searchByEmailLabel, 'Search by customer email')}
            </label>
            <Input
              type="search"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(translationKeys.admin.payments.searchByEmailPlaceholder, 'e.g. customer@example.com')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t(translationKeys.admin.payments.itemsPerPageLabel, 'Items per page')}
            </label>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2 md:flex-row">
            <Button onClick={handleSearch}>
              {t(translationKeys.admin.payments.searchButton, 'Search')}
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              {t(translationKeys.admin.payments.clearFilters, 'Clear filters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t(translationKeys.admin.payments.loading, 'Loading payments...')}
          </CardContent>
        </Card>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t(translationKeys.admin.payments.empty, 'No payments found')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t(translationKeys.admin.payments.analyticsByCustomer, 'Analytics by customer')}</CardTitle>
              <CardDescription>
                {t(translationKeys.admin.payments.analyticsDescription, 'Aggregated totals from current results')}
                {analyticsByEmail.length > 0 &&
                  ` · ${analyticsByEmail.length} ${analyticsByEmail.length === 1 ? t(translationKeys.admin.payments.analyticsCustomer, 'customer') : t(translationKeys.admin.payments.analyticsCustomers, 'customers')}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analyticsByEmail.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t(translationKeys.admin.payments.noDataAvailable, 'No data available.')}</p>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {paginatedAnalytics.map((entry) => (
                      <div
                        key={entry.email}
                        className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm"
                      >
                        <div className="font-medium text-foreground">
                          {entry.email === 'unknown' ? t(translationKeys.admin.payments.unknownEmail, 'Unknown email') : entry.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t(translationKeys.admin.payments.analyticsPaymentsLine, '{count} payments · {total}')
                            .replace('{count}', String(entry.count))
                            .replace('{total}', formatPrice(entry.total / 100))}
                        </div>
                        {entry.lastPayment && (
                          <div className="text-xs text-muted-foreground">
                            {t(translationKeys.admin.payments.lastPaymentLabel, 'Last: ')}{new Date(entry.lastPayment * 1000).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {totalAnalyticsPages > 1 && (
                    <div className="flex items-center justify-between border-t pt-3">
                      <p className="text-sm text-muted-foreground">
                        {t(translationKeys.admin.payments.pageLabel, 'Page')} {analyticsPage} {t(translationKeys.common.of, 'of')} {totalAnalyticsPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAnalyticsPage((p) => Math.max(1, p - 1))}
                          disabled={analyticsPage <= 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          {t(translationKeys.common.previous, 'Previous')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAnalyticsPage((p) => Math.min(totalAnalyticsPages, p + 1))}
                          disabled={analyticsPage >= totalAnalyticsPages}
                        >
                          {t(translationKeys.common.next, 'Next')}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t(translationKeys.admin.payments.paymentsTable, 'Payments table')}</CardTitle>
              <CardDescription>
                {t(translationKeys.admin.payments.sortableListDescription, 'Sortable list with payment details')}
                {payments.length > 0 &&
                  ` · ${t(translationKeys.admin.payments.showingRange, 'Showing {start}–{end} of {total}')
                      .replace('{start}', String((paymentsPage - 1) * itemsPerPage + 1))
                      .replace('{end}', String(Math.min(paymentsPage * itemsPerPage, payments.length)))
                      .replace('{total}', String(payments.length))}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-left">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-4 py-3 font-medium text-foreground"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <div className="flex items-center gap-2">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getIsSorted() === 'asc' && <span>▲</span>}
                              {header.column.getIsSorted() === 'desc' && <span>▼</span>}
                            </div>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 align-top">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPaymentsPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    {t(translationKeys.admin.payments.pageLabel, 'Page')} {paymentsPage} {t(translationKeys.common.of, 'of')} {totalPaymentsPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}
                      disabled={paymentsPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t(translationKeys.common.previous, 'Previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentsPage((p) => Math.min(totalPaymentsPages, p + 1))}
                      disabled={paymentsPage >= totalPaymentsPages}
                    >
                      {t(translationKeys.common.next, 'Next')}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedPayment !== null && (
            <Dialog open onOpenChange={(open) => !open && setSelectedPayment(null)}>
              <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {t(translationKeys.admin.payments.orderDetailsTitle, 'Order details')}
                </DialogTitle>
              </DialogHeader>
              {selectedPayment?.order ? (
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div className="grid gap-2 md:grid-cols-2">
                    <span>
                      {t(translationKeys.admin.orders.orderId, 'Order')}: #{formatOrderIdDisplay(selectedPayment.order.id)}
                    </span>
                    <span>
                      {t(translationKeys.admin.orderDetails.status, 'Status')}:{' '}
                      {t(
                        {
                          PENDING: translationKeys.common.orderStatus.pending,
                          PROCESSING: translationKeys.common.orderStatus.processing,
                          SHIPPED: translationKeys.common.orderStatus.shipped,
                          DELIVERED: translationKeys.common.orderStatus.delivered,
                          CANCELLED: translationKeys.common.orderStatus.cancelled,
                        }[selectedPayment.order.status] ?? '',
                        selectedPayment.order.status,
                      )}
                    </span>
                    <span>
                      {t(translationKeys.admin.payments.customerLabel, 'Customer')}:{' '}
                      {selectedPayment.order.user?.email ||
                        selectedPayment.order.guestEmail ||
                        t(translationKeys.admin.orders.guest, 'Guest')}
                    </span>
                    <span>
                      {t(translationKeys.admin.orders.total, 'Total')}:{' '}
                      {formatPrice(selectedPayment.order.total)}
                    </span>
                    <span>
                      {t(translationKeys.admin.orders.shipping, 'Shipping')}:{' '}
                      {formatPrice(selectedPayment.order.shipping)}
                    </span>
                  </div>
                  {selectedPayment.order.trackingNumber && (
                    <p>
                      {t(translationKeys.admin.payments.trackingLabel, 'Tracking DHL')}:{' '}
                      {selectedPayment.order.trackingNumber}
                    </p>
                  )}
                  <div>
                    <p className="font-medium text-foreground">
                      {t(translationKeys.admin.orderDetails.shippingAddress, 'Shipping address')}
                    </p>
                    <p>{formatAddress(selectedPayment.order.shippingAddress)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {t(translationKeys.admin.orderDetails.billingAddress, 'Billing address')}
                    </p>
                    <p>{formatAddress(selectedPayment.order.billingAddress)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {t(translationKeys.admin.payments.itemsTitle, 'Items')}
                    </p>
                    <div className="space-y-2">
                      {selectedPayment.order.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between">
                          <span>
                            {item.productVariant.product.name}
                            {item.productVariant.name ? ` - ${item.productVariant.name}` : ''}
                          </span>
                          <span>x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button asChild>
                      <Link href={`/admin/orders/${selectedPayment.order.id}`}>{t(translationKeys.admin.payments.goToOrder, 'Go to order')}</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t(
                    translationKeys.admin.payments.orderDetailsUnavailable,
                    'Order details not available for this payment.',
                  )}
                </p>
              )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
}
