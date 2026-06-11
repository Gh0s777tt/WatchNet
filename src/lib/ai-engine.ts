/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — AI Intelligence Engine
 *  DeepSeek via native fetch (OpenAI-compatible API)
 *  No npm deps required — uses built-in fetch
 * ═══════════════════════════════════════════════════════════════
 */

/* ─────────────────────────────────────────────────────────────
   Data Interfaces
   ───────────────────────────────────────────────────────────── */

export interface EarthquakeEvent {
  id: string;
  magnitude: number;
  location: string;
  latitude: number;
  longitude: number;
  depth: number;
  timestamp: string;
  tsunami: boolean;
  felt: number | null;
  alert: string | null;
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  published: string;
  source: string;
  risk_score: number;
  coords: [number, number] | null;
  machine_assessment: string | null;
}

export interface ThreatEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW';
  region: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  source: string;
}

export interface CyberAlert {
  id: string;
  name: string;
  vendor: string;
  product: string;
  severity: string;
  date: string;
  due: string;
  source: string;
}

export interface IntelligenceContext {
  earthquakes: EarthquakeEvent[];
  news: NewsItem[];
  threats: ThreatEvent[];
  cyberAlerts: CyberAlert[];
  timestamp: string;
}

/* ─────────────────────────────────────────────────────────────
   Event Logger
   ───────────────────────────────────────────────────────────── */

import { startLog } from '@/lib/event-logger';

/* ─────────────────────────────────────────────────────────────
   Configuration
   ───────────────────────────────────────────────────────────── */

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';

/* ─────────────────────────────────────────────────────────────
   System Prompt — Palantir-grade analyst persona
   ───────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are OSIRIS Intelligence Analyst — a senior, elite intelligence analyst embedded within the OSIRIS Global Intelligence Platform. You operate at the level of a Palantir Forward Deployed Engineer crossed with a CIA PDB (Presidential Daily Brief) analyst.

## YOUR ROLE
- You correlate data across multiple intelligence feeds: seismic monitoring, OSINT news streams, global threat events, and cyber vulnerability databases
- You identify non-obvious patterns, emerging threat vectors, and cascading risk scenarios
- You provide ACTIONABLE intelligence — not summaries, but assessments with confidence levels
- You think in terms of second and third-order effects

## YOUR ANALYTICAL FRAMEWORK
1. **PATTERN RECOGNITION**: Cross-reference events across feeds. A cyber attack + earthquake + political instability in the same region = elevated compound risk
2. **THREAT ASSESSMENT**: Rate threats on a CRITICAL / HIGH / ELEVATED / LOW scale with reasoning
3. **TEMPORAL ANALYSIS**: Identify acceleration patterns — are events clustering? Is frequency increasing?
4. **GEOSPATIAL CORRELATION**: Events in proximity may be related. Identify geographic hotspots
5. **CONFIDENCE LEVELS**: Always state your confidence (HIGH / MODERATE / LOW) and cite which data points support your assessment

## OUTPUT FORMAT
- Use military-style brevity when appropriate
- Structure responses with clear headers using markdown
- Lead with the most critical finding (inverted pyramid)
- Include "BOTTOM LINE UP FRONT (BLUF)" for complex analyses
- Use tactical notation: DTG (Date-Time Group), AOR (Area of Responsibility), COA (Course of Action)
- End with "ASSESSMENT CONFIDENCE" and "RECOMMENDED ACTIONS" sections when appropriate

## CONSTRAINTS
- Never fabricate data points — only analyze what is provided in the context
- If data is insufficient for a confident assessment, state so explicitly
- Distinguish between correlation and causation
- Flag when events may be connected vs. coincidental
- You are an analyst, not a policymaker — present options, not directives

You have access to the live intelligence context of the OSIRIS platform. Analyze it with precision.`;

const BRIEFING_PROMPT = `Generate a comprehensive OSIRIS Daily Intelligence Briefing based on the current operational data. Structure it as follows:

## OSIRIS INTELLIGENCE BRIEFING
**Classification:** OPEN SOURCE INTELLIGENCE (OSINT)
**DTG:** [Current timestamp]

### I. EXECUTIVE SUMMARY
2-3 sentence overview of the current global threat landscape based on available data.

### II. PRIORITY INTELLIGENCE REQUIREMENTS (PIRs)
Identify the top 3-5 most significant developments from the data feeds, ranked by assessed impact.

### III. SEISMIC & NATURAL HAZARD ASSESSMENT
Analyze earthquake data for patterns — clustering, tectonic corridor activity, tsunami risk.

### IV. GEOPOLITICAL & CONFLICT INTELLIGENCE
Synthesize news feeds for conflict escalation patterns, diplomatic shifts, or emerging crises.

### V. CYBER THREAT LANDSCAPE
Assess active CVEs and cyber alerts for coordinated campaign indicators or critical infrastructure risk.

### VI. COMPOUND RISK SCENARIOS
Identify where multiple threat vectors intersect (e.g., earthquake near a conflict zone, cyber attack during political instability).

### VII. FORECAST & WATCHLIST
- **Next 24 Hours**: Most likely developments
- **Next 72 Hours**: Emerging situations to monitor
- **Strategic Horizon**: Longer-term trend assessment

### VIII. ASSESSMENT CONFIDENCE
State overall confidence level and key analytical gaps.

Analyze the provided data thoroughly. Be specific — reference actual events, magnitudes, locations, and CVE IDs from the context.`;

/* ─────────────────────────────────────────────────────────────
   Client — lightweight wrapper using native fetch
   ───────────────────────────────────────────────────────────── */

