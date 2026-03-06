'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { getBranding, type BrandingConfig } from '@/lib/branding';
import { useT, translationKeys } from '@/lib/utils/translations';

const branding = getBranding();
const company = (branding as BrandingConfig).company;
const companyName =
  company?.displayName ?? company?.legalName ?? branding.name;
const addressParts = [
  companyName,
  company?.street,
  company?.postalCode && company?.city
    ? `${company.postalCode} ${company.city}`
    : undefined,
  company?.email,
  company?.phone,
].filter(Boolean) as string[];
const footerCopyright =
  (branding as BrandingConfig).footer?.copyright ??
  '© 2026 Mistico Parfume. Toate drepturile rezervate.';

export function Footer() {
  const t = useT();

  return (
    <footer className="bg-background border-t">
      <div className="container py-12 md:py-16">
        {/* Logo + Address */}
        <div className="mb-10">
          <Link href="/" className="inline-block mb-5">
            <Image
              src="/branding/mp_logo.svg"
              alt={branding.name}
              width={220}
              height={110}
              className="h-auto w-[220px]"
              priority
            />
          </Link>
          <p className="text-sm text-muted-foreground">
            {addressParts.join(' | ')}
          </p>
        </div>

        {/* Three main sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Cont client */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-primary">
              {t(translationKeys.footer.account.title, 'Cont client')}
            </h4>
            <div className="grid grid-cols-2 gap-x-4">
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/auth/login" className="text-muted-foreground hover:text-foreground">
                    {t(translationKeys.footer.account.login, 'Autentificare')}
                  </Link>
                </li>
                <li>
                  <Link href="/auth/forgot-password" className="text-muted-foreground hover:text-foreground">
                    {t(translationKeys.footer.account.forgotPassword, 'Parolă uitată')}
                  </Link>
                </li>
                <li>
                  <Link href="/cart" className="text-muted-foreground hover:text-foreground flex items-center gap-1.5">
                    <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                    {t(translationKeys.footer.account.cart, 'Coș de cumpărături')}
                  </Link>
                </li>
              </ul>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/account" className="text-muted-foreground hover:text-foreground">
                    {t(translationKeys.footer.account.myAccount, 'Contul meu')}
                  </Link>
                </li>
                <li>
                  <Link href="/auth/register" className="text-muted-foreground hover:text-foreground">
                    {t(translationKeys.footer.account.createAccount, 'Creează cont')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Juridic – only pages with real content */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-primary">
              {t(translationKeys.footer.legal.title, 'Juridic')}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                  {t(translationKeys.footer.legal.terms, 'Termeni și condiții generale')}
                </Link>
              </li>
              <li>
                <Link href="/returns" className="text-muted-foreground hover:text-foreground">
                  {t(translationKeys.footer.legal.returns, 'Drept de retragere')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                  {t(translationKeys.footer.legal.privacy, 'Protecția datelor')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Informații generale – only pages with real content */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-primary">
              {t(translationKeys.footer.info.title, 'Informații generale')}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/products?sale=true" className="text-muted-foreground hover:text-foreground">
                  {t(translationKeys.footer.info.sale, 'Sale')}
                </Link>
              </li>
              <li>
                <Link href="/returns#anulare" className="text-muted-foreground hover:text-foreground">
                  {t(translationKeys.footer.info.cancellation, 'Anulare')}
                </Link>
              </li>
              <li>
                <Link href="/returns" className="text-muted-foreground hover:text-foreground">
                  {t(translationKeys.footer.info.returnsRefunds, 'Retur și rambursare')}
                </Link>
              </li>
              <li>
                <Link href="/terms#plata" className="text-muted-foreground hover:text-foreground">
                  {t(translationKeys.footer.info.paymentMethods, 'Metode de plată')}
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-muted-foreground hover:text-foreground">
                  {t(translationKeys.footer.info.orderInfo, 'Info comandă și livrare')}
                </Link>
              </li>
              <li>
                <Link href="/brands" className="text-muted-foreground hover:text-foreground">
                  {t(translationKeys.footer.info.allBrands, 'Toate mărcile')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>{footerCopyright}</p>
        </div>
      </div>
    </footer>
  );
}
