'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isAdmin } from '@/lib/auth';
import { Languages, FileText, Tag, FolderTree, Package, List } from 'lucide-react';
import { useT, translationKeys } from '@/lib/utils/translations';

export default function AdminDashboard() {
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    // Check if user is admin
    if (!isAdmin()) {
      router.push('/auth/login');
      return;
    }
  }, [router]);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t(translationKeys.admin.dashboard.title, 'Admin Dashboard')}</h1>
        <p className="text-muted-foreground mt-2">
          {t(translationKeys.admin.dashboard.description, 'Manage your e-commerce store')}
        </p>
      </div>

      {/* Management Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/admin/products')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Products
            </CardTitle>
            <CardDescription>{t(translationKeys.admin.dashboard.manageProducts, 'Manage products')}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/admin/brands')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Brands
            </CardTitle>
            <CardDescription>{t(translationKeys.admin.dashboard.manageBrands, 'Manage product brands')}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/admin/categories')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Categories
            </CardTitle>
            <CardDescription>{t(translationKeys.admin.dashboard.manageCategories, 'Manage product categories')}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/admin/product-types')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Types
            </CardTitle>
            <CardDescription>{t(translationKeys.admin.dashboard.manageProductTypes, 'Manage product types')}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/admin/attributes')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Attributes
            </CardTitle>
            <CardDescription>Manage product attributes and subattributes</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/admin/languages')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Languages
            </CardTitle>
            <CardDescription>{t(translationKeys.admin.dashboard.manageLanguages, 'Manage supported languages')}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/admin/translations')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              UI Translations
            </CardTitle>
            <CardDescription>{t(translationKeys.admin.dashboard.manageTranslations, 'Manage interface text translations')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