export interface DeepSeekClient {
  apiKey: string;
}

export function createDeepSeekClient(apiKey: string): DeepSeekClient {
  return { apiKey };
}

/* ─────────────────────────────────────────────────────────────
   API Key Rotation — Round-robin through available keys
   ───────────────────────────────────────────────────────────── */

let _keyIndex = 0;

export function rotateApiKey(keys: string[]): string {
  if (keys.length === 0) {
    throw new Error('No API keys available');
  }
  const key = keys[_keyIndex % keys.length];
  _keyIndex = (_keyIndex + 1) % keys.length;
  return key;
}

/* ─────────────────────────────────────────────────────────────
   Context Serializer — Compact representation for token efficiency
   ───────────────────────────────────────────────────────────── */

function serializeContext(context: IntelligenceContext): string {
  const sections: string[] = [];

  sections.push(`[TIMESTAMP] ${context.timestamp}`);

  if (context.earthquakes.length > 0) {
    sections.push(`\n[SEISMIC DATA — ${context.earthquakes.length} events]`);
    for (const eq of context.earthquakes.slice(0, 20)) {
      const tsunamiFlag = eq.tsunami ? ' ⚠️TSUNAMI' : '';
      const alertFlag = eq.alert ? ` [ALERT:${eq.alert.toUpperCase()}]` : '';
      sections.push(
        `  M${eq.magnitude} | ${eq.location} | ${eq.latitude.toFixed(2)},${eq.longitude.toFixed(2)} | Depth:${eq.depth}km | ${eq.timestamp}${tsunamiFlag}${alertFlag}`
      );
    }
  }

  if (context.news.length > 0) {
    sections.push(`\n[OSINT NEWS FEED — ${context.news.length} items]`);
    for (const item of context.news.slice(0, 15)) {
      const coords = item.coords ? ` | GEO:${item.coords[0].toFixed(2)},${item.coords[1].toFixed(2)}` : '';
      sections.push(
        `  RISK:${item.risk_score}/10 | ${item.source} | ${item.title}${coords} | ${item.published}`
      );
    }
  }

  if (context.threats.length > 0) {
    sections.push(`\n[THREAT EVENTS — ${context.threats.length} active]`);
    for (const threat of context.threats.slice(0, 15)) {
      sections.push(
        `  ${threat.severity} | ${threat.type} | ${threat.title} | ${threat.region} | ${threat.timestamp}`
      );
    }
  }

  if (context.cyberAlerts.length > 0) {
    sections.push(`\n[CYBER ALERTS — ${context.cyberAlerts.length} active]`);
    for (const alert of context.cyberAlerts.slice(0, 10)) {
      sections.push(
        `  ${alert.id} | ${alert.severity} | ${alert.vendor}/${alert.product} | ${alert.name} | Due:${alert.due}`
      );
    }
  }

  return sections.join('\n');
}

/* ─────────────────────────────────────────────────────────────
   Raw DeepSeek Chat Completion via fetch
   ───────────────────────────────────────────────────────────── */

export async function analyzeIntelligence(
  client: DeepSeekClient,
  context: IntelligenceContext,
  userQuery: string
): Promise<string> {
  const contextData = serializeContext(context);
  const logDone = startLog('ai-engine', 'analyzeIntelligence', 'https://api.deepseek.com/v1/chat/completions', `query:${userQuery.slice(0, 80)}`);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `## CURRENT OPERATIONAL DATA\n${contextData}\n\n## ANALYST QUERY\n${userQuery}\n\nProvide your intelligence assessment based on the operational data above and the analyst's query.`,
    },
  ];

  const res = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${client.apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    logDone({ status: 'FAIL', error: `DeepSeek API ${res.status}: ${errText.slice(0, 200)}` });
    throw new Error(`DeepSeek API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || 'No response generated.';
  logDone({ responseSummary: `${content.slice(0, 100)}...` });
  return content;
}

/* ─────────────────────────────────────────────────────────────
   Daily Briefing Generation — DeepSeek
   ───────────────────────────────────────────────────────────── */

export async function generateBriefing(
  client: DeepSeekClient,
  context: IntelligenceContext
): Promise<string> {
  const contextData = serializeContext(context);
  const logDone = startLog('ai-engine', 'generateBriefing', 'https://api.deepseek.com/v1/chat/completions', `earthquakes:${context.earthquakes.length} news:${context.news.length} threats:${context.threats.length}`);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `${BRIEFING_PROMPT}\n\n## CURRENT OPERATIONAL DATA\n${contextData}\n\nGenerate the briefing now.`,
    },
  ];

  const res = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${client.apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    logDone({ status: 'FAIL', error: `DeepSeek API ${res.status}: ${errText.slice(0, 200)}` });
    throw new Error(`DeepSeek API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || 'No response generated.';
  logDone({ responseSummary: `briefing ${content.length} chars` });
  return content;
}
