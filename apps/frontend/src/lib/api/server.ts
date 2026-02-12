/**
 * Server-side API functions for Next.js Server Components
 * These use Next.js fetch with caching strategies
 */

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface FetchProductsParams {
  page?: number;
  limit?: number;
  brandId?: string;
  categoryId?: string | string[];
  categoryIds?: string | string[];
  search?: string;
  featured?: boolean;
}

export interface ProductsResponse {
  data: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    shortDescription?: string | null;
    images: string[];
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
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  sku?: string;
  images: string[];
  productImages?: Array<{ filepath: string; url?: string; isPrimary?: boolean }>;
  isActive?: boolean;
  isFeatured?: boolean;
  brand: { name: string; slug: string };
  categories: Array<{ category: { name: string; slug: string } }>;
  variants: Array<{
    id: string;
    name: string;
    price: number | string;
    stock: number;
    isActive: boolean;
  }>;
  attributes: Array<{
    attribute: { 
      name: string; 
      slug: string;
      subattributes?: Array<{
        id: string;
        name: string;
        slug: string;
      }>;
    };
    value: string;
  }>;
  metaTitle: string | null;
  metaDescription: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  children?: Array<{ id: string; name: string; slug: string }>;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

/**
 * Fetch products with caching
 * Revalidates every 60 seconds
 */
export async function fetchProducts(
  params: FetchProductsParams = {},
  language?: string,
): Promise<ProductsResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.brandId) searchParams.append('brandId', params.brandId);
  
  // Support both categoryId (single) and categoryIds (multiple)
  const categoryIds = params.categoryIds || (params.categoryId ? [params.categoryId] : []);
  if (categoryIds.length > 0) {
    categoryIds.forEach(id => {
      if (id && id !== 'all') {
        searchParams.append('categoryIds', id);
      }
    });
  }
  
  if (params.search) searchParams.append('search', params.search);
  if (params.featured) searchParams.append('featured', 'true');
  if (language) searchParams.append('lang', language);
  
  searchParams.append('page', String(params.page || 1));
  searchParams.append('limit', String(params.limit || 20));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (language) {
    headers['Accept-Language'] = language;
  }

  const response = await fetch(`${API_URL}/api/products?${searchParams}`, {
    // Cache for 60 seconds, then revalidate
    next: { revalidate: 60 },
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    }
    throw new Error(`Failed to fetch products: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch a single product by slug
 * Revalidates every 5 minutes, but cache key includes language
 */
export async function fetchProduct(slug: string, language?: string): Promise<Product | null> {
  const searchParams = new URLSearchParams();
  if (language) {
    searchParams.append('lang', language);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (language) {
    headers['Accept-Language'] = language;
  }

  const url = `${API_URL}/api/products/${slug}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  // When language is provided, disable caching to ensure fresh data on language change
  // When no language is specified, cache for 5 minutes
  const cacheOptions = language 
    ? { cache: 'no-store' as const } // No cache when language is specified to ensure language changes work immediately
    : { next: { revalidate: 300 } }; // Cache for 5 minutes when no language specified
  
  const response = await fetch(url, {
    ...cacheOptions,
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch product: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch categories
 * Cache for 1 hour (categories don't change often)
 */
export async function fetchCategories(language?: string): Promise<Category[]> {
  const searchParams = new URLSearchParams();
  if (language) {
    searchParams.append('lang', language);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (language) {
    headers['Accept-Language'] = language;
  }

  const url = `${API_URL}/api/categories${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  // When language is provided, disable caching to ensure fresh data on language change
  // When no language is specified, cache for 1 hour
  const cacheOptions = language 
    ? { cache: 'no-store' as const } // No cache when language is specified to ensure language changes work immediately
    : { next: { revalidate: 3600 } }; // Cache for 1 hour when no language specified

  const response = await fetch(url, {
    ...cacheOptions,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * Fetch a single category by slug
 * Revalidates every 5 minutes, but cache key includes language
 */
export interface CategoryDetail extends Category {
  parentId?: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  children?: Array<{ id: string; name: string; slug: string }>;
}

export async function fetchCategory(slug: string, language?: string): Promise<CategoryDetail | null> {
  const searchParams = new URLSearchParams();
  if (language) {
    searchParams.append('lang', language);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (language) {
    headers['Accept-Language'] = language;
  }

  const url = `${API_URL}/api/categories/${slug}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  // When language is provided, disable caching to ensure fresh data on language change
  // When no language is specified, cache for 5 minutes
  const cacheOptions = language 
    ? { cache: 'no-store' as const } // No cache when language is specified to ensure language changes work immediately
    : { next: { revalidate: 300 } }; // Cache for 5 minutes when no language specified
  
  const response = await fetch(url, {
    ...cacheOptions,
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch category: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch brands
 * Cache for 1 hour
 */
export async function fetchBrands(language?: string): Promise<Brand[]> {
  const searchParams = new URLSearchParams();
  if (language) {
    searchParams.append('lang', language);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (language) {
    headers['Accept-Language'] = language;
  }

  const url = `${API_URL}/api/brands${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  // When language is provided, disable caching to ensure fresh data on language change
  // When no language is specified, cache for 1 hour
  const cacheOptions = language 
    ? { cache: 'no-store' as const } // No cache when language is specified to ensure language changes work immediately
    : { next: { revalidate: 3600 } }; // Cache for 1 hour when no language specified

  const response = await fetch(url, {
    ...cacheOptions,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch brands: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * Fetch a single brand by slug
 * Revalidates every 5 minutes, but cache key includes language
 */
export async function fetchBrand(slug: string, language?: string): Promise<Brand | null> {
  const searchParams = new URLSearchParams();
  if (language) {
    searchParams.append('lang', language);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (language) {
    headers['Accept-Language'] = language;
  }

  const url = `${API_URL}/api/brands/${slug}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  // When language is provided, disable caching to ensure fresh data on language change
  // When no language is specified, cache for 5 minutes
  const cacheOptions = language 
    ? { cache: 'no-store' as const } // No cache when language is specified to ensure language changes work immediately
    : { next: { revalidate: 300 } }; // Cache for 5 minutes when no language specified
  
  const response = await fetch(url, {
    ...cacheOptions,
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch brand: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch featured products
 * Cache for 5 minutes
 */
export async function fetchFeaturedProducts(
  limit: number = 6,
  language?: string,
): Promise<ProductsResponse['data']> {
  const langQuery = language ? `&lang=${encodeURIComponent(language)}` : '';
  const response = await fetch(
    `${API_URL}/api/products?featured=true&limit=${limit}${langQuery}`,
    {
      next: { revalidate: 300 }, // 5 minutes
      headers: {
        'Content-Type': 'application/json',
        ...(language ? { 'x-language': language } : {}),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch featured products: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Carousel slide (public API shape)
 */
export interface CarouselSlideServer {
  id: string;
  order: number;
  link: string | null;
  desktopUrl: string;
  mobileUrl: string | null;
}

/**
 * Fetch carousel slides for the home page (server-side).
 * Cache 5 minutes so the carousel can render with data on first paint.
 */
export async function fetchCarouselSlides(
  language?: string,
): Promise<CarouselSlideServer[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(language ? { 'x-language': language } : {}),
  };
  const response = await fetch(`${API_URL}/api/carousel`, {
    next: { revalidate: 300 }, // 5 minutes
    headers,
  });
  if (!response.ok) {
    return [];
  }
  return response.json();
}

