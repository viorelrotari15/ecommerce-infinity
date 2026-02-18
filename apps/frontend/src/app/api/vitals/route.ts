import { observeWebVital } from '@/lib/metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedNames = new Set(['CLS', 'LCP', 'INP', 'FCP', 'TTFB', 'FID']);
const allowedRatings = new Set(['good', 'needs-improvement', 'poor']);
const defaultRating = 'good';

export async function POST(request: Request) {
  // sendBeacon may send Blob with or without Content-Type; read body once then parse
  const raw = await request.text().catch(() => '');
  let body: unknown = null;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const name = String((body as Record<string, unknown>).name ?? '').trim();
  const rawRating = (body as Record<string, unknown>).rating;
  const rating = allowedRatings.has(String(rawRating ?? '')) ? String(rawRating) : defaultRating;
  const value = Number((body as Record<string, unknown>).value);
  const page = typeof (body as Record<string, unknown>).page === 'string' ? (body as Record<string, unknown>).page : 'unknown';

  if (!allowedNames.has(name) || Number.isNaN(value)) {
    return Response.json({ error: 'Invalid metric fields' }, { status: 400 });
  }

  const vitalName = name === 'FID' ? 'INP' : name;

  observeWebVital({
    name: vitalName as 'CLS' | 'LCP' | 'INP' | 'FCP' | 'TTFB',
    rating: rating as 'good' | 'needs-improvement' | 'poor',
    value,
    page,
  });

  return Response.json({ ok: true });
}
