import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outDir = path.join(process.cwd(), 'docs', 'data');
const layersDir = path.join(outDir, 'layers');
await mkdir(outDir, { recursive: true });
await mkdir(layersDir, { recursive: true });

const UA = 'osiris-v2-pages-cache/2.0 (+https://github.com/DeerSpotter/osiris-v2)';
const OSIRIS = 'https://osirisai.live';

const layerGroups = [
  { key: 'sdk', label: 'SDK lattice', layers: ['sdk_sea', 'sdk_air', 'sdk_naval'] },
  { key: 'aviation', label: 'Aviation', layers: ['flights', 'private', 'jets', 'military', 'balloons'] },
  { key: 'maritime_space', label: 'Maritime + space', layers: ['maritime', 'satellites', 'cables'] },
  { key: 'surveillance', label: 'Surveillance', layers: ['cctv', 'live_news', 'news_intel'] },
  { key: 'hazards', label: 'Hazards', layers: ['earthquakes', 'fires', 'weather', 'radiation'] },
  { key: 'intel_infra', label: 'Intel + infrastructure', layers: ['infrastructure', 'global_incidents', 'gps_jamming', 'network_intel'] },
  { key: 'display', label: 'Display', layers: ['day_night'] }
];

const layerDefs = [
  { key: 'sdk_sea', label: 'SDK sea mesh', group: 'sdk', tone: 'blue', defaultOn: true, routeLayer: true },
  { key: 'sdk_air', label: 'SDK air lattice', group: 'sdk', tone: 'cyan', defaultOn: true },
  { key: 'sdk_naval', label: 'SDK naval lattice', group: 'sdk', tone: 'cyan', defaultOn: true },
  { key: 'flights', label: 'Flights', group: 'aviation', tone: 'cyan' },
  { key: 'private', label: 'Private flights', group: 'aviation', tone: 'gold' },
  { key: 'jets', label: 'Jets', group: 'aviation', tone: 'gold' },
  { key: 'military', label: 'Military aviation', group: 'aviation', tone: 'red' },
  { key: 'balloons', label: 'Balloons', group: 'aviation', tone: 'gold' },
  { key: 'maritime', label: 'Maritime', group: 'maritime_space', tone: 'cyan', defaultOn: true },
  { key: 'satellites', label: 'Satellites', group: 'maritime_space', tone: 'gold' },
  { key: 'cables', label: 'Cable routes', group: 'maritime_space', tone: 'blue', defaultOn: true, routeLayer: true },
  { key: 'cctv', label: 'CCTV feeds', group: 'surveillance', tone: 'green', defaultOn: true },
  { key: 'live_news', label: 'Live news', group: 'surveillance', tone: 'green', defaultOn: true },
  { key: 'news_intel', label: 'News intel', group: 'surveillance', tone: 'magenta', defaultOn: true },
  { key: 'earthquakes', label: 'Earthquakes', group: 'hazards', tone: 'orange', defaultOn: true },
  { key: 'fires', label: 'Fires', group: 'hazards', tone: 'red' },
  { key: 'weather', label: 'Weather', group: 'hazards', tone: 'cyan' },
  { key: 'radiation', label: 'Radiation', group: 'hazards', tone: 'orange' },
  { key: 'infrastructure', label: 'Infrastructure', group: 'intel_infra', tone: 'gold' },
  { key: 'global_incidents', label: 'Global incidents', group: 'intel_infra', tone: 'magenta', defaultOn: true },
  { key: 'gps_jamming', label: 'GPS interference', group: 'intel_infra', tone: 'red' },
  { key: 'network_intel', label: 'Network intel', group: 'intel_infra', tone: 'red' },
  { key: 'day_night', label: 'Day/night overlay', group: 'display', tone: 'gold', defaultOn: true, displayOnly: true }
];
const layerKeys = layerDefs.map((layer) => layer.key);
const layerStore = Object.fromEntries(layerKeys.map((key) => [key, { schema: 1, layer: key, generatedAt: '', nodes: [], routes: [], panel: [] }]));

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

