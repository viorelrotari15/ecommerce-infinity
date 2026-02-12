'use client';

import { useUserProfile } from '@/lib/hooks/use-user-profile';
import { useUserOrders } from '@/lib/hooks/use-orders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatPrice, formatOrderIdDisplay } from '@/lib/utils';
import { Loader2, User, Mail, Phone, Calendar, Package, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { useEffect } from 'react';
import { useT, translationKeys } from '@/lib/utils/translations';

export default function UserProfilePage() {
  const router = useRouter();
  const { data: profile, isLoading: profileLoading, error: profileError } = useUserProfile();
  const { data: orders, isLoading: ordersLoading } = useUserOrders();
  const t = useT();

  useEffect(() => {
    if (typeof window !== 'undefined' && !isAuthenticated()) {
      router.push('/auth/login');
    }
  }, [router]);

  if (profileLoading) {
    return (
      <div className="w-full px-4 md:px-6 lg:px-8 flex min-h-[60vh] items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="w-full px-4 md:px-6 lg:px-8 py-12">
        <Card>
          <CardHeader>
            <CardTitle>{t(translationKeys.profile.error, 'Error')}</CardTitle>
            <CardDescription>{t(translationKeys.profile.failedToLoad, 'Failed to load profile. Please try again.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>{t(translationKeys.profile.goHome, 'Go Home')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Extract unique addresses from orders
  const addresses = new Map<string, any>();
  orders?.forEach((order) => {
    if (order.shippingAddress) {
      const key = JSON.stringify(order.shippingAddress);
      if (!addresses.has(key)) {
        addresses.set(key, { ...order.shippingAddress, type: t(translationKeys.profile.shippingAddress, 'Shipping') });
      }
    }
    if (order.billingAddress) {
      const key = JSON.stringify(order.billingAddress);
      if (!addresses.has(key)) {
        addresses.set(key, { ...order.billingAddress, type: t(translationKeys.profile.billingAddress, 'Billing') });
      }
    }
  });
  const uniqueAddresses = Array.from(addresses.values());

  const formatAddress = (address: any) => {
    if (!address) return 'N/A';
    const parts = [
      address.street,
      address.city,
      address.state,
      address.postalCode,
      address.country,
    ].filter(Boolean);
    return parts.join(', ') || 'N/A';
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'text-primary bg-primary/10';
      case 'PROCESSING':
        return 'text-secondary bg-secondary/10';
      case 'SHIPPED':
        return 'text-accent bg-accent/10';
      case 'DELIVERED':
        return 'text-foreground bg-muted';
      case 'CANCELLED':
        return 'text-destructive bg-destructive/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t(translationKeys.profile.title, 'My Profile')}</h1>
        <p className="text-muted-foreground mt-2">{t(translationKeys.profile.description, 'Manage your account information and view your orders')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t(translationKeys.profile.personalInformation, 'Personal Information')}
            </CardTitle>
            <CardDescription>{t(translationKeys.profile.accountDetails, 'Your account details')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t(translationKeys.profile.email, 'Email')}</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            {profile.firstName && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t(translationKeys.profile.name, 'Name')}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.firstName} {profile.lastName || ''}
                  </p>
                </div>
              </div>
            )}
            {profile.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t(translationKeys.profile.phone, 'Phone')}</p>
                  <p className="text-sm text-muted-foreground">{profile.phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t(translationKeys.profile.memberSince, 'Member Since')}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(profile.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Addresses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t(translationKeys.profile.addresses, 'Addresses')}
            </CardTitle>
            <CardDescription>{t(translationKeys.profile.savedAddresses, 'Your saved addresses from orders')}</CardDescription>
          </CardHeader>
          <CardContent>
            {uniqueAddresses.length > 0 ? (
              <div className="space-y-4">
                {uniqueAddresses.map((address, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{address.type} {t(translationKeys.profile.addresses, 'Address')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatAddress(address)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t(translationKeys.profile.noAddresses, 'No addresses found. Addresses will appear here after you place orders.')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t(translationKeys.profile.previousOrders, 'Previous Orders')}
          </CardTitle>
          <CardDescription>{t(translationKeys.profile.orderHistory, 'Your order history')}</CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-medium">{t(translationKeys.profile.order, 'Order')} #{formatOrderIdDisplay(order.id)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(parseFloat(order.total))}</p>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getStatusColor(order.status)}`}
                      >
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
                    </div>
                  </div>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">
                            {item.productVariant.product.name}
                            {item.productVariant.name && ` - ${item.productVariant.name}`}
                          </p>
                          <p className="text-muted-foreground">
                            SKU: {item.productVariant.sku} × {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium">{formatPrice(parseFloat(item.price))}</p>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4">
                    <Link className="text-sm text-primary hover:underline" href={`/user/orders/${order.id}`}>
                      View order details
                    </Link>
                  </div>
                  {order.payment && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        {t(translationKeys.profile.payment, 'Payment')}: {order.payment.method} - {order.payment.status}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t(translationKeys.profile.noOrders, 'No orders found. Start shopping to see your orders here!')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

