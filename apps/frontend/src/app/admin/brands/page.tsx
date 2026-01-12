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
import { useBrands } from '@/lib/hooks/use-brands';
import { brandQueryKeys } from '@/lib/api/queries';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const token = getAuthToken();

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
    if (!formData.name) {
      alert('Please fill in the name field');
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
      await queryClient.refetchQueries({ queryKey: brandQueryKeys.list() });
      closeDialog();
      setIsCreating(false);
      alert('Brand created successfully!');
    } catch (error: any) {
      setIsCreating(false);
      alert(error.message || 'Failed to create brand');
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    
    if (!formData.name) {
      alert('Please fill in the name field');
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
      await queryClient.invalidateQueries({ queryKey: brandQueryKeys.list() });
      closeDialog();
      setIsCreating(false);
      alert('Brand updated successfully!');
    } catch (error: any) {
      setIsCreating(false);
      alert(error.message || 'Failed to update brand');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/brands/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await queryClient.refetchQueries({ queryKey: brandQueryKeys.list() });
      alert('Brand deleted successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to delete brand');
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading brands...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Brands</h1>
          <p className="text-muted-foreground mt-2">
            Create, edit, and delete product brands
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Brand
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
                  onClick={() => openEditDialog(brand)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
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
            <p className="text-muted-foreground mb-4">No brands found.</p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Brand
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Brand' : 'Create New Brand'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update brand information' : 'Add a new brand to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Brand name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brand description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={isCreating}
            >
              {isCreating
                ? editingId
                  ? 'Updating...'
                  : 'Creating...'
                : editingId
                  ? 'Update Brand'
                  : 'Create Brand'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
