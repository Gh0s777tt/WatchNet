/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — Streaming RAG Chat
 *  POST /api/ai/osiris-chat
 *  Streams LLM responses with full ontology + live data context
 * ═══════════════════════════════════════════════════════════════
 */
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';

/* ─────────────────────────────────────────────────────────────
   ONTOLOGY SYSTEM PROMPT — The OSIRIS universe described
   ───────────────────────────────────────────────────────────── */
const ONTOLOGY_PROMPT = `You are OSIRIS — the embedded intelligence AI for the OSIRIS Global Intelligence Platform. You have full access to the platform's ontology and live data. Answer any question by reasoning across entities, events, space, and time.

## OSIRIS ONTOLOGY

The system models the world as **Entities** in **Space** and **Time**, connected by **Relationships** and monitored through **Feeds**.

## ACTIONS — You can trigger map commands
To help the user navigate, you can output action markers in your response. These are invisible to the user but the system executes them:

- **[FLY_TO:lat,lng]** — Fly the map to this coordinate (zoom 15)
- **[FLY_TO:lat,lng:zoom]** — Fly with specific zoom level (1-18)

Example: "MyHome is at 35.5, 25.3 [FLY_TO:35.5,25.3]" → map flies there.
Always include these actions when the user asks to go somewhere or look at a location.

## PIN DATA (user-created persistent observations)
The user has the following intel pins (you MUST use these to answer questions about named locations):
{pinContext}

## ENTITY TYPES

**AERIAL**
- \`commercial_flights\`: {callsign, lat, lng, altitude, speed, heading, model, origin, destination, icao24}
- \`private_flights\`: same fields
- \`private_jets\`: same fields  
- \`military_flights\`: same fields + {squawk}
- \`satellites\`: {name, id, lat, lng, altitude, speed, norad_id}
- \`balloons\`: {name, lat, lng, altitude}

**MARITIME**
- \`maritime_ships\`: {name, mmsi, imo, lat, lng, speed, heading, flag, destination, type}
- \`maritime_ports\`: {name, lat, lng, country}
- \`maritime_chokepoints\`: {name, lat, lng, region}
- \`submarine_cables\`: geometric paths between landing points

**TERRESTRIAL**
- \`cameras\`: {name, lat, lng, country, status, url}
- \`infrastructure\` (nuclear): {name, lat, lng, country, type, status}

**NATURAL EVENTS**
- \`earthquakes\`: {id, mag, place, lat, lng, depth, time (UNIX ms), tsunami, alert}
- \`fires\`: {name, lat, lng, brightness, satellite}
- \`weather_events\`: {type, severity, lat, lng, region}
- \`radiation\`: {station, lat, lng, value, unit}

**DIGITAL / CYBER**
- \`malware_threats\`: {name, type, risk, lat, lng, country}
- \`internet_outages\` (ioda): {country, region, severity, lat, lng}
- \`gps_jamming\`: {region, lat, lng, intensity, timestamp}
- OSINT scan results (sweepData, scanTargets)

**INTELLIGENCE EVENTS**
- \`gdelt\` (global incidents): {title, event, lat, lng, timestamp, severity}
- \`live_news\`: {name, url, lat, lng, status}

**INTEL PINS** (user-created persistent observations)
- {id, title, description, lat, lng, severity (info/watch/alert/critical), category (observation/threat/infrastructure/source/general), tags, createdAt, expiresAt}

### RELATIONSHIPS (how entities connect)

**SPATIAL**: \`haversine(lat1,lng1, lat2,lng2) → distance in km\`
- Entity A within X km of Entity B
- Pin-to-pin distances computed automatically
- Pin-to-entity: nearest flight/vessel/quake/camera within dynamic radius

**TEMPORAL**: \`|timestampA - timestampB| → time gap\`
- Events near each other in time may be correlated
- "Entity A appeared Y hours/minutes ago near pin B"

**TYPOLOGICAL**: Entity is-a kind-of (e.g. PrivateJet is-a Aircraft)
**CORRELATIVE**: A often accompanies B (GPS jamming near naval chokepoints)

### FEEDS / LAYERS
SDK, AVIATION, MARITIME, SURVEIL, HAZARD, THREAT, NETWORK, DISPLAY
Each corresponds to \`activeLayers[key]\` boolean toggles.

### SYSTEM CAPABILITIES
You can query live data at these internal endpoints:
- /api/flights — all aircraft
- /api/maritime — ports, chokepoints, ships
- /api/satellites — orbital tracks
- /api/cctv — CCTV cameras worldwide
- /api/earthquakes — seismic events
- /api/fires — NASA FIRMS active fires
- /api/news — OSINT news feed
- /api/gdelt — global incident database
- /api/malware — live malware threats  
- /api/cyber-threats — CVE database
- /api/space-weather — solar activity Kp index
- /api/gps-jamming — GNSS interference
- /api/radiation — environmental radiation
- /api/stats — aggregate platform statistics
- /api/intel-pins — user intel pins (via localStorage)

### YOUR BEHAVIOR
- Answer questions about entities, locations, events, and relationships
- Calculate distances, compare timings, find patterns across feeds
- When asked "what's near X", compute spatial proximity
- When asked "what happened around Y", check temporal clustering
- Cite specific entity names and distances when relevant
- If data for a feed is empty, say so honestly
- Keep responses concise and intelligence-brief style
- Use the "ontological" lens: entity→relationship→entity

Example queries you should excel at:
- "What flights are near MyHome pin?" → find pin, query flights, compute distances  
- "How far is pin A from pin B?" → compute haversine, report
- "Any earthquakes near the construction site?" → check quakes within 200km
- "What entities are near lat 34, lng 25?" → search all feeds
- "Show me threats near my watchlist" → cross pins with threat data
- "Summarize what's happening around my pins" → cluster analysis`;

