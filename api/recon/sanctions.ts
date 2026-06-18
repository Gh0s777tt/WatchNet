/**
 * RECON · OFAC SDN sanctions search  (BUILT NEW for WatchNet)
 *
 * Self-contained Vercel Edge Function. Full-text search over the OFAC SDN list
 * (OpenSanctions us_ofac_sdn, ~20k entities) seeded into Redis by
 * scripts/seed-ofac-sdn.mjs. Reads the chunked index from Upstash via REST and
 * caches it at module scope (warm isolates) to avoid re-reading per request.
 *
 * This is the searchable counterpart to OSIRIS's `/intel` ontology engine's
 * sanctions layer. Hand-written (exceptions: `deferred`).
 */

export const config = { runtime: 'edge' };

const PREFIX = 'recon:ofac';
const CACHE_TTL_MS = 3_600_000;

interface SdnEntity {
  n: string; // name
  a: string; // aliases (;-separated)
  t: string; // schema / type
  p: string; // program ids
  c: string; // countries
  s: string; // precomputed lowercase search field
}
let CACHE: { entities: SdnEntity[]; ts: number } | null = null;

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
      'Cache-Control': status === 200 ? 'public, s-maxage=600, stale-while-revalidate=3600' : 'no-store',
      ...cors(origin),
    },
  });
}

async function redis(cmd: unknown[]): Promise<any> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    return (await r.json()).result;
  } catch {
    return null;
  }
}

async function loadEntities(): Promise<SdnEntity[] | null> {
  if (CACHE && Date.now() - CACHE.ts < CACHE_TTL_MS) return CACHE.entities;
  const metaRaw = await redis(['GET', `${PREFIX}:meta`]);
  if (!metaRaw) return CACHE?.entities ?? null;
  let meta: { chunks?: number };
  try {
    meta = JSON.parse(metaRaw);
  } catch {
    return CACHE?.entities ?? null;
  }
  const n = Math.max(0, Number(meta.chunks ?? 0));
  if (!n) return CACHE?.entities ?? null;
  const keys = Array.from({ length: n }, (_, i) => `${PREFIX}:${i}`);
  const vals = await redis(['MGET', ...keys]);
  if (!Array.isArray(vals)) return CACHE?.entities ?? null;
  const entities: SdnEntity[] = [];
  for (const v of vals) {
    if (!v) continue;
    try {
      for (const e of JSON.parse(v) as Omit<SdnEntity, 's'>[]) {
        entities.push({ ...e, s: `${e.n} ${e.a}`.toLowerCase() });
      }
    } catch {
      /* skip bad chunk */
    }
  }
  CACHE = { entities, ts: Date.now() };
  return entities;
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405, origin);

  const q = new URL(req.url).searchParams.get('q')?.trim().toLowerCase();
  if (!q || q.length < 2) return json({ error: 'Query must be at least 2 characters' }, 400, origin);

  const entities = await loadEntities();
  if (!entities) return json({ error: 'Sanctions index unavailable (not seeded?)' }, 503, origin);

  const matches: SdnEntity[] = [];
  for (const e of entities) {
    if (e.s.includes(q)) {
      matches.push(e);
      if (matches.length >= 25) break;
    }
  }

  return json(
    {
      query: q,
      total_indexed: entities.length,
      count_shown: matches.length,
      matches: matches.map((m) => ({ name: m.n, type: m.t, programs: m.p, countries: m.c, aliases: m.a })),
      source: 'OpenSanctions us_ofac_sdn',
      timestamp: new Date().toISOString(),
    },
    200,
    origin,
  );
}
