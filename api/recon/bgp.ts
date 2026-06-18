/**
 * RECON · BGP / ASN lookup  (OSIRIS port, re-sourced to RIPEstat)
 *
 * Self-contained Vercel Edge Function. OSIRIS used bgpview.io, which is now
 * unreliable/down — this uses RIPEstat (stat.ripe.net), a reliable keyless
 * source: IP → prefix + ASN(s), or ASN → holder + announced prefixes.
 * Part of the OSIRIS → WatchNet merge. Hand-written (exceptions: `deferred`).
 */

export const config = { runtime: 'edge' };

const RIPE = 'https://stat.ripe.net/data';

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
      'Cache-Control': status === 200 ? 'public, s-maxage=1800, stale-while-revalidate=3600' : 'no-store',
      ...cors(origin),
    },
  });
}

async function getJson(url: string): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } });
    return res.ok ? ((await res.json()) as Record<string, any>) : null;
  } catch {
    return null;
  }
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405, origin);

  const query = new URL(req.url).searchParams.get('query')?.trim();
  if (!query) return json({ error: 'Missing query parameter (IP or AS number)' }, 400, origin);

  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(query);
  const asnNum = /^(AS)?\d+$/i.test(query) ? query.replace(/^AS/i, '') : null;
  if (!isIp && !asnNum) {
    return json({ error: 'Unrecognized query — use an IP address or AS number' }, 400, origin);
  }

  const timestamp = new Date().toISOString();

  if (asnNum) {
    const [ov, pfx] = await Promise.all([
      getJson(`${RIPE}/as-overview/data.json?resource=AS${asnNum}`),
      getJson(`${RIPE}/announced-prefixes/data.json?resource=AS${asnNum}`),
    ]);
    const list = ((pfx?.data?.prefixes ?? []) as any[]).map((p) => p.prefix).filter(Boolean);
    return json(
      {
        query,
        type: 'asn',
        timestamp,
        asn: { number: asnNum, holder: ov?.data?.holder ?? null, announced: ov?.data?.announced ?? null },
        prefixes: { total: list.length, sample: list.slice(0, 15) },
      },
      200,
      origin,
    );
  }

  // IP path
  const ni = await getJson(`${RIPE}/network-info/data.json?resource=${encodeURIComponent(query)}`);
  const asns = (ni?.data?.asns ?? []) as (string | number)[];
  let holder: string | null = null;
  if (asns.length > 0) {
    const ov = await getJson(`${RIPE}/as-overview/data.json?resource=AS${asns[0]}`);
    holder = ov?.data?.holder ?? null;
  }
  return json(
    {
      query,
      type: 'ip',
      timestamp,
      ip: { address: query, prefix: ni?.data?.prefix ?? null, asns, holder },
    },
    200,
    origin,
  );
}
