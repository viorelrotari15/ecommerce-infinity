'use client';

import { useTranslation } from '../hooks/use-translations';
import { useLanguage } from '../contexts/language-context';

/**
 * Hook to get translation function for UI text
 */
export function useT() {
  const { currentLanguage } = useLanguage();
  return useTranslation(currentLanguage);
}

/**
 * Common translation keys used throughout the app
 */
export const translationKeys = {
  // Header
  header: {
    menu: {
      home: 'header.menu.home',
      products: 'header.menu.products',
      categories: 'header.menu.categories',
      brands: 'header.menu.brands',
      cart: 'header.menu.cart',
      dashboard: 'header.menu.dashboard',
      newProduct: 'header.menu.newProduct',
    },
    actions: {
      login: 'header.actions.login',
      logout: 'header.actions.logout',
      profile: 'header.actions.profile',
    },
  },
  // Footer
  footer: {
    shop: {
      title: 'footer.shop.title',
      allProducts: 'footer.shop.allProducts',
      categories: 'footer.shop.categories',
      brands: 'footer.shop.brands',
    },
    customerService: {
      title: 'footer.customerService.title',
      contact: 'footer.customerService.contact',
      shipping: 'footer.customerService.shipping',
      returns: 'footer.customerService.returns',
    },
  },
  // Products
  products: {
    title: 'products.title',
    noProducts: 'products.noProducts',
    addToCart: 'products.addToCart',
    outOfStock: 'products.outOfStock',
    inStock: 'products.inStock',
    price: 'products.price',
    viewDetails: 'products.viewDetails',
  },
  // Cart
  cart: {
    title: 'cart.title',
    empty: 'cart.empty',
    total: 'cart.total',
    checkout: 'cart.checkout',
    remove: 'cart.remove',
    quantity: 'cart.quantity',
  },
  // Common
  common: {
    loading: 'common.loading',
    error: 'common.error',
    save: 'common.save',
    cancel: 'common.cancel',
    delete: 'common.delete',
    edit: 'common.edit',
    create: 'common.create',
    update: 'common.update',
    search: 'common.search',
    filter: 'common.filter',
    clear: 'common.clear',
  },
} as const;

/**
 * Flatten translationKeys object to get all keys
 * Returns an array of all translation key strings
 */
export function getAllTranslationKeys(): string[] {
  const keys: string[] = [];
  
  function traverse(obj: any, prefix = '') {
    for (const key in obj) {
      const value = obj[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'string') {
        // This is a translation key string
        keys.push(value);
      } else if (typeof value === 'object' && value !== null) {
        // Continue traversing
        traverse(value, fullKey);
      }
    }
  }
  
  traverse(translationKeys);
  return [...new Set(keys)].sort(); // Remove duplicates and sort
}

/**
 * Get English default values for all translation keys
 * This is used as a template for exports
 */
export function getEnglishTemplate(): Record<string, string> {
  const template: Record<string, string> = {};
  
  // English defaults based on the key structure
  const englishDefaults: Record<string, string> = {
    'header.menu.home': 'Home',
    'header.menu.products': 'Products',
    'header.menu.categories': 'Categories',
    'header.menu.brands': 'Brands',
    'header.menu.cart': 'Cart',
    'header.menu.dashboard': 'Dashboard',
    'header.menu.newProduct': 'New Product',
    'header.actions.login': 'Login',
    'header.actions.logout': 'Logout',
    'header.actions.profile': 'Profile',
    'footer.shop.title': 'Shop',
    'footer.shop.allProducts': 'All Products',
    'footer.shop.categories': 'Categories',
    'footer.shop.brands': 'Brands',
    'footer.customerService.title': 'Customer Service',
    'footer.customerService.contact': 'Contact Us',
    'footer.customerService.shipping': 'Shipping Info',
    'footer.customerService.returns': 'Returns',
    'products.title': 'Products',
    'products.noProducts': 'No products found',
    'products.addToCart': 'Add to Cart',
    'products.outOfStock': 'Out of Stock',
    'products.inStock': 'In Stock',
    'products.price': 'Price',
    'products.viewDetails': 'View Details',
    'cart.title': 'Shopping Cart',
    'cart.empty': 'Your cart is empty',
    'cart.total': 'Total',
    'cart.checkout': 'Checkout',
    'cart.remove': 'Remove',
    'cart.quantity': 'Quantity',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.update': 'Update',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.clear': 'Clear',
  };
  
  const allKeys = getAllTranslationKeys();
  allKeys.forEach((key) => {
    template[key] = englishDefaults[key] || key.split('.').pop() || key;
  });
  
  return template;
}

