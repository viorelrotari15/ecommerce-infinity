'use client';

import { useT, translationKeys } from '@/lib/utils/translations';

interface ProductsHeaderProps {
  total: number;
}

export function ProductsHeader({ total }: ProductsHeaderProps) {
  const t = useT();
  const foundText = t(translationKeys.products.found, '{total} products found').replace('{total}', String(total));
  
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold tracking-tight">{t(translationKeys.products.allProducts, 'All Products')}</h1>
      <p className="mt-2 text-muted-foreground">
        {foundText}
      </p>
    </div>
  );
}
