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
        <p className="text-muted-foreground">{t(translationKeys.profile.orderDetails.loading, 'Loading order...')}</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{t(translationKeys.profile.orderDetails.errorTitle, 'Error')}</CardTitle>
            <CardDescription>{t(translationKeys.profile.orderDetails.errorDescription, 'Failed to load order details.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/user/profile')}>{t(translationKeys.profile.orderDetails.backToProfile, 'Back to profile')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t(translationKeys.profile.orderDetails.title, 'Order')} #{formatOrderIdDisplay(order.id)}</h1>
        <p className="text-muted-foreground">{t(translationKeys.profile.orderDetails.status, 'Status')}: {statusLabel}</p>
      </div>

      {order.trackingNumber && (
        <Card>
          <CardHeader>
            <CardTitle>{t(translationKeys.profile.orderDetails.trackingTitle, 'Tracking')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t(translationKeys.profile.orderDetails.trackingLabel, 'DHL tracking number')}: {order.trackingNumber}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.profile.orderDetails.addressesTitle, 'Addresses')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t(translationKeys.profile.orderDetails.shippingAddress, 'Shipping address')}: {formatAddress(order.shippingAddress)}</p>
          <p>{t(translationKeys.profile.orderDetails.billingAddress, 'Billing address')}: {formatAddress(order.billingAddress)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.profile.orderDetails.totalsTitle, 'Order totals')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          <span>{t(translationKeys.checkout.subtotal, 'Subtotal')}: {formatPrice(order.subtotal)}</span>
          <span>{t(translationKeys.checkout.shipping, 'Shipping')}: {formatPrice(order.shipping)}</span>
          <span>{t(translationKeys.checkout.total, 'Total')}: {formatPrice(order.total)}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.profile.orderDetails.itemsTitle, 'Items')}</CardTitle>
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
