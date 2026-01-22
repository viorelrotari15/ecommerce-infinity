'use client';

import { useMemo } from 'react';
import { useLanguages } from './use-languages';
import { useAttributeTranslations } from './use-attributes';
import { useCategoryTranslations } from './use-categories';
import { useBrandTranslations } from './use-brands';

export interface TranslationStatus {
  missingLanguages: string[];
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
    
    // Find all missing languages
    const missingLanguages = activeLanguages
      .filter((lang) => !translatedLanguages.has(lang.code))
      .map((lang) => lang.name);
    
    // hasAllTranslations is true only if all active languages have translations
    const hasAllTranslations = missingLanguages.length === 0;
    
    return {
      missingLanguages,
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
    
    // Find all missing languages
    const missingLanguages = activeLanguages
      .filter((lang) => !translatedLanguages.has(lang.code))
      .map((lang) => lang.name);
    
    // hasAllTranslations is true only if all active languages have translations
    const hasAllTranslations = missingLanguages.length === 0;
    
    return {
      missingLanguages,
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
    
    // Find all missing languages
    const missingLanguages = activeLanguages
      .filter((lang) => !translatedLanguages.has(lang.code))
      .map((lang) => lang.name);
    
    // hasAllTranslations is true only if all active languages have translations
    const hasAllTranslations = missingLanguages.length === 0;
    
    return {
      missingLanguages,
      hasAllTranslations,
    };
  }, [languages, translations]);
}
