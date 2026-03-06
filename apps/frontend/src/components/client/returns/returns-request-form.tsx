'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { fetchAPI, APIError } from '@/lib/api';
import { useLanguage } from '@/lib/contexts/language-context';
import { useT, translationKeys } from '@/lib/utils/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const REQUEST_TYPES = ['Withdrawal', 'Return', 'Cancellation'] as const;

function createSchema(t: (key: string, fallback?: string) => string) {
  return yup.object({
    orderNumber: yup
      .string()
      .trim()
      .required(t(translationKeys.validation.fieldRequired, 'This field is required'))
      .max(100),
    fullName: yup
      .string()
      .trim()
      .required(t(translationKeys.validation.fieldRequired, 'This field is required'))
      .max(200),
    email: yup
      .string()
      .trim()
      .email(t(translationKeys.validation.emailInvalid, 'Please provide a valid email address'))
      .required(t(translationKeys.validation.emailRequired, 'Email is required'))
      .max(255),
    deliveryAddress: yup
      .string()
      .trim()
      .required(t(translationKeys.validation.fieldRequired, 'This field is required'))
      .max(500),
    requestType: yup
      .string()
      .trim()
      .required(t(translationKeys.validation.fieldRequired, 'This field is required'))
      .oneOf(REQUEST_TYPES, t(translationKeys.validation.fieldRequired, 'This field is required')),
    reason: yup.string().trim().max(2000).optional(),
  });
}

type FormData = yup.InferType<ReturnType<typeof createSchema>>;

export function ReturnsRequestForm() {
  const t = useT();
  const { currentLanguage } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: yupResolver(createSchema(t)),
    defaultValues: {
      orderNumber: '',
      fullName: '',
      email: '',
      deliveryAddress: '',
      requestType: 'Withdrawal',
      reason: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    try {
      await fetchAPI<{ message: string }>('/contact/withdrawal-return', {
        method: 'POST',
        body: JSON.stringify({
          orderNumber: data.orderNumber,
          fullName: data.fullName,
          email: data.email,
          deliveryAddress: data.deliveryAddress,
          requestType: data.requestType,
          reason: data.reason || '',
          language: currentLanguage || undefined,
        }),
      });
      setSuccess(true);
    } catch (err) {
      const message =
        err instanceof APIError
          ? err.message
          : t(translationKeys.returns.formError, 'Failed to send. Please try again or contact us by e-mail.');
      setSubmitError(message);
    }
  };

  if (success) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
        {t(translationKeys.returns.formSuccess, 'Your request has been sent. We will contact you shortly.')}
      </div>
    );
  }

  const formTitle = t(translationKeys.returns.formTitle, 'Request withdrawal, return or cancellation');

  return (
    <div className="rounded-md border border-border bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-base font-semibold text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset transition-colors"
        aria-expanded={expanded}
        aria-controls="returns-request-form-content"
        id="returns-request-form-toggle"
      >
        <span>{formTitle}</span>
        {expanded ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </button>
      <div
        id="returns-request-form-content"
        role="region"
        aria-labelledby="returns-request-form-toggle"
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pt-0">
            {submitError && (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">
                  {t(translationKeys.returns.formOrderNumber, 'Order number')}
                  <span className="text-destructive"> *</span>
                </Label>
                <Input
                  id="orderNumber"
                  {...register('orderNumber')}
                  className={cn(errors.orderNumber && 'border-destructive')}
                  placeholder="e.g. 1A2B3C4D"
                />
                {errors.orderNumber && (
                  <p className="text-sm text-destructive">{errors.orderNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  {t(translationKeys.returns.formFullName, 'Full name')}
                  <span className="text-destructive"> *</span>
                </Label>
                <Input
                  id="fullName"
                  {...register('fullName')}
                  className={cn(errors.fullName && 'border-destructive')}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                {t(translationKeys.returns.formEmail, 'E-mail')}
                <span className="text-destructive"> *</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className={cn(errors.email && 'border-destructive')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">
                {t(translationKeys.returns.formDeliveryAddress, 'Delivery address')}
                <span className="text-destructive"> *</span>
              </Label>
              <Textarea
                id="deliveryAddress"
                rows={2}
                {...register('deliveryAddress')}
                className={cn(errors.deliveryAddress && 'border-destructive')}
                placeholder="Street, postal code, city, country"
              />
              {errors.deliveryAddress && (
                <p className="text-sm text-destructive">{errors.deliveryAddress.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestType">
                {t(translationKeys.returns.formRequestType, 'Type of request')}
                <span className="text-destructive"> *</span>
              </Label>
              <select
                id="requestType"
                {...register('requestType')}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  errors.requestType && 'border-destructive',
                )}
              >
                <option value="Withdrawal">
                  {t(translationKeys.returns.formRequestTypeWithdrawal, 'Withdrawal')}
                </option>
                <option value="Return">
                  {t(translationKeys.returns.formRequestTypeReturn, 'Return')}
                </option>
                <option value="Cancellation">
                  {t(translationKeys.returns.formRequestTypeCancellation, 'Cancellation before dispatch')}
                </option>
              </select>
              {errors.requestType && (
                <p className="text-sm text-destructive">{errors.requestType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">
                {t(translationKeys.returns.formReason, 'Reason / Additional notes')}
              </Label>
              <Textarea
                id="reason"
                rows={4}
                {...register('reason')}
                className={cn(errors.reason && 'border-destructive')}
              />
              {errors.reason && (
                <p className="text-sm text-destructive">{errors.reason.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t(translationKeys.common.loading, 'Sending…')
                : t(translationKeys.returns.formSubmit, 'Send request')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
