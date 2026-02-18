import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const defaultCurrency = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DEFAULT_CURRENCY) || 'EUR';

export function formatPrice(price: number | string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: defaultCurrency,
  }).format(numPrice);
}

/** Short, user-friendly order ID for display (e.g. "3D4D1374" from a UUID). Links still use full id. */
export function formatOrderIdDisplay(orderId: string): string {
  if (!orderId) return orderId;
  const short = orderId.replace(/-/g, '').slice(0, 8);
  return short.toUpperCase();
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

