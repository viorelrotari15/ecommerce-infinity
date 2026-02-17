import { observeWebVital } from '@/lib/metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedNames = new Set(['CLS', 'LCP', 'INP', 'FCP', 'TTFB']);
const allowedRatings = new Set(['good', 'needs-improvement', 'poor']);

export async function POST(request: Request) {
  // sendBeacon may send Blob without Content-Type; try json first, then text
  let body: unknown = null;
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await request.json().catch(() => null);
  } else {
    const text = await request.text().catch(() => '');
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const name = String((body as Record<string, unknown>).name ?? '');
  const rating = String((body as Record<string, unknown>).rating ?? '');
  const value = Number((body as Record<string, unknown>).value);
  const page = typeof (body as Record<string, unknown>).page === 'string' ? (body as Record<string, unknown>).page : 'unknown';

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
