'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FieldPath, FieldPathValue, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronDown, Trash2 } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';
import { useUserOrders } from '@/lib/hooks/use-orders';
import { AddressForm } from '@/components/checkout/address-form';
import { ShippingMethodSelector } from '@/components/checkout/shipping-method-selector';
import { OrderSummary } from '@/components/checkout/order-summary';
import { getAuthToken, getCurrentUser, isAuthenticated } from '@/lib/auth';
import { apiService, listShippingOptions, ShippingOption } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useT, translationKeys } from '@/lib/utils/translations';
import { DEFAULT_REGION_CODE } from '@/lib/config';
import { getDialCodeByIso2, phoneCountries } from '@/lib/phone-countries';
import { useUpdateProfile, useUserProfile } from '@/lib/hooks/use-user-profile';

const addressSchema = yup.object({
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
});

const createCheckoutSchema = (isGuest: boolean) =>
  yup.object({
    guestEmail: isGuest ? yup.string().email('Invalid email').required('Email is required') : yup.string().optional(),
    billingSameAsShipping: yup.boolean().default(true),
    shippingMethodId: yup.string().required('Select a shipping method'),
    shippingAddress: addressSchema,
    billingAddress: yup.mixed().when('billingSameAsShipping', {
      is: true,
      then: (schema) => schema.notRequired(),
      otherwise: () => addressSchema,
    }),
  });

type CheckoutFormData = yup.InferType<ReturnType<typeof createCheckoutSchema>>;

