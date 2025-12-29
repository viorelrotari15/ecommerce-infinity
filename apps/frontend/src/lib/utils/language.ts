import { cookies } from 'next/headers';

/**
 * Get language from request (SSR)
 * Priority: query param > cookie > header > default
 */
export async function getServerLanguage(
  searchParams?: { [key: string]: string | string[] | undefined },
): Promise<string> {
  // 1. Check query param
  if (searchParams?.lang && typeof searchParams.lang === 'string') {
    return searchParams.lang;
  }

  // 2. Check cookie
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get('lang')?.value;
  if (cookieLang) {
    return cookieLang;
  }

  // 3. Default to 'en' (will be overridden by backend default)
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

