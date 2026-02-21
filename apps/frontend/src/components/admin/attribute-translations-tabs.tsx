'use client';

import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguages } from '@/lib/hooks/use-languages';
import { useAttributeTranslations, useUpsertAttributeTranslation } from '@/lib/hooks/use-attributes';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import { useT, translationKeys } from '@/lib/utils/translations';

interface AttributeTranslationsTabsProps {
  attributeId?: string;
  defaultName?: string;
  creationMode?: boolean;
  onTranslationDataChange?: (data: Record<string, { name: string }>) => void;
}

export interface AttributeTranslationsTabsRef {
  resetChanges: () => void;
  validateAll: () => { isValid: boolean; errors: Record<string, string[]> };
  getTranslationData: () => Record<string, { name: string }>;
}

export const AttributeTranslationsTabs = forwardRef<AttributeTranslationsTabsRef, AttributeTranslationsTabsProps>(({
  attributeId,
  defaultName = '',
  creationMode = false,
  onTranslationDataChange,
}, ref) => {
  const t = useT();
  const { data: languages = [] } = useLanguages(true);
  const { data: translations = [], isLoading: isLoadingTranslations, refetch: refetchTranslations } = useAttributeTranslations(attributeId || '');
  const upsertTranslation = useUpsertAttributeTranslation();
  const { toast } = useToast();

  const [translationData, setTranslationData] = useState<
    Record<string, { name: string }>
  >({});

  const [originalTranslationData, setOriginalTranslationData] = useState<
    Record<string, { name: string }>
  >({});

  // State for field-level errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, {
    name?: string;
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
  useEffect(() => {
    const activeLangs = languages.filter((l) => l.isActive);
    if (activeLangs.length === 0) return;

    // Create a stable key to detect if languages/translations actually changed
    const languagesKey = activeLangs.map(l => l.code).sort().join(',');
    const translationsKey = translations.map(t => `${t.language}:${t.name}`).sort().join(',');

    // Only update if languages or translations actually changed
    // Also update when translations finish loading (to handle initial load after creation)
    const shouldUpdate = !hasInitializedRef.current || 
      prevLanguagesRef.current !== languagesKey ||
      prevTranslationsRef.current !== translationsKey ||
      (isLoadingTranslations === false && prevTranslationsRef.current === '' && translations.length > 0);

    if (!shouldUpdate && !isLoadingTranslations) return;

    const defaultLang = languages.find((l) => l.isDefault);
    const data: Record<string, { name: string }> = {};
    activeLangs.forEach((lang) => {
      const existing = translations.find((t) => t.language === lang.code);
      // Only use defaultName for default language in creation mode, or if there's an existing translation
      // For other languages, leave empty if no translation exists
      if (existing) {
        data[lang.code] = {
          name: existing.name,
        };
      } else if (lang.isDefault && creationMode) {
        // Only pre-fill default language in creation mode
        data[lang.code] = {
          name: defaultName,
        };
      } else {
        // Leave empty for non-default languages or in edit mode
        data[lang.code] = {
          name: '',
        };
      }
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
  }, [translations, languages, defaultName, creationMode, isLoadingTranslations]);

  // Helper function to update translation data and notify parent in creation mode
  const updateTranslationData = (updates: Record<string, any>) => {
    setTranslationData((prev) => {
      const newData = { ...prev };
      // Merge updates into newData
      Object.keys(updates).forEach((key) => {
        newData[key] = { ...(newData[key] || {}), ...updates[key] };
      });
      
      // Notify parent in creation mode when user makes changes
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
  const clearFieldError = (language: string, field: 'name') => {
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

  // Validation function
  const validateTranslation = (data: { name: string }): { 
    hasErrors: boolean; 
    errors: { name?: string };
    errorMessages: string[];
  } => {
    const errors: { name?: string } = {};
    const errorMessages: string[] = [];
    
    if (!data.name || data.name.trim() === '') {
      errors.name = 'Attribute name is required';
      errorMessages.push('Attribute name is required');
    }
    
    return { 
      hasErrors: Object.keys(errors).length > 0, 
      errors,
      errorMessages
    };
  };

  // Expose validation function for parent component
  useImperativeHandle(ref, () => ({
    resetChanges: () => {
      setTranslationData(originalTranslationData);
      setFieldErrors({});
    },
    validateAll: (): { isValid: boolean; errors: Record<string, string[]> } => {
      const allErrors: Record<string, string[]> = {};
      const allFieldErrors: Record<string, { name?: string }> = {};
      
      // Only validate default language - it's the only required one
      const defaultLang = languages.find((l) => l.isDefault);
      if (!defaultLang) {
        return {
          isValid: false,
          errors: { general: ['No default language configured'] },
        };
      }

      const data = translationData[defaultLang.code];
      if (data) {
        const validation = validateTranslation(data);
        if (validation.hasErrors) {
          allFieldErrors[defaultLang.code] = validation.errors;
          allErrors[defaultLang.code] = validation.errorMessages;
        }
      } else {
        allFieldErrors[defaultLang.code] = { name: t(translationKeys.common.translationDataMissing, 'Translation data is missing') };
        allErrors[defaultLang.code] = [t(translationKeys.common.translationDataMissing, 'Translation data is missing')];
      }
      
      // Set field errors so they display in the UI
      if (Object.keys(allFieldErrors).length > 0) {
        setFieldErrors(allFieldErrors);
        // Switch to the default language tab so user can see the error
        setActiveTab(defaultLang.code);
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
        {t(translationKeys.common.noActiveLanguages, 'No active languages configured')}
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
                  <span className="ml-1 text-xs text-muted-foreground">{t(translationKeys.common.missingLabel, '(missing)')}</span>
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
                  {t(translationKeys.common.requiredFieldsMissingInLanguages, 'Required fields are missing in the following languages:')}
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
                          if (field === 'name') return t(translationKeys.admin.attributes.name, 'Attribute Name');
                          return field;
                        }).join(', ')}</span>
                        <button
                          type="button"
                          className="ml-auto text-xs text-destructive hover:underline"
                          onClick={() => setActiveTab(langCode)}
                        >
                          {t(translationKeys.common.goToLanguage, 'Go to {langName}').replace('{langName}', langName)}
                        </button>
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
            <Card>
              <CardHeader>
                <CardTitle>{t(translationKeys.common.basicInfo, 'Basic Information')}</CardTitle>
                <CardDescription>{t(translationKeys.admin.attributes.nameInLanguage, 'Attribute name in {langName}').replace('{langName}', lang.name)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`name-${lang.code}`}>
                    {t(translationKeys.admin.attributes.name, 'Attribute Name')} <span className="text-destructive">*</span>
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
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
});

AttributeTranslationsTabs.displayName = 'AttributeTranslationsTabs';
