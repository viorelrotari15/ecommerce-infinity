'use client';

import { useUserProfile, useUpdateProfile, type UserProfile } from '@/lib/hooks/use-user-profile';
import { useUserOrders } from '@/lib/hooks/use-orders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatPrice, formatOrderIdDisplay } from '@/lib/utils';
import { Loader2, User, Mail, Phone, Calendar, Package, MapPin, Eye, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { useEffect, useState, useMemo } from 'react';
import { useT, translationKeys } from '@/lib/utils/translations';
import { useLanguage } from '@/lib/contexts/language-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { AddressForm } from '@/components/checkout/address-form';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_REGION_CODE } from '@/lib/config';
import { getDialCodeByIso2, phoneCountries } from '@/lib/phone-countries';

const addressSchema = yup.object({
  shippingAddress: yup.object({
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    phoneCountryCode: yup.string().required('Phone country code is required'),
    phoneNumber: yup
      .string()
      .matches(/^[0-9\s-]{6,18}$/, 'Phone number is invalid')
      .required('Phone number is required'),
    street: yup.string().required('Street is required'),
    houseNumber: yup.string().required('House number is required'),
    city: yup.string().required('City is required'),
    postalCode: yup
      .string()
      .matches(/^\d{5}$/, 'Postal code must be 5 digits')
      .required('Postal code is required'),
    country: yup.string().oneOf([DEFAULT_REGION_CODE]).required('Country is required'),
  }),
});

type AddressFormValues = yup.InferType<typeof addressSchema>;
type SavedAddressType = 'shipping' | 'billing';

function splitPhone(value?: string | null): { phoneCountryCode: string; phoneNumber: string } {
  if (!value) {
    return { phoneCountryCode: getDialCodeByIso2(DEFAULT_REGION_CODE) || '+49', phoneNumber: '' };
  }
  const normalizePhone = (v: string) => v.replace(/[^\d+]/g, '');
  const findDialCode = (v: string) => {
    const normalized = normalizePhone(v);
    const sorted = phoneCountries
      .map((c) => normalizePhone(c.dialCode))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    return sorted.find((code) => normalized.startsWith(code));
  };
  const dialCode = findDialCode(value) || getDialCodeByIso2(DEFAULT_REGION_CODE) || '+49';
  const normalized = normalizePhone(value);
  const phoneNumber = normalized.startsWith(dialCode) ? normalized.slice(dialCode.length) : normalized;
  return { phoneCountryCode: dialCode, phoneNumber };
}

const countryLabel = DEFAULT_REGION_CODE === 'DE' ? 'Germany' : DEFAULT_REGION_CODE;

function addressContentKey(addr: Record<string, unknown>): string {
  const { type, ...rest } = addr;
  return JSON.stringify(rest);
}

function getEditFormDefaultValues(
  editAddress: { type: SavedAddressType; address: Record<string, unknown> | null },
): AddressFormValues['shippingAddress'] {
  if (editAddress.address) {
    const { phoneCountryCode, phoneNumber } = splitPhone(editAddress.address.phone as string);
    return {
      firstName: (editAddress.address.firstName as string) || '',
      lastName: (editAddress.address.lastName as string) || '',
      phoneCountryCode,
      phoneNumber,
      street: (editAddress.address.street as string) || '',
      houseNumber: (editAddress.address.houseNumber as string) || '',
      city: (editAddress.address.city as string) || '',
      postalCode: (editAddress.address.postalCode as string) || '',
      country: (editAddress.address.country as string) || DEFAULT_REGION_CODE,
    };
  }
  return {
    firstName: '',
    lastName: '',
    phoneCountryCode: getDialCodeByIso2(DEFAULT_REGION_CODE) || '+49',
    phoneNumber: '',
    street: '',
    houseNumber: '',
    city: '',
    postalCode: '',
    country: DEFAULT_REGION_CODE,
  };
}

function EditAddressForm({
  editAddress,
  onClose,
  onSave,
  isPending,
}: {
  editAddress: { type: SavedAddressType; address: Record<string, unknown> | null };
  onClose: () => void;
  onSave: (payload: { type: SavedAddressType; values: AddressFormValues['shippingAddress'] }) => void;
  isPending: boolean;
}) {
  const t = useT();
  const defaultValues = useMemo(
    () => ({ shippingAddress: getEditFormDefaultValues(editAddress) }),
    [editAddress.type, editAddress.address ? addressContentKey(editAddress.address) : 'new'],
  );
  const form = useForm<AddressFormValues>({
    resolver: yupResolver(addressSchema),
    defaultValues,
  });

  return (
    <form
      onSubmit={form.handleSubmit((data) => onSave({ type: editAddress.type, values: data.shippingAddress }))}
      className="space-y-4"
    >
      <AddressForm
        prefix="shippingAddress"
        title={
          editAddress.type === 'shipping'
            ? t(translationKeys.profile.shippingAddress, 'Shipping address')
            : t(translationKeys.profile.billingAddress, 'Billing address')
        }
        register={form.register}
        errors={form.formState.errors}
        countryLabel={countryLabel}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t(translationKeys.common.cancel, 'Cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t(translationKeys.common.save, 'Save')}
        </Button>
      </DialogFooter>
    </form>
  );
}

const localeByLang: Record<string, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  de: 'de-DE',
};

export default function UserProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { currentLanguage } = useLanguage();
  const dateLocale = localeByLang[currentLanguage || 'en'] || 'en-US';
  const { data: profile, isLoading: profileLoading, error: profileError } = useUserProfile();
  const { data: orders, isLoading: ordersLoading } = useUserOrders();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const t = useT();

  type ViewAddressItem = {
    type: string;
    address: Record<string, unknown>;
    id: string;
    isDefaultShipping: boolean;
    isDefaultBilling: boolean;
  };
  const [viewAddress, setViewAddress] = useState<ViewAddressItem | null>(null);
  const [editAddress, setEditAddress] = useState<{ type: SavedAddressType; address: Record<string, unknown> | null } | null>(null);
  const [deleteAddress, setDeleteAddress] = useState<ViewAddressItem | null>(null);

  const handleSaveAddress = async (
    payload: { type: SavedAddressType; values: AddressFormValues['shippingAddress'] },
  ) => {
    const currentEdit = editAddress;
    if (!currentEdit) return;
    const addr = payload.values;
    const normalized = {
      ...addr,
      phone: `${addr.phoneCountryCode}${addr.phoneNumber}`,
    };
    const { phoneCountryCode, phoneNumber, ...rest } = normalized;
    const body = rest as Record<string, unknown>;
    body.phone = normalized.phone;
    const oldKey = currentEdit.address ? addressContentKey(currentEdit.address as Record<string, unknown>) : null;
    const currentSaved = profile?.savedAddresses ?? [];
    const savedIndex = oldKey ? currentSaved.findIndex((a: any) => addressContentKey(a) === oldKey) : -1;
    const newSavedAddresses =
      savedIndex >= 0
        ? currentSaved.map((a: any, i: number) => (i === savedIndex ? body : a))
        : [...currentSaved, body];
    try {
      const updates: Partial<Pick<UserProfile, 'defaultShippingAddress' | 'defaultBillingAddress' | 'savedAddresses'>> = {
        savedAddresses: newSavedAddresses,
      };
      if (payload.type === 'shipping') {
        updates.defaultShippingAddress = body;
      } else {
        updates.defaultBillingAddress = body;
      }
      await updateProfile.mutateAsync(updates);
      toast({ title: t(translationKeys.profile.addressUpdated, 'Address updated.') });
      setEditAddress(null);
      setViewAddress(null);
    } catch {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: t(translationKeys.common.somethingWentWrong, 'Something went wrong.'),
      });
    }
  };

  const handleDeleteAddress = async () => {
    const item = deleteAddress;
    if (!item) return;
    try {
      const updates: Partial<Pick<UserProfile, 'defaultShippingAddress' | 'defaultBillingAddress' | 'savedAddresses' | 'hiddenAddressKeys'>> = {};
      if (item.isDefaultShipping) updates.defaultShippingAddress = null;
      if (item.isDefaultBilling) updates.defaultBillingAddress = null;
      if (!item.isDefaultShipping && !item.isDefaultBilling) {
        const hidden = new Set(profile?.hiddenAddressKeys ?? []);
        hidden.add(item.id);
        updates.hiddenAddressKeys = Array.from(hidden);
      }
      const newSavedAddresses = (profile?.savedAddresses ?? []).filter(
        (a: any) => addressContentKey(a) !== item.id,
      );
      if (newSavedAddresses.length !== (profile?.savedAddresses ?? []).length) {
        updates.savedAddresses = newSavedAddresses;
      }
      if (Object.keys(updates).length > 0) {
        await updateProfile.mutateAsync(updates);
      }
      toast({ title: t(translationKeys.profile.addressDeleted, 'Address removed from list.') });
      setDeleteAddress(null);
      setViewAddress(null);
    } catch {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: t(translationKeys.common.somethingWentWrong, 'Something went wrong.'),
      });
    }
  };

  const defaultShippingKey = useMemo(
    () =>
      profile?.defaultShippingAddress
        ? addressContentKey(profile.defaultShippingAddress as Record<string, unknown>)
        : null,
    [profile?.defaultShippingAddress],
  );
  const defaultBillingKey = useMemo(
    () =>
      profile?.defaultBillingAddress
        ? addressContentKey(profile.defaultBillingAddress as Record<string, unknown>)
        : null,
    [profile?.defaultBillingAddress],
  );

  // Same address list as checkout: defaults first, then savedAddresses, then from orders; exclude hidden
  const addressList = useMemo(() => {
    const profileData = profile;
    if (!profileData) return [];
    const hidden = new Set(profileData.hiddenAddressKeys ?? []);
    const list: { id: string; address: Record<string, unknown> & { type?: string }; isDefaultShipping: boolean; isDefaultBilling: boolean }[] = [];
    const byKey = new Map<string, (typeof list)[0]>();
    const add = (
      key: string,
      address: Record<string, unknown> & { type?: string },
      isDefaultShipping: boolean,
      isDefaultBilling: boolean,
    ) => {
      if (hidden.has(key)) return;
      const existing = byKey.get(key);
      if (existing) {
        existing.isDefaultShipping = existing.isDefaultShipping || isDefaultShipping;
        existing.isDefaultBilling = existing.isDefaultBilling || isDefaultBilling;
      } else {
        const item = { id: key, address, isDefaultShipping, isDefaultBilling };
        list.push(item);
        byKey.set(key, item);
      }
    };
    if (profileData.defaultShippingAddress) {
      const addr = { ...(profileData.defaultShippingAddress as Record<string, unknown>), type: 'shipping' };
      const key = addressContentKey(addr as Record<string, unknown>);
      add(key, addr as Record<string, unknown> & { type?: string }, true, false);
    }
    if (profileData.defaultBillingAddress) {
      const addr = { ...(profileData.defaultBillingAddress as Record<string, unknown>), type: 'billing' };
      const key = addressContentKey(addr as Record<string, unknown>);
      add(key, addr as Record<string, unknown> & { type?: string }, false, true);
    }
    (profileData.savedAddresses ?? []).forEach((addr: Record<string, unknown>) => {
      const key = addressContentKey(addr);
      add(key, addr as Record<string, unknown> & { type?: string }, key === defaultShippingKey, key === defaultBillingKey);
    });
    orders?.forEach((order) => {
      if (order.shippingAddress) {
        const addr = { ...order.shippingAddress, type: 'shipping' };
        const key = addressContentKey(addr as Record<string, unknown>);
        add(key, addr as Record<string, unknown> & { type?: string }, false, false);
      }
      if (order.billingAddress) {
        const addr = { ...order.billingAddress, type: 'billing' };
        const key = addressContentKey(addr as Record<string, unknown>);
        add(key, addr as Record<string, unknown> & { type?: string }, false, false);
      }
    });
    return list;
  }, [profile?.defaultShippingAddress, profile?.defaultBillingAddress, profile?.savedAddresses, profile?.hiddenAddressKeys, defaultShippingKey, defaultBillingKey, orders]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated()) {
      router.push('/auth/login');
    }
  }, [mounted, router]);

  // Same initial UI on server and client to avoid hydration mismatch (server has no auth token, client may have one)
  if (!mounted || profileLoading) {
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

  const formatAddress = (address: any) => {
    if (!address) return 'N/A';
    const parts = [
      address.street,
      address.houseNumber,
      address.city,
      address.state,
      address.postalCode,
      address.country,
    ].filter(Boolean);
    return parts.join(', ') || 'N/A';
  };

  const formatAddressLine = (label: string, value: string | undefined) =>
    value ? `${label}: ${value}` : null;

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
                  {new Date(profile.createdAt).toLocaleDateString(dateLocale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Addresses – same list as checkout; add, edit, or remove here; order history unchanged */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t(translationKeys.profile.addresses, 'Addresses')}
            </CardTitle>
            <CardDescription>
              {t(translationKeys.profile.addressesDescription, 'Add, edit, or remove addresses here. Past orders keep the address used at checkout.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {addressList.length > 0 ? (
              <div className="space-y-2">
                {addressList.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-sm font-medium">
                        {(item.address as { type?: string }).type === 'shipping'
                          ? t(translationKeys.profile.shippingAddress, 'Shipping Address')
                          : t(translationKeys.profile.billingAddress, 'Billing Address')}
                      </span>
                      <p className="text-sm text-muted-foreground mt-0.5">{formatAddress(item.address)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() =>
                        setViewAddress({
                          type: (item.address as { type?: string }).type ?? 'shipping',
                          address: item.address,
                          id: item.id,
                          isDefaultShipping: item.isDefaultShipping,
                          isDefaultBilling: item.isDefaultBilling,
                        })
                      }
                    >
                      {t(translationKeys.profile.viewAddress, 'View details')}
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setEditAddress({ type: 'shipping', address: null })}
            >
              {t(translationKeys.profile.addNewAddress, 'Add new address')}
            </Button>
            {!ordersLoading && addressList.length === 0 && (
              <p className="text-sm text-muted-foreground">{t(translationKeys.profile.noAddresses, 'No addresses yet. Add one above or place an order.')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View address dialog */}
      <Dialog open={!!viewAddress} onOpenChange={(open) => !open && setViewAddress(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t(translationKeys.profile.addressDetails, 'Address details')}</DialogTitle>
            <DialogDescription>
              {viewAddress?.type === 'shipping'
                ? t(translationKeys.profile.shippingAddress, 'Shipping Address')
                : t(translationKeys.profile.billingAddress, 'Billing Address')}
            </DialogDescription>
          </DialogHeader>
          {viewAddress && (
            <div className="grid gap-2 text-sm">
              {[
                formatAddressLine(t(translationKeys.checkout.address.firstName, 'First name'), viewAddress.address.firstName as string),
                formatAddressLine(t(translationKeys.checkout.address.lastName, 'Last name'), viewAddress.address.lastName as string),
                formatAddressLine(t(translationKeys.checkout.address.street, 'Street'), viewAddress.address.street as string),
                formatAddressLine(t(translationKeys.checkout.address.houseNumber, 'House number'), viewAddress.address.houseNumber as string),
                formatAddressLine(t(translationKeys.checkout.address.city, 'City'), viewAddress.address.city as string),
                formatAddressLine(t(translationKeys.checkout.address.postalCode, 'Postal code'), viewAddress.address.postalCode as string),
                formatAddressLine(t(translationKeys.checkout.address.country, 'Country'), viewAddress.address.country as string),
                formatAddressLine(t(translationKeys.checkout.address.phone, 'Phone'), viewAddress.address.phone as string),
              ]
                .filter(Boolean)
                .map((line, i) => (
                  <p key={i} className="text-muted-foreground">
                    {line}
                  </p>
                ))}
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setViewAddress(null)}>
              {t(translationKeys.common.close, 'Close')}
            </Button>
            {viewAddress && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    const type: SavedAddressType = viewAddress.isDefaultShipping ? 'shipping' : viewAddress.isDefaultBilling ? 'billing' : 'shipping';
                    setEditAddress({ type, address: viewAddress.address });
                    setViewAddress(null);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  {t(translationKeys.profile.editAddress, 'Edit')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteAddress(viewAddress)}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  {t(translationKeys.profile.deleteAddress, 'Delete')}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit saved address dialog */}
      <Dialog open={!!editAddress} onOpenChange={(open) => !open && setEditAddress(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editAddress?.address
                ? t(translationKeys.profile.editAddress, 'Edit saved address')
                : editAddress?.type === 'shipping'
                  ? t(translationKeys.profile.addShippingAddress, 'Save as default shipping address')
                  : t(translationKeys.profile.addBillingAddress, 'Save as default billing address')}
            </DialogTitle>
          </DialogHeader>
          {editAddress && (
            <EditAddressForm
              key={`${editAddress.type}-${editAddress.address ? addressContentKey(editAddress.address) : 'new'}`}
              editAddress={editAddress}
              onClose={() => setEditAddress(null)}
              onSave={handleSaveAddress}
              isPending={updateProfile.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete address confirmation */}
      <AlertDialog open={!!deleteAddress} onOpenChange={(open) => !open && setDeleteAddress(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(translationKeys.profile.deleteAddress, 'Delete address')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(translationKeys.profile.confirmDeleteSavedOnly, 'Remove this address from your list. Past orders are unchanged.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t(translationKeys.common.cancel, 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAddress} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t(translationKeys.profile.deleteAddress, 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                        {new Date(order.createdAt).toLocaleDateString(dateLocale, {
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
                      {t(translationKeys.profile.viewOrderDetails, 'View order details')}
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

