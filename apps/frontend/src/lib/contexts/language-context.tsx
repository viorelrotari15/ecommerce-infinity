'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

  // Handle consent changes - update cookie if preferences consent changed
  useEffect(() => {
    if (hasConsented() && consent) {
      if (consent.preferences) {
        // User accepted preferences cookies - ensure language cookie is set
        const cookieLang = document.cookie
          .split('; ')
          .find((row) => row.startsWith('lang='))
          ?.split('=')[1];
        
        if (currentLanguage && cookieLang !== currentLanguage) {
          document.cookie = `lang=${currentLanguage}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
        }
      } else {
        // User rejected preferences cookies - remove language cookie
        document.cookie = 'lang=; path=/; max-age=0';
      }
    }
  }, [hasConsented, consent, currentLanguage]);

  const setLanguage = useCallback((lang: string) => {
    // Clear cache for previous language if it changed
    if (previousLanguage && previousLanguage !== lang) {
      clearCachedTranslations(previousLanguage);
    }
    
    // Invalidate React Query cache for old language
    queryClient.removeQueries({ queryKey: ['translations', previousLanguage] });
    
    setPreviousLanguage(lang);
    setCurrentLanguageState(lang);
    
    // Only set cookie if user has consented to preferences cookies
    // If consent is pending, we'll set it after consent is given
    if (hasConsented() && consent?.preferences) {
      // Set cookie with SameSite attribute to ensure it's available immediately
      document.cookie = `lang=${lang}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`; // 1 year
    } else if (!hasConsented()) {
      // If consent is pending, still set the cookie but it's considered necessary
      // for basic functionality. User can reject preferences later if they want.
      document.cookie = `lang=${lang}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`; // 1 year
    }
    // If user rejected preferences cookies, we don't set the cookie
    // but we still update the language state for the current session
    
    // Invalidate React Query cache for new language to force refetch
    queryClient.invalidateQueries({ queryKey: ['translations', lang] });
    
    // Invalidate all queries to refetch data with new language
    queryClient.invalidateQueries();
    
    // Use Next.js router refresh to update server components without full page reload
    // Small delay to ensure cookie is set before refresh
    setTimeout(() => {
      router.refresh();
    }, 100);
  }, [previousLanguage, queryClient, router, hasConsented, consent]);

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

