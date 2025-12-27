'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProducts, useDeleteProduct } from '@/lib/hooks/use-products';
import { getImageUrl, getPrimaryProductImage } from '@/lib/images';
import { formatPrice } from '@/lib/utils';
import { isAdmin } from '@/lib/auth';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  sku: string;
  images: string[];
  productImages?: Array<{ filepath: string; url?: string; isPrimary?: boolean }>;
  isActive: boolean;
  isFeatured: boolean;
  brand: { name: string; slug: string };
  variants: Array<{ price: number | string; stock: number }>;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  useEffect(() => {
    // Check if user is admin
    if (!isAdmin()) {
      router.push('/auth/login');
      return;
    }
  }, [router]);

  // Use React Query instead of useState/useEffect
  const { data, isLoading, error } = useProducts({ page, limit: 20 });
  const deleteProduct = useDeleteProduct();

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await deleteProduct.mutateAsync(productId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error.message || 'Failed to load products'}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const products = data?.data || [];
  const meta = data?.meta || { totalPages: 1 };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your products and inventory
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Product
          </Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No products found</p>
            <Link href="/admin/products/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Product
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const minPrice = product.variants[0]?.price
                ? formatPrice(product.variants[0].price)
                : 'N/A';
              const imageUrl = product.productImages
                ? getPrimaryProductImage(product.productImages)
                : product.images?.[0]
                ? getImageUrl(product.images[0])
                : '/placeholder-image.jpg';

              return (
                <Card key={product.id} className="overflow-hidden">
                  <div className="relative aspect-square w-full overflow-hidden bg-muted">
                    {imageUrl && imageUrl !== '/placeholder-image.jpg' ? (
                      <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-muted-foreground">No Image</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      {product.isFeatured && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                          Featured
                        </span>
                      )}
                      {!product.isActive && (
                        <span className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{product.name}</CardTitle>
                    <CardDescription>
                      {product.brand.name} • SKU: {product.sku}
                    </CardDescription>
                    <p className="text-lg font-semibold mt-2">{minPrice}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Link href={`/products/${product.slug}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/admin/products/${product.id}/edit`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        disabled={deleteProduct.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {meta.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === meta.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

