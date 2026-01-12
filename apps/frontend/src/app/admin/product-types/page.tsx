'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth';
import { isAdmin } from '@/lib/auth';
import { useProductTypes, productTypeQueryKeys } from '@/lib/hooks/use-product-types';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/confirm-dialog-context';
import { useT, translationKeys } from '@/lib/utils/translations';

interface ProductType {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function ProductTypesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: productTypes = [], isLoading } = useProductTypes();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const token = getAuthToken();
  const { toast } = useToast();
  const confirm = useConfirm();
  const t = useT();

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth/login');
      return;
    }
  }, [router]);

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({ name: '', description: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (productType: ProductType) => {
    setEditingId(productType.id);
    setFormData({
      name: productType.name,
      description: productType.description || '',
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({ name: '', description: '' });
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.validationError, 'Validation Error'),
        description: t(translationKeys.common.fillRequired, 'Please fill in the name field'),
      });
      return;
    }

    try {
      setIsCreating(true);
      await apiClient.post(
        '/product-types',
        {
          name: formData.name,
          description: formData.description || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await queryClient.refetchQueries({ queryKey: productTypeQueryKeys.list() });
      closeDialog();
      setIsCreating(false);
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.productTypes.createSuccess, 'Product type created successfully!'),
      });
    } catch (error: any) {
      setIsCreating(false);
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: error.message || t(translationKeys.common.failed, 'Failed'),
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;

    if (!formData.name) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.validationError, 'Validation Error'),
        description: t(translationKeys.common.fillRequired, 'Please fill in the name field'),
      });
      return;
    }

    try {
      setIsCreating(true);
      await apiClient.patch(
        `/product-types/${editingId}`,
        {
          name: formData.name,
          description: formData.description || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await queryClient.invalidateQueries({ queryKey: productTypeQueryKeys.list() });
      closeDialog();
      setIsCreating(false);
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.productTypes.updateSuccess, 'Product type updated successfully!'),
      });
    } catch (error: any) {
      setIsCreating(false);
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: error.message || t(translationKeys.common.failed, 'Failed'),
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const deleteDescription = t(translationKeys.admin.productTypes.deleteDescription, `Are you sure you want to delete "${name}"? This action cannot be undone.`);
    const confirmed = await confirm({
      title: t(translationKeys.admin.productTypes.deleteTitle, 'Delete Product Type'),
      description: deleteDescription.replace(/{name}/g, name),
      confirmText: t(translationKeys.common.delete, 'Delete'),
      cancelText: t(translationKeys.common.cancel, 'Cancel'),
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    try {
      await apiClient.delete(`/product-types/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await queryClient.refetchQueries({ queryKey: productTypeQueryKeys.list() });
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.productTypes.deleteSuccess, 'Product type deleted successfully!'),
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
          <p className="text-muted-foreground">{t(translationKeys.admin.productTypes.loading, 'Loading product types...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t(translationKeys.admin.productTypes.title, 'Manage Product Types')}</h1>
          <p className="text-muted-foreground mt-2">
            {t(translationKeys.admin.productTypes.description, 'Create, edit, and delete product types')}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t(translationKeys.admin.productTypes.addNew, 'Add New Product Type')}
        </Button>
      </div>

      {/* Product Types List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {productTypes.map((productType) => (
          <Card key={productType.id}>
            <CardHeader>
              <CardTitle>{productType.name}</CardTitle>
              <CardDescription>{productType.slug}</CardDescription>
            </CardHeader>
            <CardContent>
              {productType.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {productType.description}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(productType)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t(translationKeys.admin.productTypes.edit, 'Edit')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(productType.id, productType.name)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {productTypes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">{t(translationKeys.admin.productTypes.noProductTypesFound, 'No product types found.')}</p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t(translationKeys.admin.productTypes.createFirst, 'Create Your First Product Type')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t(translationKeys.admin.productTypes.editTitle, 'Edit Product Type') : t(translationKeys.admin.productTypes.createTitle, 'Create New Product Type')}</DialogTitle>
            <DialogDescription>
              {editingId ? t(translationKeys.admin.productTypes.editDescription, 'Update product type information') : t(translationKeys.admin.productTypes.createDescription, 'Add a new product type to the system')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t(translationKeys.admin.productTypes.name, 'Name *')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t(translationKeys.admin.productTypes.namePlaceholder, 'Product type name')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t(translationKeys.common.description, 'Description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t(translationKeys.admin.productTypes.descriptionPlaceholder, 'Product type description')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t(translationKeys.common.cancel, 'Cancel')}
            </Button>
            <Button
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={isCreating}
            >
              {isCreating
                ? editingId
                  ? t(translationKeys.admin.productTypes.updating, 'Updating...')
                  : t(translationKeys.admin.productTypes.creating, 'Creating...')
                : editingId
                  ? t(translationKeys.admin.productTypes.update, 'Update Product Type')
                  : t(translationKeys.admin.productTypes.create, 'Create Product Type')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
