'use client';

import { useT, translationKeys } from '@/lib/utils/translations';

export function BrandsHeader() {
  const t = useT();
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold tracking-tight">{t(translationKeys.brands.title, 'Brands')}</h1>
      <p className="mt-2 text-muted-foreground">
        {t(translationKeys.brands.description, 'Discover products from your favorite brands')}
      </p>
    </div>
  );
}
