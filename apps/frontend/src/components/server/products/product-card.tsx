import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { getPrimaryProductImage, getImageUrl } from '@/lib/images';
import Image from 'next/image';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    images: string[];
    productImages?: Array<{ filepath: string; url?: string; isPrimary?: boolean }>;
    brand: { name: string; slug: string };
    variants: Array<{ price: number | string }>;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const minPrice = product.variants[0]?.price
    ? formatPrice(product.variants[0].price)
    : 'N/A';

  const imageUrl = product.productImages
    ? getPrimaryProductImage(product.productImages)
    : product.images?.[0]
    ? getImageUrl(product.images[0])
    : '/placeholder-image.jpg';

  return (
    <Link href={`/products/${product.slug}`}>
      <Card className="h-full transition-shadow hover:shadow-lg">
        <CardHeader>
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
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
          </div>
        </CardHeader>
        <CardContent>
          <CardTitle className="mb-2 line-clamp-2">{product.name}</CardTitle>
          <CardDescription className="mb-4">
            {product.brand.name}
          </CardDescription>
          <p className="text-lg font-semibold">{minPrice}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

