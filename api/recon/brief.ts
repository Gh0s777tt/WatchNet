/**
 * RECON · AI Intelligence Brief  (BUILT NEW for WatchNet)
 *
 * Self-contained Vercel Edge Function. Generates a concise analyst-style OSINT
 * brief on a topic using the project's configured OpenAI-compatible LLM
 * (LLM_API_URL / LLM_API_KEY / LLM_MODEL — the same `generic` provider wired
 * into World Monitor's LLM chain).
 *
 * GROUNDED: before calling the LLM it searches the seeded OFAC SDN index
 * (recon:ofac:* in Redis, ~20k entities) for entities matching the topic and
 * injects them into the prompt as real data — so the brief cites actual
 * sanctioned entities rather than relying purely on model memory.
 *
 * Output is AI-generated situational-awareness analysis, not verified
 * intelligence — the system prompt instructs the model to flag uncertainty.
 * Hand-written (exceptions: `deferred`).
 */

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = [
  'You are a senior intelligence analyst producing a concise open-source intelligence (OSINT) brief.',
  'Structure the output as:',
  '1. BLUF — one-line bottom line up front.',
  '2. KEY ASSESSMENTS — 3 to 6 short bullet points.',
  '3. CONFIDENCE — one line on overall confidence and the main gaps.',
  'If the user message includes a "REAL DATA" section (e.g. OFAC SDN entities), incorporate and cite it.',
  'Be measured and factual. Do NOT fabricate specific figures, dates, casualty counts, or named',
  'sources you are not certain of — flag uncertainty explicitly with words like "reportedly" or',
  '"unconfirmed". This is AI-generated analysis for situational awareness, not verified intelligence.',
].join(' ');

// ---- OFAC SDN grounding index (shared shape with api/recon/sanctions.ts) ----
const OFAC_PREFIX = 'recon:ofac';
const OFAC_TTL_MS = 3_600_000;
interface Sdn {
  n: string;
  a: string;
  t: string;
  p: string;
  c: string;
  w: string[];
}
let OFAC_CACHE: { entities: Sdn[]; ts: number } | null = null;

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
    return r.ok ? (await r.json()).result : null;
  } catch {
    return null;
  }
}

async function loadOfac(): Promise<Sdn[] | null> {
  if (OFAC_CACHE && Date.now() - OFAC_CACHE.ts < OFAC_TTL_MS) return OFAC_CACHE.entities;
  const metaRaw = await redis(['GET', `${OFAC_PREFIX}:meta`]);
  if (!metaRaw) return OFAC_CACHE?.entities ?? null;
  let n = 0;
  try {
    n = Number(JSON.parse(metaRaw).chunks ?? 0);
  } catch {
    return OFAC_CACHE?.entities ?? null;
  }
  if (!n) return OFAC_CACHE?.entities ?? null;
  const vals = await redis(['MGET', ...Array.from({ length: n }, (_, i) => `${OFAC_PREFIX}:${i}`)]);
  if (!Array.isArray(vals)) return OFAC_CACHE?.entities ?? null;
  const entities: Sdn[] = [];
  for (const v of vals) {
    if (!v) continue;
    try {
      for (const e of JSON.parse(v) as Omit<Sdn, 'w'>[]) {
        entities.push({ ...e, w: `${e.n} ${e.a}`.toLowerCase().split(/[\s,;.\-/()]+/).filter(Boolean) });
      }
    } catch {
      /* skip */
    }
  }
  OFAC_CACHE = { entities, ts: Date.now() };
  return entities;
}

function searchOfac(entities: Sdn[], qWords: string[], limit: number): Sdn[] {
  if (!qWords.length) return [];
  const out: Sdn[] = [];
  for (const e of entities) {
    if (qWords.every((qw) => e.w.some((w) => w.startsWith(qw)))) {
      out.push(e);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405, origin);

  const topic = new URL(req.url).searchParams.get('topic')?.trim();
  if (!topic) return json({ error: 'Missing topic parameter' }, 400, origin);
  if (topic.length < 3 || topic.length > 200) return json({ error: 'Topic must be 3–200 characters' }, 400, origin);

  const apiUrl = process.env.LLM_API_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';
  if (!apiUrl || !apiKey) return json({ error: 'AI brief not configured (LLM_API_URL/KEY missing)' }, 503, origin);

  // Ground on OFAC SDN data when the topic matches sanctioned entities.
  const qWords = topic.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
  const ofac = await loadOfac();
  const matches = ofac ? searchOfac(ofac, qWords, 8) : [];
  const grounding = matches.length
    ? `\n\nREAL DATA — OFAC SDN entities matching this topic:\n${matches
        .map((m) => `- ${m.n} [${m.t}]${m.c ? ` (${m.c})` : ''}${m.p ? ` — programs: ${m.p}` : ''}`)
        .join('\n')}`
    : '';

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 700,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Topic: ${topic}${grounding}\n\nProduce the OSINT brief.` },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return json({ error: `LLM HTTP ${res.status}`, detail: detail.slice(0, 200) }, 502, origin);
    }
    const data = (await res.json()) as Record<string, any>;
    const briefing = data.choices?.[0]?.message?.content?.trim();
    if (!briefing) return json({ error: 'LLM returned no content' }, 502, origin);

    return json(
      {
        topic,
        briefing,
        grounded_on: matches.map((m) => m.n),
        grounded_count: matches.length,
        model,
        timestamp: new Date().toISOString(),
      },
      200,
      origin,
    );
  } catch {
    return json({ error: 'AI brief generation failed or timed out' }, 502, origin);
  }
}
