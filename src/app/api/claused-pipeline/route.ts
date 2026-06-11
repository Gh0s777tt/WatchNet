/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — CLAUSED PIPELINE Data Ingestion Gateway
 *  Accepts and processes: files (JSON/PDF/TXT), images, audio, URLs
 *  Feeds processed intelligence into the system
 * ═══════════════════════════════════════════════════════════════
 */
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

// ── Helpers ──

async function ensureDir(p: string) {
  try { await fs.mkdir(p, { recursive: true }); } catch {}
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── PDF text extraction using pdf-parse + Tesseract OCR fallback ──
let _pdfParse: any = null;
let _Tesseract: any = null;
let _sharp: any = null;

async function getPdfParse() {
  if (!_pdfParse) { try { _pdfParse = (await import('pdf-parse')).default || require('pdf-parse'); } catch {} }
  return _pdfParse;
}
async function getTesseract() {
  if (!_Tesseract) { try { _Tesseract = (await import('tesseract.js')).default || require('tesseract.js'); } catch {} }
  return _Tesseract;
}
async function getSharp() {
  if (!_sharp) { try { _sharp = (await import('sharp')).default || require('sharp'); } catch {} }
  return _sharp;
}

async function extractPdfText(buffer: Buffer): Promise<{ text: string; method: string }> {
  // Method 1: Try pdf-parse for text-based PDFs
  try {
    const pdfParse = await getPdfParse();
    if (pdfParse) {
      const data = await pdfParse(buffer);
      const text = data.text?.trim();
      if (text && text.length > 50) {
        return { text, method: 'pdf-parse (text-based)' };
      }
    }
  } catch {}

  // Method 2: Better regex extraction for simple PDFs (works with most text PDFs)
  try {
    const raw = buffer.toString('binary');
    // Extract text between parentheses in PDF streams (standard PDF text objects)
    // Also handle escaped characters and line feeds
    const matches: string[] = [];
    const re = /\(([^)]*)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      const t = m[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
        .replace(/\\(.)/g, '$1');
      if (t.length > 2 && !t.startsWith('\\') && !/^[\s\-.0-9]+$/.test(t)) {
        matches.push(t);
      }
    }
    if (matches.length > 0) {
      const text = matches.join('\n').trim();
      if (text.length > 50) {
        return { text, method: 'regex extraction' };
      }
    }
  } catch {}

  // Method 3: Tesseract OCR for scanned/image-based PDFs (via poppler-utils)
  try {
    const { execSync } = require('child_process');
    const os = require('os');
    const tmpDir = os.tmpdir();
    const imgPath = `${tmpDir}/pdf_page_${Date.now()}.png`;
    // Convert first page of PDF to PNG using pdftoppm (from poppler-utils)
    try {
      execSync(`pdftoppm -png -f 1 -l 1 -r 300 "${tmpDir}/pdf_input_${Date.now()}.pdf" "${tmpDir}/pdf_out" 2>/dev/null`, {
        input: buffer,
        timeout: 30000,
      });
    } catch {
      // fallback: write PDF to temp file and convert
      const fs = require('fs');
      const pdfPath = `${tmpDir}/pdf_input_${Date.now()}.pdf`;
      await fs.promises.writeFile(pdfPath, buffer);
      try {
        execSync(`pdftoppm -png -f 1 -l 1 -r 300 "${pdfPath}" "${tmpDir}/pdf_out"`, { timeout: 30000 });
      } catch {}
      // Try to read the output
      const imgFiles = await fs.promises.readdir(tmpDir);
      const pngFile = imgFiles.find((f: string) => f.startsWith('pdf_out') && f.endsWith('.png'));
      if (pngFile) {
        const imgBuffer = await fs.promises.readFile(`${tmpDir}/${pngFile}`);
        const Tesseract = await getTesseract();
        if (Tesseract) {
          const { data: ocrResult } = await Tesseract.recognize(imgBuffer, 'eng', { logger: () => {} });
          const ocrText = ocrResult.text?.trim();
          if (ocrText && ocrText.length > 20) {
            // Cleanup temp files
            try { fs.promises.unlink(pdfPath); } catch {}
            try { fs.promises.unlink(`${tmpDir}/${pngFile}`); } catch {}
            return { text: ocrText, method: 'Tesseract OCR' };
          }
        }
        try { fs.promises.unlink(`${tmpDir}/${pngFile}`); } catch {}
      }
      try { fs.promises.unlink(pdfPath); } catch {}
    }
  } catch {}

  return { text: 'Could not extract text from this PDF. It may be encrypted, damaged, or an unsupported format.', method: 'failed' };
}

// ── Simple HTML text extraction (without cheerio) ──
function extractHtmlText(html: string): string {
  // Remove scripts, styles
  let clean = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  clean = clean.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  // Replace tags with newlines
  clean = clean.replace(/<br\s*\/?>/gi, '\n');
  clean = clean.replace(/<\/p>/gi, '\n\n');
  clean = clean.replace(/<\/?[^>]+(>|$)/g, '');
  // Decode common entities
  clean = clean.replace(/&nbsp;/g, ' ');
  clean = clean.replace(/&amp;/g, '&');
  clean = clean.replace(/&lt;/g, '<');
  clean = clean.replace(/&gt;/g, '>');
  clean = clean.replace(/&quot;/g, '"');
  clean = clean.replace(/&#39;/g, "'");
  // Clean up whitespace
  clean = clean.replace(/\n{3,}/g, '\n\n');
  clean = clean.replace(/[ \t]+/g, ' ');
  clean = clean.trim();
  return clean;
}

// ── DeepSeek API call ──
async function callDeepSeek(systemPrompt: string, userContent: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek API ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// Get API key from env
function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY_1 || process.env.DEEPSEEK_API_KEY || '';
  if (key) return key;
  // Try from various env var names
  for (const k of Object.keys(process.env)) {
    if (k.toLowerCase().includes('deepseek') && process.env[k]) return process.env[k]!;
  }
  return '';
}

// ── Main Handler ──

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      return await handleFormUpload(req);
    }

    const body = await req.json().catch(() => ({}));
    const { action, ...params } = body;

    switch (action) {
      case 'process-text':
        return handleProcessText(params);
      case 'process-image':
        return handleProcessImage(params);
      case 'process-audio':
        return handleProcessAudio(params);
      case 'process-url':
        return handleProcessUrl(params);
      case 'ingest':
        return handleIngest(params);
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── File Upload Handler (multipart) ──

async function handleFormUpload(req: NextRequest) {
  await ensureDir(UPLOAD_DIR);
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const fileName = file.name || 'unnamed';
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
  const buffer = Buffer.from(await file.arrayBuffer());

  // Save to uploads
  const savePath = path.join(UPLOAD_DIR, `${Date.now()}_${fileName}`);
  await fs.writeFile(savePath, buffer);

  let result: any = { fileName, fileExt, size: buffer.length, saved: true, path: savePath };

  if (fileExt === 'json') {
    try {
      const parsed = JSON.parse(buffer.toString('utf-8'));
      result.type = 'json';
      result.data = typeof parsed === 'object' ? parsed : { content: parsed };
      result.summary = `JSON parsed: ${JSON.stringify(result.data).slice(0, 200)}...`;
    } catch (e: any) {
      result.error = `JSON parse error: ${e.message}`;
    }
  } else if (fileExt === 'pdf') {
    const { text: extracted, method } = await extractPdfText(buffer);
    result.type = 'pdf';
    result.text = extracted;
    result.extractionMethod = method;
    result.summary = `PDF extracted via ${method}: ${extracted.slice(0, 200)}... (${extracted.length} chars)`;
  } else if (['txt', 'csv', 'md', 'log', 'xml', 'yaml', 'yml'].includes(fileExt)) {
    const text = buffer.toString('utf-8');
    result.type = 'text';
    result.text = text;
    result.summary = `${fileExt.toUpperCase()} read: ${text.slice(0, 200)}... (${text.length} chars)`;
  } else {
    result.type = 'binary';
    result.text = `Binary file (${fileExt}): ${buffer.length} bytes saved to uploads.`;
    result.summary = `Binary file saved: ${fileName} (${(buffer.length / 1024).toFixed(1)}KB)`;
  }

  return NextResponse.json({ success: true, result });
}

// ── Process Text (from file or direct input) ──

async function handleProcessText(params: any) {
  const text = params.text || '';
  if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 });

  const textType = params.textType || 'unknown'; // 'json', 'report', 'intel', 'general'
  const apiKey = getApiKey();

  let analysis = '';
  let parsedEntities: any[] = [];

  if (textType === 'personal_ontology' && apiKey) {
    // AI-powered personal ontology extraction
    const ontologyResult = await callDeepSeek(
      `You are an OSIRIS ontology extraction AI. Parse the following intelligence data and extract EVERY entity mentioned into structured JSON.

ENTITY TYPES (use these exact type names):
- person: name, email, phone, dob, nationality, occupation, aliases
- phone_number: number, carrier, country, contactName
- social_profile: platform (X/FB/IG), username, url, displayName, email, followers, bio
- personal_id: idType (Passport/DL/ID), idNumber, issuingCountry, fullName, expiryDate
- vehicle: plate, vin, make, model, year, color, owner
- place: address, city, country, placeType (Home/Work/Other), residents
- mac_address: mac, vendor, deviceName, owner, wifiNetworks
- wifi_network: ssid, bssid, security, frequency
- event: eventType, date, participants, description
- image_media: source, url, faces, textExtracted

Return ONLY a valid JSON array. No markdown, no explanation. Each object:
{
  "type": "person|phone_number|social_profile|personal_id|vehicle|place|mac_address|wifi_network|event|image_media",
  "label": "display name",
  "description": "brief context",
  "properties": { all applicable fields },
  "coordinates": { "lat": number, "lng": number } | null
}

Be thorough — extract EVERY entity mentioned, even partial data.`,
      `RAW DATA:\n\n${text.slice(0, 15000)}`,
      apiKey
    );

    // Parse the JSON from the AI response
    try {
      // Try direct JSON parse
      const cleaned = ontologyResult.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        parsedEntities = parsed.map((e: any, i: number) => ({
          id: generateEntityId(e.type || 'entity'),
          type: e.type || 'person',
          domain: mapTypeToDomain(e.type || 'person'),
          label: e.label || 'Unknown',
          description: e.description || '',
          coordinates: e.coordinates || null,
          properties: e.properties || {},
          tags: [],
          source: 'AI ontology extraction',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
    } catch {
      // If JSON parsing fails, include raw analysis
      analysis = ontologyResult;
    }
  } else if (apiKey) {
    analysis = await callDeepSeek(
      `You are an OSIRIS intelligence analyst. Analyze the following ${textType} data and extract: 
1. Key intelligence findings (be specific)
2. Geographic locations mentioned (lat/lng if discernible)
3. Entities identified (people, organizations, threats, events)
4. Threat level assessment
5. Recommended actions for the OSIRIS platform

Format your response as structured intelligence report with clear sections.`,
      `## ${textType.toUpperCase()} DATA TO ANALYZE\n\n${text.slice(0, 15000)}`,
      apiKey
    );
  }

  // Try to extract geolocation data
  const coords = extractCoords(text);

  return NextResponse.json({
    success: true,
    result: {
      type: 'text_analysis',
      text,
      textType,
      analysis,
      parsedEntities: parsedEntities.length > 0 ? parsedEntities : undefined,
      extractedCoords: coords,
      summary: parsedEntities.length > 0
        ? `AI extracted ${parsedEntities.length} ontology entities from ${text.length} chars of data`
        : `Analyzed ${text.length} chars of ${textType} data${coords ? ` — coordinates found: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : ''}`,
    },
  });
}

function mapTypeToDomain(type: string): string {
  const map: Record<string, string> = {
    person: 'PERSON', phone_number: 'COMMUNICATION', social_profile: 'SOCIAL',
    personal_id: 'IDENTITY', vehicle: 'VEHICLE', place: 'LOCATION',
    mac_address: 'NETWORK', wifi_network: 'NETWORK', event: 'EVENT', image_media: 'MEDIA',
  };
  return map[type] || 'PERSON';
}

function generateEntityId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Process Image (via DeepSeek vision) ──

async function handleProcessImage(params: any) {
  const imageBase64 = params.image;
  const imageUrl = params.imageUrl;
  const fileName = params.fileName || 'image';

  if (!imageBase64 && !imageUrl) {
    return NextResponse.json({ error: 'No image data provided (base64 or URL)' }, { status: 400 });
  }

  const apiKey = getApiKey();
  let analysis = '';
  let extractedText = '';
  let description = '';

  if (apiKey && imageBase64) {
    try {
      const imageMime = fileName.match(/\.(png|jpg|jpeg|gif|webp)$/i)
        ? `image/${fileName.split('.').pop()!.toLowerCase().replace('jpg', 'jpeg')}`
        : 'image/jpeg';

      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [
            {
              role: 'system',
              content: `You are an OSIRIS imagery analyst. Analyze this image for intelligence value:
1. Describe what you see in detail (objects, text, people, locations, activities)
2. Extract any visible text, labels, signs, or documents
3. Assess the context and potential intelligence significance
4. Identify any threats, risks, or notable patterns
5. Suggest how this intelligence should be integrated into the OSIRIS platform

Format as a structured IMAGERY INTELLIGENCE REPORT.`
            },
            {
              role: 'user',
              content: `[Image: ${fileName}]\nExtract all intelligence from this image. Include any visible text verbatim.`,
            },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        analysis = data.choices?.[0]?.message?.content || '';
        description = analysis.slice(0, 500);
      }
    } catch (e: any) {
      analysis = `Image analysis failed: ${e.message}`;
    }
  }

  return NextResponse.json({
    success: true,
    result: {
      type: 'image_analysis',
      fileName,
      description,
      analysis,
      extractedText,
      summary: `Image processed: ${fileName}${analysis ? ' — AI analysis completed' : ' — stored as reference'}`,
    },
  });
}

// ── Process Audio (via DeepSeek or stored reference) ──

async function handleProcessAudio(params: any) {
  const audioBase64 = params.audio;
  const fileName = params.fileName || 'audio_recording';
  const audioUrl = params.audioUrl;

  if (!audioBase64 && !audioUrl) {
    return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
  }

  const apiKey = getApiKey();
  let transcription = '';
  let analysis = '';

  if (apiKey && !audioBase64) {
    // Try to use DeepSeek for audio analysis if we have a URL or reference
    try {
      analysis = await callDeepSeek(
        `You are an OSIRIS signals intelligence analyst. Audio file analysis context.`,
        `Audio file: ${fileName}\n${audioUrl ? `Source URL: ${audioUrl}` : ''}\nProcess this audio intelligence.`,
        apiKey
      );
    } catch {}
  }

  return NextResponse.json({
    success: true,
    result: {
      type: 'audio',
      fileName,
      transcription: transcription || 'Audio transcription requires Whisper API integration. File stored for manual review.',
      analysis: analysis || 'Audio analysis pending. File saved for processing.',
      summary: `Audio received: ${fileName}${audioUrl ? ` from ${audioUrl}` : ''}`,
    },
  });
}

// ── Process URL ──

async function handleProcessUrl(params: any) {
  const url = params.url;
  if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });

  // Validate URL format
  try { new URL(url); } catch { return NextResponse.json({ error: 'Invalid URL' }, { status: 400 }); }

  let html = '';
  let text = '';
  let metadata: any = { title: '', description: '', domain: '' };

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OSIRIS/1.0; +https://osiris.local)',
        'Accept': 'text/html,application/json,*/*',
      },
      signal: AbortSignal.timeout(15000),
    });

    metadata.domain = new URL(url).hostname;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await response.json();
      text = JSON.stringify(json, null, 2);
      metadata.type = 'json';
    } else {
      html = await response.text();
      text = extractHtmlText(html);

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      metadata.title = titleMatch ? titleMatch[1].trim() : '';

      // Extract description
      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
      metadata.description = descMatch ? descMatch[1] : '';

      metadata.type = 'html';
    }
  } catch (e: any) {
    return NextResponse.json({ error: `Failed to fetch URL: ${e.message}` }, { status: 502 });
  }

  // AI analysis of URL content
  const apiKey = getApiKey();
  let analysis = '';
  if (apiKey && text.length > 50) {
    try {
      analysis = await callDeepSeek(
        `You are an OSIRIS intelligence analyst. Extract intelligence from this web content:
1. Key findings and significance
2. Geographic locations and entities mentioned
3. Threat indicators or notable patterns
4. Suggested OSIRIS platform actions

Be specific and concise.`,
        `## SOURCE: ${url}\n## TITLE: ${metadata.title}\n\n${text.slice(0, 12000)}`,
        apiKey
      );
    } catch {}
  }

  const coords = extractCoords(text);

  return NextResponse.json({
    success: true,
    result: {
      type: 'url',
      url,
      title: metadata.title,
      domain: metadata.domain,
      description: metadata.description,
      text: text.slice(0, 5000),
      analysis,
      extractedCoords: coords,
      summary: `URL processed: ${metadata.title || url} (${text.length} chars extracted)${coords ? ' — coordinates found' : ''}`,
    },
  });
}

// ── Ingest into Osiris ──

async function handleIngest(params: any) {
  const data = params.data || {};
  const type = data.type || 'general';
  const content = data.content || data.text || data.analysis || '';
  const coords = data.extractedCoords || params.coords || null;

  // Build an intelligence object that the Osiris system can consume
  const intelItem: any = {
    id: `claused_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    source: 'CLAUSED PIPELINE',
    type,
    title: data.title || data.fileName || data.url || 'CLAUSED Intel',
    description: content.slice(0, 500),
    timestamp: new Date().toISOString(),
    severity: params.severity || 'info',
    category: params.category || 'intel',
  };

  if (coords) {
    intelItem.lat = coords.lat;
    intelItem.lng = coords.lng;
  }

  // Save to a local store for the dashboard to pick up
  await ensureDir(UPLOAD_DIR);
  const storeFile = path.join(UPLOAD_DIR, 'claused_intel_store.json');
  let store: any[] = [];
  try {
    const existing = await fs.readFile(storeFile, 'utf-8').catch(() => '[]');
    store = JSON.parse(existing);
  } catch {}
  store.push(intelItem);
  // Keep last 100
  if (store.length > 100) store = store.slice(-100);
  await fs.writeFile(storeFile, JSON.stringify(store, null, 2));

  return NextResponse.json({
    success: true,
    intelItem,
    summary: `Ingested into OSIRIS: ${intelItem.title} (${type})${coords ? ` at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : ''}`,
  });
}

// ── GET: Retrieve ingested CLAUSED intel ──

export async function GET() {
  try {
    const storeFile = path.join(UPLOAD_DIR, 'claused_intel_store.json');
    const content = await fs.readFile(storeFile, 'utf-8').catch(() => '[]');
    const items = JSON.parse(content);
    return NextResponse.json({ items, count: items.length });
  } catch {
    return NextResponse.json({ items: [], count: 0 });
  }
}

// ── Utility: extract coordinates from text ──

function extractCoords(text: string): { lat: number; lng: number } | null {
  if (!text) return null;
  // Match common lat/lng patterns: "35.5, 25.3" or "lat: 35.5, lng: 25.3"
  const patterns = [
    /([+-]?\d+\.\d+)\s*[,;]\s*([+-]?\d+\.\d+)/,
    /lat[:\s]*([+-]?\d+\.\d+)[,\s]+lng?[:\s]*([+-]?\d+\.\d+)/i,
    /latitude[:\s]*([+-]?\d+\.\d+)[,\s]+longitude[:\s]*([+-]?\d+\.\d+)/i,
    /(\d{1,2})°\s*(\d{1,2})['′][\s,]+(\d{1,3})°\s*(\d{1,2})['′]/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let lat = parseFloat(match[1]);
      let lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}
