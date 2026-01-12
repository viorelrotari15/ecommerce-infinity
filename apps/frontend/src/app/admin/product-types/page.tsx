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
import { useProductTypes, productTypeQueryKeys } from '@/lib/hooks/use-product-types';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface ProductType {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function ProductTypesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: productTypes = [], isLoading } = useProductTypes();
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

  const openEditDialog = (productType: ProductType) => {
    setEditingId(productType.id);
    setFormData({
      name: productType.name,
      description: productType.description || '',
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
        '/product-types',
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
      await queryClient.refetchQueries({ queryKey: productTypeQueryKeys.list() });
      closeDialog();
      setIsCreating(false);
      alert('Product type created successfully!');
    } catch (error: any) {
      setIsCreating(false);
      alert(error.message || 'Failed to create product type');
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
        `/product-types/${editingId}`,
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
      await queryClient.invalidateQueries({ queryKey: productTypeQueryKeys.list() });
      closeDialog();
      setIsCreating(false);
      alert('Product type updated successfully!');
    } catch (error: any) {
      setIsCreating(false);
      alert(error.message || 'Failed to update product type');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/product-types/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await queryClient.refetchQueries({ queryKey: productTypeQueryKeys.list() });
      alert('Product type deleted successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to delete product type');
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading product types...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Product Types</h1>
          <p className="text-muted-foreground mt-2">
            Create, edit, and delete product types
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Product Type
        </Button>
      </div>

      {/* Product Types List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {productTypes.map((productType) => (
          <Card key={productType.id}>
            <CardHeader>
              <CardTitle>{productType.name}</CardTitle>
              <CardDescription>{productType.slug}</CardDescription>
            </CardHeader>
            <CardContent>
              {productType.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {productType.description}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(productType)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(productType.id, productType.name)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {productTypes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No product types found.</p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Product Type
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Product Type' : 'Create New Product Type'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update product type information' : 'Add a new product type to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Product type name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product type description"
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
                  ? 'Update Product Type'
                  : 'Create Product Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
