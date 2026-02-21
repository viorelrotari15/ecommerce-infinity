'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAuthToken } from '@/lib/auth';
import { isAdmin } from '@/lib/auth';
import { useCategories, useCategoryTranslations, useUpsertCategoryTranslation } from '@/lib/hooks/use-categories';
import { useLanguages } from '@/lib/hooks/use-languages';
import { categoryQueryKeys } from '@/lib/api/queries';
import { Plus, Edit, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/confirm-dialog-context';
import { useT, translationKeys } from '@/lib/utils/translations';
import { apiClient } from '@/lib/api/client';
import { revalidateCategories } from '@/app/actions/revalidate';
import type { Category as CategoryType } from '@/lib/api/server';
import { CategoryTranslationsTabs, type CategoryTranslationsTabsRef } from '@/components/admin/category-translations-tabs';
import { TranslationWarningBadge } from '@/components/admin/translation-warning-badge';
import { useCategoryTranslationStatus } from '@/lib/hooks/use-translation-status';
import { ItemsPerPageControl } from '@/components/ui/items-per-page-control';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useSearchParams } from 'next/navigation';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  children?: Category[];
}

export default function CategoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useCategories();
  const { data: languages = [] } = useLanguages(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    parentId: '',
  });
  const [creationTranslationData, setCreationTranslationData] = useState<Record<string, { name: string; description: string }>>({});
  const [isCreating, setIsCreating] = useState(false);
  const token = getAuthToken();
  const { toast } = useToast();
  const confirm = useConfirm();
  const t = useT();
  const translationTabsRef = useRef<CategoryTranslationsTabsRef>(null);

  const upsertTranslation = useUpsertCategoryTranslation();

  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth/login');
      return;
    }
  }, [router]);

  // Flatten the nested categories structure to a flat array with parentId
  // Handle the nested structure from backend which may have children at multiple levels
  const flatCategories = useMemo(() => {
    const flattenCategories = (cats: any[], parentId: string | null = null): Category[] => {
      const result: Category[] = [];
      if (!Array.isArray(cats)) return result;
      
      for (const cat of cats) {
        if (!cat || !cat.id) continue;
        
        const flatCat: Category = {
          id: cat.id,
          name: cat.name || '',
          slug: cat.slug || '',
          description: cat.description,
          parentId: parentId || undefined,
        };
        result.push(flatCat);
        // Handle nested children - they might be full objects or just {id, name, slug}
        if (cat.children && Array.isArray(cat.children) && cat.children.length > 0) {
          // Recursively flatten children, ensuring each child has required properties
          const childrenToFlatten = cat.children.map((child: any) => ({
            id: child.id,
            name: child.name || '',
            slug: child.slug || '',
            description: child.description,
            children: child.children,
          }));
          result.push(...flattenCategories(childrenToFlatten, cat.id));
        }
      }
      return result;
    };
    return flattenCategories(categories as CategoryType[]);
  }, [categories]);

  // Filter categories to show only top-level (no parent)
  const topLevelCategories = flatCategories.filter((cat) => !cat.parentId);

  // Paginate top-level categories
  const totalPages = Math.ceil(topLevelCategories.length / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTopLevelCategories = topLevelCategories.slice(startIndex, endIndex);
  
  // Get subcategories for a given category
  const getSubcategories = (categoryId: string): Category[] => {
    return flatCategories.filter((cat) => cat.parentId === categoryId);
  };

  // Get all available parent categories (only top-level categories, excluding the current one being edited)
  const getAvailableParents = (excludeId?: string): Category[] => {
    return flatCategories.filter((cat) => {
      if (cat.id === excludeId) return false;
      if (cat.parentId) return false; // Only show top-level as parents
      return true;
    });
  };

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({
      name: '',
      parentId: '',
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      parentId: category.parentId || '',
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({ name: '', parentId: '' });
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

      const response = await apiClient.post<Category>(
        '/categories',
        {
          name: defaultName,
          parentId: formData.parentId || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const newCategory = response.data;

      // Save translations for all languages
      if (newCategory?.id) {
        await Promise.all(
          activeLangs.map(async (lang) => {
            const data = translationData[lang.code];
            if (data?.name?.trim()) {
              return upsertTranslation.mutateAsync({
                categoryId: newCategory.id,
                language: lang.code,
                name: data.name,
                description: data?.description?.trim(),
              });
            }
          })
        );
      }

      // Invalidate React Query cache
      await queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
      // Revalidate Next.js server-side cache for categories page
      await revalidateCategories();
      // Refresh Next.js router cache to ensure server-side cache is also invalidated
      router.refresh();
      closeDialog();
      setIsCreating(false);
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.categories.createSuccess, 'Category created successfully!'),
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

      await apiClient.patch(
        `/categories/${editingId}`,
        {
          name: defaultName,
          parentId: formData.parentId || undefined,
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
                categoryId: editingId,
                language: lang.code,
                name: data.name,
                description: data?.description?.trim(),
              });
            }
          })
        );
      }

      // Invalidate React Query cache
      await queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
      // Revalidate Next.js server-side cache for categories page
      await revalidateCategories();
      // Refresh Next.js router cache to ensure server-side cache is also invalidated
      router.refresh();
      closeDialog();
      setIsCreating(false);
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.categories.updateSuccess, 'Category updated successfully!'),
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
    const deleteDescription = t(translationKeys.admin.categories.deleteDescription, `Are you sure you want to delete "${name}"? This action cannot be undone.`);
    const confirmed = await confirm({
      title: t(translationKeys.admin.categories.deleteTitle, 'Delete Category'),
      description: deleteDescription.replace(/{name}/g, name),
      confirmText: t(translationKeys.common.delete, 'Delete'),
      cancelText: t(translationKeys.common.cancel, 'Cancel'),
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    try {
      await apiClient.delete(`/categories/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Invalidate React Query cache
      await queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
      // Refresh Next.js router cache to ensure server-side cache is also invalidated
      router.refresh();
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.categories.deleteSuccess, 'Category deleted successfully!'),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: error.message || t(translationKeys.common.failed, 'Failed'),
      });
    }
  };


  // Component for rendering a single category with translation status
  const CategoryItem = ({ category, level = 0 }: { category: Category; level?: number }) => {
    const subcategories = getSubcategories(category.id);
    const hasSubcategories = subcategories.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const translationStatus = useCategoryTranslationStatus(category.id);

    return (
      <div className="ml-4">
        <Card className="mb-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                {hasSubcategories && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(category.id)}
                    className="h-6 w-6 p-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {!hasSubcategories && <div className="w-6" />}
                <div className="flex-1 flex items-center gap-2">
                  <div>
                    <div className="font-medium">{category.name}</div>
                    <div className="text-sm text-muted-foreground">{category.slug}</div>
                  </div>
                  {!translationStatus.hasAllTranslations && (
                    <TranslationWarningBadge
                      missingLanguageCodes={translationStatus.missingLanguageCodes}
                      missingLanguages={translationStatus.missingLanguages}
                      entityType="category"
                    />
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(category)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t(translationKeys.common.edit, 'Edit')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(category.id, category.name)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {hasSubcategories && isExpanded && (
          <div className="ml-4">
            {subcategories.map((subcat) => (
              <CategoryItem key={subcat.id} category={subcat} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCategory = (category: Category, level: number = 0) => {
    return <CategoryItem key={category.id} category={category} level={level} />;
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">{t(translationKeys.admin.categories.loading, 'Loading categories...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t(translationKeys.admin.categories.title, 'Manage Categories')}</h1>
          <p className="text-muted-foreground mt-2">
            {t(translationKeys.admin.categories.description, 'Create, edit, and delete product categories')}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t(translationKeys.admin.categories.addNew, 'Add New Category')}
        </Button>
      </div>

      {/* Items Per Page Control */}
      <ItemsPerPageControl
        limit={limit}
        baseUrl="/admin/categories"
      />

      {/* Categories List */}
      {topLevelCategories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">{t(translationKeys.admin.categories.noCategoriesFound, 'No categories found.')}</p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t(translationKeys.admin.categories.createFirst, 'Create Your First Category')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div>
            {paginatedTopLevelCategories.map((category) => renderCategory(category))}
          </div>
          {totalPages > 1 && (
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              limit={limit}
              baseUrl="/admin/categories"
            />
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t(translationKeys.admin.categories.editTitle, 'Edit Category') : t(translationKeys.admin.categories.createTitle, 'Create New Category')}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? t(translationKeys.admin.categories.editDescription, 'Update category information')
                : t(translationKeys.admin.categories.createDescription, 'Add a new category to the system')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="parentId">{t(translationKeys.admin.categories.parentCategory, 'Parent Category')}</Label>
              <Select
                value={formData.parentId || 'none'}
                onValueChange={(value) => setFormData({ ...formData, parentId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t(translationKeys.admin.categories.parentPlaceholder, 'Select parent category (optional)')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t(translationKeys.admin.categories.none, 'None (Top Level)')}</SelectItem>
                  {getAvailableParents(editingId || undefined).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t(translationKeys.admin.categories.selectParentToCreateSubcategory, 'Select a parent category to create a subcategory')}
              </p>
            </div>
            <div className="grid gap-2">
              <Label>{t(translationKeys.admin.categories.translationsLabel, 'Translations *')}</Label>
              <p className="text-sm text-muted-foreground mb-2">
                {t(translationKeys.common.translationsHintForAllLanguages, 'Add translations for all languages. Name is required for the default language only. Other languages will fallback to the default language if missing.')}
              </p>
              <CategoryTranslationsTabs
                ref={translationTabsRef}
                categoryId={editingId || undefined}
                defaultName={formData.name}
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
                  ? t(translationKeys.admin.categories.updating, 'Updating...')
                  : t(translationKeys.admin.categories.creating, 'Creating...')
                : editingId
                  ? t(translationKeys.admin.categories.update, 'Update Category')
                  : t(translationKeys.admin.categories.create, 'Create Category')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
