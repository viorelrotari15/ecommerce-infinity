'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguages, useDefaultLanguage } from '@/lib/hooks/use-languages';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth';
import { isAdmin } from '@/lib/auth';
import { Plus, Edit, Trash2, CheckCircle2, XCircle, Star } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/confirm-dialog-context';
import { useT, translationKeys } from '@/lib/utils/translations';

interface Language {
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

export default function LanguagesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    isDefault: false,
    isActive: true,
  });

  const { data: languages = [], isLoading } = useLanguages(true);
  const { data: defaultLanguage } = useDefaultLanguage();
  const token = getAuthToken();
  const { toast } = useToast();
  const confirm = useConfirm();
  const t = useT();

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth/login');
    }
  }, [router]);

  const handleCreate = async () => {
    if (!formData.code || !formData.name) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.validationError, 'Validation Error'),
        description: t(translationKeys.common.fillRequired, 'Please fill all required fields'),
      });
      return;
    }

    try {
      await apiClient.post(
        '/languages',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      setFormData({ code: '', name: '', isDefault: false, isActive: true });
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.languages.createSuccess, 'Language created successfully!'),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: error.message || t(translationKeys.common.failed, 'Failed'),
      });
    }
  };

  const handleUpdate = async (code: string, updates: Partial<Language>) => {
    try {
      await apiClient.patch(
        `/languages/${code}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      setEditingCode(null);
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.languages.updateSuccess, 'Language updated successfully!'),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: error.message || t(translationKeys.common.failed, 'Failed'),
      });
    }
  };

  const handleSetDefault = async (code: string) => {
    try {
      await apiClient.post(
        `/languages/${code}/set-default`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.languages.setDefaultSuccess, 'Default language updated!'),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: error.message || t(translationKeys.common.failed, 'Failed'),
      });
    }
  };

  const handleDelete = async (code: string) => {
    const deleteDescription = t(translationKeys.admin.languages.deleteDescription, `Are you sure you want to delete language ${code}? This action cannot be undone.`);
    const confirmed = await confirm({
      title: t(translationKeys.admin.languages.deleteTitle, 'Delete Language'),
      description: deleteDescription.replace(/{code}/g, code),
      confirmText: t(translationKeys.common.delete, 'Delete'),
      cancelText: t(translationKeys.common.cancel, 'Cancel'),
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    try {
      await apiClient.delete(
        `/languages/${code}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.languages.deleteSuccess, 'Language deleted successfully!'),
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
    return <div className="container py-10">{t(translationKeys.admin.languages.loading, 'Loading languages...')}</div>;
  }

  return (
    <div className="container py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t(translationKeys.admin.languages.title, 'Languages Management')}</h1>
        <p className="text-muted-foreground mt-2">
          {t(translationKeys.admin.languages.description, 'Add, edit, and manage supported languages for your application')}
        </p>
      </div>

      {/* Add New Language */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t(translationKeys.admin.languages.addNew, 'Add New Language')}</CardTitle>
          <CardDescription>{t(translationKeys.admin.languages.addLanguage, 'Create a new language entry')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="code">{t(translationKeys.admin.languages.code, 'Language Code *')}</Label>
              <Input
                id="code"
                placeholder={t(translationKeys.admin.languages.codePlaceholder, 'e.g., en, ro, ru')}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                maxLength={5}
              />
            </div>
            <div>
              <Label htmlFor="name">{t(translationKeys.admin.languages.name, 'Language Name *')}</Label>
              <Input
                id="name"
                placeholder={t(translationKeys.admin.languages.namePlaceholder, 'e.g., English')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
                <span className="text-sm">{t(translationKeys.admin.languages.setAsDefault, 'Set as default')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span className="text-sm">{t(translationKeys.admin.languages.active, 'Active')}</span>
              </label>
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {t(translationKeys.admin.languages.addLanguage, 'Add Language')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Languages List */}
      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.admin.languages.allLanguages, 'All Languages')}</CardTitle>
          <CardDescription>
            {languages.length} {t(translationKeys.admin.languages.configured, 'language(s) configured')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {languages.map((lang) => (
              <div
                key={lang.code}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{lang.name}</span>
                      <span className="text-sm text-muted-foreground">({lang.code})</span>
                      {lang.isDefault && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                      {lang.isActive ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {lang.isDefault && `${t(translationKeys.admin.languages.default, 'Default')} • `}
                      {lang.isActive ? t(translationKeys.admin.languages.active, 'Active') : t(translationKeys.admin.languages.inactive, 'Inactive')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!lang.isDefault && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefault(lang.code)}
                    >
                      {t(translationKeys.admin.languages.setDefault, 'Set Default')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdate(lang.code, { isActive: !lang.isActive })}
                  >
                    {lang.isActive ? t(translationKeys.admin.languages.deactivate, 'Deactivate') : t(translationKeys.admin.languages.activate, 'Activate')}
                  </Button>
                  {!lang.isDefault && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(lang.code)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

