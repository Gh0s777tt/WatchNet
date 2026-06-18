/**
 * RECON · DNS lookup  (ported from OSIRIS `osint/dns`)
 *
 * Self-contained Vercel Edge Function. Resolves A/AAAA/MX/NS/TXT/CNAME/SOA via
 * Google DNS-over-HTTPS (keyless). Part of the OSIRIS → WatchNet merge.
 * Hand-written (exceptions: `deferred`) pending proto migration — see whois.ts.
 */

export const config = { runtime: 'edge' };

const DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const TYPES = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'] as const;

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
      'Cache-Control': status === 200 ? 'public, s-maxage=300, stale-while-revalidate=600' : 'no-store',
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
    const records: Record<string, { name?: string; type?: number; ttl?: number; data?: string }[]> = {};
    const lookups = await Promise.allSettled(
      TYPES.map(async (type) => {
        const res = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
          { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' } },
        );
        const data = res.ok ? ((await res.json()) as Record<string, any>) : {};
        return { type, answers: (data.Answer ?? []) as any[] };
      }),
    );
    for (const r of lookups) {
      if (r.status === 'fulfilled') {
        records[r.value.type] = r.value.answers.map((a: any) => ({
          name: a.name,
          type: a.type,
          ttl: a.TTL,
          data: a.data,
        }));
      }
    }
    const flat = Object.values(records).flat();
    return json(
      {
        domain,
        timestamp: new Date().toISOString(),
        records,
        summary: {
          ip_addresses: (records.A ?? []).map((r) => r.data).filter(Boolean),
          mail_servers: (records.MX ?? []).map((r) => r.data).filter(Boolean),
          nameservers: (records.NS ?? []).map((r) => r.data).filter(Boolean),
          total_records: flat.length,
        },
      },
      200,
      origin,
    );
  } catch {
    return json({ error: 'DNS lookup failed' }, 500, origin);
  }
}
