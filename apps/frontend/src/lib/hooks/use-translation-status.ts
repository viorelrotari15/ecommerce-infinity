'use client';

import { useMemo } from 'react';
import { useLanguages } from './use-languages';
import { useAttributeTranslations } from './use-attributes';
import { useCategoryTranslations } from './use-categories';
import { useBrandTranslations } from './use-brands';

export interface TranslationStatus {
  missingLanguages: string[];
  /** Language codes that are missing (use with t('common.languageName.' + code) for localized names) */
  missingLanguageCodes: string[];
  hasAllTranslations: boolean;
}

/**
 * Hook to check translation status for an attribute
 * Returns all missing languages, warning shows if any language is missing
 */
export function useAttributeTranslationStatus(attributeId: string): TranslationStatus {
  const { data: languages = [] } = useLanguages(true);
  const { data: translations = [] } = useAttributeTranslations(attributeId);

  return useMemo(() => {
    const activeLanguages = languages.filter((l) => l.isActive);
    const translatedLanguages = new Set(translations.map((t) => t.language));
    
    // Find all missing languages (names from API) and their codes
    const missing = activeLanguages.filter((lang) => !translatedLanguages.has(lang.code));
    const missingLanguages = missing.map((lang) => lang.name);
    const missingLanguageCodes = missing.map((lang) => lang.code);

    const hasAllTranslations = missingLanguages.length === 0;

    return {
      missingLanguages,
      missingLanguageCodes,
      hasAllTranslations,
    };
  }, [languages, translations]);
}

/**
 * Hook to check translation status for a category
 * Returns all missing languages, warning shows if any language is missing
 */
export function useCategoryTranslationStatus(categoryId: string): TranslationStatus {
  const { data: languages = [] } = useLanguages(true);
  const { data: translations = [] } = useCategoryTranslations(categoryId);

  return useMemo(() => {
    const activeLanguages = languages.filter((l) => l.isActive);
    const translatedLanguages = new Set(translations.map((t) => t.language));
    
    // Find all missing languages (names from API) and their codes
    const missing = activeLanguages.filter((lang) => !translatedLanguages.has(lang.code));
    const missingLanguages = missing.map((lang) => lang.name);
    const missingLanguageCodes = missing.map((lang) => lang.code);

    const hasAllTranslations = missingLanguages.length === 0;

    return {
      missingLanguages,
      missingLanguageCodes,
      hasAllTranslations,
    };
  }, [languages, translations]);
}

/**
 * Hook to check translation status for a brand
 * Returns all missing languages, warning shows if any language is missing
 */
export function useBrandTranslationStatus(brandId: string): TranslationStatus {
  const { data: languages = [] } = useLanguages(true);
  const { data: translations = [] } = useBrandTranslations(brandId);

  return useMemo(() => {
    const activeLanguages = languages.filter((l) => l.isActive);
    const translatedLanguages = new Set(translations.map((t) => t.language));
    
    // Find all missing languages (names from API) and their codes
    const missing = activeLanguages.filter((lang) => !translatedLanguages.has(lang.code));
    const missingLanguages = missing.map((lang) => lang.name);
    const missingLanguageCodes = missing.map((lang) => lang.code);

    const hasAllTranslations = missingLanguages.length === 0;

    return {
      missingLanguages,
      missingLanguageCodes,
      hasAllTranslations,
    };
  }, [languages, translations]);
}
