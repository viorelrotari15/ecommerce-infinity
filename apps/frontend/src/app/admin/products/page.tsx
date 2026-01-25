'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProducts, useDeleteProduct } from '@/lib/hooks/use-products';
import { useCategories } from '@/lib/hooks/use-categories';
import { useBrands } from '@/lib/hooks/use-brands';
import { getImageUrl, getPrimaryProductImage } from '@/lib/images';
import { formatPrice } from '@/lib/utils';
import { isAdmin } from '@/lib/auth';
import { Plus, Edit, Trash2, Eye, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { useConfirm } from '@/contexts/confirm-dialog-context';
import { useToast } from '@/hooks/use-toast';
import { MultiSelectCategory } from '@/components/ui/multi-select-category';
import { useT, translationKeys } from '@/lib/utils/translations';
import { apiService } from '@/lib/api/client';
import { ItemsPerPageControl } from '@/components/ui/items-per-page-control';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  sku?: string;
  images: string[];
  productImages?: Array<{ filepath: string; url?: string; isPrimary?: boolean }>;
  isActive?: boolean;
  isFeatured?: boolean;
  brand: { name: string; slug: string };
  variants: Array<{ price: number | string; stock: number }>;
  createdAt?: string;
  updatedAt?: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const t = useT();
  const searchParams = useSearchParams();
  
  // Get filter values from URL params
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const searchParam = searchParams.get('search') || '';
  const brandParam = searchParams.get('brand');
  // Memoize categories param to prevent infinite loops
  const categoriesParam = useMemo(() => searchParams.getAll('categories'), [searchParams]);
  const categoryParam = searchParams.get('category');
  const inactiveOnlyParam = searchParams.get('inactiveOnly') === 'true';
  const featuredOnlyParam = searchParams.get('featuredOnly') === 'true';
  
  const [search, setSearch] = useState(searchParam);
  const [selectedBrand, setSelectedBrand] = useState(brandParam && brandParam !== 'all' ? brandParam : 'all');
  const getInitialCategories = () => {
    if (categoriesParam && categoriesParam.length > 0) {
      return categoriesParam.filter(c => c && c !== 'all');
    }
    if (categoryParam && categoryParam !== 'all') {
      return [categoryParam];
    }
    return [];
  };
  const [selectedCategories, setSelectedCategories] = useState<string[]>(getInitialCategories());
  const [inactiveOnly, setInactiveOnly] = useState(inactiveOnlyParam);
  const [featuredOnly, setFeaturedOnly] = useState(featuredOnlyParam);

  useEffect(() => {
    // Check if user is admin
    if (!isAdmin()) {
      router.push('/auth/login');
      return;
    }
  }, [router]);

  // Memoize the computed categories from URL params
  const urlCategories = useMemo(() => {
    return categoriesParam && categoriesParam.length > 0
      ? categoriesParam.filter(c => c && c !== 'all')
      : categoryParam && categoryParam !== 'all'
      ? [categoryParam]
      : [];
  }, [categoriesParam, categoryParam]);

  const prevUrlCategoriesRef = useRef<string>('');

  // Sync filter state with URL params
  useEffect(() => {
    setSearch(searchParam);
    setSelectedBrand(brandParam && brandParam !== 'all' ? brandParam : 'all');
    
    // Only update if the categories actually changed (compare sorted arrays)
    const urlCategoriesStr = JSON.stringify([...urlCategories].sort());
    if (urlCategoriesStr !== prevUrlCategoriesRef.current) {
      prevUrlCategoriesRef.current = urlCategoriesStr;
      setSelectedCategories(urlCategories);
    }
    
    setInactiveOnly(inactiveOnlyParam);
    setFeaturedOnly(featuredOnlyParam);
  }, [searchParam, brandParam, urlCategories, inactiveOnlyParam, featuredOnlyParam]);

  // Fetch categories and brands for filters
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();

  // Build filters object from URL params (not state) so filters only apply when "Apply Filters" is clicked
  const getCategoryIds = () => {
    if (categoriesParam && categoriesParam.length > 0) {
      return categoriesParam.filter(c => c && c !== 'all');
    }
    if (categoryParam && categoryParam !== 'all') {
      return [categoryParam];
    }
    return undefined;
  };

  const filters = {
    page,
    limit,
    includeInactive: true,
    search: searchParam || undefined,
    brandId: brandParam && brandParam !== 'all' ? brandParam : undefined,
    categoryIds: getCategoryIds(),
    featured: featuredOnlyParam || undefined,
    // Note: inactiveOnly filter needs to be handled on backend or client-side filtering
    // For now, we'll include it in the filters but backend may need to support it
  };

  // Use React Query instead of useState/useEffect
  // Include inactive products for admin dashboard
  const { data, isLoading, error } = useProducts(filters);
  const deleteProduct = useDeleteProduct();
  const confirm = useConfirm();
  const { toast } = useToast();

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedBrand && selectedBrand !== 'all') {
      params.set('brand', selectedBrand);
    }
    if (selectedCategories.length > 0) {
      selectedCategories.forEach(catId => {
        params.append('categories', catId);
      });
    }
    if (inactiveOnly) params.set('inactiveOnly', 'true');
    if (featuredOnly) params.set('featuredOnly', 'true');
    if (newLimit !== 20) params.set('limit', String(newLimit));
    params.set('page', '1'); // Reset to first page
    router.push(`/admin/products?${params.toString()}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedBrand && selectedBrand !== 'all') {
      params.set('brand', selectedBrand);
    }
    // Add multiple categories
    if (selectedCategories.length > 0) {
      selectedCategories.forEach(catId => {
        params.append('categories', catId);
      });
    }
    if (inactiveOnly) params.set('inactiveOnly', 'true');
    if (featuredOnly) params.set('featuredOnly', 'true');
    if (limit !== 20) params.set('limit', String(limit));
    params.set('page', '1'); // Reset to first page
    router.push(`/admin/products?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedBrand('all');
    setSelectedCategories([]);
    setInactiveOnly(false);
    setFeaturedOnly(false);
    router.push('/admin/products');
  };

  // Helper function to build pagination URL with filters
  const buildPaginationUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set('page', String(pageNum));
    if (search) params.set('search', search);
    if (selectedBrand && selectedBrand !== 'all') {
      params.set('brand', selectedBrand);
    }
    if (selectedCategories.length > 0) {
      selectedCategories.forEach(catId => {
        params.append('categories', catId);
      });
    }
    if (inactiveOnly) params.set('inactiveOnly', 'true');
    if (featuredOnly) params.set('featuredOnly', 'true');
    if (limit !== 20) params.set('limit', String(limit));
    return `/admin/products?${params.toString()}`;
  };

  const handleDelete = async (productId: string) => {
    const confirmed = await confirm({
      title: t(translationKeys.admin.products.deleteTitle, 'Delete Product'),
      description: t(translationKeys.admin.products.deleteDescription, 'Are you sure you want to delete this product? This action cannot be undone.'),
      confirmText: t(translationKeys.common.delete, 'Delete'),
      cancelText: t(translationKeys.common.cancel, 'Cancel'),
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteProduct.mutateAsync(productId);
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.products.deleteSuccess, 'Product deleted successfully!'),
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: err.message || t(translationKeys.common.failed, 'Failed to delete product. Please try again.'),
      });
    }
  };

  const handleReactivate = async (productId: string) => {
    try {
      await apiService.patch(`/products/${productId}`, { isActive: true });
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.products.reactivateSuccess, 'Product reactivated successfully!'),
      });
      // Refetch products
      window.location.reload();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: err.message || t(translationKeys.common.failed, 'Failed to reactivate product. Please try again.'),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">{t(translationKeys.admin.products.loading, 'Loading products...')}</p>
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
              <CardTitle>{t(translationKeys.common.error, 'Error')}</CardTitle>
              <CardDescription>{error.message || t(translationKeys.common.failed, 'Failed to load products')}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Filter products client-side for inactiveOnly (backend doesn't support this filter)
  // Use URL param value, not state, so it only applies when filters are applied
  const inactiveOnlyFromUrl = inactiveOnlyParam;
  let products = data?.data || [];
  
  if (inactiveOnlyFromUrl) {
    products = products.filter((product: any) => !product.isActive);
  }
  
  // Note: featuredOnly is already handled by backend via filters.featured
  // We only need client-side filtering for inactiveOnly
  
  // Note: Pagination counts may be inaccurate when inactiveOnly filter is active
  // since we're filtering client-side after fetching
  const meta = data?.meta || { totalPages: 1 };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t(translationKeys.admin.products.title, 'Manage Products')}</h1>
          <p className="text-muted-foreground mt-2">
            {t(translationKeys.admin.products.description, 'Create, edit, and delete products')}
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t(translationKeys.admin.products.newProduct, 'New Product')}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4 rounded-lg border p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            placeholder={t(translationKeys.admin.products.searchPlaceholder, 'Search products...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />

          <MultiSelectCategory
            categories={categories}
            selectedIds={selectedCategories}
            onSelectionChange={setSelectedCategories}
            placeholder={t(translationKeys.admin.products.selectCategories, 'Select categories...')}
          />

          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger>
              <SelectValue placeholder={t(translationKeys.admin.products.allBrands, 'All Brands')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(translationKeys.admin.products.allBrands, 'All Brands')}</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-6">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="inactiveOnly"
              checked={inactiveOnly}
              onChange={(e) => setInactiveOnly(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="inactiveOnly" className="font-normal cursor-pointer">
              {t(translationKeys.admin.products.showInactiveOnly, 'Show inactive only')}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="featuredOnly"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="featuredOnly" className="font-normal cursor-pointer">
              {t(translationKeys.admin.products.showFeaturedOnly, 'Show featured only')}
            </Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={applyFilters}>{t(translationKeys.admin.products.applyFilters, 'Apply Filters')}</Button>
          <Button variant="outline" onClick={clearFilters}>
            {t(translationKeys.common.clear, 'Clear')}
          </Button>
        </div>
      </div>

      {/* Items Per Page Control */}
      <ItemsPerPageControl
        limit={limit}
        baseUrl="/admin/products"
      />

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">{t(translationKeys.admin.products.noProductsFound, 'No products found')}</p>
            <Link href="/admin/products/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t(translationKeys.admin.products.createFirstProduct, 'Create Your First Product')}
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
                        <span className="text-muted-foreground">{t(translationKeys.products.noImage, 'No Image')}</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      {(product as any).isFeatured && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                          {t(translationKeys.products.featured, 'Featured')}
                        </span>
                      )}
                      {!(product as any).isActive && (
                        <span className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded">
                          {t(translationKeys.products.inactive, 'Inactive')}
                        </span>
                      )}
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{product.name}</CardTitle>
                    <CardDescription>
                      {product.brand.name} • {t(translationKeys.admin.products.sku, 'SKU')}: {(product as any).sku || 'N/A'}
                    </CardDescription>
                    <p className="text-lg font-semibold mt-2">{minPrice}</p>
                  </CardHeader>
                  <CardContent>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Link href={`/products/${product.slug}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              <Eye className="h-4 w-4 mr-2" />
                              {t(translationKeys.admin.products.view, 'View')}
                            </Button>
                          </Link>
                          <Link href={`/admin/products/${product.id}/edit`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              <Edit className="h-4 w-4 mr-2" />
                              {t(translationKeys.common.edit, 'Edit')}
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
                        {!(product as any).isActive && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleReactivate(product.id)}
                            className="w-full"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {t(translationKeys.admin.products.reactivate, 'Reactivate Product')}
                          </Button>
                        )}
                      </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {meta.totalPages > 1 && (
            <PaginationControls
              currentPage={page}
              totalPages={meta.totalPages}
              limit={limit}
              baseUrl="/admin/products"
            />
          )}
        </>
      )}
    </div>
  );
}
