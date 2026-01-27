'use client';

import { useMutation } from '@tanstack/react-query';
import {
  CheckoutAddress,
  CheckoutEstimateResponse,
  CheckoutItem,
  createGuestCheckout,
  getCheckoutEstimate,
} from '@/lib/api/client';

export interface CheckoutEstimateInput {
  items: CheckoutItem[];
  shippingAddress: CheckoutAddress;
  regionCode?: string;
}

export interface CheckoutCreateInput {
  items: CheckoutItem[];
  shippingAddress: CheckoutAddress;
  billingAddress: CheckoutAddress;
  guestEmail: string;
  shippingMethodId: string;
  regionCode?: string;
}

export function useCheckoutEstimate() {
  return useMutation({
    mutationFn: (payload: CheckoutEstimateInput): Promise<CheckoutEstimateResponse> =>
      getCheckoutEstimate(payload),
  });
}

export function useCreateGuestCheckout() {
  return useMutation({
    mutationFn: (payload: CheckoutCreateInput) => createGuestCheckout(payload),
  });
}
