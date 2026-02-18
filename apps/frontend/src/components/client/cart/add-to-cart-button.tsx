'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cart-store';
import { useT, translationKeys } from '@/lib/utils/translations';
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
  /** When true, adds to cart then redirects to /cart (e.g. Buy Now) */
  redirectToCart?: boolean;
  /** Custom button label (e.g. "Buy Now") */
  label?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
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
  redirectToCart = false,
  label,
  variant: buttonVariant = 'default',
}: AddToCartButtonProps) {
  const t = useT();
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

    if (redirectToCart) {
      setTimeout(() => {
        router.push('/cart');
      }, 300);
      return;
    }

    // Small delay for visual feedback
    setTimeout(() => {
      setIsAdding(false);
    }, 300);
  };

  if (stock <= 0) {
    return (
      <Button disabled size={size} className={className}>
        {t(translationKeys.products.outOfStock, 'Out of Stock')}
      </Button>
    );
  }

  const displayLabel = isAdding
    ? t(translationKeys.products.added, 'Added!')
    : (label ?? t(translationKeys.products.addToCart, 'Add to Cart'));

  return (
    <Button
      onClick={handleAddToCart}
      disabled={isAdding}
      size={size}
      variant={buttonVariant}
      className={className}
    >
      {showIcon && <ShoppingCart className="mr-2 h-4 w-4" />}
      {displayLabel}
    </Button>
  );
}

