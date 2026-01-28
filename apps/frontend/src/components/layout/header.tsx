'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
<<<<<<< HEAD
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
=======
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
>>>>>>> origin/main
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart, LogOut, LayoutDashboard, User, Search, Menu, X } from 'lucide-react';
import { getCurrentUser, isAdmin, isAuthenticated, logout } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '@/lib/store/cart-store';
import { LanguageSelector } from '@/components/layout/language-selector';
import { useT, translationKeys } from '@/lib/utils/translations';
import { getBranding } from '@/lib/branding';
import { cn } from '@/lib/utils';

const branding = getBranding();

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const t = useT();
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartItemCount = useCartStore((state) => state.getTotalItems());
  const { loadFromServer } = useCartStore();
  const isProducts = pathname?.startsWith('/products');
  const isCategories = pathname?.startsWith('/categories');
  const isBrands = pathname?.startsWith('/brands');

  // Sync search query with URL params
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam !== null) {
      setSearchQuery(searchParam);
    } else {
      setSearchQuery('');
    }
  }, [searchParams]);

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setIsUserAdmin(isAdmin());
    setIsLoggedIn(isAuthenticated());
    
    // Load cart from server if user is logged in
    if (isAuthenticated()) {
      loadFromServer().catch(console.error);
    }
  }, [loadFromServer]);

  const handleLogout = () => {
    logout();
    setUser(null);
    setIsUserAdmin(false);
    setIsLoggedIn(false);
    // Invalidate all queries to refetch data
    queryClient.invalidateQueries();
    queryClient.clear();
    router.push('/');
    router.refresh();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isAdminPage = pathname?.startsWith('/admin');
    const basePath = isAdminPage ? '/admin/products' : '/products';
    
    // Build new URL params preserving all existing params except search
    const currentParams = new URLSearchParams();
    searchParams.forEach((value: string, key: string) => {
      if (key !== 'search') {
        currentParams.set(key, value);
      }
    });
    
    // If search query is empty, remove search parameter from URL
    if (!searchQuery.trim()) {
      const newUrl = currentParams.toString() 
        ? `${basePath}?${currentParams.toString()}`
        : basePath;
      router.push(newUrl);
      return;
    }
    
    // If search query has value, add/update search parameter
    currentParams.set('search', searchQuery.trim());
    router.push(`${basePath}?${currentParams.toString()}`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between max-w-full gap-2">
          {/* Mobile menu button - show on mobile and when items don't fit */}
          <Button
            variant="ghost"
            size="icon"
            className="xl:hidden flex-shrink-0"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* App logo and Desktop navigation */}
          <div className="flex items-center gap-6 flex-shrink-0">
            <Link href="/" className="flex items-center">
              <img src={branding.logo.primary} alt={branding.name} className="h-8 w-auto" />
            </Link>
            <nav className="hidden xl:flex gap-6 flex-shrink-0">
              <Link
                href="/products"
                aria-current={isProducts ? 'page' : undefined}
                className={cn(
                  'text-sm font-medium transition-colors hover:underline whitespace-nowrap',
                  isProducts && 'text-primary'
                )}
              >
                {t(translationKeys.header.menu.products, 'Products')}
              </Link>
              <Link
                href="/categories"
                aria-current={isCategories ? 'page' : undefined}
                className={cn(
                  'text-sm font-medium transition-colors hover:underline whitespace-nowrap',
                  isCategories && 'text-primary'
                )}
              >
                {t(translationKeys.header.menu.categories, 'Categories')}
              </Link>
              <Link
                href="/brands"
                aria-current={isBrands ? 'page' : undefined}
                className={cn(
                  'text-sm font-medium transition-colors hover:underline whitespace-nowrap',
                  isBrands && 'text-primary'
                )}
              >
                {t(translationKeys.header.menu.brands, 'Brands')}
              </Link>
            </nav>
          </div>

          {/* Right side actions - progressively hide items on smaller screens */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            {/* Search input - desktop, hide on smaller screens if needed */}
            <form onSubmit={handleSearch} className="hidden lg:flex">
              <div className="relative w-full max-w-xs">
                <Input
                  type="text"
                  placeholder={t(translationKeys.products.searchPlaceholder, 'Search products...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pr-10"
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>
            <div className="hidden xl:block">
              <LanguageSelector />
            </div>
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {mounted && cartItemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </Button>
            </Link>
            {!mounted ? (
              <Link href="/auth/login">
                <Button variant="outline" size="sm" className="hidden lg:inline-flex">
                  {t(translationKeys.header.actions.login, 'Login')}
                </Button>
              </Link>
            ) : isLoggedIn ? (
              <>
                {isUserAdmin && (
                  <Link href="/admin/dashboard">
                    <Button variant="ghost" size="icon" title="Dashboard">
                      <LayoutDashboard className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
                <Link href="/user/profile">
                  <Button variant="ghost" size="icon" title="Profile" className="hidden xl:inline-flex">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="hidden xl:flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {user?.firstName || user?.email}
                  </span>
                  <Button variant="outline" onClick={handleLogout} size="sm">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t(translationKeys.header.actions.logout, 'Logout')}
                  </Button>
                </div>
              </>
            ) : (
              <Link href="/auth/login">
                <Button variant="outline" size="sm" className="hidden lg:inline-flex">
                  {t(translationKeys.header.actions.login, 'Login')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu - show when burger menu is visible (xl:hidden) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          {/* Menu panel */}
          <div className="fixed left-0 top-0 h-full w-80 bg-background border-r shadow-lg overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <Link href="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
                <img src={branding.logo.primary} alt={branding.name} className="h-8 w-auto" />
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              {/* Search in mobile menu */}
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={t(translationKeys.products.searchPlaceholder, 'Search products...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="pr-10"
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </form>

              {/* Navigation links */}
              <nav className="space-y-2">
                <Link
                  href="/products"
                  className="block px-4 py-2 text-sm font-medium hover:bg-accent hover:text-white rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t(translationKeys.header.menu.products, 'Products')}
                </Link>
                <Link
                  href="/categories"
                  className="block px-4 py-2 text-sm font-medium hover:bg-accent hover:text-white rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t(translationKeys.header.menu.categories, 'Categories')}
                </Link>
                <Link
                  href="/brands"
                  className="block px-4 py-2 text-sm font-medium hover:bg-accent hover:text-white rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t(translationKeys.header.menu.brands, 'Brands')}
                </Link>
              </nav>

              {/* Cart and Dashboard - show both for admin, cart for regular users */}
              <div className="pt-4 border-t space-y-2">
                <Link
                  href="/cart"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium hover:bg-accent hover:text-white rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {t(translationKeys.header.menu.cart, 'Cart')}
                  {mounted && cartItemCount > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-primary text-xs font-bold text-white">
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </span>
                  )}
                </Link>
                {mounted && isUserAdmin && (
                  <Link
                    href="/admin/dashboard"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium hover:bg-accent hover:text-white rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    {t(translationKeys.header.menu.dashboard, 'Dashboard')}
                  </Link>
                )}
              </div>

              {/* User actions */}
              {mounted && (
                <div className="pt-4 border-t space-y-2">
                  <div className="px-4">
                    <LanguageSelector />
                  </div>
                  {isLoggedIn ? (
                    <>
                      <Link
                        href="/user/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium hover:bg-accent hover:text-white rounded-md"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="h-5 w-5" />
                        <span>{user?.firstName || user?.email}</span>
                      </Link>
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full"
                        size="sm"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {t(translationKeys.header.actions.logout, 'Logout')}
                      </Button>
                    </>
                  ) : (
                    <Link
                      href="/auth/login"
                      className="block"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button variant="outline" className="w-full" size="sm">
                        {t(translationKeys.header.actions.login, 'Login')}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

