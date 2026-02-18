'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice, formatOrderIdDisplay } from '@/lib/utils';
import { isAdmin } from '@/lib/auth';
import Link from 'next/link';
import { useAdminOrders } from '@/lib/hooks/use-orders';
import { useT, translationKeys } from '@/lib/utils/translations';

export default function AdminOrdersPage() {
  const router = useRouter();
  const t = useT();
  const { data: orders = [], isLoading, error } = useAdminOrders();

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth/login');
    }
  }, [router]);

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
          {t(translationKeys.admin.orders.description, 'Review all orders and tax totals')}
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t(translationKeys.admin.orders.noOrders, 'No orders yet')}
          </CardContent>
        </Card>
      ) : (
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
                      {t(translationKeys.admin.orders.tax, 'Tax')}: {formatPrice(order.tax)}
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
      )}
    </div>
  );
}
