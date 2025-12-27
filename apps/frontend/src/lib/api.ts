/**
 * Legacy API functions - re-exported from client.ts for backward compatibility
 * New code should import directly from '@/lib/api/client' or '@/lib/api/server'
 */

// Re-export client-side functions for backward compatibility
export { fetchAPI, fetchAPIAuth, uploadImage, deleteImage, setPrimaryImage } from './api/client';

