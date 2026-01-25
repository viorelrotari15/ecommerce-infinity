/**
 * Translation Cache Service
 * Manages browser-side caching of translations using localStorage
 */

const CACHE_PREFIX = 'translations_';
const CACHE_VERSION = '1.0';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedTranslation {
  data: Record<string, any>;
  language: string;
  timestamp: number;
  version: string;
}

/**
 * Get cache key for a language
 */
function getCacheKey(language: string): string {
  return `${CACHE_PREFIX}${language}`;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cached: CachedTranslation | null): boolean {
  if (!cached) return false;
  
  // Check version
  if (cached.version !== CACHE_VERSION) return false;
  
  // Check expiry
  const now = Date.now();
  const age = now - cached.timestamp;
  return age < CACHE_EXPIRY_MS;
}

/**
 * Get translations from cache
 */
export function getCachedTranslations(language: string): Record<string, any> | null {
  try {
    if (!canUseStorage()) return null;
    const cacheKey = getCacheKey(language);
    const cachedStr = localStorage.getItem(cacheKey);
    
    if (!cachedStr) return null;
    
    const cached: CachedTranslation = JSON.parse(cachedStr);
    
    if (!isCacheValid(cached)) {
      // Remove expired cache
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return cached.data;
  } catch (error) {
    console.error('Error reading translation cache:', error);
    return null;
  }
}

/**
 * Save translations to cache
 */
export function setCachedTranslations(language: string, data: Record<string, any>): void {
  try {
    if (!canUseStorage()) return;
    const cacheKey = getCacheKey(language);
    const cached: CachedTranslation = {
      data,
      language,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cached));
  } catch (error) {
    console.error('Error saving translation cache:', error);
    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Clear old caches if storage is full
      clearOldCaches();
      // Try again
      try {
        const cacheKey = getCacheKey(language);
        const cached: CachedTranslation = {
          data,
          language,
          timestamp: Date.now(),
          version: CACHE_VERSION,
        };
        localStorage.setItem(cacheKey, JSON.stringify(cached));
      } catch (retryError) {
        console.error('Failed to save translation cache after cleanup:', retryError);
      }
    }
  }
}

/**
 * Clear cache for a specific language
 */
export function clearCachedTranslations(language: string): void {
  try {
    if (!canUseStorage()) return;
    const cacheKey = getCacheKey(language);
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.error('Error clearing translation cache:', error);
  }
}

/**
 * Clear all translation caches
 */
export function clearAllTranslationCaches(): void {
  try {
    if (!canUseStorage()) return;
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing all translation caches:', error);
  }
}

/**
 * Clear old caches (keep only recent ones)
 */
function clearOldCaches(): void {
  try {
    if (!canUseStorage()) return;
    const keys = Object.keys(localStorage);
    const caches: Array<{ key: string; timestamp: number }> = [];
    
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cachedStr = localStorage.getItem(key);
          if (cachedStr) {
            const cached: CachedTranslation = JSON.parse(cachedStr);
            caches.push({ key, timestamp: cached.timestamp });
          }
        } catch {
          // Invalid cache, remove it
          localStorage.removeItem(key);
        }
      }
    });
    
    // Sort by timestamp (oldest first)
    caches.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest 50% of caches
    const toRemove = Math.floor(caches.length / 2);
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(caches[i].key);
    }
  } catch (error) {
    console.error('Error clearing old caches:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  languages: string[];
  totalSize: number;
  oldestCache: number | null;
  newestCache: number | null;
} {
  try {
    if (!canUseStorage()) {
      return { languages: [], totalSize: 0, oldestCache: null, newestCache: null };
    }
    const keys = Object.keys(localStorage);
    const languages: string[] = [];
    let oldestCache: number | null = null;
    let newestCache: number | null = null;
    let totalSize = 0;
    
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cachedStr = localStorage.getItem(key);
          if (cachedStr) {
            totalSize += cachedStr.length;
            const cached: CachedTranslation = JSON.parse(cachedStr);
            languages.push(cached.language);
            
            if (oldestCache === null || cached.timestamp < oldestCache) {
              oldestCache = cached.timestamp;
            }
            if (newestCache === null || cached.timestamp > newestCache) {
              newestCache = cached.timestamp;
            }
          }
        } catch {
          // Skip invalid caches
        }
      }
    });
    
    return {
      languages: [...new Set(languages)],
      totalSize,
      oldestCache,
      newestCache,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      languages: [],
      totalSize: 0,
      oldestCache: null,
      newestCache: null,
    };
  }
}
