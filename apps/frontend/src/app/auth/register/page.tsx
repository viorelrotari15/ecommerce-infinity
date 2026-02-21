'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/form-field';
import { fetchAPI } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notifyAuthStateChanged } from '@/lib/auth';
import { useT, translationKeys } from '@/lib/utils/translations';
import {
  emailSchema,
  passwordRegisterSchema,
  safeStringSchema,
  VALIDATION,
} from '@/lib/validation';
import dynamic from 'next/dynamic';

const SocialLoginButtons = dynamic(
  () => import('@/components/auth/social-login-buttons').then((m) => ({ default: m.SocialLoginButtons })),
  { ssr: false },
);

function createRegisterSchema(t: (key: string, fallback?: string) => string) {
  return yup.object({
    email: emailSchema(
      t(translationKeys.validation.emailInvalid, 'Please provide a valid email address'),
      t(translationKeys.validation.emailTooLong, 'Email is too long'),
    ).required(t(translationKeys.validation.emailRequired, 'Email is required')),
    password: passwordRegisterSchema(
      t(translationKeys.validation.passwordMinLength, 'Password must be at least 8 characters'),
      t(translationKeys.validation.passwordMaxLength, 'Password must not exceed 128 characters'),
      t(translationKeys.validation.passwordInvalidChars, 'Password must not contain < or >'),
      t(translationKeys.validation.passwordNeedsLetter, 'Password must contain at least one letter'),
      t(translationKeys.validation.passwordNeedsNumber, 'Password must contain at least one number'),
    ).required(t(translationKeys.validation.passwordRequired, 'Password is required')),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password')], t(translationKeys.validation.confirmPasswordMatch, 'Passwords must match'))
      .required(t(translationKeys.validation.confirmPasswordRequired, 'Please confirm your password')),
    firstName: safeStringSchema(
      VALIDATION.NAME_MAX_LENGTH,
      t(translationKeys.validation.valueTooLong, 'Value is too long'),
      t(translationKeys.validation.invalidCharacters, 'Invalid characters (no < > or quotes)'),
    ).optional(),
    lastName: safeStringSchema(
      VALIDATION.NAME_MAX_LENGTH,
      t(translationKeys.validation.valueTooLong, 'Value is too long'),
      t(translationKeys.validation.invalidCharacters, 'Invalid characters (no < > or quotes)'),
    ).optional(),
  });
}

type RegisterFormData = yup.InferType<ReturnType<typeof createRegisterSchema>>;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const defaultEmail = searchParams.get('email') || '';
  const defaultFirstName = searchParams.get('firstName') || '';
  const defaultLastName = searchParams.get('lastName') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(createRegisterSchema(t)),
    defaultValues: {
      email: defaultEmail,
      firstName: defaultFirstName,
      lastName: defaultLastName,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { confirmPassword, ...registerData } = data;
      const response = await fetchAPI<{
        access_token: string;
        user: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          role: string;
        };
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerData),
      });

      // Store token in localStorage
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Invalidate all queries to refetch data
      queryClient.invalidateQueries();

      // Notify header to show logged-in state without page refresh
      notifyAuthStateChanged();

      // Redirect to home (new users are always regular users)
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || t(translationKeys.auth.registerFailed, 'Registration failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t(translationKeys.auth.createAccountTitle, 'Create Account')}</CardTitle>
          <CardDescription>{t(translationKeys.auth.signUpDescription, 'Sign up to get started')}</CardDescription>
        </CardHeader>
        <CardContent>
          <SocialLoginButtons />
          <p className="mt-4 mb-3 text-sm font-medium text-muted-foreground">
            {t(translationKeys.auth.registerWithEmailPassword, 'Create account with email and password')}
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={t(translationKeys.auth.firstName, 'First Name')}
                name="firstName"
                type="text"
                placeholder="John"
                error={errors.firstName?.message}
                register={register}
              />

              <FormField
                label={t(translationKeys.auth.lastName, 'Last Name')}
                name="lastName"
                type="text"
                placeholder="Doe"
                error={errors.lastName?.message}
                register={register}
              />
            </div>

            <FormField
              label={t(translationKeys.auth.password, 'Password')}
              name="password"
              type="password"
              placeholder={t(translationKeys.auth.passwordPlaceholder, '••••••••')}
              error={errors.password?.message}
              register={register}
              required
            />

            <FormField
              label={t(translationKeys.auth.confirmPassword, 'Confirm Password')}
              name="confirmPassword"
              type="password"
              placeholder={t(translationKeys.auth.passwordPlaceholder, '••••••••')}
              error={errors.confirmPassword?.message}
              register={register}
              required
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t(translationKeys.auth.creatingAccount, 'Creating account...') : t(translationKeys.auth.register, 'Register')}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {t(translationKeys.auth.alreadyHaveAccount, 'Already have an account?')}{' '}
              <Link href="/auth/login" className="text-foreground hover:underline">
                {t(translationKeys.auth.login, 'Login')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
