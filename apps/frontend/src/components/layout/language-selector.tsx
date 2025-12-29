'use client';

import { useLanguage } from '@/lib/contexts/language-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LanguageSelector() {
  const { currentLanguage, setLanguage, languages, isLoading } = useLanguage();

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-[120px] h-10 rounded-md border border-input bg-background animate-pulse" />
    );
  }

  // Show current language even if only one (for debugging/visibility)
  // In production, you might want to hide if languages.length <= 1
  if (languages.length === 0) {
    return (
      <div className="text-xs text-muted-foreground px-2">
        No languages
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
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="Language" />
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

