/**
 * RECON · Certificate Transparency  (OSIRIS port, re-sourced to Certspotter)
 *
 * Self-contained Vercel Edge Function. OSIRIS used crt.sh, which rate-limits /
 * blocks cloud egress IPs — this uses Certspotter's keyless issuances API,
 * which is more reliable. Extracts observed subdomains + certificate metadata.
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
    const res = await fetch(
      `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(domain)}&include_subdomains=true&expand=dns_names&expand=issuer`,
      { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json', 'User-Agent': 'WatchNet-RECON/1.0' } },
    );
    if (!res.ok) {
      return json({ domain, certificates: [], subdomains: [], error: `Certspotter HTTP ${res.status}` }, 200, origin);
    }

    const issuances = (await res.json()) as any[];
    const subdomains = new Set<string>();
    const certificates: any[] = [];

    for (const c of issuances) {
      for (const n of (c.dns_names ?? []) as string[]) {
        const clean = String(n).trim().toLowerCase().replace(/^\*\./, '');
        if (clean === domain || clean.endsWith(`.${domain}`)) subdomains.add(clean);
      }
      if (certificates.length < 50) {
        certificates.push({
          id: c.id,
          issuer: c.issuer?.name ?? null,
          not_before: c.not_before,
          not_after: c.not_after,
          dns_names: (c.dns_names ?? []).slice(0, 10),
        });
      }
    }

    return json(
      {
        domain,
        certificates,
        subdomains: Array.from(subdomains).sort(),
        total_certs: issuances.length,
        unique_subdomains: subdomains.size,
        timestamp: new Date().toISOString(),
      },
      200,
      origin,
    );
  } catch {
    return json({ domain, certificates: [], subdomains: [], error: 'Lookup failed' }, 200, origin);
  }
}