const sources = await Promise.all([
  fetchJson(`${OSIRIS}/api/earthquakes`, {}),
  fetchJson(`${OSIRIS}/api/cctv?region=all&v=2`, {}),
  fetchJson(`${OSIRIS}/api/live-news`, {}),
  fetchJson(`${OSIRIS}/api/maritime`, {}),
  fetchJson(`${OSIRIS}/api/news`, {}),
  fetchJson(`${OSIRIS}/api/gdelt`, {}),
  fetchJson(`${OSIRIS}/api/flights`, {}),
  fetchJson(`${OSIRIS}/api/satellites`, {}),
  fetchJson(`${OSIRIS}/api/balloons`, {}),
  fetchJson(`${OSIRIS}/api/fires`, {}),
  fetchJson(`${OSIRIS}/api/weather`, {}),
  fetchJson(`${OSIRIS}/api/radiation`, {}),
  fetchJson(`${OSIRIS}/api/infrastructure`, {}),
  fetchJson(`${OSIRIS}/api/markets`, {}),
  fetchJson(`${OSIRIS}/api/country-risk`, {}),
  fetchJson(`${OSIRIS}/api/cyber-threats`, {}),
  fetchJson(`${OSIRIS}/api/space-weather`, {})
]);
const [earthquakes, cctv, liveNews, maritime, news, gdelt, flights, satellites, balloons, fires, weather, radiation, infrastructure, markets, countryRisk, cyberThreats, spaceWeather] = sources;

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
function firstText(item, keys) {
  for (const key of keys) if (item?.[key]) return String(item[key]);
  return '';
}
function coordsOf(item) {
  const lat = num(item.lat ?? item.latitude ?? item.location?.lat ?? item.coords?.[0] ?? item.geometry?.coordinates?.[1]);
  const lon = num(item.lon ?? item.lng ?? item.longitude ?? item.location?.lon ?? item.location?.lng ?? item.coords?.[1] ?? item.geometry?.coordinates?.[0]);
  return lat === null || lon === null ? null : { lat, lon };
}
function addNode(layer, item, opts = {}) {
  if (!layerStore[layer]) return;
  const coords = coordsOf(item);
  if (!coords) return;
  layerStore[layer].nodes.push({
    lat: coords.lat,
    lon: coords.lon,
    layer,
    tone: opts.tone || item.tone || layerDefs.find((l) => l.key === layer)?.tone || 'green',
    size: opts.size || item.size || 3.6,
    label: opts.label ?? firstText(item, ['label', 'name', 'title', 'flight', 'id', 'place']),
    source: opts.source || item.source || layer,
    url: opts.url || item.url || item.link || '',
    priority: !!opts.priority
  });
}
function addPanel(layer, item, opts = {}) {
  if (!layerStore[layer]) return;
  layerStore[layer].panel.push({
    title: opts.title || firstText(item, ['title', 'name', 'label', 'country', 'symbol', 'id']) || layerDefs.find((l) => l.key === layer)?.label || layer,
    meta: opts.meta || firstText(item, ['status', 'summary', 'description', 'severity', 'type']) || '',
    value: opts.value || item.value || item.score || item.count || '',
    url: opts.url || item.url || item.link || ''
  });
}

