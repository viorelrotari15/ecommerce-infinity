'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { CartItem } from '@/lib/store/cart-store';
import { useT, translationKeys } from '@/lib/utils/translations';

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
}

export function OrderSummary({ items, subtotal, shipping, total }: OrderSummaryProps) {
  const t = useT();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(translationKeys.checkout.orderSummary, 'Order Summary')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t(translationKeys.checkout.subtotal, 'Subtotal')}</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t(translationKeys.checkout.shipping, 'Shipping')}</span>
            <span>{shipping > 0 ? formatPrice(shipping) : formatPrice(0)}</span>
          </div>
        </div>
        <div className="border-t pt-4">
          <div className="flex justify-between text-lg font-semibold">
            <span>{t(translationKeys.checkout.total, 'Total')}</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            {items.length} {items.length === 1 ? t(translationKeys.checkout.item, 'item') : t(translationKeys.checkout.items, 'items')}
          </p>
          {items.slice(0, 3).map((item) => (
            <div key={item.id} className="flex justify-between">
              <span className="truncate">{item.productName}</span>
              <span>x{item.quantity}</span>
            </div>
          ))}
          {items.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{items.length - 3} {t(translationKeys.checkout.moreItems, 'more items')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
