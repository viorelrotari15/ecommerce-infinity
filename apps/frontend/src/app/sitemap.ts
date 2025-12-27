import { MetadataRoute } from 'next';
import { fetchProducts } from '@/lib/api/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    // Fetch products using server API
    const productsData = await fetchProducts({ limit: 1000 });

    const productUrls: MetadataRoute.Sitemap = productsData.data.map((product) => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: new Date(), // Products don't have updatedAt in the response, using current date
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        url: `${baseUrl}/products`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/categories`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/brands`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      ...productUrls,
    ];
  } catch (error) {
    console.error('Failed to generate sitemap:', error);
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
    ];
  }
}

