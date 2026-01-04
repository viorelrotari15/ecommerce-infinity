'use client';

import React, { createContext, useContext } from 'react';
import { useDefaultCurrency, useCurrencies } from '../hooks/use-currencies';

interface CurrencyContextType {
  currentCurrency: string;
  currencySymbol: string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { data: instanceCurrency = 'EUR', isLoading: currencyLoading } = useDefaultCurrency();
  const { data: currencies = [], isLoading: currenciesLoading } = useCurrencies();
  
  // Get currency symbol from currencies list
  const currency = currencies.find(c => c.code === instanceCurrency);
  const currencySymbol = currency?.symbol || instanceCurrency;

  const value: CurrencyContextType = {
    currentCurrency: instanceCurrency,
    currencySymbol,
    isLoading: currencyLoading || currenciesLoading,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

