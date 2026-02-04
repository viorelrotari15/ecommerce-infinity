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
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const language = await getServerLanguage();
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
}: {
  params: { slug: string };
}) {
  const language = await getServerLanguage();
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
      .map((cat) => {
        // Try to get category ID from different possible structures
        const category = cat.category as any;
        return category?.id || (cat as any)?.categoryId;
      })
      .filter((id): id is string => !!id);

    // Extract attribute information from current product
    const currentProductAttributeIds: string[] = [];
    product.attributes.forEach((attr) => {
      const attrId = (attr.attribute as any)?.id;
      const attrValue = attr.value;

      // Add the attribute ID
      if (attrId) currentProductAttributeIds.push(attrId);

      // Add the value if it's an ID
      if (attrValue) currentProductAttributeIds.push(attrValue);

      // Add subattribute IDs if they exist
      const subattributes = (attr.attribute as any)?.subattributes || [];
      if (subattributes.length > 0) {
        subattributes.forEach((subattr: any) => {
          if (subattr.id) currentProductAttributeIds.push(subattr.id);
        });
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

      // Filter: exclude current product and match by category OR attributes
      similarProducts = candidateProducts
        .filter((candidateProduct) => {
          // Exclude current product
          if (candidateProduct.id === product.id || candidateProduct.slug === product.slug) {
            return false;
          }

          // Check if product matches by category
          const hasMatchingCategory = candidateProduct.categories.some((cat) => {
            // Try to get category ID from different possible structures
            const category = cat.category as any;
            const catId = category?.id || (cat as any)?.categoryId;
            return catId && categoryIds.includes(catId);
          });

          if (hasMatchingCategory) {
            return true;
          }

          // Check if product matches by attributes
          if (currentProductAttributeIds.length > 0 && candidateProduct.attributes) {
            const candidateAttributeIds: string[] = [];
            candidateProduct.attributes.forEach((attr: any) => {
              const attrId = attr.attribute?.id || attr.attributeId;
              const attrValue = attr.value;

              // Add the attribute ID
              if (attrId) candidateAttributeIds.push(attrId);

              // Add the value if it's an ID
              if (attrValue) candidateAttributeIds.push(attrValue);

              // Add subattribute IDs if they exist
              if (attr.attribute?.subattributes) {
                attr.attribute.subattributes.forEach((subattr: any) => {
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
        .slice(0, 9); // Limit to 9 products
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

          {product.attributes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  {product.attributes.map((attr, idx) => {
                    // Try to find translated subattribute value
                    let displayValue = attr.value;
                    // Check if subattributes exist and are available
                    const subattributes = attr.attribute?.subattributes || [];
                    if (subattributes.length > 0) {
                      // The value is stored as subattribute name (in the language used when creating/editing)
                      // We need to match it to the translated subattribute
                      // Helper function to normalize text for comparison (removes accents, special chars)
                      const normalize = (text: string) => {
                        return text
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '') // Remove accents
                          .replace(/[^a-z0-9]/g, '') // Remove special chars
                          .trim();
                      };
                      
                      // Helper function to create a slug from text (similar to backend slugify)
                      const slugify = (text: string) => {
                        return text
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '') // Remove accents
                          .trim()
                          .replace(/\s+/g, '-')
                          .replace(/[^\w\-]+/g, '')
                          .replace(/\-\-+/g, '-')
                          .replace(/^-+/, '')
                          .replace(/-+$/, '');
                      };
                      
                      const valueNormalized = normalize(attr.value);
                      const valueSlug = slugify(attr.value);
                      
                      // Try matching by slug first (most reliable, language-independent)
                      // Then by ID, then by normalized name comparison
                      const subattr = subattributes.find(
                        (sub) => {
                          // Match by exact slug (normalized)
                          if (sub.slug && normalize(sub.slug) === valueNormalized) return true;
                          // Match by slug (direct, case-insensitive)
                          if (sub.slug && sub.slug.toLowerCase().trim() === attr.value.toLowerCase().trim()) return true;
                          // Match by slug from value (if stored value can be converted to slug)
                          if (sub.slug && normalize(sub.slug) === valueNormalized) return true;
                          if (sub.slug && sub.slug.toLowerCase().trim() === valueSlug) return true;
                          // Match by ID
                          if (sub.id && sub.id.trim() === attr.value.trim()) return true;
                          // Match by exact name (normalized)
                          if (sub.name && normalize(sub.name) === valueNormalized) return true;
                          // Match by name (case-insensitive, direct)
                          if (sub.name && sub.name.toLowerCase().trim() === attr.value.toLowerCase().trim()) return true;
                          
                          return false;
                        }
                      );
                      
                      if (subattr) {
                        // Use the translated subattribute name
                        displayValue = subattr.name;
                      } else {
                        // If no match found, the value might be a custom text value (not a subattribute)
                        // or the subattribute might have been deleted. Keep the original value.
                        displayValue = attr.value;
                      }
                    }
                    
                    return (
                      <div key={idx} className="flex justify-between">
                        <dt className="font-medium">{attr.attribute.name}:</dt>
                        <dd className="text-muted-foreground">{displayValue}</dd>
                      </div>
                    );
                  })}
                </dl>
              </CardContent>
            </Card>
          )}

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

