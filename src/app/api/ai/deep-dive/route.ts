/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — AI Deep Dive Intel Endpoint
 *  GET /api/ai/deep-dive?lat=X&lng=Y&title=...
 *  Returns LLM-generated intelligence analysis for a map coordinate
 * ═══════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { startLog } from '@/lib/event-logger';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';

const DEEP_DIVE_SYSTEM_PROMPT = `You are OSIRIS Deep Recon Analyst — an elite geospatial intelligence (GEOINT) officer. Your mission is to analyze a specific coordinate and provide actionable ground-level intelligence.

## YOUR CAPABILITIES
- Draw on your training knowledge of global infrastructure, geography, urban development, industrial facilities, transport networks, and geopolitical significance
- Identify what is likely at or near the given coordinate: urban area type, industrial zones, military installations, ports, airports, power plants, telecom towers, data centers, research facilities, natural resources, conflict zones, etc.
- Assess strategic significance of the location

## OUTPUT FORMAT
Structure your analysis with these sections:

### LOCATION PROFILE
- What this location is (city, region, geographic feature)
- Population estimate if urban
- Primary economic activity

### INFRASTRUCTURE & INSTALLATIONS
- Nearby airports, seaports, railway hubs
- Power generation facilities
- Telecom/data infrastructure
- Military bases or government installations
- Industrial facilities

### GEOPOLITICAL / STRATEGIC SIGNIFICANCE
- Why this location matters
- Current conflicts, tensions, or security concerns
- Economic importance

### INTELLIGENCE ASSESSMENT
- Overall classification of the area
- Key observations for an OSINT operator
- Confidence level

Be specific, cite real facilities and known features. If the location appears to be a residential area or natural terrain with no strategic significance, state that honestly — do not fabricate threats. Mark low-confidence assessments clearly.`;

function getDeepSeekApiKey(): string {
  for (let i = 1; i <= 8; i++) {
    const key = process.env[`DEEPSEEK_API_KEY_${i}`];
    if (key && key.trim()) return key.trim();
  }
  throw new Error('No DeepSeek API key configured');
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16&addressdetails=1`,
      { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'OsirisIntel/1.0' } }
    );
    if (res.ok) {
      const data = await res.json();
      return data.display_name || '';
    }
  } catch {}
  return '';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const pinTitle = searchParams.get('title') || '';
  const pinDesc = searchParams.get('description') || '';
  const pinCategory = searchParams.get('category') || '';
  const pinSeverity = searchParams.get('severity') || '';

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Valid lat and lng required' }, { status: 400 });
  }

  try {
    // Gather location intelligence
    const geoLogDone = startLog('deep-dive', 'reverseGeocode', 'https://nominatim.openstreetmap.org/reverse', `${lat},${lng}`);
    const address = await reverseGeocode(lat, lng);
    geoLogDone({ responseSummary: address ? address.slice(0, 100) : 'no address' });

    const locationSummary = [
      `COORDINATES: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      address ? `ADDRESS: ${address}` : '',
      pinTitle ? `PIN TITLE: ${pinTitle}` : '',
      pinDesc ? `PIN DESCRIPTION: ${pinDesc}` : '',
      pinCategory ? `PIN CATEGORY: ${pinCategory}` : '',
      pinSeverity ? `PIN SEVERITY: ${pinSeverity}` : '',
    ].filter(Boolean).join('\n');

    const apiKey = getDeepSeekApiKey();
    const llmLogDone = startLog('deep-dive', 'analyzeLocation', 'https://api.deepseek.com/v1/chat/completions', `${lat.toFixed(4)},${lng.toFixed(4)} ${pinTitle}`);

    const res = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: DEEP_DIVE_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Perform a deep reconnaissance analysis of this location:\n\n${locationSummary}\n\nProvide your full intelligence assessment.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      llmLogDone({ status: 'FAIL', error: `DeepSeek API ${res.status}: ${errText.slice(0, 200)}` });
      throw new Error(`DeepSeek API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const analysis = data.choices?.[0]?.message?.content || 'No analysis generated.';
    llmLogDone({ responseSummary: `${analysis.slice(0, 120).replace(/\n/g, ' ')}...` });

    return NextResponse.json({
      analysis,
      location: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      model: DEEPSEEK_MODEL,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[OSIRIS DEEP DIVE] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
