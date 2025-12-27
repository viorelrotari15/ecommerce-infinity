import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const existingItem = get().items.find((i) => i.id === item.id);
        
        if (existingItem) {
          // Update quantity if item already exists
          const newQuantity = (existingItem.quantity + (item.quantity || 1));
          if (newQuantity > item.stock) {
            // Don't exceed stock
            return;
          }
          set((state) => ({
            items: state.items.map((i) =>
              i.id === item.id
                ? { ...i, quantity: newQuantity }
                : i
            ),
          }));
        } else {
          // Add new item
          set((state) => ({
            items: [...state.items, { ...item, quantity: item.quantity || 1 }],
          }));
        }
      },
      removeItem: (variantId) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== variantId),
        }));
      },
      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }
        
        const item = get().items.find((i) => i.id === variantId);
        if (item && quantity > item.stock) {
          // Don't exceed stock
          return;
        }
        
        set((state) => ({
          items: state.items.map((i) =>
            i.id === variantId ? { ...i, quantity } : i
          ),
        }));
      },
      clearCart: () => {
        set({ items: [] });
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
    }),
    {
      name: 'cart-storage',
    }
  )
);

