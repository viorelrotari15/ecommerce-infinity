import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAPI } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Discover premium fragrances and luxury perfumes',
};

async function getFeaturedProducts() {
  try {
    const data = await fetchAPI<{
      data: Array<{
        id: string;
        name: string;
        slug: string;
        description: string;
        images: string[];
        brand: { name: string; slug: string };
        variants: Array<{ price: number | string }>;
      }>;
    }>('/products?featured=true&limit=6');
    return data.data;
  } catch (error) {
    console.error('Failed to fetch featured products:', error);
    return [];
  }
}

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container py-20 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
            Discover Premium Fragrances
          </h1>
          <p className="mb-8 text-lg text-muted-foreground md:text-xl">
            Experience luxury scents crafted for the modern individual. Shop our
            curated collection of premium perfumes.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/products">
              <Button size="lg">Shop Now</Button>
            </Link>
            <Link href="/categories">
              <Button size="lg" variant="outline">
                Browse Categories
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="container py-12">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Featured Products</h2>
            <p className="mt-2 text-muted-foreground">
              Handpicked selections from our collection
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product) => {
              const minPrice = product.variants[0]?.price
                ? formatPrice(product.variants[0].price)
                : 'N/A';
              return (
                <Link key={product.id} href={`/products/${product.slug}`}>
                  <Card className="h-full transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                        {product.images[0] ? (
                          <Image
                            src={product.images[0]}
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
                      <CardTitle className="mb-2">{product.name}</CardTitle>
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
        </section>
      )}

      {/* CTA Section */}
      <section className="container py-12">
        <Card className="bg-muted/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Ready to Find Your Signature Scent?</CardTitle>
            <CardDescription className="text-base">
              Explore our full collection of premium fragrances
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link href="/products">
              <Button size="lg">View All Products</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

