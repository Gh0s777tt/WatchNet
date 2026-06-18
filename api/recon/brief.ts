/**
 * RECON · AI Intelligence Brief  (BUILT NEW for WatchNet)
 *
 * Self-contained Vercel Edge Function. Generates a concise analyst-style OSINT
 * brief on a topic using the project's configured OpenAI-compatible LLM
 * (LLM_API_URL / LLM_API_KEY / LLM_MODEL — the same `generic` provider wired
 * into World Monitor's LLM chain). Delivers the "AI briefings" capability with
 * the OSINT/RECON toolkit. Hand-written (exceptions: `deferred`).
 *
 * Note: output is AI-generated situational-awareness analysis, not verified
 * intelligence — the system prompt instructs the model to flag uncertainty and
 * avoid fabricating specifics.
 */

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = [
  'You are a senior intelligence analyst producing a concise open-source intelligence (OSINT) brief.',
  'Structure the output as:',
  '1. BLUF — one-line bottom line up front.',
  '2. KEY ASSESSMENTS — 3 to 6 short bullet points.',
  '3. CONFIDENCE — one line on overall confidence and the main gaps.',
  'Be measured and factual. Do NOT fabricate specific figures, dates, casualty counts, or named',
  'sources you are not certain of — flag uncertainty explicitly with words like "reportedly" or',
  '"unconfirmed". This is AI-generated analysis for situational awareness, not verified intelligence.',
].join(' ');

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

  const topic = new URL(req.url).searchParams.get('topic')?.trim();
  if (!topic) return json({ error: 'Missing topic parameter' }, 400, origin);
  if (topic.length < 3 || topic.length > 200) {
    return json({ error: 'Topic must be 3–200 characters' }, 400, origin);
  }

  const apiUrl = process.env.LLM_API_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';
  if (!apiUrl || !apiKey) return json({ error: 'AI brief not configured (LLM_API_URL/KEY missing)' }, 503, origin);

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
          { role: 'user', content: `Topic: ${topic}\n\nProduce the OSINT brief.` },
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

    return json({ topic, briefing, model, timestamp: new Date().toISOString() }, 200, origin);
  } catch {
    return json({ error: 'AI brief generation failed or timed out' }, 502, origin);
  }
}
