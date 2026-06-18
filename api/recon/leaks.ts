/**
 * RECON · Email breach check  (ported from OSIRIS `osint/leaks`)
 *
 * Self-contained Vercel Edge Function. Checks an email against XposedOrNot's
 * keyless breach-analytics API. Part of the OSIRIS → WatchNet merge.
 * Hand-written (exceptions: `deferred`).
 */

export const config = { runtime: 'edge' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function cors(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}
function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, s-maxage=600, stale-while-revalidate=1800' : 'no-store',
      ...cors(origin),
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405, origin);

  const email = new URL(req.url).searchParams.get('email')?.trim();
  if (!email) return json({ error: 'Missing email parameter' }, 400, origin);
  if (!EMAIL_RE.test(email)) return json({ error: 'Invalid email format' }, 400, origin);

  try {
    const res = await fetch(`https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json', 'User-Agent': 'WatchNet-RECON/1.0' },
    });
    if (res.status === 404) {
      return json({ email, breached: false, breaches: [], breach_count: 0, data_exposed: [] }, 200, origin);
    }
    if (!res.ok) return json({ error: `XposedOrNot HTTP ${res.status}` }, 502, origin);

    const data = (await res.json()) as Record<string, any>;
    const breaches: string[] = data.BreachesSummary?.site
      ? String(data.BreachesSummary.site).split(';').filter(Boolean)
      : [];

    const dataExposed = new Set<string>();
    for (const b of data.ExposedBreaches?.breaches_details ?? []) {
      for (const dc of String(b.xposed_data ?? '').split(';')) {
        const v = dc.trim();
        if (v) dataExposed.add(v);
      }
    }

    return json(
      {
        email,
        breached: breaches.length > 0,
        breach_count: breaches.length,
        breaches,
        data_exposed: Array.from(dataExposed).sort(),
        timestamp: new Date().toISOString(),
      },
      200,
      origin,
    );
  } catch {
    return json({ error: 'Leak lookup failed' }, 502, origin);
  }
}
