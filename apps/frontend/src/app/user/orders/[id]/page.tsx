'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { useUserOrder, type Order } from '@/lib/hooks/use-orders';

const statusLabels: Record<string, string> = {
  PENDING: 'Receptionat',
  PROCESSING: 'In procesare',
  SHIPPED: 'Trimis la posta',
  DELIVERED: 'Livrat',
  CANCELLED: 'Anulat',
};

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

export default function UserOrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string | undefined;
  const { data, isLoading, error } = useUserOrder(orderId);

  const order = data;

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

  const orderData = order as unknown as Order;

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Order #{orderData.id}</h1>
        <p className="text-muted-foreground">Status: {statusLabels[orderData.status] || orderData.status}</p>
      </div>

      {orderData.trackingNumber && (
        <Card>
          <CardHeader>
            <CardTitle>Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">DHL tracking number: {orderData.trackingNumber}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Addresses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Shipping address: {formatAddress(orderData.shippingAddress)}</p>
          <p>Billing address: {formatAddress(orderData.billingAddress)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order totals</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          <span>Subtotal: {formatPrice(orderData.subtotal)}</span>
          <span>Shipping: {formatPrice(orderData.shipping)}</span>
          <span>Tax: {formatPrice(orderData.tax)}</span>
          <span>Total: {formatPrice(orderData.total)}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {orderData.items.map((item) => (
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
