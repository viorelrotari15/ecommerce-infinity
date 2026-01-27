'use client';

import { cn, formatPrice } from '@/lib/utils';
import { ShippingOption } from '@/lib/api/client';
import { useT, translationKeys } from '@/lib/utils/translations';

interface ShippingMethodSelectorProps {
  options: ShippingOption[];
  value?: string;
  onChange: (value: string) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export function ShippingMethodSelector({
  options,
  value,
  onChange,
  loading = false,
  emptyMessage,
}: ShippingMethodSelectorProps) {
  const t = useT();

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        {t(translationKeys.checkout.shippingLoading, 'Loading shipping options...')}
      </p>
    );
  }

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyMessage || t(translationKeys.checkout.noShippingOptions, 'No shipping options available')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {options.map((option) => (
        <button
          type="button"
          key={option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            'flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors',
            value === option.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'
          )}
        >
          <div>
            <p className="font-medium">
              {option.name} {option.isExpress ? `(${option.carrier})` : ''}
            </p>
            <p className="text-sm text-muted-foreground">
              {option.carrier} ·{' '}
              {option.isExpress
                ? t(translationKeys.checkout.shippingExpress, 'Express')
                : t(translationKeys.checkout.shippingStandard, 'Standard')}
            </p>
          </div>
          <div className="text-sm font-semibold">
            {option.price === 0
              ? t(translationKeys.cart.free, 'Free')
              : formatPrice(option.price)}
          </div>
        </button>
      ))}
    </div>
  );
}
