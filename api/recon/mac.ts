/**
 * RECON · MAC vendor lookup  (OSIRIS port, re-sourced to api.macvendors.com)
 *
 * Self-contained Vercel Edge Function. Resolves a MAC address / OUI prefix to
 * its hardware vendor via api.macvendors.com (keyless, plain-text response).
 * Part of the OSIRIS → WatchNet merge. Hand-written (exceptions: `deferred`).
 */

export const config = { runtime: 'edge' };

const MAC_RE = /^[0-9A-Fa-f]{2}([:-]?[0-9A-Fa-f]{2}){2,5}$/;

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
      'Cache-Control': status === 200 ? 'public, s-maxage=86400, stale-while-revalidate=172800' : 'no-store',
      ...cors(origin),
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405, origin);

  const raw = new URL(req.url).searchParams.get('mac')?.trim();
  if (!raw) return json({ error: 'Missing mac parameter' }, 400, origin);
  const mac = raw.toUpperCase().replace(/[^0-9A-F:-]/g, '');
  if (!MAC_RE.test(mac)) return json({ error: 'Invalid MAC / OUI format' }, 400, origin);

  try {
    const res = await fetch(`https://api.macvendors.com/${encodeURIComponent(mac)}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'text/plain' },
    });
    if (res.status === 404) return json({ mac, vendor: null, found: false }, 200, origin);
    if (!res.ok) return json({ error: `macvendors HTTP ${res.status}` }, 502, origin);
    const vendor = (await res.text()).trim();
    return json({ mac, vendor, found: !!vendor, timestamp: new Date().toISOString() }, 200, origin);
  } catch {
    return json({ error: 'MAC lookup failed' }, 502, origin);
  }
}
