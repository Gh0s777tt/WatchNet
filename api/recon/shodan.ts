/**
 * RECON · Shodan InternetDB  (ported from OSIRIS `osint/shodan`)
 *
 * Self-contained Vercel Edge Function. Passive host intelligence for an IP via
 * Shodan's keyless InternetDB (open ports, CPEs, hostnames, tags, known CVEs).
 * This is PASSIVE (no active scanning) — the closest safe analogue to a port
 * scanner. Part of the OSIRIS → WatchNet merge. Hand-written (`deferred`).
 */

export const config = { runtime: 'edge' };

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:]+$/;

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

  const ip = new URL(req.url).searchParams.get('ip')?.trim();
  if (!ip) return json({ error: 'Missing ip parameter' }, 400, origin);
  if (!IPV4_RE.test(ip) && !IPV6_RE.test(ip)) return json({ error: 'Invalid IP format' }, 400, origin);

  try {
    const res = await fetch(`https://internetdb.shodan.io/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
    if (res.status === 404) {
      return json({ ip, status: 'No Shodan InternetDB records found', ports: [], cpes: [], hostnames: [], tags: [], vulns: [] }, 200, origin);
    }
    if (!res.ok) return json({ error: `Shodan HTTP ${res.status}` }, 502, origin);
    const data = (await res.json()) as Record<string, unknown>;
    return json({ ...data, timestamp: new Date().toISOString() }, 200, origin);
  } catch {
    return json({ error: 'Shodan lookup failed' }, 502, origin);
  }
}
