'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatPrice, formatOrderIdDisplay } from '@/lib/utils';
import { isAdmin } from '@/lib/auth';
import Link from 'next/link';
import { useAdminOrders } from '@/lib/hooks/use-orders';
import { useT, translationKeys } from '@/lib/utils/translations';
import { ItemsPerPageControl } from '@/components/ui/items-per-page-control';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Search } from 'lucide-react';

export default function AdminOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const orderIdParam = searchParams.get('orderId') ?? '';

  const [searchInput, setSearchInput] = useState(orderIdParam);

  const { data, isLoading, error } = useAdminOrders({
    page,
    limit,
    orderId: orderIdParam || undefined,
  });

  const orders = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth/login');
    }
  }, [router]);

  useEffect(() => {
    setSearchInput(orderIdParam);
  }, [orderIdParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const value = searchInput.trim();
    if (value) params.set('orderId', value);
    params.set('page', '1');
    if (limit !== 20) params.set('limit', String(limit));
    router.push(`/admin/orders${params.toString() ? `?${params.toString()}` : ''}`);
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">{t(translationKeys.admin.orders.loading, 'Loading orders...')}</p>
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
        <h1 className="text-3xl font-bold tracking-tight">{t(translationKeys.admin.orders.title, 'Orders')}</h1>
        <p className="text-muted-foreground mt-2">
          {t(translationKeys.admin.orders.description, 'Review all orders')}
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm">
          <Input
            type="text"
            placeholder={t(translationKeys.admin.orders.searchByOrderId, 'Search by Order ID')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" size="icon" aria-label={t(translationKeys.admin.orders.searchByOrderId, 'Search by Order ID')}>
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <ItemsPerPageControl
          limit={limit}
          baseUrl="/admin/orders"
          preserveParams={['orderId']}
        />
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {orderIdParam
              ? t(translationKeys.admin.orders.noOrders, 'No orders yet')
              : t(translationKeys.admin.orders.noOrders, 'No orders yet')}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {orders.map((order) => {
              const customer = order.user
                ? `${order.user.firstName} ${order.user.lastName}`.trim() || order.user.email
                : order.guestEmail || t(translationKeys.admin.orders.guest, 'Guest');

              return (
                <Card key={order.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>
                        {t(translationKeys.admin.orders.orderId, 'Order')} #{formatOrderIdDisplay(order.id)}
                      </span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {t(
                          {
                            PENDING: translationKeys.common.orderStatus.pending,
                            PROCESSING: translationKeys.common.orderStatus.processing,
                            SHIPPED: translationKeys.common.orderStatus.shipped,
                            DELIVERED: translationKeys.common.orderStatus.delivered,
                            CANCELLED: translationKeys.common.orderStatus.cancelled,
                          }[order.status] ?? '',
                          order.status,
                        )}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      {t(translationKeys.admin.orders.customer, 'Customer')}: {customer}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      <span>
                        {t(translationKeys.admin.orders.subtotal, 'Subtotal')}: {formatPrice(order.subtotal)}
                      </span>
                      <span>
                        {t(translationKeys.admin.orders.shipping, 'Shipping')}: {formatPrice(order.shipping)}
                      </span>
                      <span>
                        {t(translationKeys.admin.orders.total, 'Total')}: {formatPrice(order.total)}
                      </span>
                    </div>
                    {order.trackingNumber && (
                      <p className="text-sm text-muted-foreground">
                        {t(translationKeys.admin.orders.trackingLabel, 'Tracking DHL')}: {order.trackingNumber}
                      </p>
                    )}
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{t(translationKeys.admin.orders.items, 'Items')}</p>
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-muted-foreground">
                          <span>{item.productVariant.product.name}</span>
                          <span>x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2">
                      <Link className="text-sm text-primary hover:underline" href={`/admin/orders/${order.id}`}>
                        {t(translationKeys.admin.orders.viewDetails, 'View details')}
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            limit={limit}
            baseUrl="/admin/orders"
            preserveParams={['orderId']}
          />
        </>
      )}
    </div>
  );
}