export default function CheckoutPage() {
  const router = useRouter();
  const t = useT();
  const { toast } = useToast();
  const { items, getTotalPrice } = useCartStore();
  const isGuest = !isAuthenticated();
  const currentUser = getCurrentUser();
  const { data: profile } = useUserProfile();
  const { data: userOrders } = useUserOrders();
  const updateProfile = useUpdateProfile();
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSavedShipping, setSelectedSavedShipping] = useState('');
  const [selectedSavedBilling, setSelectedSavedBilling] = useState('');
  const [openShippingId, setOpenShippingId] = useState<string | null>(null);
  const [openBillingId, setOpenBillingId] = useState<string | null>(null);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [showBillingForm, setShowBillingForm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: yupResolver(createCheckoutSchema(isGuest)),
    defaultValues: {
      guestEmail: currentUser?.email || '',
      billingSameAsShipping: true,
      shippingMethodId: '',
      shippingAddress: {
        firstName: '',
        lastName: '',
        phoneCountryCode: getDialCodeByIso2(DEFAULT_REGION_CODE) || '+49',
        phoneNumber: '',
        street: '',
        houseNumber: '',
        city: '',
        postalCode: '',
        country: DEFAULT_REGION_CODE,
      },
      billingAddress: undefined,
    },
  });

  const shippingAddress = watch('shippingAddress');
  const billingAddress = watch('billingAddress');
  const shippingMethodId = watch('shippingMethodId');
  const subtotal = getTotalPrice();

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingOptionsLoading, setShippingOptionsLoading] = useState(false);

  useEffect(() => {
    if (!billingSameAsShipping) {
      return;
    }
    setValue('billingAddress', undefined);
  }, [billingSameAsShipping, shippingAddress, setValue]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const normalizePhone = (value: string) => value.replace(/[^\d+]/g, '');
    const findDialCode = (value: string) => {
      const normalized = normalizePhone(value);
      const sorted = phoneCountries
        .map((country) => normalizePhone(country.dialCode))
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);
      return sorted.find((code) => normalized.startsWith(code));
    };

    const setIfEmpty = <T extends FieldPath<CheckoutFormData>>(
      field: T,
      value: FieldPathValue<CheckoutFormData, T>,
    ) => {
      const current = watch(field);
      if (current === '' || current === undefined || current === null) {
        setValue(field, value, { shouldDirty: false });
      }
    };

    setIfEmpty('guestEmail', profile.email || '');

    if (profile.firstName) {
      setIfEmpty('shippingAddress.firstName', profile.firstName);
    }
    if (profile.lastName) {
      setIfEmpty('shippingAddress.lastName', profile.lastName);
    }

    if (profile.phone) {
      const dialCode = findDialCode(profile.phone) || getDialCodeByIso2(DEFAULT_REGION_CODE) || '+49';
      const normalized = normalizePhone(profile.phone);
      const phoneNumber = normalized.startsWith(dialCode) ? normalized.slice(dialCode.length) : normalized;
      setIfEmpty('shippingAddress.phoneCountryCode', dialCode);
      setIfEmpty('shippingAddress.phoneNumber', phoneNumber);
    }
  }, [profile, setValue, watch]);

  const normalizePhone = (value: string) => value.replace(/[^\d+]/g, '');
  const findDialCode = (value: string) => {
    const normalized = normalizePhone(value);
    const sorted = phoneCountries
      .map((country) => normalizePhone(country.dialCode))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    return sorted.find((code) => normalized.startsWith(code));
  };

  const splitPhone = (value?: string | null) => {
    if (!value) {
      return {
        phoneCountryCode: getDialCodeByIso2(DEFAULT_REGION_CODE) || '+49',
        phoneNumber: '',
      };
    }
    const dialCode = findDialCode(value) || getDialCodeByIso2(DEFAULT_REGION_CODE) || '+49';
    const normalized = normalizePhone(value);
    const phoneNumber = normalized.startsWith(dialCode) ? normalized.slice(dialCode.length) : normalized;
    return { phoneCountryCode: dialCode, phoneNumber };
  };

  const addressContentKey = (addr: Record<string, unknown>) => {
    const { type, ...rest } = addr;
    return JSON.stringify(rest);
  };

  const defaultShippingKey = useMemo(
    () => (profile?.defaultShippingAddress ? addressContentKey(profile.defaultShippingAddress) : null),
    [profile?.defaultShippingAddress],
  );
  const defaultBillingKey = useMemo(
    () => (profile?.defaultBillingAddress ? addressContentKey(profile.defaultBillingAddress) : null),
    [profile?.defaultBillingAddress],
  );

  const savedShippingAddressesRaw = useMemo(() => {
    const map = new Map<string, { address: any }>();
    const add = (address: any) => {
      const key = addressContentKey(address);
      if (!map.has(key)) map.set(key, { address });
    };
    if (profile?.defaultShippingAddress) {
      add(profile.defaultShippingAddress);
    }
    (profile?.savedAddresses ?? []).forEach((addr: any) => add(addr));
    if (userOrders?.length) {
      userOrders.forEach((order) => {
        if (order.shippingAddress) add(order.shippingAddress);
      });
    }
    return Array.from(map.entries()).map(([id, value]) => ({ id, ...value }));
  }, [profile?.defaultShippingAddress, profile?.savedAddresses, userOrders]);

  const savedBillingAddressesRaw = useMemo(() => {
    const map = new Map<string, { address: any }>();
    const add = (address: any) => {
      const key = addressContentKey(address);
      if (!map.has(key)) map.set(key, { address });
    };
    if (profile?.defaultBillingAddress) {
      add(profile.defaultBillingAddress);
    }
    (profile?.savedAddresses ?? []).forEach((addr: any) => add(addr));
    if (userOrders?.length) {
      userOrders.forEach((order) => {
        if (order.billingAddress) add(order.billingAddress);
      });
    }
    return Array.from(map.entries()).map(([id, value]) => ({ id, ...value }));
  }, [profile?.defaultBillingAddress, profile?.savedAddresses, userOrders]);

  const hiddenSet = useMemo(() => new Set(profile?.hiddenAddressKeys ?? []), [profile?.hiddenAddressKeys]);
  const savedShippingAddresses = useMemo(
    () => savedShippingAddressesRaw.filter((e) => !hiddenSet.has(addressContentKey(e.address))),
    [savedShippingAddressesRaw, hiddenSet],
  );
  const savedBillingAddresses = useMemo(
    () => savedBillingAddressesRaw.filter((e) => !hiddenSet.has(addressContentKey(e.address))),
    [savedBillingAddressesRaw, hiddenSet],
  );

  const handleDeleteAddress = async (
    entry: { id: string; address: any },
    kind: 'shipping' | 'billing',
  ) => {
    const key = addressContentKey(entry.address);
    const isDefaultShipping = key === defaultShippingKey;
    const isDefaultBilling = key === defaultBillingKey;
    const updates: {
      defaultShippingAddress?: null;
      defaultBillingAddress?: null;
      savedAddresses?: Record<string, any>[];
      hiddenAddressKeys?: string[];
    } = {};
    if (kind === 'shipping' && isDefaultShipping) {
      updates.defaultShippingAddress = null;
    } else if (kind === 'billing' && isDefaultBilling) {
      updates.defaultBillingAddress = null;
    } else {
      updates.hiddenAddressKeys = Array.from(new Set([...(profile?.hiddenAddressKeys ?? []), key]));
    }
    const newSavedAddresses = (profile?.savedAddresses ?? []).filter(
      (a: any) => addressContentKey(a) !== key,
    );
    if (newSavedAddresses.length !== (profile?.savedAddresses ?? []).length) {
      updates.savedAddresses = newSavedAddresses;
    }
    try {
      await updateProfile.mutateAsync(updates);
      toast({ title: t(translationKeys.profile.addressDeleted, 'Address removed from list.') });
      if (kind === 'shipping') {
        setOpenShippingId(null);
        if (selectedSavedShipping === entry.id) setSelectedSavedShipping('');
      } else {
        setOpenBillingId(null);
        if (selectedSavedBilling === entry.id) setSelectedSavedBilling('');
      }
    } catch {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: t(translationKeys.common.somethingWentWrong, 'Something went wrong.'),
      });
    }
  };

  const formatAddressLabel = (address: any) => {
    if (!address) return '';
    const name = [address.firstName, address.lastName].filter(Boolean).join(' ');
    const line = [address.street, address.houseNumber].filter(Boolean).join(' ');
    const city = [address.postalCode, address.city].filter(Boolean).join(' ');
    return [name, line, city, address.country].filter(Boolean).join(', ');
  };

  const formatAddressSummary = (address: any) => {
    if (!address) return '';
    const name = [address.firstName, address.lastName].filter(Boolean).join(' ');
    const line = [address.street, address.houseNumber].filter(Boolean).join(' ');
    const city = [address.postalCode, address.city].filter(Boolean).join(' ');
    return [name, line, city].filter(Boolean).join(' · ');
  };

  const applyAddress = (address: any, prefix: 'shippingAddress' | 'billingAddress') => {
    if (!address) {
      return;
    }
    const { phoneCountryCode, phoneNumber } = splitPhone(address.phone);
    const setAddressValue = (field: string, value: string) => {
      setValue(field as FieldPath<CheckoutFormData>, value, { shouldDirty: true });
    };
    setAddressValue(`${prefix}.firstName`, address.firstName || '');
    setAddressValue(`${prefix}.lastName`, address.lastName || '');
    setAddressValue(`${prefix}.street`, address.street || '');
    setAddressValue(`${prefix}.houseNumber`, address.houseNumber || '');
    setAddressValue(`${prefix}.city`, address.city || '');
    setAddressValue(`${prefix}.postalCode`, address.postalCode || '');
    setAddressValue(`${prefix}.country`, address.country || DEFAULT_REGION_CODE);
    setAddressValue(`${prefix}.phoneCountryCode`, phoneCountryCode);
    setAddressValue(`${prefix}.phoneNumber`, phoneNumber);
  };

  useEffect(() => {
    if (!items.length) {
      setShippingOptions([]);
      return;
    }
    let isMounted = true;
    setShippingOptionsLoading(true);
    listShippingOptions(DEFAULT_REGION_CODE)
      .then((options) => {
        if (isMounted) {
          setShippingOptions(options);
        }
      })
      .catch(() => {
        if (isMounted) {
          setShippingOptions([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setShippingOptionsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [items.length]);

  const defaultShippingOption = useMemo(() => {
    if (shippingOptions.length === 0) return null;
    const freeOption = shippingOptions.find((option) => option.price === 0);
    if (freeOption) return freeOption;
    return shippingOptions
      .slice()
      .sort((a, b) => a.price - b.price)[0];
  }, [shippingOptions]);

  useEffect(() => {
    if (defaultShippingOption && !shippingMethodId) {
      setValue('shippingMethodId', defaultShippingOption.id);
    }
  }, [defaultShippingOption, setValue, shippingMethodId]);

  const selectedShipping = shippingOptions.find((option) => option.id === shippingMethodId);
  const shippingCost = selectedShipping?.price ?? 0;
  const total = subtotal + shippingCost;
  const countryLabel = DEFAULT_REGION_CODE === 'DE' ? 'Germany' : DEFAULT_REGION_CODE;

  const normalizeAddress = (address: CheckoutFormData['shippingAddress']) => {
    const { phoneCountryCode, phoneNumber, ...rest } = address;
    return {
      ...rest,
      phone: `${phoneCountryCode}${phoneNumber}`,
    };
  };

  const handleSaveDefaultShipping = async () => {
    const isValid = await addressSchema.isValid(shippingAddress);
    if (!isValid) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.validationError, 'Validation Error'),
        description: t(translationKeys.common.fillRequired, 'Please fill in all required fields'),
      });
      return;
    }
    const normalized = normalizeAddress(shippingAddress);
    const key = addressContentKey(normalized);
    const currentSaved = profile?.savedAddresses ?? [];
    const alreadySaved = currentSaved.some((a: any) => addressContentKey(a) === key);
    const savedAddresses = alreadySaved ? currentSaved : [...currentSaved, normalized];
    try {
      await updateProfile.mutateAsync({ defaultShippingAddress: normalized, savedAddresses });
      setSelectedSavedShipping(key);
      setOpenShippingId(key);
      setShowShippingForm(false);
      toast({
        variant: 'success',
        title: 'Saved',
        description: 'Shipping address saved to your account.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: 'Failed to save shipping address.',
      });
    }
  };

  const handleSaveDefaultBilling = async () => {
    if (!billingAddress) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.validationError, 'Validation Error'),
        description: t(translationKeys.common.fillRequired, 'Please fill in all required fields'),
      });
      return;
    }
    const billingValue = billingAddress as CheckoutFormData['shippingAddress'];
    const isValid = await addressSchema.isValid(billingValue);
    if (!isValid) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.validationError, 'Validation Error'),
        description: t(translationKeys.common.fillRequired, 'Please fill in all required fields'),
      });
      return;
    }
    const normalized = normalizeAddress(billingValue);
    const key = addressContentKey(normalized);
    const currentSaved = profile?.savedAddresses ?? [];
    const alreadySaved = currentSaved.some((a: any) => addressContentKey(a) === key);
    const savedAddresses = alreadySaved ? currentSaved : [...currentSaved, normalized];
    try {
      await updateProfile.mutateAsync({ defaultBillingAddress: normalized, savedAddresses });
      setSelectedSavedBilling(key);
      setOpenBillingId(key);
      setShowBillingForm(false);
      toast({
        variant: 'success',
        title: 'Saved',
        description: 'Billing address saved to your account.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: 'Failed to save billing address.',
      });
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (!items.length) {
      return;
    }

    const billingSource =
      billingSameAsShipping || !data.billingAddress ? data.shippingAddress : data.billingAddress;
    const payload = {
      items: items.map((item) => ({ variantId: item.id, quantity: item.quantity })),
      shippingAddress: normalizeAddress(data.shippingAddress),
      billingAddress: normalizeAddress(billingSource as CheckoutFormData['shippingAddress']),
      shippingMethodId: data.shippingMethodId,
      guestEmail: data.guestEmail || currentUser?.email || '',
      regionCode: DEFAULT_REGION_CODE,
    };

    let didRedirect = false;
    try {
      setIsSubmitting(true);
      if (!isGuest) {
        const token = getAuthToken();
        if (!token) {
          throw new Error('Not authenticated');
        }
      }

      if (profile) {
        const nextPhone = `${data.shippingAddress.phoneCountryCode}${data.shippingAddress.phoneNumber}`;
        const updatePayload: Partial<Pick<typeof profile, 'firstName' | 'lastName' | 'phone'>> = {};
        if (!profile.firstName && data.shippingAddress.firstName) {
          updatePayload.firstName = data.shippingAddress.firstName;
        }
        if (!profile.lastName && data.shippingAddress.lastName) {
          updatePayload.lastName = data.shippingAddress.lastName;
        }
        if (!profile.phone && nextPhone) {
          updatePayload.phone = nextPhone;
        }
        if (Object.keys(updatePayload).length > 0) {
          try {
            await updateProfile.mutateAsync(updatePayload);
          } catch {
            // Ignore profile update errors so checkout can continue
          }
        }
      }

      const customerEmail = payload.guestEmail || currentUser?.email || '';
      const payloadForStorage = {
        ...payload,
        isGuest,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('checkoutPayload', JSON.stringify(payloadForStorage));
        localStorage.setItem('checkoutEmail', customerEmail);
        localStorage.removeItem('checkoutOrderId');
      }

      const emailQuery = customerEmail ? `?email=${encodeURIComponent(customerEmail)}` : '';
      router.push(`/checkout/payment${emailQuery}`);
      didRedirect = true;
      toast({
        variant: 'success',
        title: t(translationKeys.checkout.successTitle, 'Continue to payment'),
        description: t(translationKeys.checkout.successDescription, 'Redirecting you to payment.'),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: error.message || t(translationKeys.common.failed, 'Failed'),
      });
    } finally {
      if (!didRedirect) {
        setIsSubmitting(false);
      }
    }
  };

  const onInvalid = () => {
    toast({
      variant: 'destructive',
      title: t(translationKeys.common.validationError, 'Validation Error'),
      description: t(translationKeys.common.fillRequired, 'Please fill in all required fields'),
    });
  };

  if (!items.length) {
    return (
      <div className="container py-16">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>{t(translationKeys.checkout.emptyTitle, 'Your cart is empty')}</CardTitle>
            <CardDescription>{t(translationKeys.checkout.emptyDescription, 'Add items to your cart to proceed to checkout.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/products')}>{t(translationKeys.checkout.backToShop, 'Back to shop')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t(translationKeys.checkout.title, 'Checkout')}</h1>
        <p className="text-muted-foreground mt-2">
          {t(translationKeys.checkout.description, 'Provide your details to complete the order.')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t(translationKeys.checkout.contactTitle, 'Contact information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isGuest && (
                <div className="space-y-2">
                  <Label htmlFor="guestEmail">{t(translationKeys.checkout.email, 'Email')}</Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    placeholder={t(translationKeys.checkout.emailPlaceholder, 'you@example.com')}
                    {...register('guestEmail')}
                    className={errors.guestEmail?.message ? 'border-destructive' : undefined}
                  />
                  {errors.guestEmail?.message && (
                    <p className="text-sm text-destructive">{errors.guestEmail.message}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-6 pt-6">
              {!isGuest && savedShippingAddresses.length > 0 && !showShippingForm && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-base">{t(translationKeys.checkout.shippingAddress, 'Shipping address')}</Label>
                    <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
                      <p className="font-medium text-foreground mb-1">
                        {t(translationKeys.checkout.chooseSavedAddress, 'Choose a saved address')}
                      </p>
                      <p className="text-muted-foreground">
                        {t(translationKeys.checkout.savedAddressInstruction, 'Click a saved address to open it. Then choose Select to use it for this order, Edit to change it, or Delete to remove it. You can also add a new address below.')}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {savedShippingAddresses.map((entry) => {
                      const isOpen = openShippingId === entry.id;
                      const isSelected = selectedSavedShipping === entry.id;
                      return (
                        <div
                          key={entry.id}
                          className={`rounded-xl border-2 transition ${
                            isOpen ? 'border-primary/50 bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setOpenShippingId(isOpen ? null : entry.id)}
                            className="w-full px-5 py-4 text-left flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-base font-medium text-foreground">
                                  {formatAddressSummary(entry.address)}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {entry.address.country || DEFAULT_REGION_CODE}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              {isSelected && (
                                <span className="inline-flex items-center gap-1 text-primary font-medium">
                                  <Check className="h-4 w-4" />
                                  {t(translationKeys.checkout.selectedAddress, 'Selected')}
                                </span>
                              )}
                              <ChevronDown
                                className={`h-5 w-5 transition-transform ${
                                  isOpen ? 'rotate-180 text-primary' : 'text-muted-foreground'
                                }`}
                              />
                            </div>
                          </button>
                          {isOpen && (
                            <div className="border-t border-border px-5 py-4 space-y-4 text-sm">
                              <div className="grid gap-1 text-muted-foreground">
                                <p>{formatAddressLabel(entry.address)}</p>
                                {entry.address.phone && <p>Phone: {entry.address.phone}</p>}
                              </div>
                              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                <Button
                                  type="button"
                                  variant={isSelected ? 'secondary' : 'default'}
                                  onClick={() => {
                                    setSelectedSavedShipping(entry.id);
                                    applyAddress(entry.address, 'shippingAddress');
                                  }}
                                >
                                  {isSelected
                                    ? t(translationKeys.checkout.selectedAddress, 'Selected')
                                    : t(translationKeys.checkout.useThisAddress, 'Use this address')}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedSavedShipping(entry.id);
                                    setShowShippingForm(true);
                                    applyAddress(entry.address, 'shippingAddress');
                                  }}
                                >
                                  {t(translationKeys.checkout.editInForm, 'Edit')}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteAddress(entry, 'shipping')}
                                  disabled={updateProfile.isPending}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  {t(translationKeys.profile.deleteAddress, 'Delete')}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full py-3 text-base"
                    onClick={() => {
                      setShowShippingForm(true);
                      setSelectedSavedShipping('');
                    }}
                  >
                    {t(translationKeys.checkout.addNewAddress, 'Add new address')}
                  </Button>
                </div>
              )}
              {(isGuest || savedShippingAddresses.length === 0 || showShippingForm) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t(translationKeys.checkout.shippingAddress, 'Shipping address')}</Label>
                    {!isGuest && savedShippingAddresses.length > 0 && showShippingForm && (
                      <button
                        type="button"
                        onClick={() => setShowShippingForm(false)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {t(translationKeys.checkout.chooseSavedAddress, 'Choose a saved address')}
                      </button>
                    )}
                  </div>
                  <AddressForm
                    title={t(translationKeys.checkout.shippingAddress, 'Shipping address')}
                    prefix="shippingAddress"
                    register={register}
                    errors={errors}
                    countryLabel={countryLabel}
                  />
                  {!isGuest && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleSaveDefaultShipping}
                      disabled={updateProfile.isPending}
                      className="w-full sm:w-auto"
                    >
                      {updateProfile.isPending
                        ? t(translationKeys.checkout.savingAddress, 'Saving...')
                        : t(translationKeys.checkout.saveAddressToAccount, 'Save address to account')}
                    </Button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  id="billingSameAsShipping"
                  type="checkbox"
                  checked={billingSameAsShipping}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setBillingSameAsShipping(checked);
                    setValue('billingSameAsShipping', checked);
                    setValue('billingAddress', checked ? undefined : ({ ...shippingAddress } as CheckoutFormData['billingAddress']));
                  }}
                  className="h-4 w-4"
                />
                <Label htmlFor="billingSameAsShipping">
                  {t(translationKeys.checkout.billingSameAsShipping, 'Billing address is the same as shipping')}
                </Label>
              </div>

              {!billingSameAsShipping && (
                <>
                  {!isGuest && savedBillingAddresses.length > 0 && !showBillingForm && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base">{t(translationKeys.checkout.billingAddress, 'Billing address')}</Label>
                        <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
                          <p className="font-medium text-foreground mb-1">
                            {t(translationKeys.checkout.chooseSavedAddress, 'Choose a saved address')}
                          </p>
                          <p className="text-muted-foreground">
                            {t(translationKeys.checkout.savedAddressInstruction, 'Click a saved address to open it. Then choose Select to use it for this order, Edit to change it, or Delete to remove it. You can also add a new address below.')}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {savedBillingAddresses.map((entry) => {
                          const isOpen = openBillingId === entry.id;
                          const isSelected = selectedSavedBilling === entry.id;
                          return (
                            <div
                              key={entry.id}
                              className={`rounded-xl border-2 transition ${
                                isOpen ? 'border-primary/50 bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setOpenBillingId(isOpen ? null : entry.id)}
                                className="w-full px-5 py-4 text-left flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-medium text-foreground">
                                      {formatAddressSummary(entry.address)}
                                    </p>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {entry.address.country || DEFAULT_REGION_CODE}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  {isSelected && (
                                    <span className="inline-flex items-center gap-1 text-primary font-medium">
                                      <Check className="h-4 w-4" />
                                      {t(translationKeys.checkout.selectedAddress, 'Selected')}
                                    </span>
                                  )}
                                  <ChevronDown
                                    className={`h-5 w-5 transition-transform ${
                                      isOpen ? 'rotate-180 text-primary' : 'text-muted-foreground'
                                    }`}
                                  />
                                </div>
                              </button>
                              {isOpen && (
                                <div className="border-t border-border px-5 py-4 space-y-4 text-sm">
                                  <div className="grid gap-1 text-muted-foreground">
                                    <p>{formatAddressLabel(entry.address)}</p>
                                    {entry.address.phone && <p>Phone: {entry.address.phone}</p>}
                                  </div>
                                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                    <Button
                                      type="button"
                                      variant={isSelected ? 'secondary' : 'default'}
                                      onClick={() => {
                                        setSelectedSavedBilling(entry.id);
                                        applyAddress(entry.address, 'billingAddress');
                                      }}
                                    >
                                      {isSelected
                                        ? t(translationKeys.checkout.selectedAddress, 'Selected')
                                        : t(translationKeys.checkout.useThisAddress, 'Use this address')}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedSavedBilling(entry.id);
                                        setShowBillingForm(true);
                                        applyAddress(entry.address, 'billingAddress');
                                      }}
                                    >
                                      {t(translationKeys.checkout.editInForm, 'Edit')}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteAddress(entry, 'billing')}
                                      disabled={updateProfile.isPending}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      {t(translationKeys.profile.deleteAddress, 'Delete')}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full py-3 text-base"
                        onClick={() => {
                          setShowBillingForm(true);
                          setSelectedSavedBilling('');
                        }}
                      >
                        {t(translationKeys.checkout.addNewAddress, 'Add new address')}
                      </Button>
                    </div>
                  )}
                  {(isGuest || savedBillingAddresses.length === 0 || showBillingForm) && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>{t(translationKeys.checkout.billingAddress, 'Billing address')}</Label>
                        {!isGuest && savedBillingAddresses.length > 0 && showBillingForm && (
                          <button
                            type="button"
                            onClick={() => setShowBillingForm(false)}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {t(translationKeys.checkout.chooseSavedAddress, 'Choose a saved address')}
                          </button>
                        )}
                      </div>
                      <AddressForm
                        title={t(translationKeys.checkout.billingAddress, 'Billing address')}
                        prefix="billingAddress"
                        register={register}
                        errors={errors}
                        countryLabel={countryLabel}
                      />
                      {!isGuest && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleSaveDefaultBilling}
                          disabled={updateProfile.isPending}
                          className="w-full sm:w-auto"
                        >
                          {updateProfile.isPending
                          ? t(translationKeys.checkout.savingAddress, 'Saving...')
                          : t(translationKeys.checkout.saveAddressToAccount, 'Save address to account')}
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t(translationKeys.checkout.shippingMethod, 'Shipping method')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input type="hidden" {...register('shippingMethodId')} />
              <ShippingMethodSelector
                options={shippingOptions}
                value={shippingMethodId}
                onChange={(value) => setValue('shippingMethodId', value)}
                loading={shippingOptionsLoading}
                emptyMessage={
                  t(translationKeys.checkout.noShippingOptions, 'No shipping options available')
                }
              />
              {errors.shippingMethodId?.message && (
                <p className="text-sm text-destructive">{errors.shippingMethodId.message}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <OrderSummary items={items} subtotal={subtotal} shipping={shippingCost} total={total} />
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? t(translationKeys.checkout.placingOrder, 'Placing order...')
                : t(translationKeys.checkout.placeOrder, 'Place order')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
