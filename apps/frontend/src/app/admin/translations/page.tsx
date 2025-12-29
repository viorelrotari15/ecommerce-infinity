'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUiTranslations, useCreateTranslation, useUpdateTranslation, useDeleteTranslation, useBulkUpdateTranslations } from '@/lib/hooks/use-ui-translations';
import { useLanguages } from '@/lib/hooks/use-languages';
import { isAdmin } from '@/lib/auth';
import { Plus, Save, Trash2, Download, Upload, Search, ChevronDown, ChevronUp, FileUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { getAllTranslationKeys, getEnglishTemplate } from '@/lib/utils/translations';

export default function TranslationsPage() {
  const router = useRouter();
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
    if (confirm(`Delete translation for ${key} in ${language}?`)) {
      await deleteTranslation.mutateAsync({ key, language });
    }
  };

  const handleAddNewKey = async () => {
    if (!newKey || !newKeyLanguage || !newKeyValue) {
      alert('Please fill all fields');
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
    try {
      const translations = JSON.parse(jsonText);
      await bulkUpdate.mutateAsync({ language, translations });
      alert('Translations imported successfully!');
      setImportingLanguage(null);
    } catch (error) {
      alert('Invalid JSON format');
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
      alert('Failed to read file');
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
        <h1 className="text-3xl font-bold">UI Translations Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage all interface text translations for your application
        </p>
      </div>

      {/* Add New Translation */}
      <Card className="mb-6">
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

      {/* Search and Controls */}
      <div className="mb-4 flex gap-4 items-center">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedLanguages(new Set())}
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Translations by Language */}
      <div className="space-y-4">
        {!isMounted || isLoading ? (
          <div className="py-10 text-center text-muted-foreground">Loading translations...</div>
        ) : languages.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">No languages available</div>
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
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleLanguage(lang.code)}
                      className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
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
                        {translatedCount}/{totalCount} translated
                      </span>
                    </button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportTranslations(lang.code)}
                      >
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
                    {/* Import Section */}
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
                                  if (file) {
                                    handleFileImport(lang.code, file);
                                  }
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
                                Import JSON
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
                                Cancel
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
                                <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  Translated
                                </span>
                              )}
                              {!translation.hasTranslation && (
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
                                  handleSave(
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
                                  onClick={() => handleDelete(translation.key, lang.code)}
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
          })}
          </>
        )}
      </div>

    </div>
  );
}

