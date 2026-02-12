'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useProducts, useDeleteProduct } from '@/lib/hooks/use-products';
import { useCategories } from '@/lib/hooks/use-categories';
import { useBrands } from '@/lib/hooks/use-brands';
import { getImageUrl, getPrimaryProductImage } from '@/lib/images';
import { formatPrice } from '@/lib/utils';
import { isAdmin } from '@/lib/auth';
import { Plus, Edit, Trash2, Eye, CheckCircle2, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { useConfirm } from '@/contexts/confirm-dialog-context';
import { useToast } from '@/hooks/use-toast';
import { MultiSelectCategory } from '@/components/ui/multi-select-category';
import { MultiSelectBrand } from '@/components/ui/multi-select-brand';
import { MultiSelectAttribute } from '@/components/ui/multi-select-attribute';
import { useT, translationKeys } from '@/lib/utils/translations';
import { ItemsPerPageSelector } from '@/components/ui/items-per-page-selector';
import { apiService } from '@/lib/api/client';
import { ItemsPerPageControl } from '@/components/ui/items-per-page-control';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useAttributes } from '@/lib/hooks/use-attributes';

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
  const brandsParam = useMemo(() => searchParams.getAll('brands'), [searchParams]);
  // Memoize categories param to prevent infinite loops
  const categoriesParam = useMemo(() => searchParams.getAll('categories'), [searchParams]);
  const categoryParam = searchParams.get('category');
  const attributesParam = useMemo(() => searchParams.getAll('attributes'), [searchParams]);
  const inactiveOnlyParam = searchParams.get('inactiveOnly') === 'true';
  const featuredOnlyParam = searchParams.get('featuredOnly') === 'true';
  
  const getInitialCategories = () => {
    if (categoriesParam && categoriesParam.length > 0) {
      return categoriesParam.filter(c => c && c !== 'all');
    }
    if (categoryParam && categoryParam !== 'all') {
      return [categoryParam];
    }
    return [];
  };

  const getInitialBrands = () => {
    if (brandsParam && brandsParam.length > 0) {
      return brandsParam.filter(b => b && b !== 'all');
    }
    if (brandParam && brandParam !== 'all') {
      return [brandParam];
    }
    return []; // Empty means "All brands"
  };

  const getInitialAttributes = () => {
    if (attributesParam && attributesParam.length > 0) {
      return attributesParam.filter(a => a && a !== 'all');
    }
    return [];
  };

  const [selectedCategories, setSelectedCategories] = useState<string[]>(getInitialCategories());
  const [selectedBrands, setSelectedBrands] = useState<string[]>(getInitialBrands());
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>(getInitialAttributes());
  const [inactiveOnly, setInactiveOnly] = useState(inactiveOnlyParam);
  const [featuredOnly, setFeaturedOnly] = useState(featuredOnlyParam);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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

  // Memoize brands from URL
  const urlBrands = useMemo(() => {
    if (brandsParam && brandsParam.length > 0) {
      return brandsParam.filter(b => b && b !== 'all');
    }
    if (brandParam && brandParam !== 'all') {
      return [brandParam];
    }
    return [];
  }, [brandsParam, brandParam]);

  const urlAttributes = useMemo(() => {
    if (attributesParam && attributesParam.length > 0) {
      return attributesParam.filter(a => a && a !== 'all');
    }
    return [];
  }, [attributesParam]);

  const prevUrlBrandsRef = useRef<string>('');
  const prevUrlAttributesRef = useRef<string>('');

  // Sync filter state with URL params
  useEffect(() => {
    // Only update if the categories actually changed (compare sorted arrays)
    const urlCategoriesStr = JSON.stringify([...urlCategories].sort());
    if (urlCategoriesStr !== prevUrlCategoriesRef.current) {
      prevUrlCategoriesRef.current = urlCategoriesStr;
      setSelectedCategories(urlCategories);
    }
    
    // Sync brands
    const urlBrandsStr = JSON.stringify([...urlBrands].sort());
    if (urlBrandsStr !== prevUrlBrandsRef.current) {
      prevUrlBrandsRef.current = urlBrandsStr;
      setSelectedBrands(urlBrands);
    }

    // Sync attributes
    const urlAttributesStr = JSON.stringify([...urlAttributes].sort());
    if (urlAttributesStr !== prevUrlAttributesRef.current) {
      prevUrlAttributesRef.current = urlAttributesStr;
      setSelectedAttributes(urlAttributes);
    }
    
    setInactiveOnly(inactiveOnlyParam);
    setFeaturedOnly(featuredOnlyParam);
  }, [urlCategories, urlBrands, urlAttributes, inactiveOnlyParam, featuredOnlyParam]);

  // Fetch categories, brands, and attributes for filters
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const { data: attributes = [] } = useAttributes();

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

  const getBrandIds = () => {
    if (brandsParam && brandsParam.length > 0) {
      return brandsParam.filter(b => b && b !== 'all');
    }
    if (brandParam && brandParam !== 'all') {
      return [brandParam];
    }
    return undefined;
  };

  const getAttributeIds = () => {
    if (attributesParam && attributesParam.length > 0) {
      return attributesParam.filter(a => a && a !== 'all');
    }
    return undefined;
  };

  const brandIdsFromFilters = getBrandIds();
  const filters = {
    page,
    limit,
    includeInactive: true,
    search: searchParam || undefined,
    // Only use brandId if single brand selected, otherwise let client-side handle multiple brands
    brandId: brandIdsFromFilters && brandIdsFromFilters.length === 1 ? brandIdsFromFilters[0] : undefined,
    brandIds: brandIdsFromFilters, // Pass brandIds for client-side filtering
    categoryIds: getCategoryIds(),
    attributeIds: getAttributeIds(),
    featured: featuredOnlyParam || undefined,
    // Note: attributes and multi-brand filtering may need backend support
    // Note: inactiveOnly filter needs to be handled on backend or client-side filtering
  };

  // Use React Query instead of useState/useEffect
  // Include inactive products for admin dashboard
  const { data, isLoading, error } = useProducts(filters);
  const deleteProduct = useDeleteProduct();
  const confirm = useConfirm();
  const { toast } = useToast();

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams();
    if (searchParam) params.set('search', searchParam);
    if (selectedBrands.length > 0) {
      selectedBrands.forEach(brandId => {
        params.append('brands', brandId);
      });
    }
    if (selectedCategories.length > 0) {
      selectedCategories.forEach(catId => {
        params.append('categories', catId);
      });
    }
    if (selectedAttributes.length > 0) {
      selectedAttributes.forEach(attrId => {
        params.append('attributes', attrId);
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
    if (searchParam) params.set('search', searchParam);
    if (selectedBrands.length > 0) {
      selectedBrands.forEach(brandId => {
        params.append('brands', brandId);
      });
    }
    if (selectedCategories.length > 0) {
      selectedCategories.forEach(catId => {
        params.append('categories', catId);
      });
    }
    if (selectedAttributes.length > 0) {
      selectedAttributes.forEach(attrId => {
        params.append('attributes', attrId);
      });
    }
    if (inactiveOnly) params.set('inactiveOnly', 'true');
    if (featuredOnly) params.set('featuredOnly', 'true');
    if (limit !== 20) params.set('limit', String(limit));
    params.set('page', '1'); // Reset to first page
    router.push(`/admin/products?${params.toString()}`);
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedCategories([]);
    setSelectedAttributes([]);
    setInactiveOnly(false);
    setFeaturedOnly(false);
    if (searchParam) {
      router.push(`/admin/products?search=${encodeURIComponent(searchParam)}`);
    } else {
      router.push('/admin/products');
    }
  };

  // Helper function to build pagination URL with filters
  const buildPaginationUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set('page', String(pageNum));
    if (searchParam) params.set('search', searchParam);
    if (selectedBrands.length > 0) {
      selectedBrands.forEach(brandId => {
        params.append('brands', brandId);
      });
    }
    if (selectedCategories.length > 0) {
      selectedCategories.forEach(catId => {
        params.append('categories', catId);
      });
    }
    if (selectedAttributes.length > 0) {
      selectedAttributes.forEach(attrId => {
        params.append('attributes', attrId);
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
      <div className="w-full px-4 md:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">{t(translationKeys.admin.products.loading, 'Loading products...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-4 md:px-6 lg:px-8 py-8">
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

  // Filter products client-side: OR within each filter type, AND between filter types
  // Use URL param value, not state, so it only applies when filters are applied
  const inactiveOnlyFromUrl = inactiveOnlyParam;
  const attributeIdsFromUrl = getAttributeIds();
  const categoryIdsFromUrl = getCategoryIds();
  const brandIdsFromUrl = getBrandIds();
  let products = data?.data || [];
  
  if (inactiveOnlyFromUrl) {
    products = products.filter((product: any) => !product.isActive);
  }
  
  // Filter by multiple categories (OR logic - product must have ANY selected category)
  if (categoryIdsFromUrl && categoryIdsFromUrl.length > 0) {
    products = products.filter((product: any) => {
      if (!product.categories || product.categories.length === 0) return false;
      const productCategoryIds = product.categories.map((cat: any) => cat.category?.id || cat.categoryId);
      // Product must have ANY selected category
      return categoryIdsFromUrl.some(selectedCatId => productCategoryIds.includes(selectedCatId));
    });
  }
  
  // Filter by multiple brands (OR logic - product must match ANY selected brand)
  // Note: Since a product can only have one brand, multiple brands use OR logic
  if (brandIdsFromUrl && brandIdsFromUrl.length > 0) {
    products = products.filter((product: any) => {
      const productBrandId = product.brand?.id || product.brandId;
      // Product must match ANY selected brand
      return brandIdsFromUrl.includes(productBrandId);
    });
  }
  
  // Filter by multiple attributes (OR logic - product must have ANY selected attribute)
  if (attributeIdsFromUrl && attributeIdsFromUrl.length > 0) {
    products = products.filter((product: any) => {
      if (!product.attributes || product.attributes.length === 0) return false;
      
      // Get all attribute/subattribute IDs that this product has
      const productAttributeIds: string[] = [];
      product.attributes.forEach((attr: any) => {
        const attrId = attr.attribute?.id || attr.attributeId;
        const attrValue = attr.value;
        
        // Add the attribute ID
        if (attrId) productAttributeIds.push(attrId);
        
        // Add the value if it's an ID
        if (attrValue) productAttributeIds.push(attrValue);
        
        // Add subattribute IDs if they exist
        if (attr.attribute?.subattributes) {
          attr.attribute.subattributes.forEach((subattr: any) => {
            if (subattr.id) productAttributeIds.push(subattr.id);
          });
        }
      });
      
      // Product must have ANY selected attribute/subattribute
      return attributeIdsFromUrl.some(selectedId => productAttributeIds.includes(selectedId));
    });
  }
  
  // Note: featuredOnly is already handled by backend via filters.featured
  // We only need client-side filtering for inactiveOnly and attributes
  
  // Note: Pagination counts may be inaccurate when inactiveOnly or attribute filters are active
  // since we're filtering client-side after fetching
  const meta = data?.meta || { totalPages: 1 };

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8">
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
      <div className="mb-8">
        {/* Filter Toggle Button */}
        <Button
          variant="outline"
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="w-full md:w-auto mb-4"
        >
          <Filter className="h-4 w-4 mr-2" />
          {t(translationKeys.admin.products.filters, 'Filters')}
          {isFiltersOpen ? (
            <ChevronUp className="h-4 w-4 ml-2" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-2" />
          )}
        </Button>

        {/* Filters Section */}
        {isFiltersOpen && (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="grid gap-4 md:grid-cols-3">
          <MultiSelectCategory
            categories={categories}
            selectedIds={selectedCategories}
            onSelectionChange={setSelectedCategories}
            placeholder={t(translationKeys.admin.products.selectCategories, 'Select categories...')}
          />

          <MultiSelectBrand
            brands={brands}
            selectedIds={selectedBrands}
            onSelectionChange={setSelectedBrands}
            placeholder={t(translationKeys.admin.products.allBrands, 'All Brands')}
          />

          <MultiSelectAttribute
            attributes={attributes}
            selectedIds={selectedAttributes}
            onSelectionChange={setSelectedAttributes}
            placeholder="Select attributes..."
          />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
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
                {t(translationKeys.admin.products.showFeaturedProducts, 'Show featured products')}
              </Label>
            </div>
          </div>
          <ItemsPerPageSelector
            value={limit}
            onChange={handleLimitChange}
            label={t(translationKeys.common.itemsPerPage, 'Items per page')}
          />
        </div>

            <div className="flex gap-2">
              <Button onClick={applyFilters}>{t(translationKeys.admin.products.applyFilters, 'Apply Filters')}</Button>
              <Button variant="outline" onClick={clearFilters}>
                {t(translationKeys.common.clear, 'Clear')}
              </Button>
            </div>
          </div>
        )}
      </div>

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
                      {product.isFeatured && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                          {t(translationKeys.products.featured, 'Featured')}
                        </span>
                      )}
                      {!product.isActive && (
                        <span className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded">
                          {t(translationKeys.products.inactive, 'Inactive')}
                        </span>
                      )}
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{product.name}</CardTitle>
                    <CardDescription>
                      {product.brand.name} • {t(translationKeys.admin.products.sku, 'SKU')}: {product.sku ?? 'N/A'}
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
{!product.isActive && (
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
              preserveParams={['brand', 'brands', 'categories', 'category', 'attributes', 'search', 'inactiveOnly', 'featuredOnly']}
            />
          )}
        </>
      )}
    </div>
  );
}
