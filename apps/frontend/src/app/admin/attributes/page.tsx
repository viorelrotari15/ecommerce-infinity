'use client';

import { useState, useEffect, useRef } from 'react';
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
import { useAttributes, useUpdateAttribute, useDeleteAttribute, useAttributeTranslations, useUpsertAttributeTranslation, attributeQueryKeys, type Attribute } from '@/lib/hooks/use-attributes';
import { apiClient } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguages } from '@/lib/hooks/use-languages';
import { Plus, Edit, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/confirm-dialog-context';
import { useT, translationKeys } from '@/lib/utils/translations';
import { AttributeTranslationsTabs, type AttributeTranslationsTabsRef } from '@/components/admin/attribute-translations-tabs';
import { TranslationWarningBadge } from '@/components/admin/translation-warning-badge';
import { useAttributeTranslationStatus } from '@/lib/hooks/use-translation-status';

export default function AttributesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: attributes = [], isLoading } = useAttributes();
  const { data: languages = [] } = useLanguages(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    parentId: '',
  });
  const [creationTranslationData, setCreationTranslationData] = useState<Record<string, { name: string }>>({});
  const [isCreating, setIsCreating] = useState(false);
  const token = getAuthToken();
  const { toast } = useToast();
  const confirm = useConfirm();
  const t = useT();
  const translationTabsRef = useRef<AttributeTranslationsTabsRef>(null);

  const updateAttribute = useUpdateAttribute();
  const deleteAttribute = useDeleteAttribute();
  const upsertTranslation = useUpsertAttributeTranslation();

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth/login');
      return;
    }
  }, [router]);

  // Filter attributes to show only top-level (no parent) or all if showing subattributes
  const topLevelAttributes = attributes.filter((attr) => !attr.parentId);
  
  // Get subattributes for a given attribute
  const getSubattributes = (attributeId: string): Attribute[] => {
    return attributes.filter((attr) => attr.parentId === attributeId);
  };

  // Get all available parent attributes (only top-level attributes, excluding the current one being edited)
  const getAvailableParents = (excludeId?: string): Attribute[] => {
    return attributes.filter((attr) => {
      if (attr.id === excludeId) return false;
      if (attr.parentId) return false; // Only show top-level as parents
      return true;
    });
  };

  const toggleExpand = (attributeId: string) => {
    const newExpanded = new Set(expandedAttributes);
    if (newExpanded.has(attributeId)) {
      newExpanded.delete(attributeId);
    } else {
      newExpanded.add(attributeId);
    }
    setExpandedAttributes(newExpanded);
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({
      name: '',
      parentId: '',
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = async (attribute: Attribute) => {
    setEditingId(attribute.id);
    setFormData({
      name: attribute.name,
      parentId: attribute.parentId || '',
    });
    // Invalidate and refetch translations to ensure fresh data
    queryClient.invalidateQueries({
      queryKey: attributeQueryKeys.translations(attribute.id),
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

      // Create attribute using apiClient directly (same pattern as categories)
      const response = await apiClient.post<Attribute>(
        '/attributes',
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
      const newAttribute = response.data;

      // Save translations for all languages
      if (newAttribute?.id) {
        await Promise.all(
          activeLangs.map(async (lang) => {
            const data = translationData[lang.code];
            if (data?.name?.trim()) {
              return upsertTranslation.mutateAsync({
                attributeId: newAttribute.id,
                language: lang.code,
                name: data.name,
              });
            }
          })
        );
      }

      // Invalidate React Query cache (same pattern as categories)
      await queryClient.invalidateQueries({ queryKey: attributeQueryKeys.all });
      // Refresh Next.js router cache to ensure server-side cache is also invalidated
      router.refresh();

      closeDialog();
      setIsCreating(false);
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: 'Attribute created successfully!',
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
      const translationData = translationTabsRef.current?.getTranslationData() || {};
      const activeLangs = languages.filter((l) => l.isActive);
      const defaultLang = languages.find((l) => l.isDefault) || activeLangs[0];
      
      // Use the default language's name as the main name, or first available translation
      const defaultName = translationData[defaultLang.code]?.name?.trim() || 
                         Object.values(translationData).find(d => d?.name?.trim())?.name?.trim() || 
                         formData.name;

      // Update attribute using apiClient directly (same pattern as categories)
      await apiClient.patch<Attribute>(
        `/attributes/${editingId}`,
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
      if (editingId) {
        await Promise.all(
          activeLangs.map(async (lang) => {
            const data = translationData[lang.code];
            if (data?.name?.trim()) {
              return upsertTranslation.mutateAsync({
                attributeId: editingId,
                language: lang.code,
                name: data.name,
              });
            }
          })
        );
      }

      // Invalidate React Query cache (same pattern as categories)
      await queryClient.invalidateQueries({ queryKey: attributeQueryKeys.all });
      // Refresh Next.js router cache to ensure server-side cache is also invalidated
      router.refresh();
      closeDialog();
      setIsCreating(false);
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: 'Attribute updated successfully!',
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
    const deleteDescription = `Are you sure you want to delete "${name}"? This action cannot be undone.`;
    const confirmed = await confirm({
      title: 'Delete Attribute',
      description: deleteDescription,
      confirmText: t(translationKeys.common.delete, 'Delete'),
      cancelText: t(translationKeys.common.cancel, 'Cancel'),
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteAttribute.mutateAsync(id);
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: 'Attribute deleted successfully!',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: error.message || t(translationKeys.common.failed, 'Failed'),
      });
    }
  };


  // Component for rendering a single attribute with translation status
  const AttributeItem = ({ attribute, level = 0 }: { attribute: Attribute; level?: number }) => {
    const subattributes = getSubattributes(attribute.id);
    const hasSubattributes = subattributes.length > 0;
    const isExpanded = expandedAttributes.has(attribute.id);
    const translationStatus = useAttributeTranslationStatus(attribute.id);

    return (
      <div className="ml-4">
        <Card className="mb-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                {hasSubattributes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(attribute.id)}
                    className="h-6 w-6 p-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {!hasSubattributes && <div className="w-6" />}
                <div className="flex-1 flex items-center gap-2">
                  <div>
                    <div className="font-medium">{attribute.name}</div>
                    <div className="text-sm text-muted-foreground">{attribute.slug}</div>
                  </div>
                  {!translationStatus.hasAllTranslations && (
                    <TranslationWarningBadge
                      missingLanguages={translationStatus.missingLanguages}
                      entityType="attribute"
                    />
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(attribute)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t(translationKeys.common.edit, 'Edit')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(attribute.id, attribute.name)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {hasSubattributes && isExpanded && (
          <div className="ml-4">
            {subattributes.map((subattr) => (
              <AttributeItem key={subattr.id} attribute={subattr} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAttribute = (attribute: Attribute, level: number = 0) => {
    return <AttributeItem key={attribute.id} attribute={attribute} level={level} />;
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading attributes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Attributes</h1>
          <p className="text-muted-foreground mt-2">
            Create, edit, and delete product attributes with subattributes
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Attribute
        </Button>
      </div>

      {/* Attributes List */}
      {topLevelAttributes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No attributes found. Create your first attribute.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Attribute
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          {topLevelAttributes.map((attribute) => renderAttribute(attribute))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Attribute' : 'Create New Attribute'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update attribute information'
                : 'Add a new attribute to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="parentId">Parent Attribute (Optional)</Label>
              <Select
                value={formData.parentId || 'none'}
                onValueChange={(value) => setFormData({ ...formData, parentId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (Top-level attribute)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top-level attribute)</SelectItem>
                  {getAvailableParents(editingId || undefined).map((attr) => (
                    <SelectItem key={attr.id} value={attr.id}>
                      {attr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select a parent attribute to create a subattribute
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Translations *</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Add translations for all languages. Name is required for the default language only. Other languages will fallback to the default language if missing.
              </p>
              <AttributeTranslationsTabs
                ref={translationTabsRef}
                attributeId={editingId || undefined}
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
            <Button onClick={editingId ? handleUpdate : handleCreate} disabled={isCreating}>
              {isCreating
                ? editingId
                  ? 'Updating...'
                  : 'Creating...'
                : editingId
                  ? 'Update Attribute'
                  : 'Create Attribute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
