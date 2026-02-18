'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useDefaultLanguage, useLanguages } from '../hooks/use-languages';
import { clearCachedTranslations } from '../utils/translation-cache';
import { fetchTranslationsForLanguage } from '../hooks/use-translations';
import { useCookieConsent } from './cookie-consent-context';

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  languages: Array<{ code: string; name: string; isDefault: boolean; isActive: boolean }>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguageState] = useState<string>('en');
  const [previousLanguage, setPreviousLanguage] = useState<string>('en');
  const { data: languages = [], isLoading: languagesLoading } = useLanguages();
  const { data: defaultLanguage, isLoading: defaultLoading } = useDefaultLanguage();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { consent, hasConsented } = useCookieConsent();

  // Filter to active languages only (English is guaranteed to exist in DB)
  const activeLanguages = React.useMemo(() => {
    return languages.filter((l) => l.isActive);
  }, [languages]);

  // Initialize language from cookie or use default
  useEffect(() => {
    const effectiveDefault = defaultLanguage || 'en';
    
    // Check cookie first
    const cookieLang = document.cookie
      .split('; ')
      .find((row) => row.startsWith('lang='))
      ?.split('=')[1]
      ?.trim();

    // Use cookie if: we have one AND (languages still loading OR cookie is in active list)
    // This keeps selected language on refresh before useLanguages() has returned
    const newLanguage =
      cookieLang &&
      (activeLanguages.length === 0 || activeLanguages.some((l) => l.code === cookieLang))
        ? cookieLang
        : effectiveDefault;
    
    if (newLanguage !== currentLanguage) {
      // Language changed, clear old cache
      if (currentLanguage && currentLanguage !== newLanguage) {
        clearCachedTranslations(currentLanguage);
        queryClient.removeQueries({ queryKey: ['translations', currentLanguage] });
      }
      setPreviousLanguage(currentLanguage);
      setCurrentLanguageState(newLanguage);
    }
  }, [defaultLanguage, activeLanguages, currentLanguage, queryClient]);

  // Sync ?lang= from URL to cookie when the page loads so that refresh (without ?lang= in URL) still has the cookie
  useEffect(() => {
    const langFromUrl = searchParams.get('lang');
    if (langFromUrl && activeLanguages.some((l) => l.code === langFromUrl)) {
      document.cookie = `lang=${langFromUrl}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
    }
  }, [searchParams, activeLanguages]);

  // When user accepted preferences, keep lang cookie in sync with current language. Do not clear lang when they reject preferences (language is essential).
  useEffect(() => {
    if (hasConsented() && consent?.preferences && currentLanguage) {
      const cookieLang = document.cookie
        .split('; ')
        .find((row) => row.startsWith('lang='))
        ?.split('=')[1];
      if (cookieLang !== currentLanguage) {
        document.cookie = `lang=${currentLanguage}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
      }
    }
  }, [hasConsented, consent?.preferences, currentLanguage]);

  const setLanguage = useCallback((lang: string) => {
    if (lang === currentLanguage) return;

    const previous = currentLanguage;
    clearCachedTranslations(previous);
    clearCachedTranslations(lang);

    // Only remove the previous language's query so UI stops reading it; keep new key ready for setQueryData
    queryClient.removeQueries({ queryKey: ['translations', previous] });
    setPreviousLanguage(previous);
    setCurrentLanguageState(lang);

    document.cookie = `lang=${lang}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;

    fetchTranslationsForLanguage(lang)
      .then((data) => {
        queryClient.setQueryData(['translations', lang], data);
        // Invalidate data that depends on language (products, categories, brands) so they refetch with new cookie
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        queryClient.invalidateQueries({ queryKey: ['brands'] });
        queryClient.invalidateQueries();
        router.refresh();
      })
      .catch(() => {
        queryClient.invalidateQueries({ queryKey: ['translations', lang] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        queryClient.invalidateQueries({ queryKey: ['brands'] });
        queryClient.invalidateQueries();
        router.refresh();
      });
  }, [currentLanguage, queryClient, router]);

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    languages: activeLanguages,
    isLoading: languagesLoading || defaultLoading,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

