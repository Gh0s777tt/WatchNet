/**
 * RECON · WHOIS / Domain Intelligence  (ported from OSIRIS `osint/whois`)
 *
 * Self-contained Vercel Edge Function. Resolves domain registration data via
 * RDAP — the standardized, keyless successor to WHOIS — and inspects the live
 * site's HTTP security headers, scoring them like the OSIRIS WHOIS tab.
 *
 * Part of the OSIRIS → WatchNet merge (RECON toolkit, slice 1 / WHOIS).
 *
 * WHY HAND-WRITTEN (not proto-generated):
 *   World Monitor is proto-first (proto → `buf generate` → handler). The proto
 *   toolchain (Go + sebuf protoc plugins + a Unix `make`) is not available on
 *   the current Windows dev box, so this endpoint uses the documented escape
 *   hatch — registered in `api/api-route-exceptions.json` under category
 *   "deferred". Convert to a `worldmonitor.recon.v1` proto service once a
 *   Go-capable environment (Linux / macOS / WSL) exists.
 *   Tracking: RECON-PROTO-MIGRATION.
 *
 * EDGE CONSTRAINTS honoured (tests/edge-functions.test.mjs):
 *   - no `node:` built-ins, no `../src` / `../server` imports (self-contained).
 *   - The OSIRIS Node version pre-resolved DNS for SSRF defence; that is
 *     impossible on Edge. Instead we rely on the Edge sandbox having no
 *     private-network access, plus a string block of obviously-internal hosts
 *     as defence in depth.
 *
 * DEFERRED to later slices:
 *   - OFAC SDN cross-check of RDAP registrant / org names. That needs the
 *     OpenSanctions dataset, which arrives with the `entity` (intel) domain.
 */

export const config = { runtime: 'edge' };

const RDAP_TIMEOUT_MS = 8000;
const HEAD_TIMEOUT_MS = 5000;

// Security headers scored on the live site (mirrors the OSIRIS WHOIS tab).
const SECURITY_HEADERS = [
  'server',
  'x-powered-by',
  'x-frame-options',
  'strict-transport-security',
  'content-security-policy',
  'x-content-type-options',
  'x-xss-protection',
  'referrer-policy',
  'permissions-policy',
] as const;

const DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Defence in depth: refuse obviously-internal hostnames before the live HEAD. */
function isInternalHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h.startsWith('169.254.')) return true; // link-local incl. cloud metadata
  if (h === '0.0.0.0' || h === '::1' || h.startsWith('[')) return true; // IPv6 literals
  return false;
}

function cors(origin: string | null): Record<string, string> {
  // Permissive for the slice; tighten to the shared `api/_cors` allowlist on merge.
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
      // RDAP data is slow-moving — cache at the CDN like WM's "slow" tier.
      'Cache-Control':
        status === 200
          ? 'public, s-maxage=1800, stale-while-revalidate=3600'
          : 'no-store',
      ...cors(origin),
    },
  });
}

interface RdapEntity {
  handle?: string;
  roles?: string[];
  name?: string;
  org?: string;
}

interface WhoisResult {
  domain: string;
  timestamp: string;
  rdap?: {
    handle?: string;
    name?: string;
    status?: string[];
    events: { action?: string; date?: string }[];
    nameservers: string[];
    entities: RdapEntity[];
  };
  registration?: string;
  expiration?: string;
  last_changed?: string;
  http?: {
    status: number;
    headers: Record<string, string>;
    redirected: boolean;
    final_url: string;
  };
  security_score?: { score: number; max: number; grade: string };
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(origin) });
  }
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, origin);
  }

  const domain = new URL(req.url).searchParams.get('domain')?.trim().toLowerCase();
  if (!domain) return json({ error: 'Missing domain parameter' }, 400, origin);
  if (!DOMAIN_RE.test(domain)) {
    return json({ error: 'Invalid domain format' }, 400, origin);
  }

  const result: WhoisResult = { domain, timestamp: new Date().toISOString() };

  // --- RDAP (keyless WHOIS successor) ---
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(RDAP_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      // RDAP responses are loosely typed JSON; narrow defensively.
      const data = (await res.json()) as Record<string, any>;
      result.rdap = {
        handle: data.handle,
        name: data.ldhName,
        status: data.status,
        events: (data.events ?? []).map((e: any) => ({
          action: e.eventAction,
          date: e.eventDate,
        })),
        nameservers: (data.nameservers ?? [])
          .map((ns: any) => ns.ldhName)
          .filter(Boolean),
        entities: (data.entities ?? [])
          .map(
            (e: any): RdapEntity => ({
              handle: e.handle,
              roles: e.roles,
              name: e.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3],
              org: e.vcardArray?.[1]?.find((v: any) => v[0] === 'org')?.[3],
            }),
          )
          .filter((e: RdapEntity) => e.name || e.org),
      };
      const events = result.rdap.events;
      result.registration = events.find((e) => e.action === 'registration')?.date;
      result.expiration = events.find((e) => e.action === 'expiration')?.date;
      result.last_changed = events.find((e) => e.action === 'last changed')?.date;
    }
  } catch {
    // RDAP unavailable / timed out — return whatever else we gathered.
  }

  // --- Live HTTP security-header inspection ---
  if (!isInternalHost(domain)) {
    try {
      const res = await fetch(`https://${domain}`, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(HEAD_TIMEOUT_MS),
      });
      const headers: Record<string, string> = {};
      for (const name of SECURITY_HEADERS) {
        const v = res.headers.get(name);
        if (v) headers[name] = v;
      }
      result.http = {
        status: res.status,
        headers,
        redirected: res.redirected,
        final_url: res.url,
      };
      let score = 0;
      if (headers['strict-transport-security']) score += 2;
      if (headers['content-security-policy']) score += 2;
      if (headers['x-frame-options']) score += 1;
      if (headers['x-content-type-options']) score += 1;
      if (headers['referrer-policy']) score += 1;
      result.security_score = {
        score,
        max: 7,
        grade: score >= 5 ? 'A' : score >= 3 ? 'B' : score >= 1 ? 'C' : 'F',
      };
    } catch {
      // Site unreachable — RDAP-only result is still useful.
    }
  }

  return json(result, 200, origin);
}
