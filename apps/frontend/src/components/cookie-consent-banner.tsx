'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCookieConsent, type CookieConsent } from '@/lib/contexts/cookie-consent-context';
import { useT, translationKeys } from '@/lib/utils/translations';
import { X, Settings, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CookieConsentBanner() {
  const t = useT();
  const { hasConsented, acceptAll, rejectAll, acceptCustom, isSettingsOpen, openSettings, closeSettings, consent, isInitialized } =
    useCookieConsent();
  const [showBanner, setShowBanner] = useState(false);
  const [customConsent, setCustomConsent] = useState<CookieConsent>({
    necessary: true,
    preferences: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Wait for consent to be initialized from cookie before showing banner
    if (!isInitialized) {
      return;
    }

    const shouldShow = !hasConsented();

    // Only update state if the desired visibility actually changed
    setShowBanner((prev) => (prev === shouldShow ? prev : shouldShow));

    // When we decide to show the banner, initialize custom consent from existing value once
    if (shouldShow && consent) {
      setCustomConsent(consent);
    }
  }, [isInitialized, hasConsented, consent]);

  const handleAcceptAll = () => {
    acceptAll();
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    rejectAll();
    setShowBanner(false);
  };

  const handleSaveCustom = () => {
    acceptCustom(customConsent);
    setShowBanner(false);
  };

  const toggleConsent = (key: keyof CookieConsent) => {
    if (key === 'necessary') return; // Cannot toggle necessary cookies
    setCustomConsent((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!showBanner) {
    return null;
  }

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-lg animate-in slide-in-from-bottom">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-1">
                {t(translationKeys.cookies.title, 'We use cookies')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(
                  translationKeys.cookies.description,
                  'We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. By clicking "Accept All", you consent to our use of cookies.'
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openSettings}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                {t(translationKeys.cookies.customize, 'Customize')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRejectAll}>
                {t(translationKeys.cookies.rejectAll, 'Reject All')}
              </Button>
              <Button variant="default" size="sm" onClick={handleAcceptAll}>
                {t(translationKeys.cookies.acceptAll, 'Accept All')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={closeSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t(translationKeys.cookies.settingsTitle, 'Cookie Preferences')}</DialogTitle>
            <DialogDescription>
              {t(
                translationKeys.cookies.settingsDescription,
                'Manage your cookie preferences. You can enable or disable different types of cookies below.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Necessary Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">
                    {t(translationKeys.cookies.necessary.title, 'Necessary Cookies')}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t(
                      translationKeys.cookies.necessary.description,
                      'These cookies are essential for the website to function properly. They cannot be disabled.'
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {t(translationKeys.cookies.alwaysActive, 'Always Active')}
                  </span>
                </div>
              </div>
            </div>

            {/* Preferences Cookies */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">
                    {t(translationKeys.cookies.preferences.title, 'Preferences Cookies')}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t(
                      translationKeys.cookies.preferences.description,
                      'These cookies allow the website to remember your preferences, such as language selection.'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleConsent('preferences')}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    customConsent.preferences ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      customConsent.preferences ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">
                    {t(translationKeys.cookies.analytics.title, 'Analytics Cookies')}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t(
                      translationKeys.cookies.analytics.description,
                      'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleConsent('analytics')}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    customConsent.analytics ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      customConsent.analytics ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">
                    {t(translationKeys.cookies.marketing.title, 'Marketing Cookies')}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t(
                      translationKeys.cookies.marketing.description,
                      'These cookies are used to deliver advertisements that are more relevant to you and your interests.'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleConsent('marketing')}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    customConsent.marketing ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      customConsent.marketing ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={closeSettings}>
              {t(translationKeys.cookies.cancel, 'Cancel')}
            </Button>
            <Button variant="default" onClick={handleSaveCustom}>
              {t(translationKeys.cookies.savePreferences, 'Save Preferences')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
