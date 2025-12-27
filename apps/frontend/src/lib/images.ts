/**
 * Image URL utility for handling development and production image URLs
 * 
 * Development: http://localhost:9000/products/...
 * Production: https://cdn.myshop.com/products/...
 */

export function getImageUrl(filepath: string | null | undefined): string {
  if (!filepath) {
    return '/placeholder-image.jpg'; // Fallback placeholder
  }

  // If already a full URL, return as-is (backend already converted it)
  if (filepath.startsWith('http://') || filepath.startsWith('https://')) {
    return filepath;
  }

  // Get CDN URL from environment
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:9000';
  
  // Handle relative paths like /images/products/... or /products/...
  let cleanPath: string;
  if (filepath.startsWith('/images/')) {
    // Remove /images/ prefix
    cleanPath = filepath.slice('/images/'.length);
  } else if (filepath.startsWith('/')) {
    // Remove leading slash
    cleanPath = filepath.slice(1);
  } else {
    cleanPath = filepath;
  }
  
  // Remove bucket name "products" from path if present to avoid duplicate
  // The bucket name will be added by the CDN URL structure
  if (cleanPath.startsWith('products/')) {
    cleanPath = cleanPath.slice('products/'.length);
  }
  
  // Construct full URL
  // For MinIO: http://localhost:9000/products/{cleanPath}
  return `${cdnUrl}/products/${cleanPath}`;
}

/**
 * Get product image URL from ProductImage object
 */
export function getProductImageUrl(image: {
  filepath: string;
  url?: string;
} | null | undefined): string {
  if (!image) {
    return '/placeholder-image.jpg';
  }

  // If URL is already provided (from API), use it
  if (image.url) {
    return image.url;
  }

  // Otherwise construct from filepath
  return getImageUrl(image.filepath);
}

/**
 * Get primary product image or first available image
 */
export function getPrimaryProductImage(
  images: Array<{ filepath: string; url?: string; isPrimary?: boolean }> | null | undefined,
): string {
  if (!images || images.length === 0) {
    return '/placeholder-image.jpg';
  }

  // Find primary image
  const primaryImage = images.find((img) => img.isPrimary);
  if (primaryImage) {
    return getProductImageUrl(primaryImage);
  }

  // Fallback to first image
  return getProductImageUrl(images[0]);
}

/**
 * Get all product images with URLs
 */
export function getProductImages(
  images: Array<{ filepath: string; url?: string }> | null | undefined,
): Array<{ filepath: string; url: string }> {
  if (!images || images.length === 0) {
    return [];
  }

  return images.map((image) => ({
    filepath: image.filepath,
    url: image.url || getImageUrl(image.filepath),
  }));
}

