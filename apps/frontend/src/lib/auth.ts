/**
 * Authentication utilities for client-side auth state management
 */

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      return null;
    }
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

/**
 * Get auth token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('token');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null && getCurrentUser() !== null;
}

/**
 * Check if user is admin
 */
export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'ADMIN' || user?.role === 'admin';
}

/**
 * Logout user
 */
export function logout(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

/** Custom event name for auth state changes (login/logout). Dispatch after updating localStorage so the header can re-sync without a full reload. */
export const AUTH_STATE_CHANGED = 'auth-state-changed';

/**
 * Notify listeners (e.g. Header) that auth state changed. Call after login/register or when token/user is updated.
 */
export function notifyAuthStateChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_STATE_CHANGED));
  }
}

