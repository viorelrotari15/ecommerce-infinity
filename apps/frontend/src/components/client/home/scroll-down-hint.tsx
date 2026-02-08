'use client';

import { ChevronDown } from 'lucide-react';
import { useT, translationKeys } from '@/lib/utils/translations';

const HERO_SECTION_ID = 'hero';

export function ScrollDownHint() {
  const t = useT();

  const scrollToContent = () => {
    const el = document.getElementById(HERO_SECTION_ID);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <button
      type="button"
      onClick={scrollToContent}
      className="flex w-full flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
      aria-label={t(translationKeys.carousel.scrollDown, 'Scroll to explore')}
    >
      <span className="text-xs font-medium">
        {t(translationKeys.carousel.scrollDown, 'Scroll to explore')}
      </span>
      <ChevronDown className="h-6 w-6 animate-bounce" aria-hidden />
    </button>
  );
}
