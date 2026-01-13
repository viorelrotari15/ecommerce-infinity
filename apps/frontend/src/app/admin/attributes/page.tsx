'use client';

import { useState, useEffect } from 'react';
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
import { useAttributes, useCreateAttribute, useUpdateAttribute, useDeleteAttribute, useAttributeTranslations, useUpsertAttributeTranslation, type Attribute } from '@/lib/hooks/use-attributes';
import { useLanguages } from '@/lib/hooks/use-languages';
import { Plus, Edit, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/confirm-dialog-context';
import { useT, translationKeys } from '@/lib/utils/translations';

export default function AttributesPage() {
  const router = useRouter();
  const { data: attributes = [], isLoading } = useAttributes();
  const { data: languages = [] } = useLanguages(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTranslationDialogOpen, setIsTranslationDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [translationAttributeId, setTranslationAttributeId] = useState<string | null>(null);
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    parentId: '',
  });
  const [translationData, setTranslationData] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const token = getAuthToken();
  const { toast } = useToast();
  const confirm = useConfirm();
  const t = useT();

  const createAttribute = useCreateAttribute();
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

  const openEditDialog = (attribute: Attribute) => {
    setEditingId(attribute.id);
    setFormData({
      name: attribute.name,
      parentId: attribute.parentId || '',
    });
    setIsDialogOpen(true);
  };

  const openTranslationDialog = async (attributeId: string) => {
    setTranslationAttributeId(attributeId);
    // Load existing translations
    try {
      if (token) {
        const translations = await fetchAPIAuth<Array<{ language: string; name: string }>>(
          `/attributes/${attributeId}/translations`,
          token,
        );
        const translationMap: Record<string, string> = {};
        languages.forEach((lang) => {
          const existing = translations?.find((t) => t.language === lang.code);
          translationMap[lang.code] = existing?.name || '';
        });
        setTranslationData(translationMap);
      } else {
        // Initialize with empty strings
        const translationMap: Record<string, string> = {};
        languages.forEach((lang) => {
          translationMap[lang.code] = '';
        });
        setTranslationData(translationMap);
      }
    } catch (error) {
      // Initialize with empty strings on error
      const translationMap: Record<string, string> = {};
      languages.forEach((lang) => {
        translationMap[lang.code] = '';
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
    setTranslationAttributeId(null);
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
      await createAttribute.mutateAsync({
        name: formData.name,
        parentId: formData.parentId || undefined,
      });
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
      await updateAttribute.mutateAsync({
        id: editingId,
        data: {
          name: formData.name,
          parentId: formData.parentId || undefined,
        },
      });
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

  const handleSaveTranslations = async () => {
    if (!translationAttributeId) return;

    try {
      setIsCreating(true);
      const promises = languages.map((lang) => {
        const name = translationData[lang.code]?.trim();
        if (!name) return Promise.resolve();
        return upsertTranslation.mutateAsync({
          attributeId: translationAttributeId,
          language: lang.code,
          name,
        });
      });

      await Promise.all(promises);
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

  const renderAttribute = (attribute: Attribute, level: number = 0) => {
    const subattributes = getSubattributes(attribute.id);
    const hasSubattributes = subattributes.length > 0;
    const isExpanded = expandedAttributes.has(attribute.id);

    return (
      <div key={attribute.id} className="ml-4">
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
                <div className="flex-1">
                  <div className="font-medium">{attribute.name}</div>
                  <div className="text-sm text-muted-foreground">{attribute.slug}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openTranslationDialog(attribute.id)}
                >
                  {t(translationKeys.common.translations, 'Translations')}
                </Button>
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
            {subattributes.map((subattr) => renderAttribute(subattr, level + 1))}
          </div>
        )}
      </div>
    );
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
        <DialogContent className="max-w-2xl">
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
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Attribute name"
              />
            </div>
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

      {/* Translation Dialog */}
      <Dialog open={isTranslationDialogOpen} onOpenChange={setIsTranslationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attribute Translations</DialogTitle>
            <DialogDescription>
              Add translations for this attribute in different languages
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
                    <Label htmlFor={`translation-${lang.code}`}>
                      Name ({lang.name})
                    </Label>
                    <Input
                      id={`translation-${lang.code}`}
                      value={translationData[lang.code] || ''}
                      onChange={(e) =>
                        setTranslationData({
                          ...translationData,
                          [lang.code]: e.target.value,
                        })
                      }
                      placeholder={`Enter name in ${lang.name}`}
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
