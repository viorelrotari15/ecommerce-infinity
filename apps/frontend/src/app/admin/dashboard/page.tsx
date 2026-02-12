'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isAdmin } from '@/lib/auth';
import {
  CreditCard,
  Languages,
  FileText,
  Tag,
  FolderTree,
  Package,
  List,
  Receipt,
  Truck,
  Percent,
  ImageIcon,
  LayoutGrid,
  Globe,
  Settings,
} from 'lucide-react';
import { useT, translationKeys } from '@/lib/utils/translations';

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-semibold text-muted-foreground mb-3 mt-8 first:mt-0">
      <Icon className="h-4 w-4" />
      {children}
    </h2>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const t = useT();

  useEffect(() => {
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

      {/* Catalog: Products, Brands, Categories, Attributes, Carousel */}
      <SectionTitle icon={LayoutGrid}>Catalog</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="group cursor-pointer hover:bg-accent hover:text-white transition-colors" onClick={() => router.push('/admin/products')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Products
            </CardTitle>
            <CardDescription className="group-hover:text-white">
              {t(translationKeys.admin.dashboard.manageProducts, 'Manage products')}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="group cursor-pointer hover:bg-accent hover:text-white transition-colors" onClick={() => router.push('/admin/brands')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Brands
            </CardTitle>
            <CardDescription className="group-hover:text-white">
              {t(translationKeys.admin.dashboard.manageBrands, 'Manage product brands')}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="group cursor-pointer hover:bg-accent hover:text-white transition-colors" onClick={() => router.push('/admin/categories')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Categories
            </CardTitle>
            <CardDescription className="group-hover:text-white">
              {t(translationKeys.admin.dashboard.manageCategories, 'Manage product categories')}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="group cursor-pointer hover:bg-accent hover:text-white transition-colors" onClick={() => router.push('/admin/attributes')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Attributes
            </CardTitle>
            <CardDescription className="group-hover:text-white">
              Manage product attributes and subattributes
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="group cursor-pointer hover:bg-accent hover:text-white transition-colors" onClick={() => router.push('/admin/carousel')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              {t(translationKeys.admin.carousel.dashboardTitle, 'Carousel')}
            </CardTitle>
            <CardDescription className="group-hover:text-white">
              {t(translationKeys.admin.carousel.dashboardDescription, 'Manage home page advertisement carousel')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Languages & Translations */}
      <SectionTitle icon={Globe}>Languages & translations</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="group cursor-pointer hover:bg-accent hover:text-white transition-colors" onClick={() => router.push('/admin/languages')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Languages
            </CardTitle>
            <CardDescription className="group-hover:text-white">
              {t(translationKeys.admin.dashboard.manageLanguages, 'Manage supported languages')}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="group cursor-pointer hover:bg-accent hover:text-white transition-colors" onClick={() => router.push('/admin/translations')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              UI Translations
            </CardTitle>
            <CardDescription className="group-hover:text-white">
              {t(translationKeys.admin.dashboard.manageTranslations, 'Manage interface text translations')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Others: Orders, Payments, Tax, Shipping */}
      <SectionTitle icon={Settings}>Orders, payments & settings</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="group cursor-pointer hover:bg-accent hover:text-white transition-colors" onClick={() => router.push('/admin/orders')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {t(translationKeys.admin.dashboard.ordersTitle, 'Orders')}
            </CardTitle>
            <CardDescription className="group-hover:text-white">
              {t(translationKeys.admin.dashboard.manageOrders, 'Review customer orders')}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="group cursor-pointer hover:bg-accent hover:text-white transition-colors" onClick={() => router.push('/admin/payments')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payments
            </CardTitle>
            <CardDescription className="group-hover:text-white">
              View Stripe payment history
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="group cursor-pointer hover:bg-accent hover:text-white transition-colors" onClick={() => router.push('/admin/tax-rates')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              {t(translationKeys.admin.dashboard.taxRatesTitle, 'Tax Rates')}
            </CardTitle>
            <CardDescription className="group-hover:text-white">
              {t(translationKeys.admin.dashboard.manageTaxRates, 'Configure VAT rates')}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="group cursor-pointer hover:bg-accent hover:text-white transition-colors" onClick={() => router.push('/admin/shipping')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {t(translationKeys.admin.dashboard.shippingTitle, 'Shipping')}
            </CardTitle>
            <CardDescription className="group-hover:text-white">
              {t(translationKeys.admin.dashboard.manageShipping, 'Configure shipping methods')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

