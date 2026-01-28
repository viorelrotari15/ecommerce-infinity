'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isAdmin } from '@/lib/auth';
import { useCategories } from '@/lib/hooks/use-categories';
import {
  useAdminTaxRates,
  useCreateAdminTaxRate,
  useDeleteAdminTaxRate,
  useUpdateAdminTaxRate,
} from '@/lib/hooks/use-pricing-admin';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useConfirm } from '@/contexts/confirm-dialog-context';
import { useToast } from '@/hooks/use-toast';
import { useT, translationKeys } from '@/lib/utils/translations';
import { DEFAULT_REGION_CODE } from '@/lib/config';

export default function TaxRatesPage() {
  const router = useRouter();
  const t = useT();
  const confirm = useConfirm();
  const { toast } = useToast();
  const { data: categories = [] } = useCategories();
  const { data: taxRates = [], isLoading } = useAdminTaxRates(DEFAULT_REGION_CODE);
  const createTaxRate = useCreateAdminTaxRate();
  const updateTaxRate = useUpdateAdminTaxRate();
  const deleteTaxRate = useDeleteAdminTaxRate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rate: '0.19',
    categoryId: '',
    isDefault: false,
    isActive: true,
  });

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth/login');
    }
  }, [router]);

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({
      name: '',
      rate: '0.19',
      categoryId: '',
      isDefault: false,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (taxRate: any) => {
    setEditingId(taxRate.id);
    setFormData({
      name: taxRate.name,
      rate: String(taxRate.rate),
      categoryId: taxRate.categoryId || '',
      isDefault: taxRate.isDefault,
      isActive: taxRate.isActive,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.validationError, 'Validation Error'),
        description: t(translationKeys.common.fillRequired, 'Please fill in the name field'),
      });
      return;
    }

    const payload = {
      regionCode: DEFAULT_REGION_CODE,
      name: formData.name,
      rate: Number(formData.rate),
      categoryId: formData.categoryId || undefined,
      isDefault: formData.isDefault,
      isActive: formData.isActive,
    };

    try {
      if (editingId) {
        await updateTaxRate.mutateAsync({
          id: editingId,
          payload: {
            name: payload.name,
            rate: payload.rate,
            categoryId: payload.categoryId ?? null,
            isDefault: payload.isDefault,
            isActive: payload.isActive,
          },
        });
        toast({
          variant: 'success',
          title: t(translationKeys.common.success, 'Success'),
          description: t(translationKeys.admin.taxRates.updateSuccess, 'Tax rate updated successfully!'),
        });
      } else {
        await createTaxRate.mutateAsync(payload);
        toast({
          variant: 'success',
          title: t(translationKeys.common.success, 'Success'),
          description: t(translationKeys.admin.taxRates.createSuccess, 'Tax rate created successfully!'),
        });
      }
      closeDialog();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: error.message || t(translationKeys.common.failed, 'Failed'),
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: t(translationKeys.admin.taxRates.deleteTitle, 'Delete Tax Rate'),
      description: t(
        translationKeys.admin.taxRates.deleteDescription,
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      ).replace('{name}', name),
      confirmText: t(translationKeys.common.delete, 'Delete'),
      cancelText: t(translationKeys.common.cancel, 'Cancel'),
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      await deleteTaxRate.mutateAsync(id);
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.taxRates.deleteSuccess, 'Tax rate deleted successfully!'),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: error.message || t(translationKeys.common.failed, 'Failed'),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">{t(translationKeys.admin.taxRates.loading, 'Loading tax rates...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t(translationKeys.admin.taxRates.title, 'Tax Rates')}</h1>
          <p className="text-muted-foreground mt-2">
            {t(translationKeys.admin.taxRates.description, 'Configure VAT rates per region and category')}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t(translationKeys.admin.taxRates.addNew, 'Add tax rate')}
        </Button>
      </div>

      {taxRates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t(translationKeys.admin.taxRates.noTaxRates, 'No tax rates configured yet.')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {taxRates.map((rate: any) => (
            <Card key={rate.id}>
              <CardHeader>
                <CardTitle>{rate.name}</CardTitle>
                <CardDescription>
                  {rate.region?.code || DEFAULT_REGION_CODE} · {(Number(rate.rate) * 100).toFixed(2)}%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t(translationKeys.admin.taxRates.category, 'Category')}: {rate.category?.name || t(translationKeys.common.all, 'All')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(translationKeys.common.status, 'Status')}: {rate.isActive ? t(translationKeys.common.active, 'Active') : t(translationKeys.common.inactive, 'Inactive')}
                </p>
                {rate.isDefault && (
                  <p className="text-xs font-semibold text-primary">{t(translationKeys.admin.taxRates.defaultRate, 'Default rate')}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(rate)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t(translationKeys.common.edit, 'Edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(rate.id, rate.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t(translationKeys.admin.taxRates.editTitle, 'Edit Tax Rate')
                : t(translationKeys.admin.taxRates.createTitle, 'Create Tax Rate')}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? t(translationKeys.admin.taxRates.editDescription, 'Update tax rate details')
                : t(translationKeys.admin.taxRates.createDescription, 'Add a new tax rate')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tax-name">{t(translationKeys.common.name, 'Name')}</Label>
              <Input
                id="tax-name"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tax-rate">{t(translationKeys.admin.taxRates.rate, 'Rate')}</Label>
              <Input
                id="tax-rate"
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(event) => setFormData({ ...formData, rate: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t(translationKeys.admin.taxRates.category, 'Category')}</Label>
              <Select
                value={formData.categoryId || 'all'}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t(translationKeys.common.all, 'All')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t(translationKeys.common.all, 'All')}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="tax-default"
                type="checkbox"
                className="h-4 w-4"
                checked={formData.isDefault}
                onChange={(event) => setFormData({ ...formData, isDefault: event.target.checked })}
              />
              <Label htmlFor="tax-default">{t(translationKeys.admin.taxRates.defaultRate, 'Default rate')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="tax-active"
                type="checkbox"
                className="h-4 w-4"
                checked={formData.isActive}
                onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })}
              />
              <Label htmlFor="tax-active">{t(translationKeys.common.active, 'Active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t(translationKeys.common.cancel, 'Cancel')}
            </Button>
            <Button onClick={handleSave} disabled={createTaxRate.isPending || updateTaxRate.isPending}>
              {editingId
                ? t(translationKeys.common.update, 'Update')
                : t(translationKeys.common.create, 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
