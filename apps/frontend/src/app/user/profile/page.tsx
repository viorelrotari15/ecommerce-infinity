'use client';

import { useUserProfile } from '@/lib/hooks/use-user-profile';
import { useUserOrders } from '@/lib/hooks/use-orders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { Loader2, User, Mail, Phone, Calendar, Package, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { useEffect } from 'react';

export default function UserProfilePage() {
  const router = useRouter();
  const { data: profile, isLoading: profileLoading, error: profileError } = useUserProfile();
  const { data: orders, isLoading: ordersLoading } = useUserOrders();

  useEffect(() => {
    if (typeof window !== 'undefined' && !isAuthenticated()) {
      router.push('/auth/login');
    }
  }, [router]);

  if (profileLoading) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load profile. Please try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>Go Home</Button>
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
        addresses.set(key, { ...order.shippingAddress, type: 'Shipping' });
      }
    }
    if (order.billingAddress) {
      const key = JSON.stringify(order.billingAddress);
      if (!addresses.has(key)) {
        addresses.set(key, { ...order.billingAddress, type: 'Billing' });
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
        return 'text-yellow-600 bg-yellow-50';
      case 'PROCESSING':
        return 'text-blue-600 bg-blue-50';
      case 'SHIPPED':
        return 'text-purple-600 bg-purple-50';
      case 'DELIVERED':
        return 'text-green-600 bg-green-50';
      case 'CANCELLED':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your account information and view your orders</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            {profile.firstName && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Name</p>
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
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{profile.phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Member Since</p>
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
              Addresses
            </CardTitle>
            <CardDescription>Your saved addresses from orders</CardDescription>
          </CardHeader>
          <CardContent>
            {uniqueAddresses.length > 0 ? (
              <div className="space-y-4">
                {uniqueAddresses.map((address, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{address.type} Address</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatAddress(address)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No addresses found. Addresses will appear here after you place orders.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Previous Orders
          </CardTitle>
          <CardDescription>Your order history</CardDescription>
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
                      <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
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
                        {order.status}
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
                  {order.payment && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Payment: {order.payment.method} - {order.payment.status}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No orders found. Start shopping to see your orders here!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

