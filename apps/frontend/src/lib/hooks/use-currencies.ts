import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface CurrenciesResponse {
  data: Currency[];
}

export function useCurrencies(includeInactive = false) {
  return useQuery<Currency[]>({
    queryKey: ['currencies', includeInactive],
    queryFn: async () => {
      const response = await apiClient.get<Currency[]>(
        `/currencies?includeInactive=${includeInactive}`,
      );
      return response.data;
    },
  });
}

export interface DefaultCurrencyResponse {
  code: string;
}

export function useDefaultCurrency() {
  return useQuery<string>({
    queryKey: ['currencies', 'default'],
    queryFn: async () => {
      const response = await apiClient.get<DefaultCurrencyResponse>('/currencies/default');
      return response.data.code;
    },
  });
}

