import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchProduct } from '@/lib/api/server';
import { formatPrice } from '@/lib/utils';
import { getProductImages, getPrimaryProductImage, getImageUrl } from '@/lib/images';
import { ProductActions } from '@/components/client/products/product-actions';
import Image from 'next/image';

async function getProduct(slug: string) {
  try {
    const product = await fetchProduct(slug);
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
    </div>
  );
}

