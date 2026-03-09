'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/form-field';
import { firebaseAuth } from '@/lib/firebase';
import { useState } from 'react';
import { useT, translationKeys } from '@/lib/utils/translations';
import { emailSchema } from '@/lib/validation';

type ForgotPasswordFormData = {
  email: string;
};

export default function ForgotPasswordPage() {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const schema = yup.object({
    email: emailSchema(
      t(translationKeys.validation.emailInvalid, 'Please provide a valid email address'),
      t(translationKeys.validation.emailTooLong, 'Email is too long'),
    ).required(t(translationKeys.validation.emailRequired, 'Email is required')),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    if (!firebaseAuth.isConfigured()) {
      setError(t(translationKeys.auth.forgotPasswordFailed, 'Password reset is not available. Please contact support.'));
      return;
    }
    setIsLoading(true);
    setError(null);
    setSent(false);

    const result = await firebaseAuth.sendPasswordResetEmail(data.email.trim());

    if (result.success) {
      setSent(true);
    } else {
      // For auth/user-not-found we show the same success screen (don't leak account existence)
      const isUserNotFound = result.code === 'auth/user-not-found';
      if (isUserNotFound) {
        setSent(true);
      } else {
        setError(result.message || t(translationKeys.auth.forgotPasswordFailed, 'Failed to send reset email. Please try again.'));
      }
    }
    setIsLoading(false);
  };

  if (sent) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t(translationKeys.auth.resetLinkSent, 'Check your email')}</CardTitle>
            <CardDescription>
              {t(translationKeys.auth.resetLinkSentDescription, "If an account exists for that email, we've sent a password reset link.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/login">{t(translationKeys.auth.backToLogin, 'Back to login')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t(translationKeys.auth.forgotPasswordTitle, 'Reset password')}</CardTitle>
          <CardDescription>
            {t(translationKeys.auth.forgotPasswordDescription, "Enter your email and we'll send you a link to reset your password.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t(translationKeys.auth.sendingResetLink, 'Sending...') : t(translationKeys.auth.sendResetLink, 'Send reset link')}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <Link href="/auth/login" className="text-foreground hover:underline">
                {t(translationKeys.auth.backToLogin, 'Back to login')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
