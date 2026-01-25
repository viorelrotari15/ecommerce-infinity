'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { apiService } from '@/lib/api/client';
import { isAdmin } from '@/lib/auth';
import { useCategories } from '@/lib/hooks/use-categories';
import { categoryQueryKeys } from '@/lib/api/queries';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/confirm-dialog-context';
import { useT, translationKeys } from '@/lib/utils/translations';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string;
  parent?: Category;
  children?: Category[];
}

export default function CategoriesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useCategories();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const confirm = useConfirm();
  const t = useT();

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth/login');
      return;
    }
  }, [router]);

  const flattenCategories = (cats: Category[], parentId: string | null = null): Category[] => {
    const result: Category[] = [];
    for (const cat of cats) {
      if (cat.parentId === parentId) {
        result.push(cat);
        if (cat.children && cat.children.length > 0) {
          result.push(...flattenCategories(cat.children, cat.id));
        }
      }
    }
    return result;
  };

  const flatCategories = useMemo(() => {
    return flattenCategories(categories);
  }, [categories]);

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', parentId: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || '',
      parentId: category.parentId || '',
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({ name: '', description: '', parentId: '' });
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
      await apiService.post('/categories', {
        name: formData.name,
        description: formData.description || undefined,
        parentId: formData.parentId || undefined,
      });
      await queryClient.refetchQueries({ queryKey: categoryQueryKeys.list() });
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
      await apiService.patch(`/categories/${editingId}`, {
        name: formData.name,
        description: formData.description || undefined,
        parentId: formData.parentId || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: categoryQueryKeys.list() });
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
      await apiService.delete(`/categories/${id}`);
      await queryClient.refetchQueries({ queryKey: categoryQueryKeys.list() });
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

  const renderCategoryTree = (cats: Category[], parentId: string | null = null, level = 0) => {
    return cats
      .filter((cat) => cat.parentId === parentId)
      .map((cat) => (
        <div key={cat.id} className="ml-4">
          <Card className="mb-2">
            <CardHeader>
              <CardTitle className="text-lg">
                {'  '.repeat(level)}
                {cat.name}
              </CardTitle>
              <CardDescription>{cat.slug}</CardDescription>
            </CardHeader>
            <CardContent>
              {cat.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {cat.description}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(cat)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t(translationKeys.admin.categories.edit, 'Edit')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(cat.id, cat.name)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          {cat.children && cat.children.length > 0 && renderCategoryTree(cat.children, cat.id, level + 1)}
        </div>
      ));
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

      {/* Categories Tree */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">{t(translationKeys.common.categories, 'Categories')}</h2>
        {categories.length === 0 ? (
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
          renderCategoryTree(categories)
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t(translationKeys.admin.categories.editTitle, 'Edit Category') : t(translationKeys.admin.categories.createTitle, 'Create New Category')}</DialogTitle>
            <DialogDescription>
              {editingId ? t(translationKeys.admin.categories.editDescription, 'Update category information') : t(translationKeys.admin.categories.createDescription, 'Add a new category to the system')}
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
              <Label htmlFor="description">{t(translationKeys.common.description, 'Description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t(translationKeys.admin.categories.descriptionPlaceholder, 'Category description')}
                rows={3}
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
                  {flatCategories
                    .filter((cat) => !editingId || cat.id !== editingId)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
