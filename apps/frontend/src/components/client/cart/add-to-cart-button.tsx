'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cart-store';
import { ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AddToCartButtonProps {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName?: string;
  price: number | string;
  stock: number;
  image?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
}

export function AddToCartButton({
  variantId,
  productId,
  productName,
  productSlug,
  variantName,
  price,
  stock,
  image,
  size = 'default',
  className,
  showIcon = true,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { addItem } = useCartStore();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = () => {
    if (stock <= 0) {
      return;
    }

    setIsAdding(true);
    addItem({
      id: variantId,
      productId,
      productName,
      productSlug,
      variantName: variantName || 'Standard',
      price,
      stock,
      image,
      quantity: 1,
    });

    // Small delay for visual feedback
    setTimeout(() => {
      setIsAdding(false);
    }, 300);
  };

  if (stock <= 0) {
    return (
      <Button disabled size={size} className={className}>
        Out of Stock
      </Button>
    );
  }

  return (
    <Button
      onClick={handleAddToCart}
      disabled={isAdding}
      size={size}
      className={className}
    >
      {showIcon && <ShoppingCart className="mr-2 h-4 w-4" />}
      {isAdding ? 'Added!' : 'Add to Cart'}
    </Button>
  );
}

