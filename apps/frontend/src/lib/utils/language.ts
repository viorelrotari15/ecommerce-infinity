import { cookies } from 'next/headers';

/**
 * Get language from request (SSR)
 * Priority: query param (?lang=) > cookie (lang) > default
 */
export async function getServerLanguage(
  searchParams?: { [key: string]: string | string[] | undefined },
): Promise<string> {
  // 1. Check query param (Next.js can give string or string[] for multiple ?lang=)
  const langParam = searchParams?.lang;
  if (langParam) {
    const lang = Array.isArray(langParam) ? langParam[0] : langParam;
    if (lang && typeof lang === 'string') return lang;
  }

  // 2. Check cookie (defensive in case cookies() is unavailable)
  try {
    const cookieStore = cookies();
    const cookieLang = typeof cookieStore?.get === 'function' ? cookieStore.get('lang')?.value : undefined;
    if (cookieLang) {
      return cookieLang;
    }
  } catch {
    // Ignore and fall through to default
  }

  // 3. Default to 'en'
  return 'en';
}

/**
 * Get language for API calls (adds lang query param or header)
 */
export function getLanguageHeader(language: string): Record<string, string> {
  return {
    'Accept-Language': language,
  };
}

