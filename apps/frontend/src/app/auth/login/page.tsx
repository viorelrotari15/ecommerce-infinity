'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/form-field';
import { fetchAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '@/lib/store/cart-store';
import { getCart, updateCart as updateCartAPI } from '@/lib/api/client';
import { notifyAuthStateChanged } from '@/lib/auth';
import { useT, translationKeys } from '@/lib/utils/translations';
import { emailSchema, passwordLoginSchema } from '@/lib/validation';
import dynamic from 'next/dynamic';

const SocialLoginButtons = dynamic(
  () => import('@/components/auth/social-login-buttons').then((m) => ({ default: m.SocialLoginButtons })),
  { ssr: false },
);

type LoginFormData = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useT();
  const { mergeWithLocal } = useCartStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loginSchema = yup.object({
    email: emailSchema(
      t(translationKeys.validation.emailInvalid, 'Please provide a valid email address'),
      t(translationKeys.validation.emailTooLong, 'Email is too long'),
    ).required(t(translationKeys.validation.emailRequired, 'Email is required')),
    password: passwordLoginSchema(
      t(translationKeys.validation.passwordMinLength, 'Password must be at least 8 characters'),
      t(translationKeys.validation.passwordMaxLength, 'Password must not exceed 128 characters'),
      t(translationKeys.validation.passwordInvalidChars, 'Password must not contain < or >'),
    ).required(t(translationKeys.validation.passwordRequired, 'Password is required')),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchAPI<{
        access_token: string;
        user: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          role: string;
        };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      // Store token in localStorage
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Merge local cart with server cart
      try {
        const serverCart = await getCart();
        mergeWithLocal(serverCart.items);
        // Get merged items and sync back to server
        const mergedItems = useCartStore.getState().items;
        if (mergedItems.length > 0) {
          await updateCartAPI(
            mergedItems.map((item) => ({
              variantId: item.id,
              quantity: item.quantity,
            }))
          );
        }
      } catch (cartError) {
        console.error('Failed to merge cart:', cartError);
        // Continue with login even if cart merge fails
      }

      // Invalidate all queries to refetch data
      queryClient.invalidateQueries();

      // Notify header to show logged-in state without page refresh
      notifyAuthStateChanged();

      // Redirect based on role
      if (response.user.role === 'ADMIN' || response.user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || t(translationKeys.auth.loginFailed, 'Login failed. Please check your credentials.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t(translationKeys.auth.loginTitle, 'Login')}</CardTitle>
          <CardDescription>{t(translationKeys.auth.loginDescription, 'Enter your credentials to access your account')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            {t(translationKeys.auth.loginWithEmailPassword, 'Login with email and password')}
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <FormField
              label={t(translationKeys.auth.email, 'Email')}
              name="email"
              type="email"
              placeholder={t(translationKeys.auth.emailPlaceholder, 'you@example.com')}
              error={errors.email?.message}
              register={register}
              required
            />

            <FormField
              label={t(translationKeys.auth.password, 'Password')}
              name="password"
              type="password"
              placeholder={t(translationKeys.auth.passwordPlaceholder, '••••••••')}
              error={errors.password?.message}
              register={register}
              required
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t(translationKeys.auth.loggingIn, 'Logging in...') : t(translationKeys.auth.login, 'Login')}
            </Button>

            <SocialLoginButtons />

            <div className="text-center text-sm text-muted-foreground">
              {t(translationKeys.auth.dontHaveAccount, "Don't have an account?")}{' '}
              <Link href="/auth/register" className="text-foreground hover:underline">
                {t(translationKeys.auth.register, 'Register')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
