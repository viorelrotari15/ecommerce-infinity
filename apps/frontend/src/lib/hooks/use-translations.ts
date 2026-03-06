'use client';

import { useMemo } from 'react';
import { getFlatTemplateForLanguage, flatToNested } from '../utils/translations-shared';

export type Translations = Record<string, unknown>;

/**
 * Get UI translations for a language from frontend-only templates (no backend API).
 * Keys and values are defined in the frontend repository only.
 */
function getTranslationsForLanguage(lang: string): Translations {
  const flat = getFlatTemplateForLanguage(lang);
  return flatToNested(flat) as Translations;
}

/**
 * Get a nested translation value by key path (e.g., "header.menu.home").
 * Uses only frontend hardcoded templates — no API calls.
 */
export function useTranslation(language?: string) {
  const effectiveLanguage = language || 'de';
  const translations = useMemo(
    () => getTranslationsForLanguage(effectiveLanguage),
    [effectiveLanguage],
  );

  return (key: string | undefined | null, fallback?: string): string => {
    if (key === undefined || key === null) {
      return fallback || '';
    }
    const keyString = String(key).trim();
    if (!keyString) {
      return fallback || '';
    }
    try {
      const keys = keyString.split('.');
      let value: unknown = translations;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in (value as object)) {
          value = (value as Record<string, unknown>)[k];
        } else {
          return fallback || keyString;
        }
      }
      return typeof value === 'string' ? value : fallback || keyString;
    } catch {
      return fallback || keyString;
    }
  };
}
