'use client';

import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguages } from '@/lib/hooks/use-languages';
import { useProductTranslations, useCreateProductTranslation, useUpdateProductTranslation } from '@/lib/hooks/use-product-translations';
import { AlertCircle } from 'lucide-react';

interface ProductTranslationsTabsProps {
  productId?: string;
  defaultName?: string;
  defaultDescription?: string;
  defaultShortDescription?: string;
  defaultMetaTitle?: string;
  defaultMetaDescription?: string;
  creationMode?: boolean;
  onTranslationDataChange?: (data: Record<string, { name: string; description: string; shortDescription: string; metaTitle: string; metaDescription: string }>) => void;
}

export interface ProductTranslationsTabsRef {
  resetChanges: () => void;
  validateAll: () => { isValid: boolean; errors: Record<string, string[]> };
  getTranslationData: () => Record<string, { name: string; description: string; shortDescription: string; metaTitle: string; metaDescription: string }>;
}

export const ProductTranslationsTabs = forwardRef<ProductTranslationsTabsRef, ProductTranslationsTabsProps>(({
  productId,
  defaultName = '',
  defaultDescription = '',
  defaultShortDescription = '',
  defaultMetaTitle = '',
  defaultMetaDescription = '',
  creationMode = false,
  onTranslationDataChange,
}, ref) => {
  const { data: languages = [] } = useLanguages(true);
  const { data: translations = [] } = useProductTranslations(productId || '');
  const createTranslation = useCreateProductTranslation();
  const updateTranslation = useUpdateProductTranslation();
  const { toast } = useToast();

  const [translationData, setTranslationData] = useState<
    Record<string, {
      name: string;
      description: string;
      shortDescription: string;
      metaTitle: string;
      metaDescription: string;
    }>
  >({});

  const [originalTranslationData, setOriginalTranslationData] = useState<
    Record<string, {
      name: string;
      description: string;
      shortDescription: string;
      metaTitle: string;
      metaDescription: string;
    }>
  >({});

  // State for field-level errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, {
    name?: string;
    metaTitle?: string;
    metaDescription?: string;
  }>>({});

  // State for controlling active tab
  const [activeTab, setActiveTab] = useState<string>('');

  // Use ref to store callback to avoid infinite loops
  const onTranslationDataChangeRef = useRef(onTranslationDataChange);
  useEffect(() => {
    onTranslationDataChangeRef.current = onTranslationDataChange;
  }, [onTranslationDataChange]);

  // Track if we've initialized to prevent re-initialization on every render
  const hasInitializedRef = useRef(false);
  const prevLanguagesRef = useRef<string>('');
  const prevTranslationsRef = useRef<string>('');

  // Initialize translation data - only for active languages
  // Only re-run when translations or languages actually change, not when default props change
  useEffect(() => {
    const activeLangs = languages.filter((l) => l.isActive);
    if (activeLangs.length === 0) return;

    // Create a stable key to detect if languages/translations actually changed
    const languagesKey = activeLangs.map(l => l.code).sort().join(',');
    const translationsKey = translations.map(t => `${t.language}:${t.name}`).sort().join(',');

    // Only update if languages or translations actually changed
    const shouldUpdate = !hasInitializedRef.current || 
      prevLanguagesRef.current !== languagesKey ||
      prevTranslationsRef.current !== translationsKey;

    if (!shouldUpdate) return;

    const data: Record<string, any> = {};
    activeLangs.forEach((lang) => {
      const existing = translations.find((t) => t.language === lang.code);
      data[lang.code] = {
        name: existing?.name || defaultName,
        description: existing?.description || defaultDescription,
        shortDescription: existing?.shortDescription || defaultShortDescription,
        metaTitle: existing?.metaTitle || defaultMetaTitle,
        metaDescription: existing?.metaDescription || defaultMetaDescription,
      };
    });
    
    setTranslationData(data);
    setOriginalTranslationData(data);
    
    // Update refs
    prevLanguagesRef.current = languagesKey;
    prevTranslationsRef.current = translationsKey;
    const wasFirstInit = !hasInitializedRef.current;
    hasInitializedRef.current = true;
    
    // Only notify parent in creation mode on initial setup
    if (creationMode && onTranslationDataChangeRef.current && wasFirstInit) {
      onTranslationDataChangeRef.current(data);
    }
  }, [translations, languages, defaultName, defaultDescription, defaultShortDescription, defaultMetaTitle, defaultMetaDescription, creationMode]);

  // Helper function to update translation data and notify parent in creation mode
  const updateTranslationData = (updates: Record<string, any>) => {
    setTranslationData((prev) => {
      const newData = { ...prev };
      // Merge updates into newData
      Object.keys(updates).forEach((key) => {
        newData[key] = { ...(newData[key] || {}), ...updates[key] };
      });
      
      // Notify parent in creation mode when user makes changes
      // Use requestAnimationFrame to defer callback to avoid state updates during render
      if (creationMode && onTranslationDataChangeRef.current) {
        requestAnimationFrame(() => {
          if (onTranslationDataChangeRef.current) {
            onTranslationDataChangeRef.current(newData);
          }
        });
      }
      
      return newData;
    });
  };

  // Helper to clear field error when user types
  const clearFieldError = (language: string, field: 'name' | 'metaTitle' | 'metaDescription') => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      if (newErrors[language]) {
        delete newErrors[language][field];
        if (Object.keys(newErrors[language]).length === 0) {
          delete newErrors[language];
        }
      }
      return newErrors;
    });
  };

  // Updated validation to return field-specific errors
  const validateTranslation = (data: { name: string; description: string; shortDescription: string; metaTitle: string; metaDescription: string }): { 
    hasErrors: boolean; 
    errors: { name?: string; metaTitle?: string; metaDescription?: string };
    errorMessages: string[];
  } => {
    const errors: { name?: string; metaTitle?: string; metaDescription?: string } = {};
    const errorMessages: string[] = [];
    
    if (!data.name || data.name.trim() === '') {
      errors.name = 'Product name is required';
      errorMessages.push('Product name is required');
    }
    if (!data.metaTitle || data.metaTitle.trim() === '') {
      errors.metaTitle = 'Meta title is required';
      errorMessages.push('Meta title is required');
    }
    if (!data.metaDescription || data.metaDescription.trim() === '') {
      errors.metaDescription = 'Meta description is required';
      errorMessages.push('Meta description is required');
    }
    
    return { 
      hasErrors: Object.keys(errors).length > 0, 
      errors,
      errorMessages
    };
  };

  const handleSave = async (language: string, e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission if button is inside a form
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (creationMode || !productId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Translations can only be saved after product creation.',
      });
      return;
    }

    const data = translationData[language];
    if (!data) return;

    // Validate translation
    const validation = validateTranslation(data);
    if (validation.hasErrors) {
      setFieldErrors(prev => ({
        ...prev,
        [language]: validation.errors
      }));
      // Switch to the tab with errors
      setActiveTab(language);
      // Inline errors are displayed below fields, no toast needed
      return;
    }

    // Clear errors if validation passes
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[language];
      return newErrors;
    });

    const existing = translations.find((t) => t.language === language);

    try {
      if (existing) {
        await updateTranslation.mutateAsync({
          productId,
          language,
          ...data,
        });
      } else {
        await createTranslation.mutateAsync({
          productId,
          language,
          ...data,
        });
      }
      
      // Update original data to reflect saved state
      setOriginalTranslationData({
        ...originalTranslationData,
        [language]: { ...data },
      });
      
      toast({
        variant: 'success',
        title: 'Success',
        description: 'Translation saved successfully!',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save translation. Please try again.',
      });
    }
  };

  const handleSaveAll = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission if button is inside a form
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (creationMode || !productId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Translations can only be saved after product creation.',
      });
      return;
    }

    // Validate all active languages - all must have required fields populated
    const allFieldErrors: Record<string, { name?: string; metaTitle?: string; metaDescription?: string }> = {};
    const allErrors: Record<string, string[]> = {};
    
    activeLanguages.forEach((lang) => {
      const data = translationData[lang.code];
      if (data) {
        const validation = validateTranslation(data);
        if (validation.hasErrors) {
          allFieldErrors[lang.code] = validation.errors;
          allErrors[lang.code] = validation.errorMessages;
        }
      } else {
        allFieldErrors[lang.code] = { name: 'Translation data is missing' };
        allErrors[lang.code] = ['Translation data is missing'];
      }
    });

    // Check that all active languages have translations
    if (activeLanguages.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'No active languages configured.',
      });
      return;
    }

    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allFieldErrors);
      // Switch to the first tab with errors
      const firstErrorLang = activeLanguages.find(lang => allFieldErrors[lang.code]);
      if (firstErrorLang) {
        setActiveTab(firstErrorLang.code);
      }
      // Inline errors are displayed below fields, no toast needed
      return;
    }

    // Clear all errors if validation passes
    setFieldErrors({});

    // Save all languages
    try {
      const savePromises = activeLanguages.map(async (lang) => {
        const data = translationData[lang.code];
        if (!data) return;

        const existing = translations.find((t) => t.language === lang.code);
        if (existing) {
          return updateTranslation.mutateAsync({
            productId,
            language: lang.code,
            ...data,
          });
        } else {
          return createTranslation.mutateAsync({
            productId,
            language: lang.code,
            ...data,
          });
        }
      });

      await Promise.all(savePromises);
      
      // Update original data to reflect saved state
      const newOriginalData = { ...originalTranslationData };
      activeLanguages.forEach((lang) => {
        const data = translationData[lang.code];
        if (data) {
          newOriginalData[lang.code] = { ...data };
        }
      });
      setOriginalTranslationData(newOriginalData);
      
      toast({
        variant: 'success',
        title: 'Success',
        description: 'All translations saved successfully!',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save some translations. Please try again.',
      });
    }
  };

  // Expose validation function for parent component
  useImperativeHandle(ref, () => ({
    resetChanges: () => {
      setTranslationData(originalTranslationData);
      setFieldErrors({});
    },
    validateAll: (): { isValid: boolean; errors: Record<string, string[]> } => {
      const allErrors: Record<string, string[]> = {};
      const allFieldErrors: Record<string, { name?: string; metaTitle?: string; metaDescription?: string }> = {};
      
      // Validate all active languages - all must have required fields populated
      activeLanguages.forEach((lang) => {
        const data = translationData[lang.code];
        if (data) {
          const validation = validateTranslation(data);
          if (validation.hasErrors) {
            allFieldErrors[lang.code] = validation.errors;
            allErrors[lang.code] = validation.errorMessages;
          }
        } else {
          allFieldErrors[lang.code] = { name: 'Translation data is missing' };
          allErrors[lang.code] = ['Translation data is missing'];
        }
      });
      
      // Set field errors so they display in the UI
      if (Object.keys(allFieldErrors).length > 0) {
        setFieldErrors(allFieldErrors);
        // Switch to the first tab with errors so user can see them
        const firstErrorLang = activeLanguages.find(lang => allFieldErrors[lang.code]);
        if (firstErrorLang) {
          setActiveTab(firstErrorLang.code);
        }
      }
      
      return {
        isValid: Object.keys(allErrors).length === 0,
        errors: allErrors,
      };
    },
    getTranslationData: () => translationData,
  }));

  const activeLanguages = languages.filter((l) => l.isActive);
  const defaultLanguage = languages.find((l) => l.isDefault);

  // Initialize active tab
  useEffect(() => {
    if (!activeTab && activeLanguages.length > 0) {
      setActiveTab(defaultLanguage?.code || activeLanguages[0]?.code);
    }
  }, [activeTab, defaultLanguage, activeLanguages]);

  if (activeLanguages.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No active languages configured
      </div>
    );
  }

  return (
    <div>
      <Tabs value={activeTab || (defaultLanguage?.code || activeLanguages[0]?.code)} onValueChange={setActiveTab}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${activeLanguages.length}, minmax(0, 1fr))` }}>
          {activeLanguages.map((lang) => {
            const hasTranslation = translations.some((t) => t.language === lang.code);
            const hasErrors = fieldErrors[lang.code] && Object.keys(fieldErrors[lang.code]).length > 0;
            return (
              <TabsTrigger key={lang.code} value={lang.code} className="relative">
                {lang.name}
                {lang.isDefault && <span className="ml-1 text-xs">★</span>}
                {!hasTranslation && (
                  <span className="ml-1 text-xs text-muted-foreground">(missing)</span>
                )}
                {hasErrors && (
                  <span className="ml-1 text-xs text-destructive">⚠</span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Alert banner showing languages with errors */}
        {Object.keys(fieldErrors).length > 0 && (
          <div className="mt-4 rounded-md bg-destructive/10 border border-destructive/20 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive mb-1">
                  Required fields are missing in the following languages:
                </p>
                <ul className="text-sm text-destructive/90 space-y-1">
                  {Object.entries(fieldErrors).map(([langCode, errors]) => {
                    const lang = activeLanguages.find(l => l.code === langCode);
                    const langName = lang?.name || langCode;
                    const errorFields = Object.keys(errors).filter(key => errors[key as keyof typeof errors]);
                    return (
                      <li key={langCode} className="flex items-center gap-2">
                        <span className="font-medium">{langName}:</span>
                        <span>{errorFields.map(field => {
                          if (field === 'name') return 'Product Name';
                          if (field === 'metaTitle') return 'Meta Title';
                          if (field === 'metaDescription') return 'Meta Description';
                          return field;
                        }).join(', ')}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                          onClick={() => setActiveTab(langCode)}
                        >
                          Go to {langName}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeLanguages.map((lang) => (
          <TabsContent key={lang.code} value={lang.code} className="space-y-6 mt-4">
            {/* Basic Information Group */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Product name and description details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`name-${lang.code}`}>
                    Product Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`name-${lang.code}`}
                    value={translationData[lang.code]?.name || ''}
                    onChange={(e) => {
                      updateTranslationData({
                        [lang.code]: {
                          ...translationData[lang.code],
                          name: e.target.value,
                        },
                      });
                      clearFieldError(lang.code, 'name');
                    }}
                    className={fieldErrors[lang.code]?.name ? 'border-destructive' : ''}
                  />
                  {fieldErrors[lang.code]?.name && (
                    <p className="text-sm text-destructive">{fieldErrors[lang.code].name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`shortDescription-${lang.code}`}>Short Description</Label>
                  <Textarea
                    id={`shortDescription-${lang.code}`}
                    value={translationData[lang.code]?.shortDescription || ''}
                    onChange={(e) =>
                      updateTranslationData({
                        [lang.code]: {
                          ...translationData[lang.code],
                          shortDescription: e.target.value,
                        },
                      })
                    }
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`description-${lang.code}`}>Description</Label>
                  <Textarea
                    id={`description-${lang.code}`}
                    value={translationData[lang.code]?.description || ''}
                    onChange={(e) =>
                      updateTranslationData({
                        [lang.code]: {
                          ...translationData[lang.code],
                          description: e.target.value,
                        },
                      })
                    }
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>

            {/* SEO Settings Group */}
            <Card>
              <CardHeader>
                <CardTitle>SEO Settings</CardTitle>
                <CardDescription>Meta title and description for search engines</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="mb-4 p-3 bg-muted rounded-md text-sm">
                  <p className="font-medium mb-2">Example SEO Settings:</p>
                  <p className="text-muted-foreground mb-1">
                    <strong>Meta Title:</strong> Premium Quality Product - Best Deals Online
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Meta Description:</strong> Discover our premium quality product with exceptional features. Shop now for the best deals and free shipping on orders over $50.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`metaTitle-${lang.code}`}>
                    Meta Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`metaTitle-${lang.code}`}
                    value={translationData[lang.code]?.metaTitle || ''}
                    onChange={(e) => {
                      updateTranslationData({
                        [lang.code]: {
                          ...translationData[lang.code],
                          metaTitle: e.target.value,
                        },
                      });
                      clearFieldError(lang.code, 'metaTitle');
                    }}
                    placeholder="e.g., Premium Quality Product - Best Deals Online"
                    className={fieldErrors[lang.code]?.metaTitle ? 'border-destructive' : ''}
                  />
                  {fieldErrors[lang.code]?.metaTitle && (
                    <p className="text-sm text-destructive">{fieldErrors[lang.code].metaTitle}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`metaDescription-${lang.code}`}>
                    Meta Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id={`metaDescription-${lang.code}`}
                    value={translationData[lang.code]?.metaDescription || ''}
                    onChange={(e) => {
                      updateTranslationData({
                        [lang.code]: {
                          ...translationData[lang.code],
                          metaDescription: e.target.value,
                        },
                      });
                      clearFieldError(lang.code, 'metaDescription');
                    }}
                    rows={3}
                    placeholder="e.g., Discover our premium quality product with exceptional features. Shop now for the best deals and free shipping on orders over $50."
                    className={fieldErrors[lang.code]?.metaDescription ? 'border-destructive' : ''}
                  />
                  {fieldErrors[lang.code]?.metaDescription && (
                    <p className="text-sm text-destructive">{fieldErrors[lang.code].metaDescription}</p>
                  )}
                </div>
              </CardContent>
            </Card>

          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
});

ProductTranslationsTabs.displayName = 'ProductTranslationsTabs';

