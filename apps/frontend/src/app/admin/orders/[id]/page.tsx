'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice } from '@/lib/utils';
import { useAdminOrder, useUpdateAdminOrderStatus } from '@/lib/hooks/use-orders';
import { useToast } from '@/hooks/use-toast';
import { useT, translationKeys } from '@/lib/utils/translations';

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

export default function AdminOrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const t = useT();
  const orderId = params?.id as string | undefined;
  const { data, isLoading, error } = useAdminOrder(orderId);
  const updateStatus = useUpdateAdminOrderStatus();

  const order = data;
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [trackingNumber, setTrackingNumber] = useState<string>('');

  const statusOptions = useMemo(
    () => [
      { value: 'PENDING', label: t(translationKeys.common.orderStatus.pending, 'Pending') },
      { value: 'PROCESSING', label: t(translationKeys.common.orderStatus.processing, 'Processing') },
      { value: 'SHIPPED', label: t(translationKeys.common.orderStatus.shipped, 'Shipped') },
      { value: 'DELIVERED', label: t(translationKeys.common.orderStatus.delivered, 'Delivered') },
      { value: 'CANCELLED', label: t(translationKeys.common.orderStatus.cancelled, 'Cancelled') },
    ],
    [t],
  );

  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setTrackingNumber(order.trackingNumber || '');
    }
  }, [order]);

  const selectedLabel = useMemo(
    () => statusOptions.find((option) => option.value === status)?.label || status,
    [status],
  );

  if (isLoading) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">
          {t(translationKeys.admin.orderDetails.loading, 'Loading order...')}
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{t(translationKeys.admin.orderDetails.errorTitle, 'Error')}</CardTitle>
            <CardDescription>{t(translationKeys.admin.orderDetails.errorDescription, 'Failed to load order.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/admin/orders')}>
              {t(translationKeys.admin.orderDetails.backToOrders, 'Back to orders')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleUpdate = async () => {
    if (status === 'SHIPPED' && !trackingNumber.trim()) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.admin.orderDetails.trackingRequiredTitle, 'Tracking number required'),
        description: t(
          translationKeys.admin.orderDetails.trackingRequiredDescription,
          'Please enter the DHL tracking number before marking as shipped.',
        ),
      });
      return;
    }

    try {
      await updateStatus.mutateAsync({
        orderId: order.id,
        status: status || order.status,
        trackingNumber: trackingNumber.trim() || undefined,
      });
      toast({
        variant: 'success',
        title: t(translationKeys.admin.orderDetails.updateSuccessTitle, 'Order updated'),
        description: t(
          translationKeys.admin.orderDetails.updateSuccessDescription,
          'Order status was updated successfully.',
        ),
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.admin.orderDetails.updateFailedTitle, 'Update failed'),
        description:
          err.message ||
          t(translationKeys.admin.orderDetails.updateFailedDescription, 'Failed to update order.'),
      });
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {t(translationKeys.admin.orderDetails.title, 'Order')} #{order.id}
        </h1>
        <p className="text-muted-foreground">
          {t(translationKeys.admin.orderDetails.status, 'Status')}: {selectedLabel || order.status}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.admin.orderDetails.customerTitle, 'Customer')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            {t(translationKeys.admin.orderDetails.customerEmail, 'Email')}:{' '}
            {order.user?.email || order.guestEmail || t(translationKeys.admin.orders.guest, 'Guest')}
          </p>
          <p>
            {t(translationKeys.admin.orderDetails.shippingAddress, 'Shipping address')}:{' '}
            {formatAddress(order.shippingAddress)}
          </p>
          <p>
            {t(translationKeys.admin.orderDetails.billingAddress, 'Billing address')}:{' '}
            {formatAddress(order.billingAddress)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.admin.orderDetails.statusUpdateTitle, 'Status update')}</CardTitle>
          <CardDescription>
            {t(translationKeys.admin.orderDetails.statusUpdateDescription, 'Update the current order status and tracking.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t(translationKeys.admin.orderDetails.statusLabel, 'Status')}
            </label>
            <Select value={status || order.status} onValueChange={(value) => setStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t(translationKeys.admin.orderDetails.trackingLabel, 'Tracking number (DHL)')}
            </label>
            <Input
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder={t(translationKeys.admin.orderDetails.trackingPlaceholder, 'DHL tracking number')}
            />
          </div>
          <Button onClick={handleUpdate} disabled={updateStatus.isPending}>
            {updateStatus.isPending
              ? t(translationKeys.admin.orderDetails.saving, 'Saving...')
              : t(translationKeys.admin.orderDetails.saveChanges, 'Save changes')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.admin.orderDetails.orderTotalsTitle, 'Order totals')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          <span>{t(translationKeys.admin.orders.subtotal, 'Subtotal')}: {formatPrice(order.subtotal)}</span>
          <span>{t(translationKeys.admin.orders.shipping, 'Shipping')}: {formatPrice(order.shipping)}</span>
          <span>{t(translationKeys.admin.orders.tax, 'Tax')}: {formatPrice(order.tax)}</span>
          <span>{t(translationKeys.admin.orders.total, 'Total')}: {formatPrice(order.total)}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.admin.orderDetails.itemsTitle, 'Items')}</CardTitle>
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
