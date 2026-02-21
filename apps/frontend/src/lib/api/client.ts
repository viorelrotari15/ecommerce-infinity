/**
 * Client-side API functions for React Query
 * These run in the browser
 */

import { logout } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Base URL for API (origin only, no trailing /api) so env can be origin or origin/api */
function getApiBase(): string {
  return (API_URL || '').replace(/\/api\/?$/, '') || API_URL;
}

const AUTH_REDIRECT_PATH = '/auth/login';

/**
 * Get current language from cookie
 */
function getCurrentLanguage(): string {
  if (typeof document === 'undefined') return 'en';
  const cookieLang = document.cookie
    .split('; ')
    .find((row) => row.startsWith('lang='))
    ?.split('=')[1];
  return cookieLang || 'en';
}

/**
 * API Client for React Query hooks
 */
export const apiClient = {
  get: async <T>(endpoint: string, options?: RequestInit): Promise<{ data: T }> => {
    const data = await fetchAPI<T>(endpoint, options);
    return { data };
  },
  post: async <T>(endpoint: string, body?: any, options?: RequestInit): Promise<{ data: T }> => {
    const data = await fetchAPI<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data };
  },
  patch: async <T>(endpoint: string, body?: any, options?: RequestInit): Promise<{ data: T }> => {
    const data = await fetchAPI<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data };
  },
  delete: async <T>(endpoint: string, options?: RequestInit): Promise<{ data: T }> => {
    const data = await fetchAPI<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
    return { data };
  },
};

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any,
  ) {
    super(message);
    this.name = 'APIError';
  }
}

function handleUnauthorized() {
  if (typeof window === 'undefined') {
    return;
  }
  logout();
  window.location.href = AUTH_REDIRECT_PATH;
}

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${getApiBase()}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const language = getCurrentLanguage();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-language': language,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    let errorData: any = null;
    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorData.error || response.statusText;
    } catch {
      // If response is not JSON, use status text
    }
    if (response.status === 401) {
      handleUnauthorized();
    }
    throw new APIError(errorMessage, response.status, errorData);
  }

  return response.json();
}

export async function fetchAPIAuth<T>(endpoint: string, token?: string, options?: RequestInit): Promise<T> {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined);
  return fetchAPI<T>(endpoint, {
    ...options,
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options?.headers,
    },
  });
}

export class ApiService {
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return fetchAPIAuth<T>(endpoint, undefined, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return fetchAPIAuth<T>(endpoint, undefined, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return fetchAPIAuth<T>(endpoint, undefined, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return fetchAPIAuth<T>(endpoint, undefined, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return fetchAPIAuth<T>(endpoint, undefined, { ...options, method: 'DELETE' });
  }
}

export const apiService = new ApiService();

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

  const url = `${getApiBase()}/api/images/products/${productId}`;
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
export async function deleteImage(imageId: string): Promise<void> {
  return apiService.delete(`/images/${imageId}`);
}

/**
 * Carousel API
 */
export interface CarouselSlideResponse {
  id: string;
  order: number;
  link: string | null;
  desktopUrl: string;
  mobileUrl: string | null;
}

export interface CarouselSlideAdminResponse extends CarouselSlideResponse {
  desktopFilepath: string;
  mobileFilepath: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getCarouselSlides(): Promise<CarouselSlideResponse[]> {
  const url = `${getApiBase()}/api/carousel`;
  const language = getCurrentLanguage();
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'x-language': language },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || response.statusText);
  }
  return response.json();
}

export async function getCarouselSlidesAdmin(): Promise<CarouselSlideAdminResponse[]> {
  return apiService.get<CarouselSlideAdminResponse[]>('/carousel/admin');
}

export async function createCarouselSlide(
  formData: FormData,
  token: string,
): Promise<CarouselSlideResponse> {
  const url = `${getApiBase()}/api/carousel`;
  const language = getCurrentLanguage();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-language': language,
    },
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || response.statusText);
  }
  return response.json();
}

export async function updateCarouselSlide(
  id: string,
  formData: FormData,
  token: string,
): Promise<CarouselSlideResponse> {
  const url = `${getApiBase()}/api/carousel/${id}`;
  const language = getCurrentLanguage();
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-language': language,
    },
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || response.statusText);
  }
  return response.json();
}

export async function deleteCarouselSlide(id: string): Promise<void> {
  return apiService.delete(`/carousel/${id}`).then(() => undefined);
}

/**
 * Set primary image
 */
export async function setPrimaryImage(imageId: string): Promise<void> {
  return apiService.patch(`/images/${imageId}/primary`, {});
}

/**
 * Cart API functions
 */
export interface CartItemResponse {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  price: number | string;
  quantity: number;
  stock: number;
  image?: string;
}

export interface CartResponse {
  items: CartItemResponse[];
}

export async function getCart(): Promise<CartResponse> {
  return apiService.get<CartResponse>('/cart');
}

export async function updateCart(
  items: Array<{ variantId: string; quantity: number }>,
): Promise<CartResponse> {
  return apiService.put<CartResponse>('/cart', { items });
}

export async function clearCart(): Promise<CartResponse> {
  return apiService.delete<CartResponse>('/cart');
}

/**
 * Checkout + Pricing API functions
 */
export interface CheckoutAddress {
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  houseNumber: string;
  city: string;
  postalCode: string;
  country: string;
  company?: string;
}

export interface CheckoutItem {
  variantId: string;
  quantity: number;
}

export interface ShippingOption {
  id: string;
  code: string;
  name: string;
  carrier: string;
  isExpress: boolean;
  price: number;
  total?: number;
}

