'use server';

import { revalidatePath } from 'next/cache';

/**
 * Revalidate the categories page
 */
export async function revalidateCategories() {
  revalidatePath('/categories');
  revalidatePath('/products'); // Also revalidate products page since it uses categories in filters
}

/**
 * Revalidate the brands page
 */
export async function revalidateBrands() {
  revalidatePath('/brands');
  revalidatePath('/products'); // Also revalidate products page since it uses brands in filters
}
