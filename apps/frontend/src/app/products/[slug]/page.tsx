import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAPI } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { getProductImages, getPrimaryProductImage, getImageUrl } from '@/lib/images';
import Image from 'next/image';

async function getProduct(slug: string) {
  try {
    const product = await fetchAPI<{
      id: string;
      name: string;
      slug: string;
      description: string;
      shortDescription: string;
      images: string[]; // Legacy field
      productImages?: Array<{ filepath: string; url?: string; isPrimary?: boolean }>;
      brand: { name: string; slug: string };
      productType: { name: string };
      categories: Array<{ category: { name: string; slug: string } }>;
      variants: Array<{
        id: string;
        name: string;
        price: number | string;
        stock: number;
        isActive: boolean;
      }>;
      attributes: Array<{
        attribute: { name: string; slug: string };
        value: string;
      }>;
      metaTitle: string | null;
      metaDescription: string | null;
    }>(`/products/${slug}`);
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
  const product = await getProduct(params.slug);

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
  const product = await getProduct(params.slug);

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

  return (
    <div className="container py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
            {primaryImage && primaryImage !== '/placeholder-image.jpg' ? (
              <Image
                src={primaryImage}
                alt={product.name}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-muted-foreground">No Image</span>
              </div>
            )}
          </div>
          {productImages.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {productImages.slice(1, 5).map((image, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                >
                  <Image
                    src={image.url}
                    alt={`${product.name} ${idx + 2}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}
        </div>

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
                  {product.attributes.map((attr, idx) => (
                    <div key={idx} className="flex justify-between">
                      <dt className="font-medium">{attr.attribute.name}:</dt>
                      <dd className="text-muted-foreground">{attr.value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          {product.variants.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Available Variants</h3>
              <div className="space-y-2">
                {product.variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{variant.name || 'Standard'}</p>
                      <p className="text-sm text-muted-foreground">
                        Stock: {variant.stock}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-semibold">
                        {formatPrice(variant.price)}
                      </p>
                      <Button>Add to Cart</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          <div className="flex gap-4">
            <Button size="lg" className="flex-1">
              Add to Cart
            </Button>
            <Button size="lg" variant="outline">
              Buy Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

