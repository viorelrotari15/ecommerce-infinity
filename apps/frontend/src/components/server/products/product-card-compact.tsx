import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { getPrimaryProductImage, getImageUrl } from '@/lib/images';
import Image from 'next/image';

interface ProductCardCompactProps {
  product: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    shortDescription?: string | null;
    images: string[];
    productImages?: Array<{ filepath: string; url?: string; isPrimary?: boolean }>;
    brand: { name: string; slug: string };
    variants: Array<{ price: number | string }>;
  };
}

export function ProductCardCompact({ product }: ProductCardCompactProps) {
  const minPrice = product.variants[0]?.price
    ? formatPrice(product.variants[0].price)
    : 'N/A';

  const imageUrl = product.productImages
    ? getPrimaryProductImage(product.productImages)
    : product.images?.[0]
    ? getImageUrl(product.images[0])
    : '/placeholder-image.jpg';

  return (
    <Link href={`/products/${product.slug}`} className="block h-full">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="p-2 pb-1">
          <div className="relative aspect-square w-full overflow-hidden rounded bg-muted">
            {imageUrl && imageUrl !== '/placeholder-image.jpg' ? (
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-muted-foreground text-[10px]">No Image</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-1">
          <CardTitle className="mb-0.5 text-xs line-clamp-2 leading-tight font-medium">{product.name}</CardTitle>
          <CardDescription className="mb-0.5 text-[10px] leading-tight">
            {product.brand.name}
          </CardDescription>
          <p className="text-sm font-semibold">{minPrice}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
