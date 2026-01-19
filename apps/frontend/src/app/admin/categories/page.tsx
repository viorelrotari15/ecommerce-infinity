'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { fetchAPIAuth } from '@/lib/api/client';
import { revalidateCategories } from '@/app/actions/revalidate';
import type { Category as CategoryType } from '@/lib/api/server';

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
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useCategories();
  const { data: languages = [] } = useLanguages(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTranslationDialogOpen, setIsTranslationDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [translationCategoryId, setTranslationCategoryId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    parentId: '',
  });
  const [translationData, setTranslationData] = useState<Record<string, { name: string; description: string }>>({});
  const [isCreating, setIsCreating] = useState(false);
  const token = getAuthToken();
  const { toast } = useToast();
  const confirm = useConfirm();
  const t = useT();

  const upsertTranslation = useUpsertCategoryTranslation();

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

  const openTranslationDialog = async (categoryId: string) => {
    setTranslationCategoryId(categoryId);
    // Load existing translations
    try {
      if (token) {
        const translations = await fetchAPIAuth<Array<{ language: string; name: string; description?: string }>>(
          `/categories/${categoryId}/translations`,
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

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({ name: '', parentId: '' });
  };

  const closeTranslationDialog = () => {
    setIsTranslationDialogOpen(false);
    setTranslationCategoryId(null);
    setTranslationData({});
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
        '/categories',
        {
          name: formData.name,
          parentId: formData.parentId || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
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
        `/categories/${editingId}`,
        {
          name: formData.name,
          parentId: formData.parentId || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
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

  const handleSaveTranslations = async () => {
    if (!translationCategoryId) return;

    try {
      setIsCreating(true);
      const promises = languages.map((lang) => {
        const data = translationData[lang.code];
        const name = data?.name?.trim();
        if (!name) return Promise.resolve();
        return upsertTranslation.mutateAsync({
          categoryId: translationCategoryId,
          language: lang.code,
          name,
          description: data?.description?.trim(),
        });
      });

      await Promise.all(promises);
      // Invalidate React Query cache
      await queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
      // Revalidate Next.js server-side cache for categories page
      await revalidateCategories();
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

  const renderCategory = (category: Category, level: number = 0) => {
    const subcategories = getSubcategories(category.id);
    const hasSubcategories = subcategories.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} className="ml-4">
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
                <div className="flex-1">
                  <div className="font-medium">{category.name}</div>
                  <div className="text-sm text-muted-foreground">{category.slug}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openTranslationDialog(category.id)}
                >
                  {t(translationKeys.common.translations, 'Translations')}
                </Button>
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
            {subcategories.map((subcat) => renderCategory(subcat, level + 1))}
          </div>
        )}
      </div>
    );
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
        <div>
          {topLevelCategories.map((category) => renderCategory(category))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
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
              <Label htmlFor="name">{t(translationKeys.admin.categories.name, 'Name *')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t(translationKeys.admin.categories.namePlaceholder, 'Category name')}
              />
            </div>
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
                Select a parent category to create a subcategory
              </p>
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

      {/* Translation Dialog */}
      <Dialog open={isTranslationDialogOpen} onOpenChange={setIsTranslationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Category Translations</DialogTitle>
            <DialogDescription>
              Add translations for this category in different languages
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
