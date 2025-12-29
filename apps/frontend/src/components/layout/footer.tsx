'use client';

import Link from 'next/link';
import { useT, translationKeys } from '@/lib/utils/translations';

export function Footer() {
  const t = useT();

  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-10 md:py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-lg font-semibold">E-commerce Infinity</h3>
            <p className="text-sm text-muted-foreground">
              Premium fragrances and luxury perfumes for every occasion.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/products"
                  className="text-muted-foreground hover:text-foreground"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Categories
                </Link>
              </li>
              <li>
                <Link
                  href="/brands"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Brands
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold">Customer Service</h4>
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
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} E-commerce Infinity. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

