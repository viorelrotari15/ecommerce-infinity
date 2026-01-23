'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDefaultLanguage, useLanguages } from '../hooks/use-languages';
import { clearCachedTranslations } from '../utils/translation-cache';

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

  const setLanguage = useCallback((lang: string) => {
    // Clear cache for previous language if it changed
    if (previousLanguage && previousLanguage !== lang) {
      clearCachedTranslations(previousLanguage);
    }
    
    // Invalidate React Query cache for old language
    queryClient.removeQueries({ queryKey: ['translations', previousLanguage] });
    
    setPreviousLanguage(lang);
    setCurrentLanguageState(lang);
    
    // Set cookie
    document.cookie = `lang=${lang}; path=/; max-age=${365 * 24 * 60 * 60}`; // 1 year
    
    // Invalidate React Query cache for new language to force refetch
    queryClient.invalidateQueries({ queryKey: ['translations', lang] });
    
    // Reload to apply language change
    window.location.reload();
  }, [previousLanguage, queryClient]);

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

