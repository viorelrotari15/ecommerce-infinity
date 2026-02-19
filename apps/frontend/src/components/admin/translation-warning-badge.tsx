'use client';

import { AlertCircle } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { useT, translationKeys } from '@/lib/utils/translations';

interface TranslationWarningBadgeProps {
  missingLanguages: string[];
  entityType: 'attribute' | 'category' | 'brand';
}

export function TranslationWarningBadge({ missingLanguages, entityType }: TranslationWarningBadgeProps) {
  const t = useT();
  if (missingLanguages.length === 0) {
    return null;
  }

  const tooltipText = t(translationKeys.common.missingTranslationsTip, 'Missing translations: {languages}').replace('{languages}', missingLanguages.join(', '));

  return (
    <Tooltip content={tooltipText}>
      <div className="inline-flex items-center cursor-help">
        <AlertCircle className="h-4 w-4 text-amber-500" />
      </div>
    </Tooltip>
  );
}
