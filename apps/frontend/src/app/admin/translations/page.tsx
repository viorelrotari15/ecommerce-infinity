'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUiTranslations, useCreateTranslation, useUpdateTranslation, useDeleteTranslation, useBulkUpdateTranslations } from '@/lib/hooks/use-ui-translations';
import { useLanguages } from '@/lib/hooks/use-languages';
import { isAdmin, getAuthToken } from '@/lib/auth';
import { Plus, Save, Trash2, Download, Upload, Search, ChevronDown, ChevronUp, FileUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { getAllTranslationKeys, getEnglishTemplate } from '@/lib/utils/translations';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/confirm-dialog-context';
import { useT, translationKeys } from '@/lib/utils/translations';

export default function TranslationsPage() {
  const router = useRouter();
  const t = useT();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, Record<string, string>>>({});
  const [newKey, setNewKey] = useState('');
  const [newKeyLanguage, setNewKeyLanguage] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const processedTranslationsHash = useRef<string>('');
  const [expandedLanguages, setExpandedLanguages] = useState<Set<string>>(new Set());
  const [importingLanguage, setImportingLanguage] = useState<string | null>(null);
  const [importText, setImportText] = useState<Record<string, string>>({});
  const [isMounted, setIsMounted] = useState(false);

  const { data: translations = [], isLoading: isLoadingTranslations } = useUiTranslations();
  const { data: languages = [], isLoading: isLoadingLanguages } = useLanguages(true);
  
  const isLoading = isLoadingTranslations || isLoadingLanguages;

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const { toast } = useToast();
  const confirm = useConfirm();
  const createTranslation = useCreateTranslation();
  const updateTranslation = useUpdateTranslation();
  const deleteTranslation = useDeleteTranslation();
  const bulkUpdate = useBulkUpdateTranslations();

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth/login');
    }
  }, [router]);

  // Create a stable hash of translations content (not reference)
  const translationsHash = useMemo(() => {
    if (!translations || translations.length === 0) return '';
    return JSON.stringify(
      translations
        .map((t) => `${t.key}:${t.translations.map((tr) => `${tr.language}=${tr.value}`).join(',')}`)
        .sort()
    );
  }, [translations]);

  // Initialize editing values only when translations data actually changes
  useEffect(() => {
    if (isLoading) {
      return;
    }
    
    // Skip if we've already processed this exact data
    if (translationsHash === processedTranslationsHash.current) {
      return;
    }
    
    processedTranslationsHash.current = translationsHash;
    
    const values: Record<string, Record<string, string>> = {};
    const allDefinedKeys = getAllTranslationKeys();
    
    // Initialize all keys from translationKeys
    allDefinedKeys.forEach((key) => {
      values[key] = {};
    });
    
    // Add existing translations from database
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

  // Get all keys from translationKeys and merge with existing translations
  const allKeys = useMemo(() => {
    const definedKeys = getAllTranslationKeys();
    const existingKeys = new Set(translations.map((t) => t.key));
    
    // Create a map of all keys (from translationKeys and existing translations)
    const keysMap = new Map<string, typeof translations[0]>();
    
    // Add existing translations
    translations.forEach((t) => {
      keysMap.set(t.key, t);
    });
    
    // Add keys from translationKeys that don't exist yet
    definedKeys.forEach((key) => {
      if (!keysMap.has(key)) {
        keysMap.set(key, {
          key,
          translations: [],
        });
      }
    });
    
    return Array.from(keysMap.values());
  }, [translations]);

  const filteredTranslations = allKeys.filter((t) =>
    t.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group translations by language for the new layout
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

  const handleSave = async (key: string, language: string, value: string) => {
    const existing = translations
      .find((t) => t.key === key)
      ?.translations.find((t) => t.language === language);

    if (existing) {
      await updateTranslation.mutateAsync({ key, language, value });
    } else {
      await createTranslation.mutateAsync({ key, language, value });
    }
  };

  const handleDelete = async (key: string, language: string) => {
    const confirmed = await confirm({
      title: t(translationKeys.admin.translations.deleteTitle, 'Delete Translation'),
      description: t(translationKeys.admin.translations.deleteDescription, `Are you sure you want to delete the translation for "${key}" in ${language}?`).replace('{key}', key).replace('{language}', language),
      confirmText: t(translationKeys.common.delete, 'Delete'),
      cancelText: t(translationKeys.common.cancel, 'Cancel'),
      variant: 'destructive',
    });

    if (confirmed) {
      await deleteTranslation.mutateAsync({ key, language });
    }
  };

  const handleAddNewKey = async () => {
    if (!newKey || !newKeyLanguage || !newKeyValue) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.admin.translations.validationError, 'Validation Error'),
        description: t(translationKeys.admin.translations.fillAllFields, 'Please fill all fields'),
      });
      return;
    }

    await createTranslation.mutateAsync({
      key: newKey,
      language: newKeyLanguage,
      value: newKeyValue,
    });

    setNewKey('');
    setNewKeyLanguage('');
    setNewKeyValue('');
  };

  const handleBulkImport = async (language: string, jsonText: string) => {
    // Check authentication before proceeding
    const token = getAuthToken();
    if (!token) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'Please log in to import translations.',
      });
      router.push('/auth/login');
      return;
    }

    if (!isAdmin()) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to import translations.',
      });
      return;
    }

    try {
      // Parse JSON
      const translations = JSON.parse(jsonText);
      
      // Validate that translations is an object
      if (typeof translations !== 'object' || translations === null || Array.isArray(translations)) {
        toast({
          variant: 'destructive',
          title: 'Invalid Format',
          description: 'Translations must be a JSON object with key-value pairs.',
        });
        return;
      }
      
      // Validate that all values are strings
      const invalidKeys = Object.entries(translations).filter(([_, value]) => typeof value !== 'string');
      if (invalidKeys.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Invalid Format',
          description: `All translation values must be strings. Found invalid values for keys: ${invalidKeys.map(([key]) => key).join(', ')}`,
        });
        return;
      }
      
      // Import translations
      await bulkUpdate.mutateAsync({ language, translations });
      toast({
        variant: 'default',
        title: 'Success',
        description: `Successfully imported ${Object.keys(translations).length} translations!`,
      });
      setImportingLanguage(null);
      setImportText((prev) => ({
        ...prev,
        [language]: '',
      }));
    } catch (error: any) {
      // Handle JSON parse errors
      if (error instanceof SyntaxError) {
        toast({
          variant: 'destructive',
          title: 'Invalid JSON',
          description: 'The JSON format is invalid. Please check your syntax.',
        });
      } else if (error?.status === 401 || error?.status === 403) {
        // Handle authentication/authorization errors
        toast({
          variant: 'destructive',
          title: 'Unauthorized',
          description: 'Your session has expired or you do not have permission. Please log in again.',
        });
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      } else if (error?.response?.message) {
        // Handle API validation errors from backend
        const errorMessage = error.response.message;
        toast({
          variant: 'destructive',
          title: 'Import Failed',
          description: errorMessage || 'Failed to import translations. Please try again.',
        });
      } else if (error?.message) {
        // Handle other errors with message
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
          toast({
            variant: 'destructive',
            title: 'Unauthorized',
            description: 'Your session has expired or you do not have permission. Please log in again.',
          });
          setTimeout(() => {
            router.push('/auth/login');
          }, 2000);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'Failed to import translations. Please try again.',
          });
        }
      } else {
        // Handle unknown errors
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to import translations. Please check your connection and try again.',
        });
      }
    }
  };

  const handleFileImport = async (language: string, file: File) => {
    try {
      const text = await file.text();
      await handleBulkImport(language, text);
      // Reset file input
      const fileInput = document.getElementById(`file-import-${language}`) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to read file. Please try again.',
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
    
    // Get all keys (from translationKeys)
    const allDefinedKeys = getAllTranslationKeys();
    
    // For each key, use the translation if it exists, otherwise use English template
    allDefinedKeys.forEach((key) => {
      const translation = translations
        .find((t) => t.key === key)
        ?.translations.find((tr) => tr.language === language);
      
      if (translation) {
        exportData[key] = translation.value;
      } else if (language === 'en') {
        // For English, use the template value
        exportData[key] = englishTemplate[key] || key.split('.').pop() || key;
      } else {
        // For other languages, include English as fallback
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

  return (
    <div className="container py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t(translationKeys.admin.translations.title, 'UI Translations Management')}</h1>
        <p className="text-muted-foreground mt-2">
          {t(translationKeys.admin.translations.description, 'Manage all interface text translations for your application')}
        </p>
      </div>

      {/* Add New Translation */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t(translationKeys.admin.translations.addTitle, 'Add New Translation')}</CardTitle>
          <CardDescription>{t(translationKeys.admin.translations.addDescription, 'Create a new translation key and value')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="new-key">{t(translationKeys.admin.translations.translationKey, 'Translation Key')}</Label>
              <Input
                id="new-key"
                placeholder={t(translationKeys.admin.translations.keyPlaceholder, 'e.g., header.menu.home')}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="new-language">{t(translationKeys.admin.translations.language, 'Language')}</Label>
              <select
                id="new-language"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newKeyLanguage}
                onChange={(e) => setNewKeyLanguage(e.target.value)}
              >
                <option value="">{t(translationKeys.common.select, 'Select language')}</option>
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="new-value">{t(translationKeys.admin.translations.value, 'Value')}</Label>
              <Input
                id="new-value"
                placeholder={t(translationKeys.admin.translations.valuePlaceholder, 'Translation text')}
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddNewKey} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {t(translationKeys.common.add, 'Add')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Controls */}
      <div className="mb-4 flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t(translationKeys.admin.translations.searchPlaceholder, 'Search translation keys...')}
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
            {t(translationKeys.admin.translations.expandAll, 'Expand All')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedLanguages(new Set())}
          >
            {t(translationKeys.admin.translations.collapseAll, 'Collapse All')}
          </Button>
        </div>
      </div>

      {/* Translations by Language */}
      <div className="space-y-4">
        {!isMounted || isLoading ? (
          <div className="py-10 text-center text-muted-foreground">{t(translationKeys.admin.translations.loading, 'Loading translations...')}</div>
        ) : languages.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">{t(translationKeys.admin.languages.noLanguages || 'admin.translations.noLanguages', 'No languages available')}</div>
        ) : (
          <>
            {languages
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
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <button
                      onClick={() => toggleLanguage(lang.code)}
                      className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity min-w-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                      <CardTitle className="text-lg">
                        {lang.name} ({lang.code})
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {translatedCount}/{totalCount} {t(translationKeys.admin.translations.translated || 'common.translated', 'translated')}
                      </span>
                    </button>
                    <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportTranslations(lang.code)}
                        className="whitespace-nowrap"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {t(translationKeys.admin.translations.export, 'Export')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Expand the accordion if it's collapsed
                          if (!isExpanded) {
                            setExpandedLanguages((prev) => {
                              const newSet = new Set(prev);
                              newSet.add(lang.code);
                              return newSet;
                            });
                          }
                          // Toggle import section
                          setImportingLanguage(importingLanguage === lang.code ? null : lang.code);
                        }}
                        className="whitespace-nowrap"
                      >
                        <FileUp className="h-4 w-4 mr-2" />
                        {t(translationKeys.admin.translations.import, 'Import')}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent>
                    {/* Import Section */}
                    {importingLanguage === lang.code && (
                      <Card className="mb-4 border-2 border-dashed">
                        <CardHeader>
                          <CardTitle className="text-sm">{t(translationKeys.admin.translations.importSection, 'Import Translations from JSON')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <Label>{t(translationKeys.admin.translations.uploadFile, 'Upload JSON File')}</Label>
                              <div className="mt-2">
                                <label
                                  htmlFor={`file-import-${lang.code}`}
                                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-white h-9 px-3 cursor-pointer"
                                >
                                  <input
                                    id={`file-import-${lang.code}`}
                                    type="file"
                                    accept=".json"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleFileImport(lang.code, file);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <FileUp className="h-4 w-4 mr-2" />
                                  {t(translationKeys.admin.translations.chooseFile, 'Choose File')}
                                </label>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor={`text-import-${lang.code}`}>{t(translationKeys.admin.translations.pasteJson, 'Or Paste JSON')}</Label>
                              <Textarea
                                id={`text-import-${lang.code}`}
                                placeholder='{"header.menu.home": "Home", ...}'
                                className="mt-2 min-h-[100px] font-mono text-sm"
                                value={importText[lang.code] || ''}
                                onChange={(e) => {
                                  setImportText((prev) => ({
                                    ...prev,
                                    [lang.code]: e.target.value,
                                  }));
                                }}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (importText[lang.code]?.trim()) {
                                    handleBulkImport(lang.code, importText[lang.code]);
                                    setImportText((prev) => ({
                                      ...prev,
                                      [lang.code]: '',
                                    }));
                                  }
                                }}
                                disabled={!importText[lang.code]?.trim() || bulkUpdate.isPending}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                {t(translationKeys.admin.translations.importJson, 'Import JSON')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setImportingLanguage(null);
                                  setImportText((prev) => ({
                                    ...prev,
                                    [lang.code]: '',
                                  }));
                                }}
                              >
                                {t(translationKeys.common.cancel, 'Cancel')}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Translations List */}
                    <div className="space-y-4">
                      {filteredLangTranslations.map((translation) => {
                        const currentValue = editingValues[translation.key]?.[lang.code] || translation.value || '';
                        
                        return (
                          <div key={translation.key} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-mono">{translation.key}</Label>
                              {translation.hasTranslation && (
                                <span className="text-xs px-2 py-1 rounded bg-secondary/10 text-secondary-foreground">
                                  {t(translationKeys.admin.translations.translated, 'Translated')}
                                </span>
                              )}
                              {!translation.hasTranslation && (
                                <span className="text-xs px-2 py-1 rounded bg-accent/10 text-accent-foreground">
                                  {t(translationKeys.admin.translations.missing, 'Missing')}
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
                              placeholder={t(translationKeys.admin.translations.enterTranslation, `Enter translation for ${translation.key}...`).replace('{key}', translation.key)}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleSave(
                                    translation.key,
                                    lang.code,
                                    editingValues[translation.key]?.[lang.code] || currentValue
                                  )
                                }
                                disabled={updateTranslation.isPending || bulkUpdate.isPending}
                              >
                                <Save className="h-3 w-3 mr-1" />
                                {t(translationKeys.common.save, 'Save')}
                              </Button>
                              {translation.hasTranslation && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(translation.key, lang.code)}
                                  disabled={deleteTranslation.isPending}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  {t(translationKeys.common.delete, 'Delete')}
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
          })}
          </>
        )}
      </div>

    </div>
  );
}

