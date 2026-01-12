'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isAdmin } from '@/lib/auth';
import { Plus, Languages, FileText, Tag, FolderTree, Package } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is admin
    if (!isAdmin()) {
      router.push('/auth/login');
      return;
    }
  }, [router]);

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your e-commerce store
          </p>
        </div>
        <Link href="/admin/products">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Manage Products
          </Button>
        </Link>
      </div>

      {/* Management Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/admin/products')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Products
            </CardTitle>
            <CardDescription>Manage products</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/admin/brands')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Brands
            </CardTitle>
            <CardDescription>Manage product brands</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/admin/categories')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Categories
            </CardTitle>
            <CardDescription>Manage product categories</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/admin/product-types')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Types
            </CardTitle>
            <CardDescription>Manage product types</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/admin/languages')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Languages
            </CardTitle>
            <CardDescription>Manage supported languages</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/admin/translations')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              UI Translations
            </CardTitle>
            <CardDescription>Manage interface text translations</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Access your management pages</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Use the quick links above to manage products, brands, categories, and more.
          </p>
          <Link href="/admin/products">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Go to Products Management
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

