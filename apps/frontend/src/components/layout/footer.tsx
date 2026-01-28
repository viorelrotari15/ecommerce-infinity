'use client';

import Link from 'next/link';
import { useT, translationKeys } from '@/lib/utils/translations';
import { getBranding } from '@/lib/branding';

const branding = getBranding();

export function Footer() {
  const t = useT();

  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-10 md:py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-lg font-semibold">
              {t(translationKeys.footer.company.name, branding.name)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(translationKeys.footer.company.tagline, branding.tagline)}
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold">{t(translationKeys.footer.shop.title, 'Shop')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/products"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t(translationKeys.footer.shop.allProducts, 'All Products')}
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t(translationKeys.footer.shop.categories, 'Categories')}
                </Link>
              </li>
              <li>
                <Link
                  href="/brands"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t(translationKeys.footer.shop.brands, 'Brands')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold">{t(translationKeys.footer.customerService.title, 'Customer Service')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t(translationKeys.footer.customerService.contact, 'Contact Us')}
                </Link>
              </li>
              <li>
                <Link
                  href="/shipping"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t(translationKeys.footer.customerService.shipping, 'Shipping Info')}
                </Link>
              </li>
              <li>
                <Link
                  href="/returns"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t(translationKeys.footer.customerService.returns, 'Returns')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t(translationKeys.footer.legal.privacy, 'Privacy Policy')}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t(translationKeys.footer.legal.terms, 'Terms of Service')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} {t(translationKeys.footer.company.name, branding.name)}.{' '}
            {t(translationKeys.footer.company.copyright, 'All rights reserved.')}
          </p>
        </div>
      </div>
    </footer>
  );
}

