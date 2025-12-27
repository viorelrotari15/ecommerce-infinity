'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingCart, LogOut, LayoutDashboard, User } from 'lucide-react';
import { getCurrentUser, isAdmin, isAuthenticated, logout } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '@/lib/store/cart-store';

export function Header() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cartItemCount = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setIsUserAdmin(isAdmin());
    setIsLoggedIn(isAuthenticated());
  }, []);

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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-bold">
            E-commerce Infinity
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link
              href="/products"
              className="text-sm font-medium transition-colors  hover:underline"
            >
              Products
            </Link>
            <Link
              href="/categories"
              className="text-sm font-medium transition-colors  hover:underline"
            >
              Categories
            </Link>
            <Link
              href="/brands"
              className="text-sm font-medium transition-colors  hover:underline"
            >
              Brands
            </Link>
            {isUserAdmin && (
              <>
                <Link
                  href="/admin/dashboard"
                  className="text-sm font-medium transition-colors  hover:underline"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/products/new"
                  className="text-sm font-medium transition-colors  hover:underline"
                >
                  New Product
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {mounted && cartItemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </Button>
          </Link>
          {isLoggedIn ? (
            <>
              {isUserAdmin && (
                <Link href="/admin/dashboard">
                  <Button variant="ghost" size="icon" title="Dashboard">
                    <LayoutDashboard className="h-5 w-5" />
                  </Button>
                </Link>
              )}
              <Link href="/user/profile">
                <Button variant="ghost" size="icon" title="Profile">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {user?.firstName || user?.email}
                </span>
                <Button variant="outline" onClick={handleLogout} size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </>
          ) : (
          <Link href="/auth/login">
            <Button variant="outline">Login</Button>
          </Link>
          )}
        </div>
      </div>
    </header>
  );
}

