'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useLanguages, useDefaultLanguage } from '@/lib/hooks/use-languages';
import { useCurrencies, useDefaultCurrency } from '@/lib/hooks/use-currencies';
import { useUiTranslations, useCreateTranslation, useUpdateTranslation, useDeleteTranslation, useBulkUpdateTranslations } from '@/lib/hooks/use-ui-translations';
import { apiClient } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth';
import { isAdmin } from '@/lib/auth';
import { Plus, Trash2, CheckCircle2, XCircle, Star, DollarSign, Languages, FileText, Settings, Save, Download, Upload, Search, ChevronDown, ChevronUp, FileUp } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getAllTranslationKeys, getEnglishTemplate } from '@/lib/utils/translations';
import { useModal } from '@/lib/contexts/modal-context';

interface Language {
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
  isActive: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = getAuthToken();
  const { showAlert, showConfirm } = useModal();

  // Languages state
  const [languageFormData, setLanguageFormData] = useState({
    code: '',
    name: '',
    isDefault: false,
    isActive: true,
  });

  // Currencies state
  const [currencyFormData, setCurrencyFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    isDefault: false,
    isActive: true,
  });

  // Translations state
  const [searchTerm, setSearchTerm] = useState('');
  const [editingValues, setEditingValues] = useState<Record<string, Record<string, string>>>({});
  const [newKey, setNewKey] = useState('');
  const [newKeyLanguage, setNewKeyLanguage] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const processedTranslationsHash = useRef<string>('');
  const [expandedLanguages, setExpandedLanguages] = useState<Set<string>>(new Set());
  const [importingLanguage, setImportingLanguage] = useState<string | null>(null);
  const [importText, setImportText] = useState<Record<string, string>>({});
  const [isMounted, setIsMounted] = useState(false);

  // Data hooks
  const { data: languages = [], isLoading: isLoadingLanguages } = useLanguages(true);
  const { data: defaultLanguage } = useDefaultLanguage();
  const { data: currencies = [], isLoading: isLoadingCurrencies } = useCurrencies(true);
  const { data: instanceCurrency } = useDefaultCurrency();
  const { data: translations = [], isLoading: isLoadingTranslations } = useUiTranslations();

  const isLoading = isLoadingLanguages || isLoadingCurrencies || isLoadingTranslations;

  const createTranslation = useCreateTranslation();
  const updateTranslation = useUpdateTranslation();
  const deleteTranslation = useDeleteTranslation();
  const bulkUpdate = useBulkUpdateTranslations();

  useEffect(() => {
    setIsMounted(true);
    if (!isAdmin()) {
      router.push('/auth/login');
    }
  }, [router]);

  // Languages handlers
  const handleCreateLanguage = async () => {
    if (!languageFormData.code || !languageFormData.name) {
      await showAlert('Please fill all required fields', {
        title: 'Validation Error',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiClient.post('/languages', languageFormData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      setLanguageFormData({ code: '', name: '', isDefault: false, isActive: true });
      await showAlert('Language created successfully!', {
        title: 'Success',
      });
    } catch (error: any) {
      await showAlert(error.message || 'Failed to create language', {
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateLanguage = async (code: string, updates: Partial<Language>) => {
    try {
      await apiClient.patch(`/languages/${code}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      await showAlert('Language updated successfully!', {
        title: 'Success',
      });
    } catch (error: any) {
      await showAlert(error.message || 'Failed to update language', {
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefaultLanguage = async (code: string) => {
    try {
      await apiClient.post(`/languages/${code}/set-default`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      await showAlert('Default language updated!', {
        title: 'Success',
      });
    } catch (error: any) {
      await showAlert(error.message || 'Failed to set default language', {
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLanguage = async (code: string) => {
    const confirmed = await showConfirm(
      `Are you sure you want to delete language ${code}?`,
      {
        title: 'Delete Language',
        description: 'This action cannot be undone.',
        variant: 'destructive',
        confirmText: 'Delete',
        cancelText: 'Cancel',
      }
    );
    if (!confirmed) return;
    try {
      await apiClient.delete(`/languages/${code}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      await showAlert('Language deleted successfully!', {
        title: 'Success',
      });
    } catch (error: any) {
      await showAlert(error.message || 'Failed to delete language', {
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  // Currencies handlers
  const handleCreateCurrency = async () => {
    if (!currencyFormData.code || !currencyFormData.name || !currencyFormData.symbol) {
      await showAlert('Please fill all required fields', {
        title: 'Validation Error',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiClient.post('/currencies', currencyFormData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      setCurrencyFormData({ code: '', name: '', symbol: '', isDefault: false, isActive: true });
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

  const handleUpdateCurrency = async (code: string, updates: Partial<Currency>) => {
    try {
      await apiClient.patch(`/currencies/${code}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      queryClient.invalidateQueries({ queryKey: ['currencies', 'default'] });
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

  const handleSetDefaultCurrency = async (code: string) => {
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
      await apiClient.post(`/currencies/${code}/set-default`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      queryClient.invalidateQueries({ queryKey: ['currencies', 'default'] });
      await showAlert('Instance currency updated! The page will reload to reflect the change.', {
        title: 'Success',
      });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      await showAlert(error.message || 'Failed to set default currency', {
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCurrency = async (code: string) => {
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
    if (!confirmed) return;
    try {
      await apiClient.delete(`/currencies/${code}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  // Translations handlers
  const translationsHash = useMemo(() => {
    if (!translations || translations.length === 0) return '';
    return JSON.stringify(
      translations
        .map((t) => `${t.key}:${t.translations.map((tr) => `${tr.language}=${tr.value}`).join(',')}`)
        .sort()
    );
  }, [translations]);

  useEffect(() => {
    if (isLoading) return;
    if (translationsHash === processedTranslationsHash.current) return;
    
    processedTranslationsHash.current = translationsHash;
    const values: Record<string, Record<string, string>> = {};
    const allDefinedKeys = getAllTranslationKeys();
    
    allDefinedKeys.forEach((key) => {
      values[key] = {};
    });
    
    translations.forEach((t) => {
      if (!values[t.key]) {
        values[t.key] = {};
      }
      t.translations.forEach((tr) => {
        values[t.key][tr.language] = tr.value;
      });
    });
    
    setEditingValues(values);
  }, [isLoading, translationsHash]);

  const translationsByLanguage = useMemo(() => {
    const grouped: Record<string, Array<{ key: string; value: string; hasTranslation: boolean }>> = {};
    const allDefinedKeys = getAllTranslationKeys();
    
    languages
      .filter((lang) => lang.isActive)
      .forEach((lang) => {
        grouped[lang.code] = allDefinedKeys.map((key) => {
          const translation = translations
            .find((t) => t.key === key)
            ?.translations.find((tr) => tr.language === lang.code);
          
          return {
            key,
            value: translation?.value || editingValues[key]?.[lang.code] || '',
            hasTranslation: !!translation,
          };
        });
      });
    
    return grouped;
  }, [translations, languages, editingValues]);

  const handleSaveTranslation = async (key: string, language: string, value: string) => {
    const existing = translations
      .find((t) => t.key === key)
      ?.translations.find((t) => t.language === language);

    if (existing) {
      await updateTranslation.mutateAsync({ key, language, value });
    } else {
      await createTranslation.mutateAsync({ key, language, value });
    }
  };

  const handleDeleteTranslation = async (key: string, language: string) => {
    const confirmed = await showConfirm(
      `Delete translation for ${key} in ${language}?`,
      {
        title: 'Delete Translation',
        description: 'This action cannot be undone.',
        variant: 'destructive',
        confirmText: 'Delete',
        cancelText: 'Cancel',
      }
    );
    if (confirmed) {
      await deleteTranslation.mutateAsync({ key, language });
    }
  };

  const handleAddNewKey = async () => {
    if (!newKey || !newKeyLanguage || !newKeyValue) {
      await showAlert('Please fill all fields', {
        title: 'Validation Error',
        variant: 'destructive',
      });
      return;
    }
    await createTranslation.mutateAsync({ key: newKey, language: newKeyLanguage, value: newKeyValue });
    setNewKey('');
    setNewKeyLanguage('');
    setNewKeyValue('');
  };

  const handleBulkImport = async (language: string, jsonText: string) => {
    try {
      const translations = JSON.parse(jsonText);
      await bulkUpdate.mutateAsync({ language, translations });
      await showAlert('Translations imported successfully!', {
        title: 'Success',
      });
      setImportingLanguage(null);
    } catch (error) {
      await showAlert('Invalid JSON format', {
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const handleFileImport = async (language: string, file: File) => {
    try {
      const text = await file.text();
      await handleBulkImport(language, text);
      const fileInput = document.getElementById(`file-import-${language}`) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      await showAlert('Failed to read file', {
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const toggleLanguage = (languageCode: string) => {
    setExpandedLanguages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(languageCode)) {
        newSet.delete(languageCode);
      } else {
        newSet.add(languageCode);
      }
      return newSet;
    });
  };

  const exportTranslations = (language: string) => {
    const exportData: Record<string, string> = {};
    const englishTemplate = getEnglishTemplate();
    const allDefinedKeys = getAllTranslationKeys();
    
    allDefinedKeys.forEach((key) => {
      const translation = translations
        .find((t) => t.key === key)
        ?.translations.find((tr) => tr.language === language);
      
      if (translation) {
        exportData[key] = translation.value;
      } else if (language === 'en') {
        exportData[key] = englishTemplate[key] || key.split('.').pop() || key;
      } else {
        exportData[key] = englishTemplate[key] || key.split('.').pop() || key;
      }
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations-${language}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="container py-10">Loading settings...</div>;
  }

  return (
    <div className="container py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage languages, currencies, and UI translations for your application
        </p>
      </div>

      <Tabs defaultValue="languages" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="languages" className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Languages
          </TabsTrigger>
          <TabsTrigger value="currencies" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Currencies
          </TabsTrigger>
          <TabsTrigger value="translations" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            UI Translations
          </TabsTrigger>
        </TabsList>

        {/* Languages Tab */}
        <TabsContent value="languages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Language</CardTitle>
              <CardDescription>Create a new language entry</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="lang-code">Language Code *</Label>
                  <Input
                    id="lang-code"
                    placeholder="e.g., en, ro, ru"
                    value={languageFormData.code}
                    onChange={(e) => setLanguageFormData({ ...languageFormData, code: e.target.value.toLowerCase() })}
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label htmlFor="lang-name">Language Name *</Label>
                  <Input
                    id="lang-name"
                    placeholder="e.g., English"
                    value={languageFormData.name}
                    onChange={(e) => setLanguageFormData({ ...languageFormData, name: e.target.value })}
                  />
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={languageFormData.isDefault}
                      onChange={(e) => setLanguageFormData({ ...languageFormData, isDefault: e.target.checked })}
                    />
                    <span className="text-sm">Set as default</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={languageFormData.isActive}
                      onChange={(e) => setLanguageFormData({ ...languageFormData, isActive: e.target.checked })}
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreateLanguage} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Language
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Languages</CardTitle>
              <CardDescription>{languages.length} language{languages.length !== 1 ? 's' : ''} configured</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {languages.map((lang) => (
                  <div key={lang.code} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{lang.name}</span>
                          <span className="text-sm text-muted-foreground">({lang.code})</span>
                          {lang.isDefault && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
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
                        <Button size="sm" variant="outline" onClick={() => handleSetDefaultLanguage(lang.code)}>
                          Set Default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateLanguage(lang.code, { isActive: !lang.isActive })}
                      >
                        {lang.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      {!lang.isDefault && (
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteLanguage(lang.code)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currencies Tab */}
        <TabsContent value="currencies" className="space-y-6">
          {instanceCurrency && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Current Instance Currency: <span className="font-bold">{instanceCurrency}</span>
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                All prices are displayed in this currency. Change it by setting a different currency as default below.
              </p>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Add New Currency</CardTitle>
              <CardDescription>Create a new currency entry</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div>
                  <Label htmlFor="curr-code">Currency Code *</Label>
                  <Input
                    id="curr-code"
                    placeholder="e.g., USD, EUR, MDL"
                    value={currencyFormData.code}
                    onChange={(e) => setCurrencyFormData({ ...currencyFormData, code: e.target.value.toUpperCase() })}
                    maxLength={3}
                  />
                </div>
                <div>
                  <Label htmlFor="curr-name">Currency Name *</Label>
                  <Input
                    id="curr-name"
                    placeholder="e.g., US Dollar"
                    value={currencyFormData.name}
                    onChange={(e) => setCurrencyFormData({ ...currencyFormData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="curr-symbol">Symbol *</Label>
                  <Input
                    id="curr-symbol"
                    placeholder="e.g., $, €, lei"
                    value={currencyFormData.symbol}
                    onChange={(e) => setCurrencyFormData({ ...currencyFormData, symbol: e.target.value })}
                    maxLength={10}
                  />
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={currencyFormData.isDefault}
                      onChange={(e) => setCurrencyFormData({ ...currencyFormData, isDefault: e.target.checked })}
                    />
                    <span className="text-sm">Set as default</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={currencyFormData.isActive}
                      onChange={(e) => setCurrencyFormData({ ...currencyFormData, isActive: e.target.checked })}
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreateCurrency} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Currency
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Currencies</CardTitle>
              <CardDescription>{currencies.length} currency{currencies.length !== 1 ? 'ies' : ''} configured</CardDescription>
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
                        <Button size="sm" variant="outline" onClick={() => handleSetDefaultCurrency(currency.code)}>
                          Set as Instance Currency
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateCurrency(currency.code, { isActive: !currency.isActive })}
                      >
                        {currency.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      {!currency.isDefault && (
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteCurrency(currency.code)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UI Translations Tab */}
        <TabsContent value="translations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Translation</CardTitle>
              <CardDescription>Create a new translation key and value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="new-key">Translation Key</Label>
                  <Input
                    id="new-key"
                    placeholder="e.g., header.menu.home"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="new-language">Language</Label>
                  <select
                    id="new-language"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newKeyLanguage}
                    onChange={(e) => setNewKeyLanguage(e.target.value)}
                  >
                    <option value="">Select language</option>
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="new-value">Value</Label>
                  <Input
                    id="new-value"
                    placeholder="Translation text"
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddNewKey} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search translation keys..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allLangCodes = languages.filter((lang) => lang.isActive).map((lang) => lang.code);
                  setExpandedLanguages(new Set(allLangCodes));
                }}
              >
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExpandedLanguages(new Set())}>
                Collapse All
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {!isMounted || isLoading ? (
              <div className="py-10 text-center text-muted-foreground">Loading translations...</div>
            ) : languages.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">No languages available</div>
            ) : (
              languages
                .filter((lang) => lang.isActive)
                .map((lang) => {
                  const isExpanded = expandedLanguages.has(lang.code);
                  const langTranslations = translationsByLanguage[lang.code] || [];
                  const filteredLangTranslations = searchTerm
                    ? langTranslations.filter((t) => t.key.toLowerCase().includes(searchTerm.toLowerCase()))
                    : langTranslations;
                  const translatedCount = langTranslations.filter((t) => t.hasTranslation).length;
                  const totalCount = langTranslations.length;

                  return (
                    <Card key={lang.code}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => toggleLanguage(lang.code)}
                            className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            <CardTitle className="text-lg">
                              {lang.name} ({lang.code})
                            </CardTitle>
                            <span className="text-sm text-muted-foreground">
                              {translatedCount}/{totalCount} translated
                            </span>
                          </button>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => exportTranslations(lang.code)}>
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setImportingLanguage(importingLanguage === lang.code ? null : lang.code)}
                            >
                              <FileUp className="h-4 w-4 mr-2" />
                              Import
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {isExpanded && (
                        <CardContent>
                          {importingLanguage === lang.code && (
                            <Card className="mb-4 border-2 border-dashed">
                              <CardHeader>
                                <CardTitle className="text-sm">Import Translations from JSON</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor={`file-import-${lang.code}`}>Upload JSON File</Label>
                                    <Input
                                      id={`file-import-${lang.code}`}
                                      type="file"
                                      accept=".json"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileImport(lang.code, file);
                                      }}
                                      className="mt-2"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`text-import-${lang.code}`}>Or Paste JSON</Label>
                                    <Textarea
                                      id={`text-import-${lang.code}`}
                                      placeholder='{"header.menu.home": "Home", ...}'
                                      className="mt-2 min-h-[100px] font-mono text-sm"
                                      value={importText[lang.code] || ''}
                                      onChange={(e) => {
                                        setImportText((prev) => ({ ...prev, [lang.code]: e.target.value }));
                                      }}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        if (importText[lang.code]?.trim()) {
                                          handleBulkImport(lang.code, importText[lang.code]);
                                          setImportText((prev) => ({ ...prev, [lang.code]: '' }));
                                        }
                                      }}
                                      disabled={!importText[lang.code]?.trim() || bulkUpdate.isPending}
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      Import JSON
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setImportingLanguage(null);
                                        setImportText((prev) => ({ ...prev, [lang.code]: '' }));
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          <div className="space-y-4">
                            {filteredLangTranslations.map((translation) => {
                              const currentValue = editingValues[translation.key]?.[lang.code] || translation.value || '';

                              return (
                                <div key={translation.key} className="border rounded-lg p-4 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm font-mono">{translation.key}</Label>
                                    {translation.hasTranslation ? (
                                      <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                        Translated
                                      </span>
                                    ) : (
                                      <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                        Missing
                                      </span>
                                    )}
                                  </div>
                                  <Textarea
                                    value={currentValue}
                                    onChange={(e) => {
                                      setEditingValues((prev) => ({
                                        ...prev,
                                        [translation.key]: {
                                          ...prev[translation.key],
                                          [lang.code]: e.target.value,
                                        },
                                      }));
                                    }}
                                    className="min-h-[80px]"
                                    placeholder={`Enter translation for ${translation.key}...`}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleSaveTranslation(
                                          translation.key,
                                          lang.code,
                                          editingValues[translation.key]?.[lang.code] || currentValue
                                        )
                                      }
                                      disabled={updateTranslation.isPending || bulkUpdate.isPending}
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                    {translation.hasTranslation && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDeleteTranslation(translation.key, lang.code)}
                                        disabled={deleteTranslation.isPending}
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Delete
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

