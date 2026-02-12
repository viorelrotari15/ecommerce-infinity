'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/utils';
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
  const [limit, setLimit] = useState('20');
  const [isMounted, setIsMounted] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created', desc: true },
  ]);

  const queryParams = useMemo(
    () => ({
      orderId: orderId.trim() || undefined,
      email: email.trim() || undefined,
      limit: Number(limit) || 20,
    }),
    [orderId, email, limit],
  );

  const { data: payments = [], isLoading, error } = useStripePaymentHistory(queryParams);

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

  const columns = useMemo<ColumnDef<StripePaymentHistoryItem>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Payment ID',
        cell: ({ row }) => (
          <span className="text-xs font-mono text-muted-foreground">{row.original.id}</span>
        ),
      },
      {
        id: 'orderId',
        header: 'Order',
        accessorFn: (row) => row.metadata?.orderId || 'N/A',
      },
      {
        id: 'email',
        header: 'Customer Email',
        accessorFn: (row) => row.metadata?.customerEmail || 'N/A',
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => formatPrice(row.original.amount / 100),
      },
      {
        accessorKey: 'currency',
        header: 'Currency',
        cell: ({ row }) => row.original.currency?.toUpperCase(),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: 'created',
        header: 'Created',
        cell: ({ row }) => new Date(row.original.created * 1000).toLocaleString(),
      },
      {
        id: 'details',
        header: 'Details',
        cell: ({ row }) => (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                View
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {t(translationKeys.admin.payments.orderDetailsTitle, 'Order details')}
                </DialogTitle>
              </DialogHeader>
              {row.original.order ? (
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div className="grid gap-2 md:grid-cols-2">
                    <span>
                      {t(translationKeys.admin.orders.orderId, 'Order')}: {row.original.order.id}
                    </span>
                    <span>
                      {t(translationKeys.admin.orderDetails.status, 'Status')}:{' '}
                      {t(
                        translationKeys.common.orderStatus[
                          row.original.order.status.toLowerCase() as keyof typeof translationKeys.common.orderStatus
                        ],
                        row.original.order.status,
                      )}
                    </span>
                    <span>
                      {t(translationKeys.admin.payments.customerLabel, 'Customer')}:{' '}
                      {row.original.order.user?.email ||
                        row.original.order.guestEmail ||
                        t(translationKeys.admin.orders.guest, 'Guest')}
                    </span>
                    <span>
                      {t(translationKeys.admin.orders.total, 'Total')}:{' '}
                      {formatPrice(row.original.order.total)}
                    </span>
                    <span>
                      {t(translationKeys.admin.orders.shipping, 'Shipping')}:{' '}
                      {formatPrice(row.original.order.shipping)}
                    </span>
                    <span>
                      {t(translationKeys.admin.orders.tax, 'Tax')}:{' '}
                      {formatPrice(row.original.order.tax)}
                    </span>
                  </div>
                  {row.original.order.trackingNumber && (
                    <p>
                      {t(translationKeys.admin.payments.trackingLabel, 'Tracking DHL')}:{' '}
                      {row.original.order.trackingNumber}
                    </p>
                  )}
                  <div>
                    <p className="font-medium text-foreground">
                      {t(translationKeys.admin.orderDetails.shippingAddress, 'Shipping address')}
                    </p>
                    <p>{formatAddress(row.original.order.shippingAddress)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {t(translationKeys.admin.orderDetails.billingAddress, 'Billing address')}
                    </p>
                    <p>{formatAddress(row.original.order.billingAddress)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {t(translationKeys.admin.payments.itemsTitle, 'Items')}
                    </p>
                    <div className="space-y-2">
                      {row.original.order.items?.map((item: any) => (
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
                      <Link href={`/admin/orders/${row.original.order.id}`}>Go to order</Link>
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
        ),
      },
    ],
    [t],
  );

  const table = useReactTable({
    data: payments,
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
      description: (error as any)?.message || t(translationKeys.common.tryAgain, 'Please try again.'),
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
            <Input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Order ID" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t(translationKeys.admin.payments.emailLabel, 'Customer email')}
            </label>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t(translationKeys.admin.payments.limitLabel, 'Limit')}
            </label>
            <Input value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="20" />
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
              <CardTitle>Analytics by customer</CardTitle>
              <CardDescription>Aggregated totals from current results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analyticsByEmail.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data available.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {analyticsByEmail.map((entry) => (
                    <div
                      key={entry.email}
                      className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm"
                    >
                      <div className="font-medium text-foreground">
                        {entry.email === 'unknown' ? 'Unknown email' : entry.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.count} payments · {formatPrice(entry.total / 100)}
                      </div>
                      {entry.lastPayment && (
                        <div className="text-xs text-muted-foreground">
                          Last: {new Date(entry.lastPayment * 1000).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments table</CardTitle>
              <CardDescription>Sortable list with payment details</CardDescription>
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
