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
import { useBrands, useUpsertBrandTranslation } from '@/lib/hooks/use-brands';
import { brandQueryKeys } from '@/lib/api/queries';
import { useLanguages } from '@/lib/hooks/use-languages';
import { fetchAPIAuth } from '@/lib/api/client';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/confirm-dialog-context';
import { useT, translationKeys } from '@/lib/utils/translations';
import { revalidateBrands } from '@/app/actions/revalidate';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function BrandsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: brands = [], isLoading } = useBrands();
  const { data: languages = [] } = useLanguages(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTranslationDialogOpen, setIsTranslationDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [translationBrandId, setTranslationBrandId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [translationData, setTranslationData] = useState<Record<string, { name: string; description: string }>>({});
  const [isCreating, setIsCreating] = useState(false);
  const token = getAuthToken();
  const { toast } = useToast();
  const confirm = useConfirm();
  const t = useT();
  const upsertTranslation = useUpsertBrandTranslation();

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

  const openEditDialog = (brand: Brand) => {
    setEditingId(brand.id);
    setFormData({
      name: brand.name,
      description: brand.description || '',
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({ name: '', description: '' });
  };

  const openTranslationDialog = async (brandId: string) => {
    setTranslationBrandId(brandId);
    // Load existing translations
    try {
      if (token) {
        const translations = await fetchAPIAuth<Array<{ language: string; name: string; description?: string }>>(
          `/brands/${brandId}/translations`,
          token,
        );
        const translationMap: Record<string, { name: string; description: string }> = {};
        languages.forEach((lang) => {
          const existing = translations?.find((t) => t.language === lang.code);
          translationMap[lang.code] = {
            name: existing?.name || '',
            description: existing?.description || '',
          };
        });
        setTranslationData(translationMap);
      } else {
        // Initialize with empty strings
        const translationMap: Record<string, { name: string; description: string }> = {};
        languages.forEach((lang) => {
          translationMap[lang.code] = { name: '', description: '' };
        });
        setTranslationData(translationMap);
      }
    } catch (error) {
      // Initialize with empty strings on error
      const translationMap: Record<string, { name: string; description: string }> = {};
      languages.forEach((lang) => {
        translationMap[lang.code] = { name: '', description: '' };
      });
      setTranslationData(translationMap);
    }
    setIsTranslationDialogOpen(true);
  };

  const closeTranslationDialog = () => {
    setIsTranslationDialogOpen(false);
    setTranslationBrandId(null);
    setTranslationData({});
  };

  const handleSaveTranslations = async () => {
    if (!translationBrandId) return;

    try {
      setIsCreating(true);
      const promises = languages.map((lang) => {
        const data = translationData[lang.code];
        const name = data?.name?.trim();
        if (!name) return Promise.resolve();
        return upsertTranslation.mutateAsync({
          brandId: translationBrandId,
          language: lang.code,
          name,
          description: data?.description?.trim(),
        });
      });

      await Promise.all(promises);
      // Invalidate React Query cache
      await queryClient.invalidateQueries({ queryKey: brandQueryKeys.all });
      // Revalidate Next.js server-side cache for brands page
      await revalidateBrands();
      // Refresh Next.js router cache to ensure server-side cache is also invalidated
      router.refresh();
      closeTranslationDialog();
      setIsCreating(false);
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: 'Translations saved successfully!',
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
        '/brands',
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
      // Invalidate React Query cache
      await queryClient.invalidateQueries({ queryKey: brandQueryKeys.all });
      // Revalidate Next.js server-side cache for brands page
      await revalidateBrands();
      // Refresh Next.js router cache to ensure server-side cache is also invalidated
      router.refresh();
      closeDialog();
      setIsCreating(false);
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.brands.createSuccess, 'Brand created successfully!'),
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
        `/brands/${editingId}`,
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
      // Invalidate React Query cache
      await queryClient.invalidateQueries({ queryKey: brandQueryKeys.all });
      // Revalidate Next.js server-side cache for brands page
      await revalidateBrands();
      // Refresh Next.js router cache to ensure server-side cache is also invalidated
      router.refresh();
      closeDialog();
      setIsCreating(false);
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.brands.updateSuccess, 'Brand updated successfully!'),
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
    const deleteDescription = t(translationKeys.admin.brands.deleteDescription, `Are you sure you want to delete "${name}"? This action cannot be undone.`);
    const confirmed = await confirm({
      title: t(translationKeys.admin.brands.deleteTitle, 'Delete Brand'),
      description: deleteDescription.replace(/{name}/g, name),
      confirmText: t(translationKeys.common.delete, 'Delete'),
      cancelText: t(translationKeys.common.cancel, 'Cancel'),
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    try {
      await apiClient.delete(`/brands/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Invalidate React Query cache
      await queryClient.invalidateQueries({ queryKey: brandQueryKeys.all });
      // Revalidate Next.js server-side cache for brands page
      await revalidateBrands();
      // Refresh Next.js router cache to ensure server-side cache is also invalidated
      router.refresh();
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.brands.deleteSuccess, 'Brand deleted successfully!'),
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
          <p className="text-muted-foreground">{t(translationKeys.admin.brands.loading, 'Loading brands...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t(translationKeys.admin.brands.title, 'Manage Brands')}</h1>
          <p className="text-muted-foreground mt-2">
            {t(translationKeys.admin.brands.description, 'Create, edit, and delete product brands')}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t(translationKeys.admin.brands.addNew, 'Add New Brand')}
        </Button>
      </div>

      {/* Brands List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => (
          <Card key={brand.id}>
            <CardHeader>
              <CardTitle>{brand.name}</CardTitle>
              <CardDescription>{brand.slug}</CardDescription>
            </CardHeader>
            <CardContent>
              {brand.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {brand.description}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openTranslationDialog(brand.id)}
                >
                  {t(translationKeys.common.translations, 'Translations')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(brand)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t(translationKeys.admin.brands.edit, 'Edit')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(brand.id, brand.name)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {brands.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">{t(translationKeys.admin.brands.noBrandsFound, 'No brands found.')}</p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t(translationKeys.admin.brands.createFirst, 'Create Your First Brand')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t(translationKeys.admin.brands.editTitle, 'Edit Brand') : t(translationKeys.admin.brands.createTitle, 'Create New Brand')}</DialogTitle>
            <DialogDescription>
              {editingId ? t(translationKeys.admin.brands.editDescription, 'Update brand information') : t(translationKeys.admin.brands.createDescription, 'Add a new brand to the system')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t(translationKeys.admin.brands.name, 'Name *')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t(translationKeys.admin.brands.namePlaceholder, 'Brand name')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t(translationKeys.common.description, 'Description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t(translationKeys.admin.brands.descriptionPlaceholder, 'Brand description')}
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
                  ? t(translationKeys.admin.brands.updating, 'Updating...')
                  : t(translationKeys.admin.brands.creating, 'Creating...')
                : editingId
                  ? t(translationKeys.admin.brands.update, 'Update Brand')
                  : t(translationKeys.admin.brands.create, 'Create Brand')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Translation Dialog */}
      <Dialog open={isTranslationDialogOpen} onOpenChange={setIsTranslationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Brand Translations</DialogTitle>
            <DialogDescription>
              Add translations for this brand in different languages
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Tabs defaultValue={languages[0]?.code || ''} className="w-full">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${languages.length}, minmax(0, 1fr))` }}>
                {languages.map((lang) => (
                  <TabsTrigger key={lang.code} value={lang.code}>
                    {lang.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {languages.map((lang) => (
                <TabsContent key={lang.code} value={lang.code} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor={`translation-name-${lang.code}`}>
                      Name ({lang.name})
                    </Label>
                    <Input
                      id={`translation-name-${lang.code}`}
                      value={translationData[lang.code]?.name || ''}
                      onChange={(e) =>
                        setTranslationData({
                          ...translationData,
                          [lang.code]: {
                            ...translationData[lang.code],
                            name: e.target.value,
                            description: translationData[lang.code]?.description || '',
                          },
                        })
                      }
                      placeholder={`Enter name in ${lang.name}`}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`translation-description-${lang.code}`}>
                      Description ({lang.name}) - Optional
                    </Label>
                    <textarea
                      id={`translation-description-${lang.code}`}
                      value={translationData[lang.code]?.description || ''}
                      onChange={(e) =>
                        setTranslationData({
                          ...translationData,
                          [lang.code]: {
                            ...translationData[lang.code],
                            name: translationData[lang.code]?.name || '',
                            description: e.target.value,
                          },
                        })
                      }
                      placeholder={`Enter description in ${lang.name}`}
                      rows={3}
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTranslationDialog}>
              {t(translationKeys.common.cancel, 'Cancel')}
            </Button>
            <Button onClick={handleSaveTranslations} disabled={isCreating}>
              {isCreating ? 'Saving...' : 'Save Translations'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
