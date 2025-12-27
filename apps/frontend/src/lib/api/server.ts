/**
 * Server-side API functions for Next.js Server Components
 * These use Next.js fetch with caching strategies
 */

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface FetchProductsParams {
  page?: number;
  limit?: number;
  brandId?: string;
  categoryId?: string;
  search?: string;
  featured?: boolean;
}

export interface ProductsResponse {
  data: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
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
  images: string[];
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
export async function fetchProducts(params: FetchProductsParams = {}): Promise<ProductsResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.brandId) searchParams.append('brandId', params.brandId);
  if (params.categoryId) searchParams.append('categoryId', params.categoryId);
  if (params.search) searchParams.append('search', params.search);
  if (params.featured) searchParams.append('featured', 'true');
  
  searchParams.append('page', String(params.page || 1));
  searchParams.append('limit', String(params.limit || 20));

  const response = await fetch(`${API_URL}/api/products?${searchParams}`, {
    // Cache for 60 seconds, then revalidate
    next: { revalidate: 60 },
    headers: {
      'Content-Type': 'application/json',
    },
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
 * Revalidates every 5 minutes
 */
export async function fetchProduct(slug: string): Promise<Product | null> {
  const response = await fetch(`${API_URL}/api/products/${slug}`, {
    // Cache for 5 minutes
    next: { revalidate: 300 },
    headers: {
      'Content-Type': 'application/json',
    },
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
export async function fetchCategories(): Promise<Category[]> {
  const response = await fetch(`${API_URL}/api/categories`, {
    next: { revalidate: 3600 }, // 1 hour
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * Fetch brands
 * Cache for 1 hour
 */
export async function fetchBrands(): Promise<Brand[]> {
  const response = await fetch(`${API_URL}/api/brands`, {
    next: { revalidate: 3600 }, // 1 hour
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch brands: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * Fetch featured products
 * Cache for 5 minutes
 */
export async function fetchFeaturedProducts(limit: number = 6): Promise<ProductsResponse['data']> {
  const response = await fetch(`${API_URL}/api/products?featured=true&limit=${limit}`, {
    next: { revalidate: 300 }, // 5 minutes
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch featured products: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

