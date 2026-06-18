/**
 * RECON · Certificate Transparency  (ported from OSIRIS `osint/certs`)
 *
 * Self-contained Vercel Edge Function. Queries crt.sh CT logs (keyless) for a
 * domain, deduplicates certificates, and extracts observed subdomains.
 * Part of the OSIRIS → WatchNet merge. Hand-written (exceptions: `deferred`).
 */

export const config = { runtime: 'edge' };

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
      'Cache-Control': status === 200 ? 'public, s-maxage=1800, stale-while-revalidate=3600' : 'no-store',
      ...cors(origin),
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405, origin);

  const domain = new URL(req.url).searchParams.get('domain')?.trim().toLowerCase();
  if (!domain) return json({ error: 'Missing domain parameter' }, 400, origin);
  if (!DOMAIN_RE.test(domain)) return json({ error: 'Invalid domain format' }, 400, origin);

  try {
    const res = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'WatchNet-RECON/1.0', Accept: 'application/json' },
    });
    if (!res.ok) return json({ domain, certificates: [], subdomains: [], error: 'crt.sh unavailable' }, 200, origin);

    const certs = (await res.json()) as any[];
    const seen = new Set<string>();
    const subdomains = new Set<string>();
    const unique: any[] = [];

    for (const cert of certs.slice(0, 200)) {
      const key = `${cert.common_name}-${cert.serial_number}`;
      if (seen.has(key)) continue;
      seen.add(key);
      for (const n of String(cert.name_value ?? '').split('\n')) {
        const clean = n.trim().replace(/^\*\./, '');
        if (clean.endsWith(domain)) subdomains.add(clean);
      }
      unique.push({
        id: cert.id,
        issuer: cert.issuer_name,
        common_name: cert.common_name,
        not_before: cert.not_before,
        not_after: cert.not_after,
        serial: cert.serial_number,
      });
    }

    return json(
      {
        domain,
        certificates: unique.slice(0, 50),
        subdomains: Array.from(subdomains).sort(),
        total_certs: certs.length,
        unique_subdomains: subdomains.size,
        timestamp: new Date().toISOString(),
      },
      200,
      origin,
    );
  } catch {
    return json({ domain, certificates: [], subdomains: [], error: 'Lookup failed' }, 500, origin);
  }
}
