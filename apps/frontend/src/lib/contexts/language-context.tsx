'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useDefaultLanguage, useLanguages } from '../hooks/use-languages';
import { clearCachedTranslations } from '../utils/translation-cache';
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
      ?.split('=')[1];

    const newLanguage = (cookieLang && activeLanguages.some((l) => l.code === cookieLang))
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
    // Clear cache for previous language if it changed
    if (previousLanguage && previousLanguage !== lang) {
      clearCachedTranslations(previousLanguage);
    }
    
    // Invalidate React Query cache for old language
    queryClient.removeQueries({ queryKey: ['translations', previousLanguage] });
    
    setPreviousLanguage(lang);
    setCurrentLanguageState(lang);
    
    // Always set the language cookie so the server sees it after refresh (language is essential for the site to function)
    document.cookie = `lang=${lang}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
    
    // Invalidate React Query cache for new language to force refetch
    queryClient.invalidateQueries({ queryKey: ['translations', lang] });
    
    // Invalidate all queries to refetch data with new language
    queryClient.invalidateQueries();
    
    // Navigate to current page with ?lang= so the server definitely receives the new language on the next request.
    // router.refresh() alone can run before the cookie is visible to the RSC request; URL param is reliable.
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      params.set('lang', lang);
      const url = `${pathname}?${params.toString()}${window.location.hash || ''}`;
      router.replace(url);
    } else {
      router.refresh();
    }
  }, [previousLanguage, queryClient, router]);

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

