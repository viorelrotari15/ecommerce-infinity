'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Textarea component - using native textarea for now
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchAPI, fetchAPIAuth, uploadImage } from '@/lib/api';
import { getProductImageUrl } from '@/lib/images';
import { useBrands } from '@/lib/hooks/use-brands';
import { useCategories } from '@/lib/hooks/use-categories';
import { useProductTypes } from '@/lib/hooks/use-product-types';
import { X, Plus, Upload, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

const productSchema = yup.object({
  name: yup.string().required('Product name is required'),
  slug: yup.string().required('Slug is required'),
  description: yup.string(),
  shortDescription: yup.string(),
  sku: yup.string().required('SKU is required'),
  brandId: yup.string().required('Brand is required'),
  productTypeId: yup.string().required('Product type is required'),
  categoryIds: yup.array().of(yup.string()).min(1, 'At least one category is required'),
  isActive: yup.boolean().default(true),
  isFeatured: yup.boolean().default(false),
  metaTitle: yup.string(),
  metaDescription: yup.string(),
  variants: yup
    .array()
    .of(
      yup.object({
        name: yup.string().required('Variant name is required'),
        sku: yup.string().required('Variant SKU is required'),
        price: yup.number().min(0, 'Price must be positive').required('Price is required'),
        stock: yup.number().min(0, 'Stock must be positive').required('Stock is required'),
        isActive: yup.boolean().default(true),
      }),
    )
    .min(1, 'At least one variant is required'),
  attributes: yup.array().of(
    yup.object({
      attributeId: yup.string().required('Attribute is required'),
      value: yup.string().required('Value is required'),
    }),
  ),
});

type ProductFormData = yup.InferType<typeof productSchema>;

interface Brand {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductType {
  id: string;
  name: string;
  slug: string;
}

interface Attribute {
  id: string;
  name: string;
  slug: string;
}

interface ProductImage {
  id: string;
  filepath: string;
  url: string;
  isPrimary: boolean;
  order: number;
}

export default function NewProductPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [uploadedImages, setUploadedImages] = useState<ProductImage[]>([]);
  const [token, setToken] = useState<string | null>(null);

  // Use React Query hooks for brands, categories, and product types
  const { data: brands = [] } = useBrands();
  const { data: categories = [] } = useCategories();
  const { data: productTypes = [] } = useProductTypes();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProductFormData>({
    resolver: yupResolver(productSchema),
    defaultValues: {
      isActive: true,
      isFeatured: false,
      categoryIds: [],
      variants: [{ name: '', sku: '', price: 0, stock: 0, isActive: true }],
      attributes: [],
    },
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: 'variants',
  });

  const { fields: attributeFields, append: appendAttribute, remove: removeAttribute } =
    useFieldArray({
      control,
      name: 'attributes',
    });

  const selectedProductTypeId = watch('productTypeId');

  useEffect(() => {
    // Get token from localStorage
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/auth/login');
      return;
    }
    setToken(storedToken);

    // Check if user is admin
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role !== 'ADMIN') {
        router.push('/');
        return;
      }
    }
    // Brands, categories, and product types are now fetched via React Query hooks
  }, [router]);

  useEffect(() => {
    // Fetch attributes when product type changes
    if (selectedProductTypeId && token) {
      fetchAPIAuth<Attribute[]>(`/attributes/product-type/${selectedProductTypeId}`, token)
        .then((data) => setAttributes(data))
        .catch(() => setAttributes([]));
    } else {
      setAttributes([]);
    }
  }, [selectedProductTypeId, token]);

  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !token) return;

    const productId = createdProductId;
    if (!productId) {
      setError('Please create the product first, then upload images');
      return;
    }

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map((file, index) =>
        uploadImage(productId, file, token, {
          isPrimary: index === 0 && uploadedImages.length === 0,
          order: uploadedImages.length + index,
        }),
      );

      const results = await Promise.all(uploadPromises);
      setUploadedImages([...uploadedImages, ...results]);
    } catch (err: any) {
      setError(err.message || 'Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!token) return;

    try {
      await fetchAPIAuth(`/images/${imageId}`, token, { method: 'DELETE' });
      setUploadedImages(uploadedImages.filter((img) => img.id !== imageId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete image');
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!token) {
      setError('Not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const product = await fetchAPIAuth('/products', token, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      // Set product ID for image uploads
      setCreatedProductId(product.id);

      // Show success message
      setError(null);
      // Don't redirect immediately - allow user to upload images first
      // router.push(`/admin/products/${product.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Product</h1>
        <p className="text-muted-foreground">Add a new product to your store</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Product name, slug, and SKU</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug <span className="text-destructive">*</span>
                </Label>
                <Input id="slug" {...register('slug')} placeholder="product-name" />
                {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">
                  SKU <span className="text-destructive">*</span>
                </Label>
                <Input id="sku" {...register('sku')} />
                {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description</Label>
                <textarea
                  id="shortDescription"
                  {...register('shortDescription')}
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  {...register('description')}
                  rows={4}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle>Classification</CardTitle>
              <CardDescription>Brand, type, and categories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brandId">
                  Brand <span className="text-destructive">*</span>
                </Label>
                <Select onValueChange={(value) => setValue('brandId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.brandId && (
                  <p className="text-sm text-destructive">{errors.brandId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="productTypeId">
                  Product Type <span className="text-destructive">*</span>
                </Label>
                <Select onValueChange={(value) => setValue('productTypeId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product type" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.productTypeId && (
                  <p className="text-sm text-destructive">{errors.productTypeId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Categories <span className="text-destructive">*</span>
                </Label>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`category-${category.id}`}
                        value={category.id}
                        {...register('categoryIds')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`category-${category.id}`} className="font-normal">
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.categoryIds && (
                  <p className="text-sm text-destructive">{errors.categoryIds.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Variants */}
        <Card>
          <CardHeader>
            <CardTitle>Product Variants</CardTitle>
            <CardDescription>Add pricing and stock information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {variantFields.map((field, index) => (
              <div key={field.id} className="grid gap-4 rounded-lg border p-4 md:grid-cols-5">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input {...register(`variants.${index}.name`)} placeholder="e.g., 50ml" />
                  {errors.variants?.[index]?.name && (
                    <p className="text-sm text-destructive">
                      {errors.variants[index]?.name?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input {...register(`variants.${index}.sku`)} />
                  {errors.variants?.[index]?.sku && (
                    <p className="text-sm text-destructive">
                      {errors.variants[index]?.sku?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`variants.${index}.price`, { valueAsNumber: true })}
                  />
                  {errors.variants?.[index]?.price && (
                    <p className="text-sm text-destructive">
                      {errors.variants[index]?.price?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    {...register(`variants.${index}.stock`, { valueAsNumber: true })}
                  />
                  {errors.variants?.[index]?.stock && (
                    <p className="text-sm text-destructive">
                      {errors.variants[index]?.stock?.message}
                    </p>
                  )}
                </div>
                <div className="flex items-end">
                  {variantFields.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeVariant(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => appendVariant({ name: '', sku: '', price: 0, stock: 0, isActive: true })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Variant
            </Button>
            {errors.variants && (
              <p className="text-sm text-destructive">{errors.variants.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Attributes */}
        {attributes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Attributes</CardTitle>
              <CardDescription>Product-specific attributes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {attributeFields.map((field, index) => (
                <div key={field.id} className="grid gap-4 rounded-lg border p-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Attribute</Label>
                    <Select
                      onValueChange={(value) => setValue(`attributes.${index}.attributeId`, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select attribute" />
                      </SelectTrigger>
                      <SelectContent>
                        {attributes.map((attr) => (
                          <SelectItem key={attr.id} value={attr.id}>
                            {attr.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Value</Label>
                    <Input {...register(`attributes.${index}.value`)} />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeAttribute(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => appendAttribute({ attributeId: '', value: '' })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Attribute
              </Button>
            </CardContent>
          </Card>
        )}

        {/* SEO */}
        <Card>
          <CardHeader>
            <CardTitle>SEO Settings</CardTitle>
            <CardDescription>Meta title and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metaTitle">Meta Title</Label>
              <Input id="metaTitle" {...register('metaTitle')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metaDescription">Meta Description</Label>
              <textarea
                id="metaDescription"
                {...register('metaDescription')}
                rows={3}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
            <CardDescription>Upload product images (up to 5 images)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              {uploadedImages.map((image) => (
                <div key={image.id} className="relative">
                  <div className="relative h-32 w-32 overflow-hidden rounded-lg border">
                    <Image
                      src={getProductImageUrl(image)}
                      alt="Product"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0"
                    onClick={() => handleDeleteImage(image.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  {image.isPrimary && (
                    <div className="absolute bottom-0 left-0 right-0 bg-primary/80 px-2 py-1 text-xs text-primary-foreground">
                      Primary
                    </div>
                  )}
                </div>
              ))}
              {uploadedImages.length < 5 && (
                <label className="flex h-32 w-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed hover:bg-muted">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <div className="text-muted-foreground">Uploading...</div>
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                </label>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {createdProductId
                ? 'Product created! You can now upload images (up to 5 images per product).'
                : 'Create the product first, then upload images. You can upload up to 5 images per product.'}
            </p>
            {createdProductId && (
              <Button
                type="button"
                onClick={() => router.push(`/products/${createdProductId}`)}
                variant="outline"
              >
                View Product
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Options */}
        <Card>
          <CardHeader>
            <CardTitle>Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                {...register('isActive')}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive" className="font-normal">
                Product is active
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isFeatured"
                {...register('isFeatured')}
                className="h-4 w-4"
              />
              <Label htmlFor="isFeatured" className="font-normal">
                Feature this product
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
}

