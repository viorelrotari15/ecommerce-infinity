'use client';

import { AlertCircle } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { useT, translationKeys } from '@/lib/utils/translations';

interface TranslationWarningBadgeProps {
  /** Display names from API (fallback when missingLanguageCodes not provided) */
  missingLanguages?: string[];
  /** Prefer: language codes so names are shown in the current UI language (e.g. "Englisch" in German) */
  missingLanguageCodes?: string[];
  entityType: 'attribute' | 'category' | 'brand';
}

export function TranslationWarningBadge({ missingLanguages = [], missingLanguageCodes, entityType }: TranslationWarningBadgeProps) {
  const t = useT();
  const codes = missingLanguageCodes ?? [];
  const count = codes.length || missingLanguages.length;
  if (count === 0) {
    return null;
  }
  const languagesLabel = codes.length > 0
    ? codes.map((code) => t(`common.languageName.${code}`, code)).join(', ')
    : missingLanguages.join(', ');
  const tooltipText = t(translationKeys.common.missingTranslationsTip, 'Missing translations: {languages}').replace('{languages}', languagesLabel);

  return (
    <Tooltip content={tooltipText}>
      <div className="inline-flex items-center cursor-help">
        <AlertCircle className="h-4 w-4 text-amber-500" />
      </div>
    </Tooltip>
  );
}
