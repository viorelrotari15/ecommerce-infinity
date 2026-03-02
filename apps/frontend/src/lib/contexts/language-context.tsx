'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useDefaultLanguage, useLanguages } from '../hooks/use-languages';
import { useCookieConsent } from './cookie-consent-context';

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  languages: Array<{ code: string; name: string; isDefault: boolean; isActive: boolean }>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const DEFAULT_LANGUAGE_VALUE: LanguageContextType = {
  currentLanguage: 'en',
  setLanguage: () => {},
  languages: [],
  isLoading: true,
};

/**
 * Inner provider that uses useRouter/useSearchParams. Only rendered after client
 * mount so we never call navigation hooks during SSR (avoids "Cannot read
 * properties of null (reading 'useContext')" when navigation context is missing).
 */
function LanguageProviderWithNavigation({ children }: { children: React.ReactNode }) {
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
      setPreviousLanguage(currentLanguage);
      setCurrentLanguageState(newLanguage);
    }
  }, [defaultLanguage, activeLanguages, currentLanguage]);

  // Sync ?lang= from URL to cookie once when the page loads
  useEffect(() => {
    const langFromUrl = searchParams.get('lang');
    if (langFromUrl && activeLanguages.some((l) => l.code === langFromUrl)) {
      document.cookie = `lang=${langFromUrl}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
    }
    // We intentionally run this only on initial mount to avoid any chance of
    // feedback loops between URL/search params and language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLanguage = useCallback((lang: string) => {
    if (lang === currentLanguage) return;

    setPreviousLanguage(currentLanguage);
    setCurrentLanguageState(lang);

    document.cookie = `lang=${lang}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;

    // UI strings come from frontend only; invalidate multilingual data (products, categories, brands) so they refetch with new language
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['brands'] });
    queryClient.invalidateQueries();
    router.refresh();
  }, [currentLanguage, queryClient, router]);

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    languages: activeLanguages,
    isLoading: languagesLoading || defaultLoading,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <LanguageContext.Provider value={DEFAULT_LANGUAGE_VALUE}>
        {children}
      </LanguageContext.Provider>
    );
  }
  return <LanguageProviderWithNavigation>{children}</LanguageProviderWithNavigation>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

