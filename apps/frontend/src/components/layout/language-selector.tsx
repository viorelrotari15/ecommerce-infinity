'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/contexts/language-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useT } from '@/lib/utils/translations';
import { translationKeys } from '@/lib/utils/translations';

export function LanguageSelector() {
  const t = useT();
  const { currentLanguage, setLanguage, languages, isLoading } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-w-[120px] h-10 rounded-md border border-input bg-background" />
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-w-[120px] h-10 rounded-md border border-input bg-background animate-pulse" />
    );
  }

  // English is guaranteed to exist in the database (auto-created by backend)
  // This is a safety fallback during loading or edge cases
  if (languages.length === 0) {
    return (
      <div className="text-sm px-3 py-2 rounded-md border border-input bg-background">
        {currentLanguage || 'en'}
      </div>
    );
  }

  // If only one language, show it but make it non-interactive
  if (languages.length === 1) {
    return (
      <div className="text-sm px-3 py-2 rounded-md border border-input bg-background">
        {languages[0].name}
      </div>
    );
  }

  return (
    <Select value={currentLanguage} onValueChange={setLanguage}>
      <SelectTrigger className="min-w-[120px] w-auto">
        <SelectValue placeholder={t(translationKeys.common.language, 'Language')} />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

