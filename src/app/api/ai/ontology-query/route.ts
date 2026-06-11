/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — Ontology AI Agentic Ingestion & Query Engine
 *  Accepts unstructured data, extracts entities+relations via AI,
 *  and answers questions about stored ontology data.
 * ═══════════════════════════════════════════════════════════════
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY_1 || process.env.DEEPSEEK_API_KEY || '';
  if (key) return key;
  for (const k of Object.keys(process.env)) {
    if (k.toLowerCase().includes('deepseek') && process.env[k]) return process.env[k]!;
  }
  return '';
}

async function callDeepSeek(system: string, user: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) return 'No API key configured';
  const res = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek API ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Agentic Ingestion: Parse unstructured data → entities + relationships ──

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'query';

    switch (action) {
      case 'ingest':
        return handleAgenticIngest(body);
      case 'query':
        return handleOntologyQuery(body);
      case 'suggest':
        return handleSuggestEntities(body);
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── Agentic Ingestion: Unstructured data → structured entities + relations ──

async function handleAgenticIngest(body: any) {
  const rawData = body.data || body.text || '';
  const fileName = body.fileName || 'unknown';
  const fileType = body.fileType || 'text';

  if (!rawData) {
    return NextResponse.json({ error: 'No data provided' }, { status: 400 });
  }

  const systemPrompt = `You are OSIRIS Agentic Ontology Ingestion AI. Your job is to parse unstructured intelligence data and extract:

1. **ENTITIES** — Every person, phone, social profile, ID document, vehicle, place, MAC address, WiFi network, event, or image mentioned
2. **RELATIONSHIPS** — How each entity connects to others

ENTITY TYPES (use these exact type names):
| Type | Fields |
|------|--------|
| person | name, email, phone, dob, nationality, occupation, aliases |
| phone_number | number, carrier, country, contactName |
| social_profile | platform (X/FB/IG), username, url, displayName, email, followers, bio |
| personal_id | idType (Passport/DL/ID), idNumber, issuingCountry, fullName, expiryDate |
| vehicle | plate, vin, make, model, year, color, owner |
| place | address, city, country, placeType (Home/Work/Other), residents |
| mac_address | mac, vendor, deviceName, owner, wifiNetworks |
| wifi_network | ssid, bssid, security, frequency |
| event | eventType, date, participants, description |
| image_media | source, url, faces, textExtracted |

RELATIONSHIP TYPES:
| Source Type | Target Type | Label | Meaning |
|-------------|-------------|-------|---------|
| person | phone_number | has_phone | Person owns/uses this number |
| person | social_profile | has_profile | Person has this social account |
| person | personal_id | has_id | Person holds this ID document |
| person | vehicle | owns | Person owns this vehicle |
| person | place | lives_at | Person resides at this place |
| person | mac_address | uses_device | Person uses this device |
| phone_number | social_profile | linked_account | Phone linked to social account |
| vehicle | person | registered_to | Vehicle registered to person |
| place | person | resident | Place has this resident |
| mac_address | wifi_network | connected_to | MAC connected to this WiFi |
| wifi_network | place | located_at | WiFi network at this location |
| event | person | involves | Event involves this person |
| event | place | occurs_at | Event occurs at this location |

Return ONLY a valid JSON object with two arrays. No markdown, no explanation:

{
  "entities": [
    {
      "id": "unique_id_string",
      "type": "person|phone_number|social_profile|...",
      "label": "display name",
      "description": "brief description",
      "properties": { all applicable fields },
      "coordinates": { "lat": number, "lng": number } | null
    }
  ],
  "relationships": [
    {
      "sourceId": "must match an entity id above",
      "targetId": "must match an entity id above",
      "label": "relationship type from table above",
      "strength": 0.0-1.0
    }
  ]
}

Be thorough — extract EVERY entity and EVERY relationship. Even partial data. Infer missing connections when obvious.`;

  const userPrompt = `## FILE: ${fileName}
## TYPE: ${fileType}
## RAW DATA:
${rawData.slice(0, 20000)}

Parse all entities and relationships from this data. Return ONLY the JSON.`;

  const aiResponse = await callDeepSeek(systemPrompt, userPrompt);
  
  // Parse the JSON from the AI response
  let parsed: { entities: any[]; relationships: any[] } = { entities: [], relationships: [] };
  try {
    const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // If direct parse fails, try to extract JSON from the text
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*"entities"[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {}
  }

  // Normalize entities with proper IDs
  const now = new Date().toISOString();
  const entities = (parsed.entities || []).map((e: any) => ({
    id: e.id || `${e.type || 'entity'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: e.type || 'person',
    domain: mapDomain(e.type || 'person'),
    label: e.label || 'Unknown',
    description: e.description || '',
    coordinates: e.coordinates || null,
    properties: e.properties || {},
    tags: [],
    source: 'AI ingestion',
    createdAt: now,
    updatedAt: now,
  }));

  const relationships = (parsed.relationships || []).map((r: any) => ({
    id: `rel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sourceId: r.sourceId,
    targetId: r.targetId,
    label: r.label || 'related_to',
    strength: typeof r.strength === 'number' ? Math.min(1, Math.max(0, r.strength)) : 0.8,
    createdAt: now,
  }));

  // Filter to only valid relationships (both entities exist)
  const validEntityIds = new Set(entities.map((e: any) => e.id));
  const validRels = relationships.filter((r: any) => validEntityIds.has(r.sourceId) && validEntityIds.has(r.targetId));

  return NextResponse.json({
    success: true,
    entities,
    relationships: validRels,
    summary: `AI extracted ${entities.length} entities and ${validRels.length} relationships from "${fileName}"`,
    raw: parsed,
  });
}

// ── Ontology Query: Ask questions about stored data ──

async function handleOntologyQuery(body: any) {
  const query = body.query || '';
  const storeData = body.store || { entities: [], relationships: [] };

  if (!query.trim()) {
    return NextResponse.json({ error: 'No query provided' }, { status: 400 });
  }

  const entities = storeData.entities || [];
  const relationships = storeData.relationships || [];

  // Build a compact representation of the ontology for the AI
  const entitySummary = entities.map((e: any) =>
    `[${e.type}] "${e.label}" id=${e.id} props=${JSON.stringify(e.properties || {})}${e.coordinates ? ` coords=${e.coordinates.lat},${e.coordinates.lng}` : ''}`
  ).join('\n');

  const relSummary = relationships.map((r: any) =>
    `${r.sourceId} --[${r.label}]--> ${r.targetId}`
  ).join('\n');

  const systemPrompt = `You are OSIRIS Ontology Analyst AI. You have access to a graph database of entities and their relationships.

When answering:
1. Be specific — reference entity names and properties directly
2. Use the relationship data to find connections between entities
3. If the data is insufficient, say so clearly
4. Suggest what additional data would help fill gaps
5. Format responses with clear sections for complex analysis

The graph uses these entity types:
- person, phone_number, social_profile, personal_id, vehicle, place, mac_address, wifi_network, event, image_media`;

  const userPrompt = `## ONTOLOGY ENTITIES (${entities.length} total):
${entitySummary || '(none)'}

## RELATIONSHIPS (${relationships.length} total):
${relSummary || '(none)'}

## USER QUERY:
${query}

Answer the user's question based on the ontology data above.`;

  const analysis = await callDeepSeek(systemPrompt, userPrompt);

  return NextResponse.json({
    success: true,
    analysis,
    summary: `Analyzed ${entities.length} entities and ${relationships.length} relationships`,
  });
}

// ── Suggest Entities: AI suggests entities to add based on context ──

async function handleSuggestEntities(body: any) {
  const context = body.context || '';
  const existingEntities = body.existingEntities || [];

  if (!context.trim()) {
    return NextResponse.json({ error: 'No context provided' }, { status: 400 });
  }

  const existingSummary = existingEntities.map((e: any) => `[${e.type}] ${e.label}`).join('\n');

  const systemPrompt = `You are an OSIRIS intelligence analyst. Based on the context provided, suggest entities that should be added to the ontology graph.

For each suggestion, provide:
1. Entity type
2. Suggested label
3. What properties it should have
4. How it relates to existing entities

Return as JSON array:
[{ "type": "person", "label": "Name", "reason": "Why this should be added", "properties": {}, "relationships": [{"targetLabel": "existing entity label", "label": "relation type"}] }]`;

  const userPrompt = `## EXISTING ENTITIES:
${existingSummary || '(none)'}

## CONTEXT:
${context}

Suggest entities to add. Return ONLY JSON.`;

  const aiResponse = await callDeepSeek(systemPrompt, userPrompt);
  
  let suggestions: any[] = [];
  try {
    const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    suggestions = JSON.parse(cleaned);
  } catch {
    suggestions = [{ type: 'person', label: 'Suggested Entity', reason: aiResponse.slice(0, 200) }];
  }

  return NextResponse.json({ success: true, suggestions });
}

function mapDomain(type: string): string {
  const map: Record<string, string> = {
    person: 'PERSON', phone_number: 'COMMUNICATION', social_profile: 'SOCIAL',
    personal_id: 'IDENTITY', vehicle: 'VEHICLE', place: 'LOCATION',
    mac_address: 'NETWORK', wifi_network: 'NETWORK', event: 'EVENT', image_media: 'MEDIA',
  };
  return map[type] || 'PERSON';
}
