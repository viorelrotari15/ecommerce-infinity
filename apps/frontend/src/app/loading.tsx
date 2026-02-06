import { PageLoading } from '@/components/ui/page-loading';

/**
 * Root loading UI. Next.js shows this automatically when the user navigates
 * to another page (e.g. product, category, cart) while the new route is loading.
 */
export default function Loading() {
  return <PageLoading />;
}
