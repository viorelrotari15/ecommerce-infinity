'use client';

import { useT, translationKeys } from '@/lib/utils/translations';

export function CategoriesHeader() {
  const t = useT();
  
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold tracking-tight">{t(translationKeys.categories.title, 'Categories')}</h1>
      <p className="mt-2 text-muted-foreground">
        {t(translationKeys.categories.description, 'Browse our products by category')}
      </p>
    </div>
  );
}
