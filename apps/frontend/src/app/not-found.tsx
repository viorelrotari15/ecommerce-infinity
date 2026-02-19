'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/utils/translations';
import { translationKeys } from '@/lib/utils/translations';

export default function NotFound() {
  const t = useT();
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-4 text-muted-foreground">{t(translationKeys.common.pageNotFound, 'Page not found')}</p>
      <Link href="/" className="mt-8">
        <Button>{t(translationKeys.profile.goHome, 'Go Home')}</Button>
      </Link>
    </div>
  );
}

