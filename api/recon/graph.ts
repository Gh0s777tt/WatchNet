/**
 * RECON · Infrastructure graph  (BUILT NEW for WatchNet)
 *
 * Self-contained Vercel Edge Function. Aggregates several keyless OSINT sources
 * for a domain into a node/link graph: domain → A-record IPs → ASN (RIPEstat),
 * domain → nameservers (DNS), domain → subdomains (Certspotter). The client
 * (ReconPanel) lays it out with a headless d3-force simulation and renders SVG.
 *
 * This is the OSIRIS "entity graph" capability, re-grounded on real infra recon.
 * Hand-written (exceptions: `deferred`).
 */

export const config = { runtime: 'edge' };

const DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface Node {
  id: string;
  label: string;
  type: 'domain' | 'ip' | 'ns' | 'asn' | 'subdomain';
}
interface Link {
  source: string;
  target: string;
}

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

async function doh(name: string, type: string): Promise<any[]> {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const d = (await res.json()) as Record<string, any>;
    return Array.isArray(d.Answer) ? d.Answer : [];
  } catch {
    return [];
  }
}

async function ripeAsn(ip: string): Promise<{ asn: string; holder: string | null } | null> {
  try {
    const ni = await fetch(`https://stat.ripe.net/data/network-info/data.json?resource=${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!ni.ok) return null;
    const nd = (await ni.json()) as Record<string, any>;
    const asn = nd.data?.asns?.[0];
    if (asn == null) return null;
    let holder: string | null = null;
    try {
      const ov = await fetch(`https://stat.ripe.net/data/as-overview/data.json?resource=AS${asn}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (ov.ok) holder = ((await ov.json()) as Record<string, any>).data?.holder ?? null;
    } catch {
      /* holder optional */
    }
    return { asn: String(asn), holder };
  } catch {
    return null;
  }
}

async function certSubdomains(domain: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(domain)}&include_subdomains=true&expand=dns_names`,
      { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json', 'User-Agent': 'WatchNet-RECON/1.0' } },
    );
    if (!res.ok) return [];
    const subs = new Set<string>();
    for (const c of (await res.json()) as any[]) {
      for (const n of (c.dns_names ?? []) as string[]) {
        const clean = String(n).trim().toLowerCase().replace(/^\*\./, '');
        if (clean !== domain && clean.endsWith(`.${domain}`)) subs.add(clean);
      }
    }
    return Array.from(subs).sort().slice(0, 8);
  } catch {
    return [];
  }
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405, origin);

  const domain = new URL(req.url).searchParams.get('domain')?.trim().toLowerCase();
  if (!domain) return json({ error: 'Missing domain parameter' }, 400, origin);
  if (!DOMAIN_RE.test(domain)) return json({ error: 'Invalid domain format' }, 400, origin);

  const [aAns, nsAns, subs] = await Promise.all([doh(domain, 'A'), doh(domain, 'NS'), certSubdomains(domain)]);
  const ips = aAns.filter((a) => a.type === 1).map((a) => String(a.data)).slice(0, 4);
  const nameservers = nsAns
    .filter((a) => a.type === 2)
    .map((a) => String(a.data).replace(/\.$/, ''))
    .slice(0, 4);

  const asn = ips[0] ? await ripeAsn(ips[0]) : null;

  const nodes: Node[] = [{ id: domain, label: domain, type: 'domain' }];
  const links: Link[] = [];
  const add = (n: Node, from: string) => {
    if (!nodes.some((x) => x.id === n.id)) nodes.push(n);
    links.push({ source: from, target: n.id });
  };

  for (const ip of ips) add({ id: ip, label: ip, type: 'ip' }, domain);
  for (const ns of nameservers) add({ id: ns, label: ns, type: 'ns' }, domain);
  if (asn) {
    const id = `AS${asn.asn}`;
    nodes.push({ id, label: asn.holder ? `${id} ${asn.holder}` : id, type: 'asn' });
    for (const ip of ips) links.push({ source: ip, target: id });
  }
  for (const sub of subs) add({ id: sub, label: sub, type: 'subdomain' }, domain);

  return json(
    {
      domain,
      nodes,
      links,
      counts: { ips: ips.length, nameservers: nameservers.length, subdomains: subs.length, asn: asn ? 1 : 0 },
      timestamp: new Date().toISOString(),
    },
    200,
    origin,
  );
}
