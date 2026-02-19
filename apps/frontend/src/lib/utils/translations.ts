'use client';

import { useTranslation } from '../hooks/use-translations';
import { useLanguage } from '../contexts/language-context';

/**
 * Hook to get translation function for UI text
 */
export function useT() {
  const { currentLanguage } = useLanguage();
  return useTranslation(currentLanguage);
}

export {
  translationKeys,
  flatToNested,
  getAllTranslationKeys,
  getEnglishTemplate,
  getRussianTemplate,
  getGermanTemplate,
} from './translations-shared';

