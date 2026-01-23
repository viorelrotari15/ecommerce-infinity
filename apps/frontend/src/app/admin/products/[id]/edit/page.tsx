'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchAPI, fetchAPIAuth } from '@/lib/api';
import { getProductImageUrl } from '@/lib/images';
import { isAdmin, getAuthToken } from '@/lib/auth';
import { useUploadProductImage, useDeleteProductImage } from '@/lib/hooks/use-product-images';
import { useCategories } from '@/lib/hooks/use-categories';
import { useBrands } from '@/lib/hooks/use-brands';
import { useProductTypes } from '@/lib/hooks/use-product-types';
import { useQueryClient } from '@tanstack/react-query';
import { productQueryKeys } from '@/lib/api/queries';
import { X, Plus, Upload, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { ProductTranslationsTabs, ProductTranslationsTabsRef } from '@/components/admin/product-translations-tabs';
import { useT, translationKeys } from '@/lib/utils/translations';
import { useLanguages, useDefaultLanguage } from '@/lib/hooks/use-languages';

type ProductFormData = {
  name?: string;
  description?: string;
  shortDescription?: string;
  brandId: string;
  productTypeId: string;
  categoryIds: string[];
  isActive: boolean;
  isFeatured: boolean;
  metaTitle?: string;
  metaDescription?: string;
  variants: Array<{
    name: string;
    price: number;
    stock: number;
    isActive: boolean;
  }>;
  attributes?: Array<{
    attributeId: string;
    value: string;
  }>;
};

interface Brand {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  children?: Category[];
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
  parentId?: string;
  subattributes?: Attribute[];
}

interface ProductImage {
  id: string;
  filepath: string;
  url: string;
  isPrimary: boolean;
  order: number;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const queryClient = useQueryClient();
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [uploadedImages, setUploadedImages] = useState<ProductImage[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const translationsRef = useRef<ProductTranslationsTabsRef>(null);
  const { data: languages = [] } = useLanguages(true);
  const { data: defaultLanguageCode = 'en' } = useDefaultLanguage();

  const productSchema = yup.object({
    // Name, description, shortDescription, metaTitle, metaDescription come from translations
    name: yup.string().optional(),
    description: yup.string().optional(),
    shortDescription: yup.string().optional(),
    brandId: yup.string().required(t(translationKeys.admin.products.brandRequired, 'Brand is required')),
    productTypeId: yup.string().required(t(translationKeys.admin.products.productTypeRequired, 'Product type is required')),
    categoryIds: yup.array().of(yup.string().required()).min(1, t(translationKeys.admin.products.categoryRequired, 'At least one category is required')).required(),
    isActive: yup.boolean().default(true),
    isFeatured: yup.boolean().default(false),
    metaTitle: yup.string().optional(),
    metaDescription: yup.string().optional(),
    variants: yup
      .array()
      .of(
        yup.object({
          name: yup.string().required(t(translationKeys.admin.products.variantNameRequired, 'Variant name is required')),
          price: yup.number().min(0, t(translationKeys.admin.products.pricePositive, 'Price must be positive')).required(t(translationKeys.admin.products.priceRequired, 'Price is required')),
          stock: yup.number().min(0, t(translationKeys.admin.products.stockPositive, 'Stock must be positive')).required(t(translationKeys.admin.products.stockRequired, 'Stock is required')),
          isActive: yup.boolean().default(true),
        }),
      )
      .min(1, t(translationKeys.admin.products.variantRequired, 'At least one variant is required'))
      .required(),
    attributes: yup.array().of(
      yup.object({
        attributeId: yup.string().required(t(translationKeys.admin.products.attributeRequired, 'Attribute is required')),
        value: yup.string().required(t(translationKeys.admin.products.valueRequired, 'Value is required')),
      }),
    ),
  });

  // Use React Query hooks for brands, categories, and product types
  const { data: brands = [] } = useBrands();
  const { data: categories = [] } = useCategories();
  const { data: productTypes = [] } = useProductTypes();

  // Use React Query hooks for image operations
  const uploadImageMutation = useUploadProductImage(productId);
  const deleteImageMutation = useDeleteProductImage();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<yup.InferType<typeof productSchema>>({
    resolver: yupResolver(productSchema),
    defaultValues: {
      isActive: true,
      isFeatured: false,
      categoryIds: [],
      variants: [{ name: '', price: 0, stock: 0, isActive: true }],
      attributes: [],
    },
  });

  // SKU and slug are auto-generated on the backend, no need to handle them in frontend

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: 'variants',
  });

  const { fields: attributeFields, append: appendAttribute, remove: removeAttribute } =
    useFieldArray({
      control,
      name: 'attributes',
    });

  // Get parent categories (categories with children are parent categories)
  const parentCategories = (categories as unknown as Category[]).filter((cat) => cat.children && cat.children.length > 0);
  
  // Get selected category IDs
  const selectedCategoryIds = watch('categoryIds') || [];
  
  // Helper to find parent category for a subcategory
  const findParentCategory = (subcategoryId: string) => {
    return parentCategories.find((cat) => 
      cat.children?.some((child) => child.id === subcategoryId)
    ) || null;
  };
  
  // Helper to get all categories and subcategories for display
  const getAllCategoriesForDisplay = () => {
    const all: Array<{ id: string; name: string; isSubcategory: boolean; parentName?: string }> = [];
    parentCategories.forEach(cat => {
      all.push({ id: cat.id, name: cat.name, isSubcategory: false });
      if (cat.children) {
        cat.children.forEach(subcat => {
          all.push({ 
            id: subcat.id, 
            name: subcat.name, 
            isSubcategory: true,
            parentName: cat.name
          });
        });
      }
    });
    return all;
  };
  
  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    const currentIds = selectedCategoryIds;
    
    // Check if it's a parent category
    const parentCategory = parentCategories.find((cat) => cat.id === categoryId);
    
    if (parentCategory) {
      // It's a parent category
      if (currentIds.includes(categoryId)) {
        // Deselecting parent - remove parent and all its subcategories
        const subcategoryIds = parentCategory.children?.map((child) => child.id).filter((id): id is string => id !== undefined) || [];
        const newIds = currentIds.filter((id) => {
          if (!id || id === categoryId) return false;
          return !subcategoryIds.includes(id);
        });
        setValue('categoryIds', newIds);
      } else {
        // Selecting parent - add parent only
        setValue('categoryIds', [...currentIds, categoryId]);
      }
    } else {
      // It's a subcategory
      const parent = findParentCategory(categoryId);
      
      if (currentIds.includes(categoryId)) {
        // Deselecting subcategory - remove subcategory only
        setValue('categoryIds', currentIds.filter((id) => id !== categoryId));
      } else {
        // Selecting subcategory - add subcategory and parent if not already selected
        const newIds = [...currentIds, categoryId];
        if (parent && !currentIds.includes(parent.id)) {
          newIds.push(parent.id);
        }
        setValue('categoryIds', newIds);
      }
    }
  };

  const selectedProductTypeId = watch('productTypeId');

  useEffect(() => {
    // Check authentication and admin status
    if (!isAdmin()) {
      router.push('/auth/login');
      return;
    }

    const storedToken = getAuthToken();
    if (!storedToken) {
      router.push('/auth/login');
      return;
    }
    setToken(storedToken);

    // Load product data
    fetchAPIAuth<{
      id: string;
      name: string;
      slug: string;
      description: string;
      shortDescription: string;
      sku: string;
      brandId: string;
      productTypeId: string;
      isActive: boolean;
      isFeatured: boolean;
      metaTitle: string;
      metaDescription: string;
      categories: Array<{ categoryId: string }>;
      variants: Array<{
        id: string;
        name: string;
        sku: string;
        price: number | string;
        stock: number;
        isActive: boolean;
      }>;
      attributes: Array<{
        attributeId: string;
        value: string;
      }>;
      productImages: Array<{
        id: string;
        filepath: string;
        url: string;
        isPrimary: boolean;
        order: number;
      }>;
    }>(`/products/id/${productId}`, storedToken)
      .then((product) => {
        // Set form values
        reset({
          name: product.name,
          description: product.description || '',
          shortDescription: product.shortDescription || '',
          brandId: product.brandId,
          productTypeId: product.productTypeId,
          categoryIds: product.categories.map((c) => c.categoryId),
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          metaTitle: product.metaTitle || '',
          metaDescription: product.metaDescription || '',
          variants: product.variants.map((v) => ({
            name: v.name || '',
            price: typeof v.price === 'string' ? parseFloat(v.price) : v.price,
            stock: v.stock,
            isActive: v.isActive,
          })),
          attributes: product.attributes.map((a) => ({
            attributeId: a.attributeId,
            value: a.value,
          })),
        });

        // Set images
        setUploadedImages(
          product.productImages.map((img) => ({
            id: img.id,
            filepath: img.filepath,
            url: img.url,
            isPrimary: img.isPrimary,
            order: img.order,
          })),
        );

        setIsLoadingProduct(false);
      })
      .catch((err) => {
        console.error('Failed to load product:', err);
        setError(err.message || 'Failed to load product');
        setIsLoadingProduct(false);
      });
  }, [productId, router, reset]);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !token) return;

    try {
      const uploadPromises = Array.from(files).map((file, index) =>
        uploadImageMutation.mutateAsync({
          file,
          options: {
            isPrimary: index === 0 && uploadedImages.length === 0,
            order: uploadedImages.length + index,
          },
        }),
      );

      const results = await Promise.all(uploadPromises);
      // Optimistically update local state
      setUploadedImages([...uploadedImages, ...results]);
      
      // Refetch product data once after all uploads to get the complete updated list
      // This ensures the images are immediately visible and in sync with the server
      const productResponse = await fetchAPIAuth<{
        productImages: Array<{
          id: string;
          filepath: string;
          url: string;
          isPrimary: boolean;
          order: number;
        }>;
      }>(`/products/id/${productId}`, token);
      
      setUploadedImages(
        productResponse.productImages.map((img) => ({
          id: img.id,
          filepath: img.filepath,
          url: img.url,
          isPrimary: img.isPrimary,
          order: img.order,
        })),
      );
      
      // Invalidate React Query cache to ensure other components see the update
      queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
    } catch (err: any) {
      setError(err.message || 'Failed to upload images');
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!token) return;

    try {
      await deleteImageMutation.mutateAsync(imageId);
      // Optimistically update local state
      setUploadedImages(uploadedImages.filter((img) => img.id !== imageId));
      
      // Refetch product data to get updated images list
      const productResponse = await fetchAPIAuth<{
        productImages: Array<{
          id: string;
          filepath: string;
          url: string;
          isPrimary: boolean;
          order: number;
        }>;
      }>(`/products/id/${productId}`, token);
      
      setUploadedImages(
        productResponse.productImages.map((img) => ({
          id: img.id,
          filepath: img.filepath,
          url: img.url,
          isPrimary: img.isPrimary,
          order: img.order,
        })),
      );
      
      // Invalidate React Query cache to ensure other components see the update
      queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
    } catch (err: any) {
      setError(err.message || 'Failed to delete image');
    }
  };

  const onSubmit = async (data: yup.InferType<typeof productSchema>) => {
    if (!token) {
      setError('Not authenticated');
      return;
    }

    // Validate translations before saving - all active languages must have required fields
    // Note: Translation validation with inline errors is already done in the form's onSubmit wrapper
    // This check ensures we don't proceed if translations are invalid
    if (translationsRef.current) {
      const validation = translationsRef.current.validateAll();
      if (!validation.isValid) {
        // Inline errors are already displayed, just prevent submission
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get default language translation data for main product fields
      const translationDataToSave = translationsRef.current?.getTranslationData() || {};
      const defaultLangData = translationDataToSave[defaultLanguageCode] || {};
      
      // SKU and slug are auto-generated on backend, don't send them
      const submitData = {
        ...data,
        // Use default language translation values for main product fields
        name: defaultLangData.name || data.name || '',
        description: defaultLangData.description || data.description || '',
        shortDescription: defaultLangData.shortDescription || data.shortDescription || '',
        metaTitle: defaultLangData.metaTitle || data.metaTitle || '',
        metaDescription: defaultLangData.metaDescription || data.metaDescription || '',
        sku: undefined,
        slug: undefined,
        variants: (data.variants || []).map((v) => ({
          ...v,
          sku: undefined,
        })),
      };

      const updatedProduct = await fetchAPIAuth<{
        id: string;
        slug: string;
      }>(`/products/${productId}`, token, {
        method: 'PATCH',
        body: JSON.stringify(submitData),
      });

      // Save translations for all active languages
      if (translationsRef.current && token) {
        try {
          const translationDataToSave = translationsRef.current.getTranslationData();
          const activeLanguages = languages.filter((l) => l.isActive);
          
          // Save translations for all active languages (POST handles both create and update)
          for (const lang of activeLanguages) {
            const langData = translationDataToSave[lang.code];
            if (langData && langData.name && langData.metaTitle && langData.metaDescription) {
              await fetchAPIAuth(`/products/${productId}/translations/${lang.code}`, token, {
                method: 'POST',
                body: JSON.stringify({
                  name: langData.name,
                  description: langData.description || '',
                  shortDescription: langData.shortDescription || '',
                  metaTitle: langData.metaTitle,
                  metaDescription: langData.metaDescription,
                }),
              });
            }
          }
        } catch (transErr: any) {
          console.error('Failed to save translations:', transErr);
          setError(transErr.message || 'Failed to save translations. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      // Invalidate React Query cache to ensure fresh data is shown
      // Invalidate all product lists
      queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });
      // Invalidate the specific product detail if we have the slug
      if (updatedProduct?.slug) {
        queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(updatedProduct.slug) });
      }
      // Also invalidate all products queries to be safe
      queryClient.invalidateQueries({ queryKey: productQueryKeys.all });

      // Refresh Next.js router cache to ensure server-side cache is also invalidated
      router.refresh();

      // Redirect to products page
      router.push('/admin/products');
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingProduct) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">{t(translationKeys.admin.products.loadingProduct, 'Loading product...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t(translationKeys.admin.products.editProduct, 'Edit Product')}</h1>
        <p className="text-muted-foreground">{t(translationKeys.admin.products.editDescription, 'Update product information')}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={(e) => {
        e.preventDefault();
        // Always validate translations first, even if form validation will fail
        // This ensures inline errors are shown for translations regardless of other validation errors
        if (translationsRef.current) {
          translationsRef.current.validateAll();
        }
        // Then proceed with normal form validation
        handleSubmit(onSubmit)(e);
      }} className="space-y-6">
        {/* Product Basic Information and Translations - Must be first as it contains name, description, and SEO */}
        {languages.filter((l) => l.isActive).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t(translationKeys.common.productInformationAndTranslations, 'Product Information and Translations')}</CardTitle>
              <CardDescription>
                {t(translationKeys.common.manageProductTranslations, 'Manage translations for this product in different languages. All active languages must have required fields populated.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductTranslationsTabs
                ref={translationsRef}
                productId={productId}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Product Details */}
          <Card>
            <CardHeader>
              <CardTitle>{t(translationKeys.common.classification, 'Product Details')}</CardTitle>
              <CardDescription>{t(translationKeys.common.brandTypeCategories, 'Brand, type, and categories')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  {t(translationKeys.common.brand, 'Brand')} <span className="text-destructive">*</span>
                </Label>
                <Select onValueChange={(value) => setValue('brandId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t(translationKeys.admin.products.selectBrand, 'Select brand')} />
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
                <Label>
                  {t(translationKeys.common.productType, 'Product Type')} <span className="text-destructive">*</span>
                </Label>
                <Select onValueChange={(value) => setValue('productTypeId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t(translationKeys.admin.products.selectProductType, 'Select product type')} />
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

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    {t(translationKeys.common.categories, 'Categories')} <span className="text-destructive">*</span>
                  </Label>
                  
                  {/* Selected Categories Display */}
                  {selectedCategoryIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 p-2 border rounded-md min-h-[40px]">
                      {selectedCategoryIds.filter((id): id is string => id !== undefined).map((categoryId) => {
                        const allCategories = getAllCategoriesForDisplay();
                        const category = allCategories.find((cat) => cat.id === categoryId);
                        if (!category) return null;
                        return (
                          <div
                            key={categoryId}
                            className="flex items-center gap-1 px-2 py-1 bg-muted border border-input rounded-md text-sm"
                          >
                            <span className="text-foreground">
                              {category.isSubcategory && category.parentName 
                                ? `${category.parentName} → ${category.name}`
                                : category.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (categoryId) {
                                  toggleCategory(categoryId);
                                }
                              }}
                              className="ml-1 hover:bg-destructive/10 rounded p-0.5 transition-colors"
                            >
                              <X className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Categories and Subcategories with Checkboxes */}
                  <div className="space-y-2 p-3 border rounded-md max-h-[300px] overflow-y-auto">
                    {parentCategories.map((category) => {
                      const isParentSelected = selectedCategoryIds.includes(category.id);
                      const hasSelectedSubcategories = category.children?.some((child) =>
                        selectedCategoryIds.includes(child.id)
                      );
                      const showSubcategories = isParentSelected || hasSelectedSubcategories;
                      
                      return (
                        <div key={category.id} className="space-y-1">
                          {/* Parent Category Checkbox */}
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`category-${category.id}`}
                              checked={isParentSelected}
                              onChange={() => toggleCategory(category.id)}
                              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                            />
                            <Label
                              htmlFor={`category-${category.id}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {category.name}
                            </Label>
                          </div>
                          
                          {/* Subcategories */}
                          {showSubcategories && category.children && category.children.length > 0 && (
                            <div className="ml-6 space-y-1">
                              {category.children.map((subcategory) => (
                                <div key={subcategory.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`subcategory-${subcategory.id}`}
                                    checked={selectedCategoryIds.includes(subcategory.id)}
                                    onChange={() => toggleCategory(subcategory.id)}
                                    className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                                  />
                                  <Label
                                    htmlFor={`subcategory-${subcategory.id}`}
                                    className="text-sm text-muted-foreground cursor-pointer"
                                  >
                                    {subcategory.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {errors.categoryIds && (
                    <p className="text-sm text-destructive">{errors.categoryIds.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attributes */}
          <Card>
            <CardHeader>
              <CardTitle>{t(translationKeys.common.attributes, 'Attributes')}</CardTitle>
              <CardDescription>{t(translationKeys.common.productSpecificAttributes, 'Product-specific attributes')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedProductTypeId ? (
                <p className="text-sm text-muted-foreground">
                  {t(translationKeys.admin.products.selectProductTypeForAttributes, 'Please select a product type to see available attributes')}
                </p>
              ) : attributes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t(translationKeys.admin.products.noAttributesForProductType, 'No attributes available for the selected product type')}
                </p>
              ) : (
                <>
                  {attributeFields.map((field, index) => {
                    const selectedAttributeId = watch(`attributes.${index}.attributeId`);
                    const selectedAttribute = attributes.find(attr => attr.id === selectedAttributeId);
                    const subattributes = selectedAttribute?.subattributes || [];
                    
                    return (
                      <div key={field.id} className="grid gap-4 rounded-lg border p-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>{t(translationKeys.common.attribute, 'Attribute')}</Label>
                          <Select
                            value={selectedAttributeId || ''}
                            onValueChange={(value) => {
                              setValue(`attributes.${index}.attributeId`, value);
                              // Clear value when attribute changes
                              setValue(`attributes.${index}.value`, '');
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t(translationKeys.common.selectAttribute, 'Select attribute')} />
                            </SelectTrigger>
                            <SelectContent>
                              {attributes.filter(attr => !attr.parentId).map((attr) => (
                                <SelectItem key={attr.id} value={attr.id}>
                                  {attr.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t(translationKeys.common.value, 'Value')}</Label>
                          {selectedAttributeId && subattributes.length > 0 ? (
                            <Select
                              value={watch(`attributes.${index}.value`) || ''}
                              onValueChange={(value) => setValue(`attributes.${index}.value`, value)}
                            >
                            <SelectTrigger>
                              <SelectValue placeholder={t(translationKeys.common.selectValue, 'Select value')} />
                            </SelectTrigger>
                              <SelectContent>
                                {subattributes.map((subattr) => (
                                  <SelectItem key={subattr.id} value={subattr.name}>
                                    {subattr.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : selectedAttributeId && subattributes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              {t(translationKeys.admin.products.noSubattributesAvailable, 'No subattributes available for this attribute')}
                            </p>
                          ) : (
                            <Input 
                              {...register(`attributes.${index}.value`)} 
                              placeholder={t(translationKeys.admin.products.selectAttributeFirst, 'Select attribute first')}
                              disabled
                            />
                          )}
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
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendAttribute({ attributeId: '', value: '' })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t(translationKeys.common.addAttribute, 'Add Attribute')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Variants */}
        <Card>
          <CardHeader>
            <CardTitle>{t(translationKeys.common.productVariants, 'Product Variants')}</CardTitle>
            <CardDescription>{t(translationKeys.common.pricingStockInfo, 'Add variants with different sizes, colors, etc.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {variantFields.map((field, index) => (
              <div key={field.id} className="grid gap-4 rounded-lg border p-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>{t(translationKeys.common.name, 'Name')}</Label>
                  <Input {...register(`variants.${index}.name`)} placeholder={t(translationKeys.admin.products.variantNamePlaceholder, 'e.g., 50ml')} />
                  {errors.variants?.[index]?.name && (
                    <p className="text-sm text-destructive">
                      {errors.variants[index]?.name?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t(translationKeys.products.price, 'Price')}</Label>
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
                  <Label>{t(translationKeys.products.stock, 'Stock')}</Label>
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
              onClick={() => appendVariant({ name: '', price: 0, stock: 0, isActive: true })}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t(translationKeys.common.addVariant, 'Add Variant')}
            </Button>
            {errors.variants && (
              <p className="text-sm text-destructive">{errors.variants.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>{t(translationKeys.common.productImages, 'Product Images')}</CardTitle>
            <CardDescription>{t(translationKeys.common.manageProductImages, 'Manage product images (up to 5 images)')}</CardDescription>
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
                      {t(translationKeys.admin.products.primary, 'Primary')}
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
                    disabled={uploadImageMutation.isPending}
                  />
                  {uploadImageMutation.isPending ? (
                    <div className="text-muted-foreground">{t(translationKeys.admin.products.uploading, 'Uploading...')}</div>
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                </label>
              )}
            </div>
          </CardContent>
        </Card>


        {/* Options */}
        <Card>
          <CardHeader>
            <CardTitle>{t(translationKeys.common.status, 'Options')}</CardTitle>
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
                {t(translationKeys.admin.products.productIsActive, 'Product is active')}
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
                {t(translationKeys.admin.products.featureProduct, 'Feature this product')}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              // Reset translation changes
              translationsRef.current?.resetChanges();
              // Reset form to original values
              // The form will be reset when we navigate away, but we explicitly reset it here
              // Navigate back to products page
              router.push('/admin/products');
            }}
          >
            {t(translationKeys.common.cancel, 'Cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t(translationKeys.admin.products.updating, 'Updating...') : t(translationKeys.admin.products.updateProduct, 'Update Product')}
          </Button>
        </div>
      </form>
    </div>
  );
}

