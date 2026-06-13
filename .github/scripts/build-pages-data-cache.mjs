import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outDir = path.join(process.cwd(), 'docs', 'data');
await mkdir(outDir, { recursive: true });

const UA = 'osiris-v2-pages-cache/1.0 (+https://github.com/DeerSpotter/osiris-v2)';
const OSIRIS = 'https://osirisai.live';

async function fetchJson(url, fallback = null) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return await res.json();
  } catch (error) {
    console.warn(`[cache] ${error.message}`);
    return fallback;
  }
}

async function mirror(url, filename) {
  const json = await fetchJson(url);
  if (json) await writeFile(path.join(outDir, filename), JSON.stringify(json));
}

await Promise.all([
  mirror('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json', 'countries-110m.json'),
  mirror('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json', 'states-10m.json')
]);

const [earthquakes, cctv, liveNews, maritime, news, gdelt] = await Promise.all([
  fetchJson(`${OSIRIS}/api/earthquakes`, {}),
  fetchJson(`${OSIRIS}/api/cctv?region=all&v=2`, {}),
  fetchJson(`${OSIRIS}/api/live-news`, {}),
  fetchJson(`${OSIRIS}/api/maritime`, {}),
  fetchJson(`${OSIRIS}/api/news`, {}),
  fetchJson(`${OSIRIS}/api/gdelt`, {})
]);

let cableData = { type: 'FeatureCollection', features: [] };
try {
  cableData = JSON.parse(await readFile(path.join(process.cwd(), 'public', 'data', 'submarine-cables.json'), 'utf8'));
  await writeFile(path.join(outDir, 'submarine-cables.json'), JSON.stringify(cableData));
} catch (error) {
  console.warn(`[cache] cables unavailable: ${error.message}`);
}

function pickArray(value, keys) {
  if (Array.isArray(value)) return value;
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key];
  return [];
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function addNode(nodes, item, opts = {}) {
  const lat = num(item.lat ?? item.latitude ?? item.coords?.[0]);
  const lon = num(item.lon ?? item.lng ?? item.longitude ?? item.coords?.[1]);
  if (lat === null || lon === null) return;
  nodes.push({
    lat, lon,
    tone: opts.tone || item.tone || 'green',
    size: opts.size || item.size || 3.6,
    label: opts.label ?? item.label ?? item.name ?? '',
    source: opts.source || item.source || '',
    priority: !!opts.priority
  });
}

const nodes = [];
for (const cam of pickArray(cctv, ['cameras', 'feeds']).slice(0, 900)) addNode(nodes, cam, { tone: 'green', size: 3.5, source: 'OSIRIS CCTV' });
for (const f of pickArray(liveNews, ['feeds']).slice(0, 250)) addNode(nodes, f, { tone: 'green', size: 3.8, source: 'OSIRIS live news' });
for (const p of pickArray(maritime, ['ports']).slice(0, 180)) addNode(nodes, p, { tone: p.type === 'naval' ? 'red' : 'cyan', size: 3.6, source: 'OSIRIS maritime ports' });
for (const c of pickArray(maritime, ['chokepoints']).slice(0, 80)) addNode(nodes, c, { tone: 'gold', size: 4.2, label: c.name, source: 'OSIRIS maritime chokepoints', priority: true });
for (const s of pickArray(maritime, ['ships']).slice(0, 350)) addNode(nodes, s, { tone: s.type === 'military' ? 'red' : 'cyan', size: 3.0, source: 'OSIRIS maritime ships' });
for (const e of pickArray(earthquakes, ['earthquakes']).slice(0, 250)) addNode(nodes, e, { tone: 'orange', size: Math.min(8, 2.5 + Number(e.magnitude || 0)), label: e.magnitude >= 4.5 ? `M${e.magnitude}` : '', source: 'OSIRIS earthquakes', priority: e.magnitude >= 5 });
for (const n of pickArray(news, ['news', 'items']).slice(0, 250)) addNode(nodes, n, { tone: 'magenta', size: 3.2, source: 'OSIRIS news intel' });
for (const g of pickArray(gdelt, ['events']).slice(0, 250)) addNode(nodes, g, { tone: 'magenta', size: 3.0, source: 'OSIRIS GDELT' });

function resample(line, maxPoints = 96) {
  const clean = line.map((p) => [num(p[0]), num(p[1])]).filter(([lon, lat]) => lon !== null && lat !== null);
  if (clean.length <= 1) return [];
  const step = Math.max(1, Math.ceil(clean.length / maxPoints));
  const out = clean.filter((_, i) => i % step === 0);
  const last = clean.at(-1);
  if (out.at(-1)?.[0] !== last[0] || out.at(-1)?.[1] !== last[1]) out.push(last);
  return out;
}

const routes = [];
for (const feature of cableData.features || []) {
  const geometry = feature.geometry;
  const lines = geometry?.type === 'LineString' ? [geometry.coordinates] : geometry?.type === 'MultiLineString' ? geometry.coordinates : [];
  for (const line of lines) {
    const coordinates = resample(line, 90);
    if (coordinates.length > 1) routes.push({ coordinates, color: 'rgba(25,128,205,.34)', width: 0.75, alpha: 0.34, source: 'OSIRIS submarine cable data' });
  }
  if (routes.length >= 1000) break;
}

const payload = {
  schema: 1,
  generatedAt: new Date().toISOString(),
  source: 'DeerSpotter/osiris-v2 Pages data cache generated from existing OSIRIS routes and public repository data',
  counts: { totalNodes: nodes.length, totalRoutes: routes.length },
  nodes,
  routes
};

await writeFile(path.join(outDir, 'live-globe.json'), JSON.stringify(payload));
console.log(`[cache] wrote ${nodes.length} nodes and ${routes.length} routes`);
