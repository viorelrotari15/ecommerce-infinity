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

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth/login');
    }
  }, [router]);

  const handleCreate = async () => {
    if (!formData.code || !formData.name) {
      alert('Please fill all required fields');
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
      alert('Language created successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to create language');
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
      alert('Language updated successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to update language');
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
      alert('Default language updated!');
    } catch (error: any) {
      alert(error.message || 'Failed to set default language');
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to delete language ${code}?`)) {
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
      alert('Language deleted successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to delete language');
    }
  };

  if (isLoading) {
    return <div className="container py-10">Loading languages...</div>;
  }

  return (
    <div className="container py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Languages Management</h1>
        <p className="text-muted-foreground mt-2">
          Add, edit, and manage supported languages for your application
        </p>
      </div>

      {/* Add New Language */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add New Language</CardTitle>
          <CardDescription>Create a new language entry</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="code">Language Code *</Label>
              <Input
                id="code"
                placeholder="e.g., en, ro, ru"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                maxLength={5}
              />
            </div>
            <div>
              <Label htmlFor="name">Language Name *</Label>
              <Input
                id="name"
                placeholder="e.g., English"
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
                <span className="text-sm">Set as default</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Language
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Languages List */}
      <Card>
        <CardHeader>
          <CardTitle>All Languages</CardTitle>
          <CardDescription>
            {languages.length} language{languages.length !== 1 ? 's' : ''} configured
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
                      {lang.isDefault && 'Default • '}
                      {lang.isActive ? 'Active' : 'Inactive'}
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
                      Set Default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdate(lang.code, { isActive: !lang.isActive })}
                  >
                    {lang.isActive ? 'Deactivate' : 'Activate'}
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

