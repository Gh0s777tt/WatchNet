/**
 * RECON · Threat intelligence  (ported from OSIRIS `osint/threats`)
 *
 * Self-contained Vercel Edge Function. Checks an IP or domain against AlienVault
 * OTX (public pulse reputation, keyless) and — for IPs — the Tor exit-node list.
 * Part of the OSIRIS → WatchNet merge. Hand-written (exceptions: `deferred`).
 */

export const config = { runtime: 'edge' };

const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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

  const query = new URL(req.url).searchParams.get('query')?.trim();
  if (!query) return json({ error: 'Missing query parameter (IP or domain)' }, 400, origin);
  const isIp = IP_RE.test(query);
  if (!isIp && !DOMAIN_RE.test(query)) return json({ error: 'Query must be an IP or domain' }, 400, origin);

  const result: Record<string, unknown> = { query, type: isIp ? 'ip' : 'domain', timestamp: new Date().toISOString() };
  let pulseCount = 0;

  try {
    const kind = isIp ? 'IPv4' : 'domain';
    const otxRes = await fetch(`https://otx.alienvault.com/api/v1/indicators/${kind}/${encodeURIComponent(query)}/general`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
    if (otxRes.ok) {
      const d = (await otxRes.json()) as Record<string, any>;
      pulseCount = d.pulse_info?.count ?? 0;
      result.otx = {
        pulse_count: pulseCount,
        reputation: d.reputation ?? null,
        country: d.country_name ?? null,
        asn: d.asn ?? null,
      };
    }
  } catch {
    /* OTX unavailable */
  }

  if (isIp) {
    try {
      const torRes = await fetch('https://check.torproject.org/torbulkexitlist', { signal: AbortSignal.timeout(6000) });
      if (torRes.ok) {
        const text = await torRes.text();
        result.tor_exit_node = text.split('\n').some((l) => l.trim() === query);
      } else {
        result.tor_exit_node = null;
      }
    } catch {
      result.tor_exit_node = null;
    }
  }

  result.threat_level = pulseCount > 5 ? 'HIGH' : pulseCount > 0 ? 'MEDIUM' : 'LOW';
  return json(result, 200, origin);
}
