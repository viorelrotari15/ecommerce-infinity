import { observeWebVital } from '@/lib/metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedNames = new Set(['CLS', 'LCP', 'INP', 'FCP', 'TTFB']);
const allowedRatings = new Set(['good', 'needs-improvement', 'poor']);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const name = String(body.name);
  const rating = String(body.rating);
  const value = Number(body.value);
  const page = typeof body.page === 'string' ? body.page : 'unknown';

  if (!allowedNames.has(name) || !allowedRatings.has(rating) || Number.isNaN(value)) {
    return Response.json({ error: 'Invalid metric fields' }, { status: 400 });
  }

  observeWebVital({
    name: name as 'CLS' | 'LCP' | 'INP' | 'FCP' | 'TTFB',
    rating: rating as 'good' | 'needs-improvement' | 'poor',
    value,
    page,
  });

  return Response.json({ ok: true });
}
