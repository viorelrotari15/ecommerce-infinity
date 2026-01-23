'use client';

import { useState, useEffect, useRef } from 'react';
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
import { useUploadProductImage } from '@/lib/hooks/use-product-images';
import { useLanguages, useDefaultLanguage } from '@/lib/hooks/use-languages';
import { ProductTranslationsTabs, ProductTranslationsTabsRef } from '@/components/admin/product-translations-tabs';
import { X, Plus, Upload, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useT, translationKeys } from '@/lib/utils/translations';

// ProductFormData type is defined below in the component

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

export default function NewProductPage() {
  const router = useRouter();
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [translationData, setTranslationData] = useState<Record<string, { name: string; description: string; shortDescription: string; metaTitle: string; metaDescription: string }>>({});
  const isSubmittingRef = useRef(false);
  const translationsRef = useRef<ProductTranslationsTabsRef>(null);
  const { data: languages = [] } = useLanguages(true);
  const { data: defaultLanguageCode = 'en' } = useDefaultLanguage();

  // Use React Query hooks for brands, categories, and product types
  const { data: brands = [] } = useBrands();
  const { data: categories = [] } = useCategories();
  const { data: productTypes = [] } = useProductTypes();

  // Create schema with translations
  const productSchema = yup.object({
    // Name, description, shortDescription, metaTitle, metaDescription come from translations
    name: yup.string().optional(),
    description: yup.string().optional(),
    shortDescription: yup.string().optional(),
    brandId: yup.string().required(t(translationKeys.admin.products.brandRequired, 'Brand is required')),
    productTypeId: yup.string().required(t(translationKeys.admin.products.productTypeRequired, 'Product type is required')),
    categoryIds: yup.array().of(yup.string()).min(1, t(translationKeys.admin.products.categoryRequired, 'At least one category is required')),
    isActive: yup.boolean().default(false),
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
      .min(1, t(translationKeys.admin.products.variantRequired, 'At least one variant is required')),
    attributes: yup.array().of(
      yup.object({
        attributeId: yup.string().required(t(translationKeys.admin.products.attributeRequired, 'Attribute is required')),
        value: yup.string().required(t(translationKeys.admin.products.valueRequired, 'Value is required')),
      }),
    ),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<yup.InferType<typeof productSchema>>({
    resolver: yupResolver(productSchema),
    defaultValues: {
      isActive: false,
      isFeatured: false,
      categoryIds: [],
      variants: [{ name: '', price: 0, stock: 0, isActive: true }],
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

  // Get parent categories (categories with children are parent categories)
  const parentCategories = categories.filter((cat) => cat.children && cat.children.length > 0);
  
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


  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).slice(0, 5 - pendingImages.length);
    setPendingImages([...pendingImages, ...newFiles]);

    // Create previews
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setImagePreviews((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const validateTranslations = (): string | null => {
    const activeLanguages = languages.filter((l) => l.isActive);
    if (activeLanguages.length === 0) {
      return t(translationKeys.common.noActiveLanguages, 'No active languages configured');
    }

    if (!translationsRef.current) {
      return t(translationKeys.common.translationDataMissing, 'Translation component not initialized');
    }

    // Validate that all active languages have required translation fields populated
    const validation = translationsRef.current.validateAll();
    if (!validation.isValid) {
      const errorMessages = Object.entries(validation.errors)
        .map(([lang, errors]) => {
          const langName = activeLanguages.find((l) => l.code === lang)?.name || lang;
          return `${langName}: ${errors.join(', ')}`;
        })
        .join('; ');
      return t(translationKeys.admin.products.translationValidationError, `All active languages must have required translation fields (Name, Meta Title, Meta Description) populated. Errors: ${errorMessages}`).replace('{errors}', errorMessages);
    }

    return null;
  };

  const onSubmit = async (data: yup.InferType<typeof productSchema>) => {
    // Prevent multiple submissions using ref for immediate check
    if (isSubmittingRef.current || isLoading) {
      return;
    }

    if (!token) {
      setError(t(translationKeys.common.notAuthenticated, 'Not authenticated'));
      return;
    }

    // Validate translations before creating product
    // Note: Translation validation with inline errors is already done in the form's onSubmit wrapper
    // This check ensures we don't proceed if translations are invalid
    if (translationsRef.current) {
      const validation = translationsRef.current.validateAll();
      if (!validation.isValid) {
        // Inline errors are already displayed, just prevent submission
        return;
      }
    }

    // Set both state and ref to prevent multiple submissions
    isSubmittingRef.current = true;
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
        name: defaultLangData.name || '',
        description: defaultLangData.description || '',
        shortDescription: defaultLangData.shortDescription || '',
        metaTitle: defaultLangData.metaTitle || '',
        metaDescription: defaultLangData.metaDescription || '',
        sku: undefined,
        slug: undefined,
        variants: (data.variants || []).map((v: { name: string; price: number; stock: number; isActive: boolean }) => ({
          ...v,
          sku: undefined,
        })),
      };

      const product = await fetchAPIAuth<{ id: string }>('/products', token, {
        method: 'POST',
        body: JSON.stringify(submitData),
      });

      // Upload pending images during creation (right after product is created)
      if (pendingImages.length > 0 && token) {
        try {
          for (let i = 0; i < pendingImages.length; i++) {
            await uploadImage(product.id, pendingImages[i], token, {
              isPrimary: i === 0,
              order: i,
            });
          }
        } catch (imgErr: any) {
          console.error('Failed to upload images:', imgErr);
          setError(imgErr.message || 'Product created but failed to upload images. Please upload images in edit mode.');
          setIsLoading(false);
          isSubmittingRef.current = false;
          // Still redirect to edit page so user can retry image upload
          router.push(`/admin/products/${product.id}/edit`);
          return;
        }
      }

      // Save translations for all active languages
      if (translationsRef.current && token) {
        try {
          const translationDataToSave = translationsRef.current.getTranslationData();
          const activeLanguages = languages.filter((l) => l.isActive);
          
          // Save translations for all active languages - all must have required fields
          for (const lang of activeLanguages) {
            const data = translationDataToSave[lang.code];
            if (data && data.name && data.metaTitle && data.metaDescription) {
              await fetchAPIAuth(`/products/${product.id}/translations/${lang.code}`, token, {
                method: 'POST',
                body: JSON.stringify({
                  name: data.name,
                  description: data.description || '',
                  shortDescription: data.shortDescription || '',
                  metaTitle: data.metaTitle,
                  metaDescription: data.metaDescription,
                }),
              });
            } else {
              throw new Error(t(translationKeys.admin.products.translationDataMissing, `Translation data missing required fields for language: ${lang.name}`).replace('{langName}', lang.name));
            }
          }
        } catch (transErr: any) {
          console.error('Failed to save translations:', transErr);
          setError(transErr.message || 'Failed to save translations. Please try again.');
          setIsLoading(false);
          isSubmittingRef.current = false;
          return;
        }
      }

      // Redirect to edit page automatically
      // Don't reset state/ref here since we're redirecting away
      router.push(`/admin/products/${product.id}/edit`);
    } catch (err: any) {
      setError(err.message || t(translationKeys.common.failed, 'Failed to create product'));
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t(translationKeys.admin.products.newProduct, 'Create New Product')}</h1>
        <p className="text-muted-foreground">{t(translationKeys.admin.products.description, 'Add a new product to your store')}</p>
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
      }} className="space-y-6" noValidate>
        {/* Product Basic Information and Translations - Must be first as it contains name, description, and SEO */}
        {languages.filter((l) => l.isActive).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t(translationKeys.common.productInformationAndTranslations, 'Product Information and Translations')}</CardTitle>
              <CardDescription>
                {t(translationKeys.admin.products.translationRequiredBeforeCreation, 'All active languages must have translations with required fields (Name, Meta Title, Meta Description) populated before product can be created.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductTranslationsTabs
                ref={translationsRef}
                creationMode={true}
                onTranslationDataChange={setTranslationData}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle>{t(translationKeys.common.classification, 'Classification')}</CardTitle>
              <CardDescription>{t(translationKeys.common.brandTypeCategories, 'Brand, type, and categories')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brandId">
                  {t(translationKeys.common.brand, 'Brand')} <span className="text-destructive">*</span>
                </Label>
                <Select onValueChange={(value) => setValue('brandId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t(translationKeys.admin.products.selectBrand, 'Select a brand')} />
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
                  {t(translationKeys.common.productType, 'Product Type')} <span className="text-destructive">*</span>
                </Label>
                <Select onValueChange={(value) => setValue('productTypeId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t(translationKeys.admin.productTypes.namePlaceholder, 'Select a product type')} />
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
            <CardDescription>{t(translationKeys.common.pricingStockInfo, 'Add pricing and stock information')}</CardDescription>
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
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <div className="relative h-32 w-32 overflow-hidden rounded-lg border">
                    <Image
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0"
                    onClick={() => handleRemovePendingImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {pendingImages.length < 5 && (
                <label className="flex h-32 w-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed hover:bg-muted">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </label>
              )}
            </div>
            {pendingImages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t(translationKeys.admin.products.selectImagesToUpload, 'Select images to upload.')}
              </p>
            )}
          </CardContent>
        </Card>


        {/* Options */}
        <Card>
          <CardHeader>
            <CardTitle>{t(translationKeys.common.status, 'Options')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>{t(translationKeys.common.name, 'Note')}:</strong> {t(translationKeys.admin.products.productOptionsNote, 'Product can be set as active or featured on the main page, only in Edit mode after creation.')}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                {...register('isActive')}
                className="h-4 w-4"
                disabled
              />
              <Label htmlFor="isActive" className="font-normal text-muted-foreground">
                {t(translationKeys.admin.products.productIsActive, 'Product is active')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isFeatured"
                {...register('isFeatured')}
                className="h-4 w-4"
                disabled
              />
              <Label htmlFor="isFeatured" className="font-normal text-muted-foreground">
                {t(translationKeys.admin.products.featureProduct, 'Feature this product')}
              </Label>
            </div>
          </CardContent>
        </Card>


        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/products')} disabled={isLoading}>
            {t(translationKeys.common.cancel, 'Cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t(translationKeys.common.creating, 'Creating...') : t(translationKeys.admin.products.newProduct, 'Create Product')}
          </Button>
        </div>
      </form>
    </div>
  );
}

