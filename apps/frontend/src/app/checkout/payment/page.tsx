'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiService, confirmPaymentSuccess, createPaymentIntent } from '@/lib/api/client';
import { useCartStore } from '@/lib/store/cart-store';
import { formatPrice } from '@/lib/utils';
import { isAuthenticated } from '@/lib/auth';
import { useT } from '@/lib/utils/translations';
import { translationKeys } from '@/lib/utils/translations';
import { useLanguage } from '@/lib/contexts/language-context';

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

function PaymentForm({ orderId, email }: { orderId: string; email: string }) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { clearCart } = useCartStore();
  const t = useT();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const isLoggedIn = isAuthenticated();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/payment?orderId=${orderId}&email=${encodeURIComponent(email)}`,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.checkout.paymentFailedTitle, 'Payment failed'),
        description: error.message || t(translationKeys.common.tryAgain, 'Please try again.'),
      });
      setIsSubmitting(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      try {
        await confirmPaymentSuccess(orderId);
      } catch {
        // Webhook may have already run; non-fatal
      }
      await clearCart();
      setIsSuccess(true);
      toast({
        variant: 'success',
        title: t(translationKeys.checkout.paymentConfirmedTitle, 'Payment confirmed'),
        description: t(translationKeys.checkout.paymentConfirmedDescription, 'Your order has been placed successfully.'),
      });
    }
    setIsSubmitting(false);
  };

  if (isSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.checkout.paymentSuccessTitle, 'Order placed')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t(translationKeys.checkout.paymentSuccessDescription, 'Payment confirmed. Thank you for your order.')}</p>
          {isLoggedIn ? (
            <Button onClick={() => router.push('/user/profile')}>{t(translationKeys.common.viewMyOrders, 'View my orders')}</Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t(translationKeys.checkout.createAccountPrompt, 'Create an account to save your details and track orders faster next time.')}
              </p>
              <Button asChild>
                <Link href={`/auth/register?email=${encodeURIComponent(email)}`}>{t(translationKeys.common.createAccount, 'Create account')}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={isSubmitting || !stripe || !elements} className="w-full">
        {isSubmitting ? t(translationKeys.checkout.paymentProcessing, 'Processing...') : t(translationKeys.checkout.paymentPayNow, 'Pay now')}
      </Button>
    </form>
  );
}

const STRIPE_LOCALES = ['en', 'ru', 'de', 'es', 'fr', 'it', 'ja', 'nl', 'pl', 'pt', 'sv', 'zh'] as const;

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentLanguage } = useLanguage();
  const stripeLocale = STRIPE_LOCALES.includes(currentLanguage as any) ? currentLanguage : 'en';
  const t = useT();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [orderId, setOrderId] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [isPreparing, setIsPreparing] = useState(true);
  const [prepError, setPrepError] = useState<string | null>(null);
  const creatingOrderRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const prepareOrder = async () => {
      if (typeof window === 'undefined') {
        return;
      }
      setIsPreparing(true);
      setPrepError(null);
      try {
        const searchOrderId = searchParams.get('orderId') || '';
        const searchEmail = searchParams.get('email') || '';
        const storedOrderId = localStorage.getItem('checkoutOrderId') || '';
        const storedEmail = localStorage.getItem('checkoutEmail') || '';

        if (searchOrderId && searchEmail) {
          localStorage.setItem('checkoutOrderId', searchOrderId);
          localStorage.setItem('checkoutEmail', searchEmail);
          if (!isMounted) return;
          setOrderId(searchOrderId);
          setEmail(searchEmail);
          setIsPreparing(false);
          return;
        }

        if (storedOrderId && storedEmail) {
          if (!isMounted) return;
          setOrderId(storedOrderId);
          setEmail(storedEmail);
          setIsPreparing(false);
          return;
        }

        const payloadRaw = localStorage.getItem('checkoutPayload');
        if (!payloadRaw) {
          throw new Error('Checkout details are missing. Please return to checkout.');
        }
        const payload = JSON.parse(payloadRaw);
        const customerEmail = payload.guestEmail || searchEmail || storedEmail || '';
        if (!customerEmail) {
          throw new Error('Email is missing. Please return to checkout.');
        }

        if (creatingOrderRef.current) {
          return;
        }
        creatingOrderRef.current = true;

        let createdOrder: { id: string };
        if (payload.isGuest) {
          createdOrder = await apiService.post<{ id: string }>('/checkout', {
            items: payload.items,
            shippingAddress: payload.shippingAddress,
            billingAddress: payload.billingAddress,
            guestEmail: payload.guestEmail,
            shippingMethodId: payload.shippingMethodId,
            regionCode: payload.regionCode,
          });
        } else {
          createdOrder = await apiService.post<{ id: string }>('/orders', {
            items: payload.items,
            shippingAddress: payload.shippingAddress,
            billingAddress: payload.billingAddress,
            shippingMethodId: payload.shippingMethodId,
            regionCode: payload.regionCode,
          });
        }

        creatingOrderRef.current = false;
        localStorage.setItem('checkoutOrderId', createdOrder.id);
        localStorage.setItem('checkoutEmail', customerEmail);

        if (!isMounted) return;
        setOrderId(createdOrder.id);
        setEmail(customerEmail);
        setIsPreparing(false);
      } catch (error: any) {
        creatingOrderRef.current = false;
        if (!isMounted) return;
        setPrepError(error.message || 'Failed to prepare payment.');
        setIsPreparing(false);
      }
    };

    prepareOrder();
    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!orderId || !email || isPreparing || prepError) {
      return;
    }
    let isMounted = true;
    createPaymentIntent({ orderId, email })
      .then((response) => {
        if (!isMounted) return;
        setClientSecret(response.clientSecret);
        setOrder(response.order);
      })
      .catch((error: any) => {
        if (!isMounted) return;
        toast({
          variant: 'destructive',
          title: t(translationKeys.checkout.paymentSetupFailedTitle, 'Payment setup failed'),
          description: error.message || t(translationKeys.common.tryAgain, 'Please refresh and try again.'),
        });
      });

    return () => {
      isMounted = false;
    };
  }, [orderId, email, isPreparing, prepError, toast]);

  const appearance = useMemo(
    () => ({
      theme: 'stripe' as const,
    }),
    [],
  );

  if (isPreparing) {
    return (
      <div className="container py-16">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>{t(translationKeys.checkout.paymentPreparing, 'Preparing payment')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t(translationKeys.checkout.paymentPreparingDescription, 'Setting up your order. Please wait...')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (prepError || !orderId || !email) {
    return (
      <div className="container py-16">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>{t(translationKeys.checkout.paymentMissingInfoTitle, 'Missing payment information')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{prepError || t(translationKeys.checkout.paymentMissingInfoDescription, 'Order ID or email is missing.')}</p>
            <div className="mt-4">
              <Button onClick={() => router.push('/checkout')}>{t(translationKeys.common.backToCheckout, 'Back to checkout')}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
<CardHeader>
        <CardTitle>{t(translationKeys.checkout.paymentTitle, 'Payment')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!stripePromise ? (
            <p className="text-sm text-muted-foreground">
              Stripe publishable key is missing. Please configure `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
            </p>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance, locale: stripeLocale }}>
              <PaymentForm orderId={orderId} email={email} />
            </Elements>
          ) : (
            <p className="text-sm text-muted-foreground">{t(translationKeys.checkout.paymentPreparing, 'Preparing payment...')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.checkout.orderSummary, 'Order summary')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {order ? (
            <>
              <div className="flex justify-between">
                <span>{t(translationKeys.checkout.subtotal, 'Subtotal')}</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t(translationKeys.checkout.shipping, 'Shipping')}</span>
                <span>{formatPrice(order.shipping)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>{t(translationKeys.checkout.total, 'Total')}</span>
                <span>{formatPrice(order.total)}</span>
              </div>
              <div className="pt-3 border-t space-y-2">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="truncate">
                      {item.productVariant.product.name}
                      {item.productVariant.name ? ` - ${item.productVariant.name}` : ''}
                    </span>
                    <span>x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p>{t(translationKeys.profile.orderDetails.loading, 'Loading order...')}</p>
          )}
        </CardContent>
      </Card>
      {!isAuthenticated() && (
        <Card>
          <CardHeader>
            <CardTitle>{t(translationKeys.common.saveYourDetails, 'Save your details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t(translationKeys.checkout.createAccountPrompt, 'Create an account after payment to reuse your shipping details and track orders.')}</p>
            <Button asChild>
              <Link href={`/auth/register?email=${encodeURIComponent(email)}`}>{t(translationKeys.common.createAccount, 'Create account')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
