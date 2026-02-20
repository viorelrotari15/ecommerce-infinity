'use client';

import { useState, useEffect, useRef } from 'react';
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
import { isAdmin, getAuthToken } from '@/lib/auth';
import { useBrands, useUpsertBrandTranslation } from '@/lib/hooks/use-brands';
import { brandQueryKeys } from '@/lib/api/queries';
import { useLanguages } from '@/lib/hooks/use-languages';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/confirm-dialog-context';
import { useT, translationKeys } from '@/lib/utils/translations';
import { revalidateBrands } from '@/app/actions/revalidate';
import { BrandTranslationsTabs, type BrandTranslationsTabsRef } from '@/components/admin/brand-translations-tabs';
import { TranslationWarningBadge } from '@/components/admin/translation-warning-badge';
import { useBrandTranslationStatus } from '@/lib/hooks/use-translation-status';
import { ItemsPerPageControl } from '@/components/ui/items-per-page-control';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useSearchParams } from 'next/navigation';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

// Component for rendering a single brand card with translation status
function BrandCard({
  brand,
  onEditClick,
  onDeleteClick,
}: {
  brand: Brand;
  onEditClick: () => void;
  onDeleteClick: () => void;
}) {
  const translationStatus = useBrandTranslationStatus(brand.id);
  const t = useT();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{brand.name}</CardTitle>
          {!translationStatus.hasAllTranslations && (
            <TranslationWarningBadge
              missingLanguageCodes={translationStatus.missingLanguageCodes}
              missingLanguages={translationStatus.missingLanguages}
              entityType="brand"
            />
          )}
        </div>
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
            onClick={onEditClick}
          >
            <Edit className="h-4 w-4 mr-2" />
            {t(translationKeys.admin.brands.edit, 'Edit')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteClick}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BrandsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: brands = [], isLoading } = useBrands();
  const { data: languages = [] } = useLanguages(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [creationTranslationData, setCreationTranslationData] = useState<Record<string, { name: string; description: string }>>({});
  const [isCreating, setIsCreating] = useState(false);
  const token = getAuthToken();
  const { toast } = useToast();
  const confirm = useConfirm();
  const t = useT();
  const translationTabsRef = useRef<BrandTranslationsTabsRef>(null);
  const upsertTranslation = useUpsertBrandTranslation();

  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;

  const totalPages = Math.ceil(brands.length / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedBrands = brands.slice(startIndex, endIndex);

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


  const handleCreate = async () => {
    // Validate translations - name must be provided in translations
    if (!translationTabsRef.current) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.validationError, 'Validation Error'),
        description: 'Translation data is required.',
      });
      return;
    }

      const validation = translationTabsRef.current.validateAll();
      if (!validation.isValid) {
        toast({
          variant: 'destructive',
          title: t(translationKeys.common.validationError, 'Validation Error'),
          description: 'Please fill in the name field for the default language.',
        });
        return;
      }

    try {
      setIsCreating(true);
      const translationData = translationTabsRef.current.getTranslationData();
      const activeLangs = languages.filter((l) => l.isActive);
      const defaultLang = languages.find((l) => l.isDefault) || activeLangs[0];
      
      // Use the default language's name as the main name, or first available translation
      const defaultName = translationData[defaultLang.code]?.name?.trim() || 
                         Object.values(translationData).find(d => d?.name?.trim())?.name?.trim() || 
                         'Untitled';
      const defaultDescription = translationData[defaultLang.code]?.description?.trim() || 
                                 Object.values(translationData).find(d => d?.description?.trim())?.description?.trim() || 
                                 formData.description;

      const response = await apiClient.post<Brand>(
        '/brands',
        {
          name: defaultName,
          description: defaultDescription || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const newBrand = response.data;

      // Save translations for all languages
      if (newBrand?.id) {
        await Promise.all(
          activeLangs.map(async (lang) => {
            const data = translationData[lang.code];
            if (data?.name?.trim()) {
              return upsertTranslation.mutateAsync({
                brandId: newBrand.id,
                language: lang.code,
                name: data.name,
                description: data?.description?.trim(),
              });
            }
          })
        );
      }

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

    // Validate translations if translation tabs ref is available
    if (translationTabsRef.current) {
      const validation = translationTabsRef.current.validateAll();
      if (!validation.isValid) {
        toast({
          variant: 'destructive',
          title: t(translationKeys.common.validationError, 'Validation Error'),
          description: 'Please fill in the name field for the default language.',
        });
        return;
      }
    }

    try {
      setIsCreating(true);
      const translationData = translationTabsRef.current?.getTranslationData();
      const activeLangs = languages.filter((l) => l.isActive);
      const defaultLang = languages.find((l) => l.isDefault) || activeLangs[0];
      
      // Use the default language's name as the main name, or first available translation
      const defaultName = translationData?.[defaultLang.code]?.name?.trim() || 
                         (translationData ? Object.values(translationData).find(d => d?.name?.trim())?.name?.trim() : null) || 
                         formData.name;
      const defaultDescription = translationData?.[defaultLang.code]?.description?.trim() || 
                                (translationData ? Object.values(translationData).find(d => d?.description?.trim())?.description?.trim() : null) || 
                                formData.description;

      await apiClient.patch(
        `/brands/${editingId}`,
        {
          name: defaultName,
          description: defaultDescription || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Save translations for all languages
      if (translationTabsRef.current && translationData) {
        await Promise.all(
          activeLangs.map(async (lang) => {
            const data = translationData[lang.code];
            if (data?.name?.trim()) {
              return upsertTranslation.mutateAsync({
                brandId: editingId,
                language: lang.code,
                name: data.name,
                description: data?.description?.trim(),
              });
            }
          })
        );
      }

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

      {/* Items Per Page Control */}
      <ItemsPerPageControl
        limit={limit}
        baseUrl="/admin/brands"
      />

      {/* Brands List */}
      {brands.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">{t(translationKeys.admin.brands.noBrandsFound, 'No brands found.')}</p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t(translationKeys.admin.brands.createFirst, 'Create Your First Brand')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedBrands.map((brand) => (
              <BrandCard
                key={brand.id}
                brand={brand}
                onEditClick={() => openEditDialog(brand)}
                onDeleteClick={() => handleDelete(brand.id, brand.name)}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              limit={limit}
              baseUrl="/admin/brands"
            />
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t(translationKeys.admin.brands.editTitle, 'Edit Brand') : t(translationKeys.admin.brands.createTitle, 'Create New Brand')}</DialogTitle>
            <DialogDescription>
              {editingId ? t(translationKeys.admin.brands.editDescription, 'Update brand information') : t(translationKeys.admin.brands.createDescription, 'Add a new brand to the system')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t(translationKeys.admin.brands.translationsLabel, 'Translations *')}</Label>
              <p className="text-sm text-muted-foreground mb-2">
                {t(translationKeys.common.translationsHintForAllLanguages, 'Add translations for all languages. Name is required for the default language only. Other languages will fallback to the default language if missing.')}
              </p>
              <BrandTranslationsTabs
                ref={translationTabsRef}
                brandId={editingId || undefined}
                defaultName={formData.name}
                defaultDescription={formData.description}
                creationMode={!editingId}
                onTranslationDataChange={setCreationTranslationData}
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

    </div>
  );
}
