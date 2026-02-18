import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchProduct, fetchProducts } from '@/lib/api/server';
import { formatPrice } from '@/lib/utils';
import { getProductImages, getPrimaryProductImage, getImageUrl } from '@/lib/images';
import { ProductActions } from '@/components/client/products/product-actions';
import { ProductImageGallery } from '@/components/client/products/product-image-gallery';
import { SimilarProductsCarousel } from '@/components/client/products/similar-products-carousel';
import { getServerLanguage } from '@/lib/utils/language';
import type { Product } from '@/lib/api/server';

// Force dynamic rendering to respect language cookie changes
export const dynamic = 'force-dynamic';

async function getProduct(slug: string, language?: string) {
  try {
    const product = await fetchProduct(slug, language);
    return product;
  } catch (error) {
    console.error('Failed to fetch product:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  const language = await getServerLanguage(searchParams);
  const product = await getProduct(params.slug, language);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: product.metaTitle || product.name,
    description: product.metaDescription || product.shortDescription || product.description,
    openGraph: {
      title: product.name,
      description: product.shortDescription || product.description,
      images: product.productImages
        ? [getPrimaryProductImage(product.productImages)]
        : product.images.length > 0
          ? [getImageUrl(product.images[0])]
          : [],
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const language = await getServerLanguage(searchParams);
  const product = await getProduct(params.slug, language);

  if (!product) {
    notFound();
  }

  const defaultVariant = product.variants[0];
  const minPrice = defaultVariant ? formatPrice(defaultVariant.price) : 'N/A';

  // Get images - prefer productImages over legacy images array
  // Check if productImages exists and has items
  const hasProductImages = product.productImages && Array.isArray(product.productImages) && product.productImages.length > 0;
  const productImages = hasProductImages
    ? getProductImages(product.productImages)
    : product.images && product.images.length > 0
    ? product.images.map((img) => ({ filepath: img, url: getImageUrl(img) }))
    : [];
  
  const primaryImage = hasProductImages
    ? getPrimaryProductImage(product.productImages)
    : product.images && product.images.length > 0
    ? getImageUrl(product.images[0])
    : '/placeholder-image.jpg';

  // Fetch similar products
  let similarProducts: Product[] = [];
  try {
    // Extract category IDs from current product
    const categoryIds = product.categories
      .map((cat) => cat.category?.id ?? cat.categoryId)
      .filter((id): id is string => !!id);

    // Extract attribute information from current product
    const currentProductAttributeIds: string[] = [];
    product.attributes.forEach((attr) => {
      const attrId = attr.attribute?.id ?? attr.attributeId;
      const attrValue = attr.value;

      if (attrId) currentProductAttributeIds.push(attrId);
      if (attrValue) currentProductAttributeIds.push(attrValue);

      const subattributes = attr.attribute?.subattributes ?? [];
      for (const subattr of subattributes) {
        if (subattr.id) currentProductAttributeIds.push(subattr.id);
      }
    });

    // Fetch products by category (if categories exist)
    if (categoryIds.length > 0) {
      const productsResponse = await fetchProducts(
        {
          categoryIds,
          limit: 30,
        },
        language,
      );

      // Filter products client-side
      const candidateProducts = productsResponse.data || [];

      // Filter: exclude current product and match by category OR attributes.
      // List API returns same shape as Product when using categoryIds; cast for SimilarProductsCarousel.
      similarProducts = candidateProducts
        .filter((candidateProduct) => {
          // Exclude current product
          if (candidateProduct.id === product.id || candidateProduct.slug === product.slug) {
            return false;
          }

          // Check if product matches by category
          const hasMatchingCategory = candidateProduct.categories?.some((cat) => {
            const catId = cat.category?.id ?? cat.categoryId;
            return !!catId && categoryIds.includes(catId);
          });

          if (hasMatchingCategory) {
            return true;
          }

          // Check if product matches by attributes
          if (currentProductAttributeIds.length > 0 && candidateProduct.attributes) {
            const candidateAttributeIds: string[] = [];
            candidateProduct.attributes.forEach((attr) => {
              const attrId = attr.attribute?.id ?? attr.attributeId;
              const attrValue = attr.value;

              // Add the attribute ID
              if (attrId) candidateAttributeIds.push(attrId);

              // Add the value if it's an ID
              if (attrValue) candidateAttributeIds.push(attrValue);

              // Add subattribute IDs if they exist
              if (attr.attribute?.subattributes) {
                attr.attribute.subattributes.forEach((subattr) => {
                  if (subattr.id) candidateAttributeIds.push(subattr.id);
                });
              }
            });

            // Check if there's any matching attribute ID
            const hasMatchingAttribute = currentProductAttributeIds.some((id) =>
              candidateAttributeIds.includes(id),
            );

            if (hasMatchingAttribute) {
              return true;
            }
          }

          return false;
        })
        .slice(0, 9) as Product[]; // Limit to 9 products; list API returns Product-like shape
    }
  } catch (error) {
    console.error('Failed to fetch similar products:', error);
    // Continue without similar products if fetch fails
  }

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Product Images */}
        <ProductImageGallery
          images={productImages}
          productName={product.name}
          primaryImage={primaryImage}
        />

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">{product.brand.name}</p>
            <h1 className="mt-2 text-4xl font-bold">{product.name}</h1>
            <p className="mt-4 text-2xl font-semibold">{minPrice}</p>
          </div>

          {product.shortDescription && (
            <p className="text-lg text-muted-foreground">{product.shortDescription}</p>
          )}

          {product.attributes.length > 0 && (() => {
            // Helpers for resolving display value from subattributes
            const normalize = (text: string) =>
              text
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '')
                .trim();
            const slugify = (text: string) =>
              text
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-')
                .replace(/^-+/, '')
                .replace(/-+$/, '');
            const getDisplayValue = (attr: (typeof product.attributes)[number]): string => {
              let displayValue = attr.value;
              const subattributes = attr.attribute?.subattributes || [];
              if (subattributes.length > 0) {
                const valueNormalized = normalize(attr.value);
                const valueSlug = slugify(attr.value);
                const subattr = subattributes.find((sub: { slug?: string; id?: string; name?: string }) => {
                  if (sub.slug && normalize(sub.slug) === valueNormalized) return true;
                  if (sub.slug && sub.slug.toLowerCase().trim() === attr.value.toLowerCase().trim()) return true;
                  if (sub.slug && sub.slug.toLowerCase().trim() === valueSlug) return true;
                  if (sub.id && sub.id.trim() === attr.value.trim()) return true;
                  if (sub.name && normalize(sub.name) === valueNormalized) return true;
                  if (sub.name && sub.name.toLowerCase().trim() === attr.value.toLowerCase().trim()) return true;
                  return false;
                });
                displayValue = subattr ? subattr.name : attr.value;
              }
              return displayValue;
            };
            // Group by attribute id so multiple subattributes of same attribute show on one line
            const grouped = new Map<string, { attribute: (typeof product.attributes)[number]['attribute']; values: string[] }>();
            for (const attr of product.attributes) {
              const id = (attr.attribute as { id?: string })?.id ?? attr.attribute?.name ?? String(attr.value);
              if (!grouped.has(id)) {
                grouped.set(id, { attribute: attr.attribute, values: [] });
              }
              grouped.get(id)!.values.push(getDisplayValue(attr));
            }
            return (
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    {Array.from(grouped.entries()).map(([id, { attribute, values }]) => (
                      <div key={id} className="flex justify-between">
                        <dt className="font-medium">{attribute.name}:</dt>
                        <dd className="text-muted-foreground">{values.join(', ')}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            );
          })()}

          <ProductActions
            productId={product.id}
            productName={product.name}
            productSlug={product.slug}
            variants={product.variants}
            primaryImage={primaryImage}
          />

          {product.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-muted-foreground">
                  {product.description}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Similar Products Carousel */}
      {similarProducts.length > 0 && (
        <SimilarProductsCarousel products={similarProducts} currentProductSlug={product.slug} />
      )}
    </div>
  );
}

