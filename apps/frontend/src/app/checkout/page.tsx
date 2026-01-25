'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/lib/store/cart-store';
import { useCreateGuestCheckout } from '@/lib/hooks/use-checkout';
import { AddressForm } from '@/components/checkout/address-form';
import { ShippingMethodSelector } from '@/components/checkout/shipping-method-selector';
import { OrderSummary } from '@/components/checkout/order-summary';
import { getAuthToken, getCurrentUser, isAuthenticated } from '@/lib/auth';
import { apiService, listShippingOptions, ShippingOption } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useT, translationKeys } from '@/lib/utils/translations';
import { DEFAULT_REGION_CODE } from '@/lib/config';
import { getDialCodeByIso2 } from '@/lib/phone-countries';

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
  const { items, getTotalPrice, clearCart } = useCartStore();
  const isGuest = !isAuthenticated();
  const currentUser = getCurrentUser();
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [orderConfirmation, setOrderConfirmation] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const shippingMethodId = watch('shippingMethodId');
  const subtotal = getTotalPrice();

  const createGuest = useCreateGuestCheckout();
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingOptionsLoading, setShippingOptionsLoading] = useState(false);

  useEffect(() => {
    if (!billingSameAsShipping) {
      return;
    }
    setValue('billingAddress', undefined);
  }, [billingSameAsShipping, shippingAddress, setValue]);

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

  const onSubmit = async (data: CheckoutFormData) => {
    if (!items.length) {
      return;
    }

    const payload = {
      items: items.map((item) => ({ variantId: item.id, quantity: item.quantity })),
      shippingAddress: normalizeAddress(data.shippingAddress),
      billingAddress: normalizeAddress(
        billingSameAsShipping ? data.shippingAddress : data.billingAddress,
      ),
      shippingMethodId: data.shippingMethodId,
      guestEmail: data.guestEmail || currentUser?.email || '',
      regionCode: DEFAULT_REGION_CODE,
    };

    try {
      setIsSubmitting(true);
      let order;
      if (isGuest) {
        order = await createGuest.mutateAsync(payload);
      } else {
        const token = getAuthToken();
        if (!token) {
          throw new Error('Not authenticated');
        }
        order = await apiService.post('/orders', {
          items: payload.items,
          shippingAddress: payload.shippingAddress,
          billingAddress: payload.billingAddress,
          shippingMethodId: payload.shippingMethodId,
          regionCode: payload.regionCode,
        });
      }

      await clearCart();
      setOrderConfirmation(order);
      toast({
        variant: 'success',
        title: t(translationKeys.checkout.successTitle, 'Order placed'),
        description: t(translationKeys.checkout.successDescription, 'Your order has been created successfully.'),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: error.message || t(translationKeys.common.failed, 'Failed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = () => {
    toast({
      variant: 'destructive',
      title: t(translationKeys.common.validationError, 'Validation Error'),
      description: t(translationKeys.common.fillRequired, 'Please fill in all required fields'),
    });
  };

  if (!items.length && !orderConfirmation) {
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

  if (orderConfirmation) {
    return (
      <div className="container py-16">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>{t(translationKeys.checkout.successTitle, 'Order placed')}</CardTitle>
            <CardDescription>{t(translationKeys.checkout.successDescription, 'Your order has been created successfully.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t(translationKeys.checkout.orderId, 'Order ID')}: {orderConfirmation.id}
            </p>
            <Button onClick={() => router.push('/products')}>
              {t(translationKeys.checkout.backToShop, 'Back to shop')}
            </Button>
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
              <AddressForm
                title={t(translationKeys.checkout.shippingAddress, 'Shipping address')}
                prefix="shippingAddress"
                register={register}
                errors={errors}
                countryLabel={countryLabel}
              />

              <div className="flex items-center gap-2">
                <input
                  id="billingSameAsShipping"
                  type="checkbox"
                  checked={billingSameAsShipping}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setBillingSameAsShipping(checked);
                    setValue('billingSameAsShipping', checked);
                    setValue('billingAddress', checked ? undefined : { ...shippingAddress });
                  }}
                  className="h-4 w-4"
                />
                <Label htmlFor="billingSameAsShipping">
                  {t(translationKeys.checkout.billingSameAsShipping, 'Billing address is the same as shipping')}
                </Label>
              </div>

              {!billingSameAsShipping && (
                <AddressForm
                  title={t(translationKeys.checkout.billingAddress, 'Billing address')}
                  prefix="billingAddress"
                  register={register}
                  errors={errors}
                  countryLabel={countryLabel}
                />
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

        <div className="lg:col-span-1 space-y-4">
          <OrderSummary items={items} subtotal={subtotal} shipping={shippingCost} total={total} />
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? t(translationKeys.checkout.placingOrder, 'Placing order...')
              : t(translationKeys.checkout.placeOrder, 'Place order')}
          </Button>
        </div>
      </form>
    </div>
  );
}
