import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAuthToken, isAuthenticated } from '@/lib/auth';
import { getCart, updateCart as updateCartAPI, clearCart as clearCartAPI, CartItemResponse } from '@/lib/api/client';

export interface CartItem {
  id: string; // variant id
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  price: number | string;
  quantity: number;
  image?: string;
  stock: number;
}

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  isSyncing: boolean;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  syncWithServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
  mergeWithLocal: (serverItems: CartItemResponse[]) => void;
}

// Helper to convert CartItemResponse to CartItem
function convertCartItem(item: CartItemResponse): CartItem {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    productSlug: item.productSlug,
    variantName: item.variantName,
    price: item.price,
    quantity: item.quantity,
    image: item.image,
    stock: item.stock,
  };
}

// Helper to sync cart to server
async function syncToServer(items: CartItem[]): Promise<void> {
  if (!isAuthenticated()) {
    return; // Don't sync if not logged in
  }

  const token = getAuthToken();
  if (!token) {
    return;
  }

  try {
    await updateCartAPI(
      items.map((item) => ({
        variantId: item.id,
        quantity: item.quantity,
      })),
      token,
    );
  } catch (error) {
    console.error('Failed to sync cart to server:', error);
    // Don't throw - allow local updates to continue
  }
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      isSyncing: false,
      
      addItem: async (item) => {
        const existingItem = get().items.find((i) => i.id === item.id);
        
        let newItems: CartItem[];
        if (existingItem) {
          // Update quantity if item already exists
          const newQuantity = (existingItem.quantity + (item.quantity || 1));
          if (newQuantity > item.stock) {
            // Don't exceed stock
            return;
          }
          newItems = get().items.map((i) =>
            i.id === item.id
              ? { ...i, quantity: newQuantity }
              : i
          );
        } else {
          // Add new item
          newItems = [...get().items, { ...item, quantity: item.quantity || 1 }];
        }

        set({ items: newItems });
        
        // Sync to server if logged in
        if (isAuthenticated()) {
          await syncToServer(newItems);
        }
      },
      
      removeItem: async (variantId) => {
        const newItems = get().items.filter((i) => i.id !== variantId);
        set({ items: newItems });
        
        // Sync to server if logged in
        if (isAuthenticated()) {
          await syncToServer(newItems);
        }
      },
      
      updateQuantity: async (variantId, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(variantId);
          return;
        }
        
        const item = get().items.find((i) => i.id === variantId);
        if (item && quantity > item.stock) {
          // Don't exceed stock
          return;
        }
        
        const newItems = get().items.map((i) =>
          i.id === variantId ? { ...i, quantity } : i
        );
        set({ items: newItems });
        
        // Sync to server if logged in
        if (isAuthenticated()) {
          await syncToServer(newItems);
        }
      },
      
      clearCart: async () => {
        set({ items: [] });
        
        // Sync to server if logged in
        if (isAuthenticated()) {
          const token = getAuthToken();
          if (token) {
            try {
              await clearCartAPI(token);
            } catch (error) {
              console.error('Failed to clear cart on server:', error);
            }
          }
        }
      },
      
      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        return get().items.reduce((sum, item) => {
          const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
          return sum + price * item.quantity;
        }, 0);
      },
      
      syncWithServer: async () => {
        if (!isAuthenticated()) {
          return;
        }

        const token = getAuthToken();
        if (!token) {
          return;
        }

        set({ isSyncing: true });
        try {
          const serverCart = await getCart(token);
          const serverItems = serverCart.items.map(convertCartItem);
          
          // Merge with local cart (server takes precedence for conflicts)
          const localItems = get().items;
          const mergedItems = new Map<string, CartItem>();
          
          // Add local items first
          localItems.forEach((item) => {
            mergedItems.set(item.id, item);
          });
          
          // Override with server items (server is source of truth)
          serverItems.forEach((item) => {
            mergedItems.set(item.id, item);
          });
          
          set({ items: Array.from(mergedItems.values()) });
        } catch (error) {
          console.error('Failed to sync cart from server:', error);
        } finally {
          set({ isSyncing: false });
        }
      },
      
      loadFromServer: async () => {
        if (!isAuthenticated()) {
          return;
        }

        const token = getAuthToken();
        if (!token) {
          return;
        }

        set({ isLoading: true });
        try {
          const serverCart = await getCart(token);
          const serverItems = serverCart.items.map(convertCartItem);
          set({ items: serverItems });
        } catch (error) {
          console.error('Failed to load cart from server:', error);
        } finally {
          set({ isLoading: false });
        }
      },
      
      mergeWithLocal: (serverItems: CartItemResponse[]) => {
        const localItems = get().items;
        const mergedItems = new Map<string, CartItem>();
        
        // Add local items first
        localItems.forEach((item) => {
          mergedItems.set(item.id, item);
        });
        
        // Merge with server items (prefer server for conflicts, but keep local-only items)
        serverItems.forEach((serverItem) => {
          const converted = convertCartItem(serverItem);
          const existing = mergedItems.get(serverItem.id);
          
          if (existing) {
            // If both exist, use server quantity but keep local if it's higher (user might have added more)
            mergedItems.set(serverItem.id, {
              ...converted,
              quantity: Math.max(existing.quantity, converted.quantity),
            });
          } else {
            // Add server item
            mergedItems.set(serverItem.id, converted);
          }
        });
        
        set({ items: Array.from(mergedItems.values()) });
      },
    }),
    {
      name: 'cart-storage',
      // Only persist if user is not logged in
      partialize: (state) => {
        // Always persist items for non-logged-in users
        // For logged-in users, we'll sync with server
        return { items: state.items };
      },
    }
  )
);
