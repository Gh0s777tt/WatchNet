/**
 * RECON · BGP / ASN lookup  (ported from OSIRIS `osint/bgp`)
 *
 * Self-contained Vercel Edge Function. Resolves an IP to its ASN, or an ASN to
 * its details / prefixes / peers, via bgpview.io (keyless).
 * Part of the OSIRIS → WatchNet merge. Hand-written (exceptions: `deferred`).
 */

export const config = { runtime: 'edge' };

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

  const result: Record<string, unknown> = { query, timestamp: new Date().toISOString() };

  try {
    if (isIp) {
      const res = await fetch(`https://api.bgpview.io/ip/${encodeURIComponent(query)}`, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const d = (await res.json()) as Record<string, any>;
        if (d.status === 'ok') {
          result.type = 'ip';
          result.ip = d.data;
        }
      }
    } else {
      const [asnRes, prefixRes, peersRes] = await Promise.allSettled([
        fetch(`https://api.bgpview.io/asn/${asnNum}`, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } }),
        fetch(`https://api.bgpview.io/asn/${asnNum}/prefixes`, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } }),
        fetch(`https://api.bgpview.io/asn/${asnNum}/peers`, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } }),
      ]);
      result.type = 'asn';
      if (asnRes.status === 'fulfilled' && asnRes.value.ok) {
        const d = (await asnRes.value.json()) as Record<string, any>;
        if (d.status === 'ok') result.asn = d.data;
      }
      if (prefixRes.status === 'fulfilled' && prefixRes.value.ok) {
        const d = (await prefixRes.value.json()) as Record<string, any>;
        if (d.status === 'ok') {
          result.prefixes = {
            ipv4: (d.data?.ipv4_prefixes ?? []).slice(0, 20),
            ipv6: (d.data?.ipv6_prefixes ?? []).slice(0, 10),
            total_v4: d.data?.ipv4_prefixes?.length ?? 0,
            total_v6: d.data?.ipv6_prefixes?.length ?? 0,
          };
        }
      }
      if (peersRes.status === 'fulfilled' && peersRes.value.ok) {
        const d = (await peersRes.value.json()) as Record<string, any>;
        if (d.status === 'ok') {
          result.peers = { upstream: (d.data?.ipv4_peers ?? []).slice(0, 10), total: d.data?.ipv4_peers?.length ?? 0 };
        }
      }
    }
    return json(result, 200, origin);
  } catch {
    return json({ error: 'BGP lookup failed' }, 500, origin);
  }
}
