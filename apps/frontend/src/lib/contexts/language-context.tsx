'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useDefaultLanguage, useLanguages } from '../hooks/use-languages';

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  languages: Array<{ code: string; name: string; isDefault: boolean; isActive: boolean }>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguageState] = useState<string>('en');
  const { data: languages = [], isLoading: languagesLoading } = useLanguages();
  const { data: defaultLanguage, isLoading: defaultLoading } = useDefaultLanguage();

  // Initialize language from cookie or use default
  useEffect(() => {
    if (defaultLanguage) {
      // Check cookie first
      const cookieLang = document.cookie
        .split('; ')
        .find((row) => row.startsWith('lang='))
        ?.split('=')[1];

      if (cookieLang && languages.some((l) => l.code === cookieLang && l.isActive)) {
        setCurrentLanguageState(cookieLang);
      } else {
        setCurrentLanguageState(defaultLanguage);
      }
    }
  }, [defaultLanguage, languages]);

  const setLanguage = useCallback((lang: string) => {
    setCurrentLanguageState(lang);
    // Set cookie
    document.cookie = `lang=${lang}; path=/; max-age=${365 * 24 * 60 * 60}`; // 1 year
    // Reload to apply language change
    window.location.reload();
  }, []);

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    languages: languages.filter((l) => l.isActive),
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

