/**
 * RECON · IP intelligence  (ported from OSIRIS `osint/ip`)
 *
 * Self-contained Vercel Edge Function. Geolocation + reputation via ip-api.com
 * (keyless free tier — HTTP only). Part of the OSIRIS → WatchNet merge.
 * OFAC SDN cross-check (OSIRIS had it) is deferred to the entity/intel domain.
 * Hand-written (exceptions: `deferred`) pending proto migration — see whois.ts.
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
  if (!IPV4_RE.test(ip) && !IPV6_RE.test(ip)) {
    return json({ error: 'Invalid IP format' }, 400, origin);
  }

  const result: Record<string, unknown> = { ip, timestamp: new Date().toISOString() };

  try {
    const fields =
      'status,message,continent,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,mobile,proxy,hosting,query';
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const geo = (await res.json()) as Record<string, any>;
      if (geo.status === 'success') {
        result.geo = {
          country: geo.country,
          country_code: geo.countryCode,
          region: geo.regionName,
          city: geo.city,
          lat: geo.lat,
          lon: geo.lon,
          timezone: geo.timezone,
          isp: geo.isp,
          org: geo.org,
          as_number: geo.as,
          as_name: geo.asname,
          is_mobile: !!geo.mobile,
          is_proxy: !!geo.proxy,
          is_hosting: !!geo.hosting,
        };
      }
    }
  } catch {
    // geolocation unavailable — return what we have
  }

  const geo = result.geo as Record<string, any> | undefined;
  result.reputation = {
    is_proxy: geo?.is_proxy ?? false,
    is_hosting: geo?.is_hosting ?? false,
    is_mobile: geo?.is_mobile ?? false,
    risk_level: geo?.is_proxy ? 'HIGH' : geo?.is_hosting ? 'MEDIUM' : 'LOW',
  };

  return json(result, 200, origin);
}
