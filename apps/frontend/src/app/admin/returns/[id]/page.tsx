'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminReturn, useUpdateAdminReturnStatus } from '@/lib/hooks/use-returns';
import { useToast } from '@/hooks/use-toast';
import { useT, translationKeys } from '@/lib/utils/translations';
import type { ReturnRequestStatus } from '@/lib/api/client';

const STATUS_OPTIONS: ReturnRequestStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AdminReturnDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const t = useT();
  const returnId = params?.id as string | undefined;
  const { data: returnRequest, isLoading, error } = useAdminReturn(returnId);
  const updateStatus = useUpdateAdminReturnStatus();

  const [status, setStatus] = useState<ReturnRequestStatus | undefined>(undefined);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (returnRequest) {
      setStatus(returnRequest.status);
      setAdminNotes(returnRequest.adminNotes || '');
    }
  }, [returnRequest]);

  const statusOptions = useMemo(
    () =>
      STATUS_OPTIONS.map((value) => ({
        value,
        label: t(
          {
            PENDING: translationKeys.admin.returns.statusPending,
            IN_PROGRESS: translationKeys.admin.returns.statusInProgress,
            APPROVED: translationKeys.admin.returns.statusApproved,
            REJECTED: translationKeys.admin.returns.statusRejected,
            COMPLETED: translationKeys.admin.returns.statusCompleted,
          }[value],
          value,
        ),
      })),
    [t],
  );

  if (isLoading) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">
          {t(translationKeys.admin.returns.loading, 'Loading...')}
        </p>
      </div>
    );
  }

  if (error || !returnRequest) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{t(translationKeys.admin.returns.errorTitle, 'Error')}</CardTitle>
            <CardDescription>
              {t(translationKeys.admin.returns.errorDescription, 'Failed to load return request.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/admin/returns')}>
              {t(translationKeys.admin.returns.backToReturns, 'Back to returns')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleUpdate = async () => {
    try {
      await updateStatus.mutateAsync({
        id: returnRequest.id,
        status: status ?? returnRequest.status,
        adminNotes: adminNotes.trim() || undefined,
      });
      toast({
        variant: 'default',
        title: t(translationKeys.admin.returns.updateSuccessTitle, 'Return updated'),
        description: t(
          translationKeys.admin.returns.updateSuccessDescription,
          'Status and notes were saved successfully.',
        ),
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.admin.returns.updateFailedTitle, 'Update failed'),
        description:
          err?.message ||
          t(translationKeys.admin.returns.updateFailedDescription, 'Failed to update return request.'),
      });
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {t(translationKeys.admin.returns.orderDetailsTitle, 'Request details')} — {returnRequest.orderNumber}
        </h1>
        <p className="text-muted-foreground">
          {t(translationKeys.admin.returns.requestType, 'Type')}: {returnRequest.requestType} ·{' '}
          {t(translationKeys.admin.returns.status, 'Status')}: {returnRequest.status}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.admin.returns.orderDetailsTitle, 'Request details')}</CardTitle>
          <CardDescription>
            Submitted {formatDate(returnRequest.createdAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-2 md:grid-cols-2">
            <p>
              <span className="font-medium text-muted-foreground">{t(translationKeys.admin.returns.orderNumber, 'Order number')}:</span>{' '}
              {returnRequest.orderNumber}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">{t(translationKeys.admin.returns.customer, 'Customer')}:</span>{' '}
              {returnRequest.fullName}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">{t(translationKeys.admin.orderDetails.customerEmail, 'Email')}:</span>{' '}
              <a href={`mailto:${returnRequest.email}`} className="text-primary hover:underline">
                {returnRequest.email}
              </a>
            </p>
            {returnRequest.language && (
              <p>
                <span className="font-medium text-muted-foreground">{t(translationKeys.admin.returns.language, 'Language')}:</span>{' '}
                {returnRequest.language}
              </p>
            )}
          </div>
          <div>
            <span className="font-medium text-muted-foreground">{t(translationKeys.admin.returns.deliveryAddress, 'Delivery address')}:</span>
            <p className="mt-1 whitespace-pre-wrap">{returnRequest.deliveryAddress}</p>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">{t(translationKeys.admin.returns.reason, 'Reason / notes')}:</span>
            <p className="mt-1 whitespace-pre-wrap">{returnRequest.reason || '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.admin.returns.statusUpdateTitle, 'Update status')}</CardTitle>
          <CardDescription>
            {t(translationKeys.admin.returns.statusUpdateDescription, 'Change status and add internal notes.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t(translationKeys.admin.returns.status, 'Status')}
            </label>
            <Select
              value={status ?? returnRequest.status}
              onValueChange={(value) => setStatus(value as ReturnRequestStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t(translationKeys.admin.returns.adminNotes, 'Admin notes')}
            </label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={t(translationKeys.admin.returns.adminNotesPlaceholder, 'Internal notes (not visible to customer)')}
              rows={4}
              className="resize-none"
            />
          </div>
          <Button onClick={handleUpdate} disabled={updateStatus.isPending}>
            {updateStatus.isPending
              ? t(translationKeys.admin.returns.saving, 'Saving...')
              : t(translationKeys.admin.returns.saveChanges, 'Save changes')}
          </Button>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => router.push('/admin/returns')}>
        {t(translationKeys.admin.returns.backToReturns, 'Back to returns')}
      </Button>
    </div>
  );
}
