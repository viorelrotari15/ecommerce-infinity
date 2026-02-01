import { getMetricsRegistry } from '@/lib/metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const registry = getMetricsRegistry();
  const metrics = await registry.metrics();

  return new Response(metrics, {
    headers: {
      'Content-Type': registry.contentType,
    },
  });
}
