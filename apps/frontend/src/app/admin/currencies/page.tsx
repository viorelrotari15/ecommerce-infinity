'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrencies, useDefaultCurrency } from '@/lib/hooks/use-currencies';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth';
import { isAdmin } from '@/lib/auth';
import { Plus, Edit, Trash2, CheckCircle2, XCircle, Star, DollarSign } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/lib/contexts/modal-context';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
  isActive: boolean;
}

export default function CurrenciesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showAlert, showConfirm } = useModal();
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    isDefault: false,
    isActive: true,
  });

  const { data: currencies = [], isLoading } = useCurrencies(true);
  const { data: instanceCurrency } = useDefaultCurrency();
  const token = getAuthToken();

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth/login');
    }
  }, [router]);

  const handleCreate = async () => {
    if (!formData.code || !formData.name || !formData.symbol) {
      await showAlert('Please fill all required fields', {
        title: 'Validation Error',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiClient.post(
        '/currencies',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      setFormData({ code: '', name: '', symbol: '', isDefault: false, isActive: true });
      await showAlert('Currency created successfully!', {
        title: 'Success',
      });
    } catch (error: any) {
      await showAlert(error.message || 'Failed to create currency', {
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (code: string, updates: Partial<Currency>) => {
    try {
      await apiClient.patch(
        `/currencies/${code}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      queryClient.invalidateQueries({ queryKey: ['currencies', 'default'] });
      setEditingCode(null);
      await showAlert('Currency updated successfully!', {
        title: 'Success',
      });
    } catch (error: any) {
      await showAlert(error.message || 'Failed to update currency', {
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (code: string) => {
    const confirmed = await showConfirm(
      `Set ${code} as the instance currency? This will change the currency for all products and orders.`,
      {
        title: 'Change Instance Currency',
        description: 'This action will affect all products and orders in the system.',
        variant: 'destructive',
        confirmText: 'Change Currency',
        cancelText: 'Cancel',
      }
    );
    if (!confirmed) {
      return;
    }

    try {
      await apiClient.post(
        `/currencies/${code}/set-default`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      queryClient.invalidateQueries({ queryKey: ['currencies', 'default'] });
      await showAlert('Instance currency updated! The page will reload to reflect the change.', {
        title: 'Success',
      });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      await showAlert(error.message || 'Failed to set default currency', {
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (code: string) => {
    const confirmed = await showConfirm(
      `Are you sure you want to delete currency ${code}?`,
      {
        title: 'Delete Currency',
        description: 'This action cannot be undone.',
        variant: 'destructive',
        confirmText: 'Delete',
        cancelText: 'Cancel',
      }
    );
    if (!confirmed) {
      return;
    }

    try {
      await apiClient.delete(
        `/currencies/${code}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      await showAlert('Currency deleted successfully!', {
        title: 'Success',
      });
    } catch (error: any) {
      await showAlert(error.message || 'Failed to delete currency', {
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="container py-10">Loading currencies...</div>;
  }

  return (
    <div className="container py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Currency Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage the instance currency. Only one currency can be active per instance.
        </p>
        {instanceCurrency && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Current Instance Currency: <span className="font-bold">{instanceCurrency}</span>
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              All prices are displayed in this currency. Change it by setting a different currency as default below.
            </p>
          </div>
        )}
      </div>

      {/* Add New Currency */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add New Currency</CardTitle>
          <CardDescription>Create a new currency entry</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <Label htmlFor="code">Currency Code *</Label>
              <Input
                id="code"
                placeholder="e.g., USD, EUR, MDL"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                maxLength={3}
              />
            </div>
            <div>
              <Label htmlFor="name">Currency Name *</Label>
              <Input
                id="name"
                placeholder="e.g., US Dollar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                placeholder="e.g., $, €, lei"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                maxLength={10}
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
                Add Currency
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Currencies List */}
      <Card>
        <CardHeader>
          <CardTitle>All Currencies</CardTitle>
          <CardDescription>
            {currencies.length} currency{currencies.length !== 1 ? 'ies' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currencies.map((currency) => (
              <div
                key={currency.code}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  currency.isDefault ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{currency.name}</span>
                      <span className="text-sm text-muted-foreground">({currency.code})</span>
                      <span className="text-lg font-bold">{currency.symbol}</span>
                      {currency.isDefault && (
                        <>
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                            Instance Currency
                          </span>
                        </>
                      )}
                      {currency.isActive ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {currency.isDefault && 'Default • '}
                      {currency.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!currency.isDefault && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefault(currency.code)}
                    >
                      Set as Instance Currency
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdate(currency.code, { isActive: !currency.isActive })}
                  >
                    {currency.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  {!currency.isDefault && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(currency.code)}
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

