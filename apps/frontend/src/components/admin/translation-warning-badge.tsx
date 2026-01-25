'use client';

import { AlertCircle } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

interface TranslationWarningBadgeProps {
  missingLanguages: string[];
  entityType: 'attribute' | 'category' | 'brand';
}

export function TranslationWarningBadge({ missingLanguages, entityType }: TranslationWarningBadgeProps) {
  if (missingLanguages.length === 0) {
    return null;
  }

  const tooltipText = `Missing translations: ${missingLanguages.join(', ')}`;

  return (
    <Tooltip content={tooltipText}>
      <div className="inline-flex items-center cursor-help">
        <AlertCircle className="h-4 w-4 text-amber-500" />
      </div>
    </Tooltip>
  );
}
