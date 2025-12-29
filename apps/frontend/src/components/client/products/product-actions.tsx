'use client';

import { AddToCartButton } from '@/components/client/cart/add-to-cart-button';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';

interface ProductVariant {
  id: string;
  name: string | null;
  price: number | string;
  stock: number;
}

interface ProductActionsProps {
  productId: string;
  productName: string;
  productSlug: string;
  variants: ProductVariant[];
  primaryImage?: string;
}

export function ProductActions({
  productId,
  productName,
  productSlug,
  variants,
  primaryImage,
}: ProductActionsProps) {
  const defaultVariant = variants[0];

  if (!defaultVariant) {
    return null;
  }

  return (
    <>
      {variants.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Variants</h3>
          <div className="space-y-2">
            {variants.map((variant) => (
              <div
                key={variant.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{variant.name || 'Standard'}</p>
                  <p className="text-sm text-muted-foreground">
                    Stock: {variant.stock}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-lg font-semibold">
                    {formatPrice(variant.price)}
                  </p>
                  <AddToCartButton
                    variantId={variant.id}
                    productId={productId}
                    productName={productName}
                    productSlug={productSlug}
                    variantName={variant.name || undefined}
                    price={variant.price}
                    stock={variant.stock}
                    image={primaryImage}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {defaultVariant && (
          <AddToCartButton
            variantId={defaultVariant.id}
            productId={productId}
            productName={productName}
            productSlug={productSlug}
            variantName={defaultVariant.name || undefined}
            price={defaultVariant.price}
            stock={defaultVariant.stock}
            image={primaryImage}
            size="lg"
            className="flex-1"
          />
        )}
        <Button size="lg" variant="outline">
          Buy Now
        </Button>
      </div>
    </>
  );
}

