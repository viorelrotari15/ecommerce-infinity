import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchFeaturedProducts, fetchCarouselSlides } from '@/lib/api/server';
import { formatPrice } from '@/lib/utils';
import { getPrimaryProductImage, getImageUrl } from '@/lib/images';
import { getServerLanguage } from '@/lib/utils/language';
import { getServerT, translationKeys } from '@/lib/utils/translations-shared';
import Image from 'next/image';
import {
  AdvertisementCarousel,
  type CarouselSlideInitial,
} from '@/components/client/home/advertisement-carousel';
import { ScrollDownHint } from '@/components/client/home/scroll-down-hint';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  const language = await getServerLanguage(searchParams);
  const t = getServerT(language);
  return {
    title: t(translationKeys.home.title, 'Home'),
    description: t(translationKeys.home.description, 'Discover premium fragrances and luxury perfumes'),
  };
}

async function getFeaturedProducts(language?: string) {
  try {
    const products = await fetchFeaturedProducts(6, language);
    return products;
  } catch (error) {
    console.error('Failed to fetch featured products:', error);
    return [];
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const language = await getServerLanguage(searchParams);
  const t = getServerT(language);
  const [featuredProducts, carouselSlides] = await Promise.all([
    getFeaturedProducts(language),
    fetchCarouselSlides(language),
  ]);

  return (
    <div className="flex flex-col">
      {/* Advertisement Carousel (full width, before hero) – data from server for fast first paint */}
      <AdvertisementCarousel initialSlides={carouselSlides as CarouselSlideInitial} />
      <ScrollDownHint />

      {/* Hero Section */}
      <section id="hero" className="w-full px-4 md:px-6 lg:px-8 py-20 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
            {t(translationKeys.home.heroTitle, 'Discover Premium Fragrances')}
          </h1>
          <p className="mb-8 text-lg text-muted-foreground md:text-xl">
            {t(translationKeys.home.heroDescription, 'Experience luxury scents crafted for the modern individual. Shop our curated collection of premium perfumes.')}
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/products">
              <Button size="lg">{t(translationKeys.home.shopNow, 'Shop Now')}</Button>
            </Link>
            <Link href="/categories">
              <Button size="lg" variant="outline">
                {t(translationKeys.home.browseCategories, 'Browse Categories')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="w-full px-4 md:px-6 lg:px-8 py-12">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              {t(translationKeys.home.featuredProducts, 'Featured Products')}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t(translationKeys.home.featuredProductsDescription, 'Handpicked selections from our collection')}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product) => {
              const minPrice = product.variants[0]?.price
                ? formatPrice(product.variants[0].price)
                : 'N/A';
              return (
                <Link key={product.id} href={`/products/${product.slug}`} className="block h-full">
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
                              <span className="text-muted-foreground">
                                {t(translationKeys.products.noImage, 'No Image')}
                              </span>
                            </div>
                          );
                        })()}
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
      <section className="w-full px-4 md:px-6 lg:px-8 py-12">
        <Card className="bg-muted/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {t(translationKeys.home.ctaTitle, 'Ready to Find Your Signature Scent?')}
            </CardTitle>
            <CardDescription className="text-base">
              {t(translationKeys.home.ctaDescription, 'Explore our full collection of premium fragrances')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link href="/products">
              <Button size="lg">
                {t(translationKeys.home.viewAllProducts, 'View All Products')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