for (const cam of pickArray(cctv, ['cameras', 'feeds']).slice(0, 1000)) addNode('cctv', cam, { tone: 'green', size: 3.5, source: 'OSIRIS CCTV' });
for (const item of pickArray(liveNews, ['feeds', 'items']).slice(0, 300)) addNode('live_news', item, { tone: 'green', size: 3.8, source: 'OSIRIS live news' });
for (const item of pickArray(news, ['news', 'items', 'articles']).slice(0, 300)) { addNode('news_intel', item, { tone: 'magenta', size: 3.2, source: 'OSIRIS news intel' }); addPanel('news_intel', item); }
for (const event of pickArray(gdelt, ['events', 'items']).slice(0, 350)) { addNode('global_incidents', event, { tone: 'magenta', size: 3.0, source: 'OSIRIS GDELT' }); addPanel('global_incidents', event); }
for (const item of pickArray(maritime, ['ports']).slice(0, 220)) addNode('maritime', item, { tone: item.type === 'naval' ? 'red' : 'cyan', size: 3.6, source: 'OSIRIS maritime ports' });
for (const item of pickArray(maritime, ['chokepoints']).slice(0, 100)) addNode('maritime', item, { tone: 'gold', size: 4.2, label: item.name, source: 'OSIRIS maritime chokepoints', priority: true });
for (const item of pickArray(maritime, ['ships']).slice(0, 400)) addNode('maritime', item, { tone: item.type === 'military' ? 'red' : 'cyan', size: 3.0, source: 'OSIRIS maritime ships' });
for (const event of pickArray(earthquakes, ['earthquakes', 'features']).slice(0, 300)) addNode('earthquakes', event, { tone: 'orange', size: Math.min(8, 2.5 + Number(event.magnitude || event.mag || 0)), label: (event.magnitude || event.mag) ? `M${event.magnitude || event.mag}` : '', source: 'OSIRIS earthquakes', priority: Number(event.magnitude || event.mag || 0) >= 5 });

for (const flight of pickArray(flights, ['flights', 'aircraft', 'items']).slice(0, 650)) {
  const text = `${flight.category || ''} ${flight.type || ''} ${flight.owner || ''} ${flight.callsign || ''}`.toLowerCase();
  const layer = text.includes('mil') ? 'military' : text.includes('private') ? 'private' : text.includes('jet') ? 'jets' : 'flights';
  addNode(layer, flight, { tone: layer === 'military' ? 'red' : layer === 'flights' ? 'cyan' : 'gold', size: 3.0, source: 'OSIRIS aviation' });
}
for (const sat of pickArray(satellites, ['satellites', 'items']).slice(0, 420)) addNode('satellites', sat, { tone: 'gold', size: 2.8, source: 'OSIRIS satellites' });
for (const item of pickArray(balloons, ['balloons', 'items']).slice(0, 160)) addNode('balloons', item, { tone: 'gold', size: 3.6, source: 'OSIRIS balloons' });
for (const fire of pickArray(fires, ['fires', 'features', 'items']).slice(0, 500)) addNode('fires', fire, { tone: 'red', size: 3.3, source: 'OSIRIS fires' });
for (const item of pickArray(weather, ['storms', 'weather', 'alerts', 'items']).slice(0, 280)) { addNode('weather', item, { tone: 'cyan', size: 3.2, source: 'OSIRIS weather' }); addPanel('weather', item); }
for (const item of pickArray(radiation, ['stations', 'readings', 'items']).slice(0, 220)) addNode('radiation', item, { tone: 'orange', size: 3.2, source: 'OSIRIS radiation' });
for (const item of pickArray(infrastructure, ['assets', 'infrastructure', 'items']).slice(0, 350)) addNode('infrastructure', item, { tone: 'gold', size: 3.2, source: 'OSIRIS infrastructure' });
for (const item of pickArray(spaceWeather, ['events', 'alerts', 'items']).slice(0, 80)) addPanel('satellites', item, { title: firstText(item, ['title', 'name']) || 'Space weather', meta: firstText(item, ['summary', 'description', 'severity']) });
for (const item of pickArray(markets, ['markets', 'items', 'events']).slice(0, 80)) addPanel('maritime', item);
for (const item of pickArray(countryRisk, ['countries', 'exchanges', 'items']).slice(0, 120)) addPanel('global_incidents', item);
for (const item of pickArray(cyberThreats, ['threats', 'items', 'cves']).slice(0, 120)) addPanel('network_intel', item);

