/**
 * Client-side API functions for React Query
 * These run in the browser
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_URL}/api${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || response.statusText;
    } catch {
      // If response is not JSON, use status text
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchAPIAuth<T>(
  endpoint: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  return fetchAPI<T>(endpoint, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
}

/**
 * Upload image file to the API
 */
export async function uploadImage(
  productId: string,
  file: File,
  token: string,
  options?: { isPrimary?: boolean; order?: number },
): Promise<{
  id: string;
  productId: string;
  bucket: string;
  filepath: string;
  filename: string;
  size: number;
  mimeType: string;
  isPrimary: boolean;
  order: number;
  url: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.isPrimary !== undefined) {
    formData.append('isPrimary', options.isPrimary.toString());
  }
  if (options?.order !== undefined) {
    formData.append('order', options.order.toString());
  }

  const url = `${API_URL}/api/images/products/${productId}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || response.statusText;
    } catch {
      // If response is not JSON, use status text
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Delete image
 */
export async function deleteImage(imageId: string, token: string): Promise<void> {
  return fetchAPIAuth(`/images/${imageId}`, token, {
    method: 'DELETE',
  });
}

/**
 * Set primary image
 */
export async function setPrimaryImage(imageId: string, token: string): Promise<void> {
  return fetchAPIAuth(`/images/${imageId}/primary`, token, {
    method: 'PATCH',
  });
}

