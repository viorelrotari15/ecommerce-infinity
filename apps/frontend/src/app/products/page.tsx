import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAPI } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { getPrimaryProductImage, getImageUrl } from '@/lib/images';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Products',
  description: 'Browse our complete collection of premium fragrances',
};

async function getProducts(searchParams: { [key: string]: string | string[] | undefined }) {
  const params = new URLSearchParams();
  if (searchParams.brand) params.append('brandId', searchParams.brand as string);
  if (searchParams.category) params.append('categoryId', searchParams.category as string);
  if (searchParams.search) params.append('search', searchParams.search as string);
  params.append('page', (searchParams.page as string) || '1');
  params.append('limit', '20');

  try {
    const data = await fetchAPI<{
      data: Array<{
        id: string;
        name: string;
        slug: string;
        description: string;
        images: string[]; // Legacy field
        productImages?: Array<{ filepath: string; url?: string; isPrimary?: boolean }>;
        brand: { name: string; slug: string };
        variants: Array<{ price: number | string }>;
      }>;
      meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(`/products?${params.toString()}`);
    return data;
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { data: products, meta } = await getProducts(searchParams);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">All Products</h1>
        <p className="mt-2 text-muted-foreground">
          {meta.total} products found
        </p>
      </div>

      {products.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No products found.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const minPrice = product.variants[0]?.price
                ? formatPrice(product.variants[0].price)
                : 'N/A';
              return (
                <Link key={product.id} href={`/products/${product.slug}`}>
                  <Card className="h-full transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                        {(() => {
                          const imageUrl = product.productImages
                            ? getPrimaryProductImage(product.productImages)
                            : product.images?.[0]
                            ? getImageUrl(product.images[0])
                            : '/placeholder-image.jpg';
                          return imageUrl && imageUrl !== '/placeholder-image.jpg' ? (
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
                          );
                        })()}
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
            })}
          </div>

          {meta.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((page) => (
                <Link
                  key={page}
                  href={`/products?page=${page}`}
                  className="rounded-md border px-4 py-2 hover:bg-accent"
                >
                  {page}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