function resample(line, maxPoints = 96) {
  const clean = line.map((p) => [num(p[0]), num(p[1])]).filter(([lon, lat]) => lon !== null && lat !== null);
  if (clean.length <= 1) return [];
  const step = Math.max(1, Math.ceil(clean.length / maxPoints));
  const out = clean.filter((_, i) => i % step === 0);
  const last = clean.at(-1);
  if (out.at(-1)?.[0] !== last[0] || out.at(-1)?.[1] !== last[1]) out.push(last);
  return out;
}
for (const feature of cableData.features || []) {
  const geometry = feature.geometry;
  const lines = geometry?.type === 'LineString' ? [geometry.coordinates] : geometry?.type === 'MultiLineString' ? geometry.coordinates : [];
  for (const line of lines) {
    const coordinates = resample(line, 90);
    if (coordinates.length > 1) {
      const route = { coordinates, layer: 'sdk_sea', color: 'rgba(25,128,205,.34)', width: 0.75, alpha: 0.34, source: 'OSIRIS submarine cable data' };
      layerStore.sdk_sea.routes.push(route);
      layerStore.cables.routes.push({ ...route, layer: 'cables', alpha: 0.18, width: 0.55 });
    }
  }
  if (layerStore.sdk_sea.routes.length >= 1000) break;
}

function spatialSample(items, limit, degrees = 6) {
  const selected = [];
  const seen = new Set();
  for (const item of items.filter((n) => n.priority)) {
    selected.push(item);
    if (selected.length >= limit) return selected;
  }
  for (const item of items) {
    const key = `${Math.floor((item.lat + 90) / degrees)}:${Math.floor((item.lon + 180) / degrees)}:${item.tone || ''}:${item.layer || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!selected.includes(item)) selected.push(item);
    if (selected.length >= limit) return selected;
  }
  for (const item of items) {
    if (!selected.includes(item)) selected.push(item);
    if (selected.length >= limit) return selected;
  }
  return selected;
}

const generatedAt = new Date().toISOString();
const allNodes = layerKeys.flatMap((key) => layerStore[key].nodes);
const allRoutes = layerKeys.flatMap((key) => layerStore[key].routes);
for (const key of layerKeys) {
  const filePayload = { ...layerStore[key], generatedAt };
  await writeFile(path.join(layersDir, `${key}.json`), JSON.stringify(filePayload));
}

const liteNodes = spatialSample(allNodes, 520, 5).map((n) => ({ ...n, label: n.priority ? n.label : '' }));
const liteRoutes = allRoutes.map((r) => ({ ...r, width: r.width ?? 0.68, alpha: r.alpha ?? 0.32, coordinates: resample(r.coordinates, 28) })).filter((r) => r.coordinates.length > 1);

const manifest = {
  schema: 2,
  generatedAt,
  source: 'DeerSpotter/osiris-v2 static Pages layer cache generated from OSIRIS routes and repository data',
  groups: layerGroups,
  layers: layerDefs.map((layer) => ({
    ...layer,
    count: layerStore[layer.key].nodes.length,
    routeCount: layerStore[layer.key].routes.length,
    panelCount: layerStore[layer.key].panel.length,
    file: `layers/${layer.key}.json`
  })),
  counts: { totalNodes: allNodes.length, totalRoutes: allRoutes.length }
};

const payload = {
  schema: 2,
  generatedAt,
  source: manifest.source,
  counts: manifest.counts,
  nodes: allNodes,
  routes: allRoutes,
  layers: manifest.layers
};
const litePayload = {
  schema: 2,
  generatedAt,
  source: `${manifest.source}; lightweight startup subset with cable mesh`,
  counts: { ...manifest.counts, includedNodes: liteNodes.length, includedRoutes: liteRoutes.length },
  nodes: liteNodes,
  routes: liteRoutes,
  layers: manifest.layers
};

await writeFile(path.join(outDir, 'layer-manifest.json'), JSON.stringify(manifest));
await writeFile(path.join(outDir, 'live-globe.json'), JSON.stringify(payload));
await writeFile(path.join(outDir, 'live-globe-lite.json'), JSON.stringify(litePayload));
console.log(`[cache] wrote ${allNodes.length} nodes, ${allRoutes.length} routes, and ${layerKeys.length} split layers`);
