import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | string, currencyCode: string = 'EUR', currencySymbol?: string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  // If currency symbol is provided, use custom formatting
  if (currencySymbol) {
    return `${currencySymbol}${numPrice.toFixed(2)}`;
  }
  
  // Use Intl.NumberFormat for proper currency formatting
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(numPrice);
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

