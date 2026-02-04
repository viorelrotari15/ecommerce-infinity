'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type CookieConsent = {
  necessary: boolean; // Always true, cannot be disabled
  preferences: boolean; // Language preferences
  analytics: boolean; // Analytics cookies (for future use)
  marketing: boolean; // Marketing cookies (for future use)
};

export type ConsentStatus = 'pending' | 'accepted' | 'rejected' | 'custom';

interface CookieConsentContextType {
  consent: CookieConsent | null;
  status: ConsentStatus;
  isInitialized: boolean; // Whether consent has been loaded from cookie
  hasConsented: () => boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  acceptCustom: (consent: CookieConsent) => void;
  openSettings: () => void;
  closeSettings: () => void;
  isSettingsOpen: boolean;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

const CONSENT_COOKIE_NAME = 'cookie_consent';
const CONSENT_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

/**
 * Get cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Set cookie
 */
function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return;
  // Calculate expiration date for better browser compatibility
  const expires = new Date();
  expires.setTime(expires.getTime() + maxAge * 1000);
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; expires=${expires.toUTCString()}; SameSite=Lax`;
}

/**
 * Parse consent cookie value
 */
function parseConsentCookie(cookieValue: string | null): { consent: CookieConsent; status: ConsentStatus } | null {
  if (!cookieValue) return null;
  
  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue));
    return {
      consent: parsed.consent,
      status: parsed.status || 'accepted',
    };
  } catch {
    return null;
  }
}

/**
 * Get initial consent state from cookie
 */
function getInitialConsent(): { consent: CookieConsent | null; status: ConsentStatus } {
  if (typeof document === 'undefined') {
    return { consent: null, status: 'pending' };
  }

  const cookieValue = getCookie(CONSENT_COOKIE_NAME);
  if (!cookieValue) {
    return { consent: null, status: 'pending' };
  }

  const parsed = parseConsentCookie(cookieValue);
  if (!parsed) {
    return { consent: null, status: 'pending' };
  }

  return parsed;
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [status, setStatus] = useState<ConsentStatus>('pending');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize from cookie on mount
  useEffect(() => {
    const initial = getInitialConsent();
    setConsent(initial.consent);
    setStatus(initial.status);
    setIsInitialized(true);
  }, []);

  const saveConsent = useCallback((newConsent: CookieConsent, newStatus: ConsentStatus) => {
    setConsent(newConsent);
    setStatus(newStatus);
    
    const cookieValue = encodeURIComponent(
      JSON.stringify({
        consent: newConsent,
        status: newStatus,
        timestamp: new Date().toISOString(),
      })
    );
    
    setCookie(CONSENT_COOKIE_NAME, cookieValue, CONSENT_COOKIE_MAX_AGE);
  }, []);

  const acceptAll = useCallback(() => {
    const allAccepted: CookieConsent = {
      necessary: true,
      preferences: true,
      analytics: true,
      marketing: true,
    };
    saveConsent(allAccepted, 'accepted');
    setIsSettingsOpen(false);
  }, [saveConsent]);

  const rejectAll = useCallback(() => {
    const onlyNecessary: CookieConsent = {
      necessary: true, // Always required
      preferences: false,
      analytics: false,
      marketing: false,
    };
    saveConsent(onlyNecessary, 'rejected');
    setIsSettingsOpen(false);
  }, [saveConsent]);

  const acceptCustom = useCallback((newConsent: CookieConsent) => {
    // Ensure necessary is always true
    const customConsent: CookieConsent = {
      ...newConsent,
      necessary: true,
    };
    saveConsent(customConsent, 'custom');
    setIsSettingsOpen(false);
  }, [saveConsent]);

  const hasConsented = useCallback(() => {
    return status !== 'pending';
  }, [status]);

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const value: CookieConsentContextType = {
    consent,
    status,
    isInitialized,
    hasConsented,
    acceptAll,
    rejectAll,
    acceptCustom,
    openSettings,
    closeSettings,
    isSettingsOpen,
  };

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
}