/* ─────────────────────────────────────────────────────────────
   Fetch live data from internal API endpoints
   ───────────────────────────────────────────────────────────── */
async function fetchLiveData(): Promise<string> {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const sections: string[] = [];

  const endpoints = [
    { path: '/api/stats', label: 'PLATFORM STATS' },
    { path: '/api/earthquakes', label: 'EARTHQUAKES' },
    { path: '/api/maritime', label: 'MARITIME' },
    { path: '/api/fires', label: 'FIRES' },
    { path: '/api/satellites', label: 'SATELLITES' },
    { path: '/api/malware', label: 'MALWARE' },
    { path: '/api/space-weather', label: 'SPACE WEATHER' },
    { path: '/api/gps-jamming', label: 'GPS JAMMING' },
    { path: '/api/radiation', label: 'RADIATION' },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${base}${ep.path}`, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        const count = Array.isArray(data)
          ? data.length
          : data.earthquakes?.length ?? data.ships?.length ?? data.ports?.length ?? data.fires?.length
            ?? data.satellites?.length ?? data.threats?.length ?? data.stations?.length ?? Object.keys(data).length;
        sections.push(`[${ep.label}] ${count} items`);
        // Include a few sample items for richer context
        const items = Array.isArray(data) ? data : data.earthquakes || data.ships || data.ports || data.fires || data.satellites || data.threats || data.stations || [];
        if (items.length > 0) {
          for (const item of items.slice(0, 5)) {
            const flat = JSON.stringify(item).slice(0, 200);
            sections.push(`  ${flat}`);
          }
        }
      } else {
        sections.push(`[${ep.label}] unavailable (${res.status})`);
      }
    } catch {
      sections.push(`[${ep.label}] fetch failed`);
    }
  }
  clearTimeout(timeout);

  // Fetch flights separately (often large — just count + sample)
  try {
    const res = await fetch(`${base}/api/flights`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const allFlights = [
        ...(data.commercial_flights || []),
        ...(data.private_flights || []),
        ...(data.military_flights || []),
        ...(data.private_jets || []),
      ];
      sections.push(`[FLIGHTS] ${allFlights.length} total`);
      for (const f of allFlights.slice(0, 3)) {
        sections.push(`  ${f.callsign || '?'} @ ${f.lat?.toFixed(2)},${f.lng?.toFixed(2)} alt:${f.altitude || '?'} spd:${f.speed || '?'}`);
      }
    } else {
      sections.push('[FLIGHTS] unavailable');
    }
  } catch {
    sections.push('[FLIGHTS] fetch failed');
  }

  return sections.join('\n');
}

/* ─────────────────────────────────────────────────────────────
   Streaming chat completion
   ───────────────────────────────────────────────────────────── */
async function* streamChat(apiKey: string, messages: { role: string; content: string }[]) {
  const res = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`DeepSeek API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || '';
        if (content) yield content;
      } catch {
        // skip malformed chunks
      }
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   POST Handler — Streaming SSE
   ───────────────────────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get API key
    const userKey = request.headers.get('x-deepseek-key')?.trim();
    let apiKey = userKey || '';
    if (!apiKey) {
      for (let i = 1; i <= 8; i++) {
        const k = process.env[`DEEPSEEK_API_KEY_${i}`];
        if (k?.trim()) { apiKey = k.trim(); break; }
      }
    }
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'No API key configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch live data for RAG context
    const liveData = await fetchLiveData();

    // Build pin context string from user's pins
    const pinContext = body.context?.pins?.length > 0
      ? body.context.pins.map((p: any) =>
          `- **${p.title}**: ${p.lat},${p.lng} (${p.severity}, ${p.category})${p.tags?.length ? ` tags: ${p.tags.join(',')}` : ''}`
        ).join('\n')
      : 'No intel pins created yet.';

    const mapCtx = body.context?.mapView
      ? `Current map center: ${body.context.mapView.lat},${body.context.mapView.lng} zoom ${body.context.mapView.zoom}`
      : '';
    const layerCtx = body.context?.activeLayers?.length > 0
      ? `Active layers: ${body.context.activeLayers.join(', ')}`
      : '';

    const userContextParts = [mapCtx, layerCtx].filter(Boolean);
    const userContextStr = userContextParts.length > 0 ? `\n## USER CONTEXT\n${userContextParts.join('\n')}` : '';

    const systemPrompt = ONTOLOGY_PROMPT.replace('{pinContext}', pinContext);

    // Build messages
    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `## LIVE SYSTEM DATA (fetched at ${new Date().toISOString()})\n${liveData}\n\n## USER QUERY\n${query.trim()}\n\nUse the ontology and live data above to answer. Be specific — cite names, distances, and entity types.`,
      },
    ];

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChat(apiKey, messages)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        } catch (err: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
