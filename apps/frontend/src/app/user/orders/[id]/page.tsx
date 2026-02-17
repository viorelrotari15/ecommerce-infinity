'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice, formatOrderIdDisplay } from '@/lib/utils';
import { useUserOrder } from '@/lib/hooks/use-orders';
import { useT, translationKeys } from '@/lib/utils/translations';
import type { UserOrderResponse } from '@/lib/api/client';

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

const statusKeyMap: Record<string, string> = {
  PENDING: translationKeys.common.orderStatus.pending,
  PROCESSING: translationKeys.common.orderStatus.processing,
  SHIPPED: translationKeys.common.orderStatus.shipped,
  DELIVERED: translationKeys.common.orderStatus.delivered,
  CANCELLED: translationKeys.common.orderStatus.cancelled,
};

export default function UserOrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string | undefined;
  const t = useT();
  const { data, isLoading, error } = useUserOrder(orderId);

  const order = data as UserOrderResponse | undefined;
  const statusLabel = order
    ? t(statusKeyMap[order.status] ?? '', order.status)
    : '';

  if (isLoading) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">Loading order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load order details.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/user/profile')}>Back to profile</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Order #{formatOrderIdDisplay(order.id)}</h1>
        <p className="text-muted-foreground">Status: {statusLabel}</p>
      </div>

      {order.trackingNumber && (
        <Card>
          <CardHeader>
            <CardTitle>Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">DHL tracking number: {order.trackingNumber}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Addresses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Shipping address: {formatAddress(order.shippingAddress)}</p>
          <p>Billing address: {formatAddress(order.billingAddress)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order totals</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          <span>Subtotal: {formatPrice(order.subtotal)}</span>
          <span>Shipping: {formatPrice(order.shipping)}</span>
          <span>Tax: {formatPrice(order.tax)}</span>
          <span>Total: {formatPrice(order.total)}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm text-muted-foreground">
              <span>
                {item.productVariant.product.name}
                {item.productVariant.name ? ` - ${item.productVariant.name}` : ''}
              </span>
              <span>x{item.quantity}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