export interface CheckoutEstimateResponse {
  region: { id: string; code: string; currency: string };
  subtotal: number;
  shippingOptions: ShippingOption[];
}

export async function listShippingOptions(regionCode?: string): Promise<ShippingOption[]> {
  const query = regionCode ? `?regionCode=${encodeURIComponent(regionCode)}` : '';
  return apiService.get<ShippingOption[]>(`/pricing/shipping-options${query}`);
}

export async function getCheckoutEstimate(payload: {
  items: CheckoutItem[];
  shippingAddress: CheckoutAddress;
  regionCode?: string;
}): Promise<CheckoutEstimateResponse> {
  return apiService.post<CheckoutEstimateResponse>('/checkout/estimate', payload);
}

export async function createGuestCheckout(payload: {
  items: CheckoutItem[];
  shippingAddress: CheckoutAddress;
  billingAddress: CheckoutAddress;
  guestEmail: string;
  shippingMethodId: string;
  regionCode?: string;
}): Promise<any> {
  return apiService.post('/checkout', payload);
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  order: any;
}

export async function createPaymentIntent(payload: {
  orderId: string;
  email: string;
}): Promise<PaymentIntentResponse> {
  return apiService.post('/payments/intent', payload);
}

/** Confirm payment success so backend marks payment COMPLETED (when webhook is not received) */
export async function confirmPaymentSuccess(orderId: string): Promise<{ success: boolean }> {
  return apiService.post('/payments/confirm-success', { orderId });
}

/** Admin order detail (GET /orders/admin/:id) */
export interface AdminOrderResponse {
  id: string;
  status: string;
  trackingNumber?: string | null;
  total: string;
  subtotal: string;
  tax: string;
  shipping: string;
  guestEmail?: string | null;
  shippingAddress: unknown;
  billingAddress: unknown;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    quantity: number;
    price: string;
    productVariant: { id: string; name: string | null; sku: string; product: { id: string; name: string; slug: string } };
  }>;
  payment: { id: string; amount: string; status: string; method: string; transactionId: string | null; createdAt: string } | null;
  user?: { id: string; email: string; firstName: string; lastName: string } | null;
}

export interface AdminOrdersListResponse {
  data: AdminOrderResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listAdminOrders(params?: {
  orderId?: string;
  page?: number;
  limit?: number;
}): Promise<AdminOrdersListResponse> {
  const query = new URLSearchParams();
  if (params?.orderId?.trim()) query.set('orderId', params.orderId.trim());
  if (params?.page != null && params.page > 1) query.set('page', String(params.page));
  if (params?.limit != null && params.limit !== 20) query.set('limit', String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiService.get<AdminOrdersListResponse>(`/orders/admin${suffix}`);
}

export async function getAdminOrderById(orderId: string): Promise<AdminOrderResponse> {
  return apiService.get<AdminOrderResponse>(`/orders/admin/${orderId}`);
}

export async function updateAdminOrderStatus(orderId: string, payload: { status: string; trackingNumber?: string }) {
  return apiService.patch(`/orders/admin/${orderId}`, payload);
}

/** User order detail (GET /orders/:id) - same shape as admin minus sensitive fields */
export interface UserOrderResponse {
  id: string;
  status: string;
  trackingNumber?: string | null;
  total: string;
  subtotal: string;
  tax: string;
  shipping: string;
  shippingAddress: unknown;
  billingAddress: unknown;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    quantity: number;
    price: string;
    productVariant: { id: string; name: string | null; sku: string; product: { id: string; name: string; slug: string } };
  }>;
  payment: { id: string; amount: string; status: string; method: string; transactionId: string | null; createdAt: string } | null;
}

export async function getUserOrderById(orderId: string): Promise<UserOrderResponse> {
  return apiService.get<UserOrderResponse>(`/orders/${orderId}`);
}

export interface StripePaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  metadata: Record<string, string>;
  order: any | null;
}

export async function listStripePayments(params?: { orderId?: string; email?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.orderId?.trim()) query.set('orderId', params.orderId.trim());
  if (params?.email?.trim()) query.set('email', params.email.trim());
  if (params?.limit != null) query.set('limit', String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiService.get<StripePaymentHistoryItem[]>(`/payments/stripe/history${suffix}`);
}

export async function listAdminRegions() {
  return apiService.get('/pricing/admin/regions');
}

export async function listAdminShippingMethods(regionCode?: string) {
  const query = regionCode ? `?regionCode=${encodeURIComponent(regionCode)}` : '';
  return apiService.get(`/pricing/admin/shipping-methods${query}`);
}

export async function createAdminShippingMethod(payload: any) {
  return apiService.post('/pricing/admin/shipping-methods', payload);
}

export async function updateAdminShippingMethod(id: string, payload: any) {
  return apiService.patch(`/pricing/admin/shipping-methods/${id}`, payload);
}

export async function deleteAdminShippingMethod(id: string) {
  return apiService.delete(`/pricing/admin/shipping-methods/${id}`);
}

export async function listAdminShippingRules(shippingMethodId?: string) {
  const query = shippingMethodId ? `?shippingMethodId=${encodeURIComponent(shippingMethodId)}` : '';
  return apiService.get(`/pricing/admin/shipping-rules${query}`);
}

export async function createAdminShippingRule(payload: any) {
  return apiService.post('/pricing/admin/shipping-rules', payload);
}

export async function updateAdminShippingRule(id: string, payload: any) {
  return apiService.patch(`/pricing/admin/shipping-rules/${id}`, payload);
}

export async function deleteAdminShippingRule(id: string) {
  return apiService.delete(`/pricing/admin/shipping-rules/${id}`);
}

