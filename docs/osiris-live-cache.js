'use strict';

const $ = (id) => document.getElementById(id);
const canvas = $('globeCanvas');
const ctx = canvas.getContext('2d');
const readout = $('readout');
const eventTitle = $('eventTitle');
const eventMeta = $('eventMeta');
const feedCount = $('feedCount');
const systemState = $('systemState');
const locateBtn = $('locateBtn');
const orbitBtn = $('orbitBtn');
const zulu = $('zulu');
const boot = $('boot');
const bootSequence = $('bootSequence');

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const VERSION = '20260613-pages-live-cache';
const scriptBase = new URL('.', document.currentScript?.src || location.href);
const dataBase = new URL('data/', scriptBase);
const dataUrl = (name) => new URL(name, dataBase).href;
const urls = {
  world: dataUrl('countries-110m.json'),
  states: dataUrl('states-10m.json'),
  live: dataUrl('live-globe.json'),
  worldCdn: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
  statesCdn: 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'
};

const palette = {
  ocean0: '#3b4d57',
  ocean1: '#283640',
  ocean2: '#111923',
  land: '#05080a',
  coast: 'rgba(176,190,198,.36)',
  country: 'rgba(73,159,219,.58)',
  state: 'rgba(218,184,55,.72)',
  route: 'rgba(25,128,205,.34)'
};

const model = {
  world: [],
  states: [],
  nodes: [],
  routes: [],
  liveAt: null,
  ready: { world: false, states: false, live: false },
  showRoutes: true,
  view: { lon: -62, lat: 22, targetLon: -62, targetLat: 22, zoom: 1 },
  pointer: { dragging: false, id: null, x: 0, y: 0, map: new Map(), pinchDistance: 1, pinchZoom: 1 },
  size: { w: 0, h: 0, dpr: 1, cx: 0, cy: 0, r: 0 }
};

const fallbackWorld = [
  { rings: [[[-168,72],[-135,61],[-123,42],[-106,27],[-86,24],[-73,41],[-56,57],[-94,70],[-148,73],[-168,72]]] },
  { rings: [[[-81,12],[-61,2],[-44,-18],[-55,-43],[-67,-55],[-76,-28],[-81,12]]] },
  { rings: [[[-17,35],[27,31],[50,2],[31,-34],[2,-24],[-17,18],[-17,35]]] },
  { rings: [[[-11,36],[2,59],[37,62],[44,49],[33,39],[18,36],[4,41],[-11,36]]] },
  { rings: [[[35,32],[70,56],[128,62],[160,49],[151,31],[105,8],[69,18],[35,32]]] },
  { rings: [[[113,-12],[133,-10],[153,-24],[147,-39],[122,-38],[112,-28],[113,-12]]] }
];

const fallbackNodes = [
  { lat: 39.9, lon: -75.1, tone: 'green', size: 4.2, label: 'CACHE PENDING', priority: true },
  { lat: 40.7, lon: -74.0, tone: 'green', size: 3.8 },
  { lat: 51.5, lon: -0.1, tone: 'green', size: 3.8 },
  { lat: -23.5, lon: -46.6, tone: 'green', size: 3.8 }
];
model.world = fallbackWorld;
model.nodes = fallbackNodes;

function pad(v) { return String(v).padStart(2, '0'); }
function tickZulu() {
  const now = new Date();
  if (zulu) zulu.textContent = `ZULU ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}Z`;
}
tickZulu();
setInterval(tickZulu, 1000);

let bootStep = 0;
const bootLines = ['LOADING LOCAL CACHE...', 'FETCHING OSIRIS REPO DATA...', 'STAGING RECON LAYERS...', 'RECON ONLINE'];
const bootTimer = setInterval(() => {
  bootStep += 1;
  if (bootSequence) bootSequence.textContent = bootLines[Math.min(bootStep, bootLines.length - 1)];
  if (bootStep >= bootLines.length - 1) {
    clearInterval(bootTimer);
    setTimeout(() => boot?.classList.add('hide'), 350);
  }
}, 320);

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function normLon(lon) { return ((lon + 540) % 360) - 180; }
function tone(t, a = 1) {
  return ({
    green: `rgba(0,240,138,${a})`, orange: `rgba(213,106,0,${a})`, red: `rgba(221,39,49,${a})`,
    magenta: `rgba(232,59,127,${a})`, cyan: `rgba(36,220,233,${a})`, gold: `rgba(215,183,57,${a})`,
    blue: `rgba(25,128,205,${a})`
  })[t] || `rgba(0,240,138,${a})`;
}

function cacheKey(url) { return `osiris-pages:${VERSION}:${url}`; }
function readCache(url, ttl) {
  try {
    const raw = localStorage.getItem(cacheKey(url));
    if (!raw) return null;
    const cached = JSON.parse(raw);
    return Date.now() - cached.t < ttl ? cached.v : null;
  } catch { return null; }
}
function writeCache(url, value) {
  try { localStorage.setItem(cacheKey(url), JSON.stringify({ t: Date.now(), v: value })); } catch {}
}
async function loadJson(url, ttl, fallback) {
  const cached = readCache(url, ttl);
  if (cached) return cached;
  for (const candidate of [url, fallback].filter(Boolean)) {
    try {
      const bust = ttl < 3600000 ? `?t=${Math.floor(Date.now() / ttl)}` : '';
      const res = await fetch(candidate + bust, { cache: ttl < 3600000 ? 'no-cache' : 'force-cache' });
      if (!res.ok) throw new Error(`${res.status} ${candidate}`);
      const json = await res.json();
      writeCache(url, json);
      return json;
    } catch {}
  }
  throw new Error(`Failed to load ${url}`);
}

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  model.size.w = innerWidth; model.size.h = innerHeight; model.size.dpr = dpr;
  canvas.width = Math.floor(innerWidth * dpr); canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const mobile = innerWidth < 760;
  model.size.cx = mobile ? innerWidth * .48 : innerWidth * .52;
  model.size.cy = mobile ? innerHeight * .50 : innerHeight * .53;
  const base = mobile ? innerWidth * .72 : Math.min(innerWidth, innerHeight) * .44;
  const max = Math.max(innerWidth, innerHeight) * (mobile ? 1.62 : 1.34);
  model.size.r = clamp(base * model.view.zoom, 220, max);
}

function project(lat, lon, lift = 1) {
  const phi = lat * DEG;
  const lam = normLon(lon - model.view.lon) * DEG;
  const c = Math.cos(phi);
  const x = c * Math.sin(lam);
  const y = Math.sin(phi);
  const z = c * Math.cos(lam);
  const tilt = model.view.lat * DEG;
  const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
  const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
  return { x: model.size.cx + model.size.r * lift * x, y: model.size.cy - model.size.r * lift * y2, z: z2, visible: z2 > -.04 };
}

function pathRing(ring) {
  let drawing = false, visible = 0;
  for (const [lon, lat] of ring) {
    const p = project(lat, lon);
    if (!p.visible) { drawing = false; continue; }
    visible += 1;
    if (!drawing) { ctx.moveTo(p.x, p.y); drawing = true; }
    else ctx.lineTo(p.x, p.y);
  }
  return visible;
}

function drawRings(features, stroke, width, fill, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineWidth = width; ctx.strokeStyle = stroke;
  for (const f of features) {
    ctx.beginPath();
    let visible = 0;
    for (const ring of f.rings) visible += pathRing(ring);
    if (visible > 2) {
      if (fill) { ctx.fillStyle = fill; ctx.fill('evenodd'); }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function lod() {
  const z = model.view.zoom;
  return {
    country: clamp((z - 1.04) / .48, 0, .72),
    state: model.ready.states ? clamp((z - 1.68) / .72, 0, .82) : 0,
    route: clamp(1.12 - (z - 1) * .22, .18, 1),
    node: clamp(1.16 - (z - 1) * .12, .72, 1.14),
    grid: clamp((z - 1.55) / .62, 0, .28)
  };
}

function drawGrid() {
  const d = lod();
  for (let lat = -60; lat <= 75; lat += 15) {
    const pts = []; for (let lon = -180; lon <= 180; lon += 3) pts.push([lon, lat]);
    drawLine(pts, 'rgba(38,132,198,.14)', .75);
  }
  for (let lon = -180; lon <= 180; lon += 15) {
    const pts = []; for (let lat = -80; lat <= 80; lat += 3) pts.push([lon, lat]);
    drawLine(pts, 'rgba(38,132,198,.14)', .75);
  }
  if (d.grid > 0) {
    for (let lon = -180; lon <= 180; lon += 5) {
      const pts = []; for (let lat = -80; lat <= 80; lat += 2) pts.push([lon, lat]);
      drawLine(pts, `rgba(38,132,198,${d.grid})`, .34);
    }
  }
}

function drawLine(coords, color, width = 1, alpha = 1, lift = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
  let drawing = false, visible = 0;
  for (const [lon, lat] of coords) {
    const p = project(lat, lon, lift);
    if (!p.visible) { drawing = false; continue; }
    visible += 1;
    if (!drawing) { ctx.moveTo(p.x, p.y); drawing = true; }
    else ctx.lineTo(p.x, p.y);
  }
  if (visible > 1) ctx.stroke();
  ctx.restore();
}

function drawRoutes() {
  if (!model.showRoutes) return;
  const d = lod();
  const max = model.view.zoom > 2.4 ? 950 : model.view.zoom > 1.5 ? 700 : 520;
  for (let i = 0; i < Math.min(model.routes.length, max); i += 1) {
    const r = model.routes[i];
    drawLine(r.coordinates, r.color || palette.route, r.width || .75, (r.alpha ?? .34) * d.route, 1.006);
  }
}

function drawNodes() {
  const d = lod();
  const max = model.view.zoom > 2.2 ? 1400 : model.view.zoom > 1.4 ? 1000 : 720;
  for (let i = 0; i < Math.min(model.nodes.length, max); i += 1) {
    const n = model.nodes[i];
    const p = project(n.lat, n.lon, 1.015);
    if (!p.visible) continue;
    const c = tone(n.tone, 1);
    const s = (n.size || 3.6) * d.node;
    ctx.save(); ctx.fillStyle = c; ctx.strokeStyle = 'rgba(4,7,10,.88)'; ctx.lineWidth = 2;
    ctx.shadowColor = c; ctx.shadowBlur = s > 5 ? 20 : 9;
    ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TWO_PI); ctx.fill(); ctx.stroke();
    if (n.label && (model.view.zoom < 2.55 || n.priority)) {
      ctx.shadowBlur = 8; ctx.font = '600 13px ui-monospace,SFMono-Regular,Menlo,monospace';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(n.label, p.x + 8, p.y + 13);
      ctx.fillStyle = c; ctx.fillText(n.label, p.x + 8, p.y + 13);
    }
    ctx.restore();
  }
}

function drawLabels() {
  if (model.view.zoom < .92) return;
  const alpha = clamp((model.view.zoom - .92) / .52, 0, .68);
  const labels = [
    ['NORTH\nAMERICA', 38, -103, 28], ['EUROPE', 50, 14, 24], ['SOUTH\nAMERICA', -18, -58, 20], ['AFRICA', 5, 20, 22], ['ASIA', 43, 88, 24]
  ];
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = 'rgba(221,232,239,.68)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = 8;
  for (const [text, lat, lon, size0] of labels) {
    const p = project(lat, lon, 1.018); if (!p.visible) continue;
    const size = size0 * clamp(1.14 - (model.view.zoom - 1) * .16, .72, 1.12);
    ctx.font = `800 ${size}px ui-monospace,SFMono-Regular,Menlo,monospace`;
    text.split('\n').forEach((line, i, arr) => ctx.fillText(line, p.x, p.y + (i - (arr.length - 1) / 2) * (size + 2)));
  }
  ctx.restore();
}

function drawGlobe(time) {
  const g = ctx.createRadialGradient(model.size.cx - model.size.r * .35, model.size.cy - model.size.r * .55, model.size.r * .15, model.size.cx, model.size.cy, model.size.r);
  g.addColorStop(0, palette.ocean0); g.addColorStop(.54, palette.ocean1); g.addColorStop(1, palette.ocean2);
  ctx.save(); ctx.beginPath(); ctx.arc(model.size.cx, model.size.cy, model.size.r, 0, TWO_PI); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(42,117,168,.42)'; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.clip(); drawGrid(); drawRings(model.world, palette.coast, .82, palette.land); 
  const d = lod();
  if (d.country) drawRings(model.world, palette.country, .35 + model.view.zoom * .1, null, d.country);
  if (d.state) drawRings(model.states, palette.state, .42 + model.view.zoom * .12, null, d.state);
  drawRoutes(); drawNodes(); drawLabels();
  const shade = ctx.createRadialGradient(model.size.cx + model.size.r * .35, model.size.cy + model.size.r * .05, model.size.r * .15, model.size.cx + model.size.r * .45, model.size.cy + model.size.r * .08, model.size.r * 1.1);
  shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(.52, 'rgba(0,0,0,.1)'); shade.addColorStop(1, 'rgba(0,0,0,.64)');
  ctx.fillStyle = shade; ctx.fillRect(model.size.cx - model.size.r, model.size.cy - model.size.r, model.size.r * 2, model.size.r * 2);
  ctx.restore();

  ctx.save(); ctx.translate(model.size.cx, model.size.cy); ctx.rotate(time * .00008);
  for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.ellipse(0, 0, model.size.r * (1.05 + i * .024), model.size.r * (.78 + i * .014), i * .18, 0, TWO_PI); ctx.strokeStyle = `rgba(21,124,203,${.16 - i * .012})`; ctx.lineWidth = .8; ctx.stroke(); }
  ctx.restore();
}

function frame(time = 0) {
  model.view.lon += (model.view.targetLon - model.view.lon) * .08;
  model.view.lat += (model.view.targetLat - model.view.lat) * .08;
  if (!model.pointer.dragging && model.pointer.map.size === 0 && model.view.zoom < 1.45) model.view.targetLon = normLon(model.view.targetLon + .018);
  ctx.clearRect(0, 0, model.size.w, model.size.h);
  drawGlobe(time);
  if (readout) {
    const detail = model.view.zoom >= 1.68 && model.ready.states ? 'STATE OUTLINES' : model.view.zoom >= 1.04 && model.ready.world ? 'COUNTRY OUTLINES' : 'CONTINENT COASTLINES';
    readout.textContent = `${detail} · ${model.ready.live ? 'REPO CACHE' : 'CACHE MISS'} · Z ${model.view.zoom.toFixed(2)}`;
  }
  requestAnimationFrame(frame);
}

function decodeTopo(topology) {
  const scale = topology.transform?.scale || [1, 1], translate = topology.transform?.translate || [0, 0], cache = new Map();
  function arc(raw) {
    const id = raw < 0 ? ~raw : raw, key = `${id}:${raw < 0 ? 'r' : 'f'}`;
    if (cache.has(key)) return cache.get(key);
    let x = 0, y = 0;
    let pts = topology.arcs[id].map(([dx, dy]) => { x += dx; y += dy; return [x * scale[0] + translate[0], y * scale[1] + translate[1]]; });
    if (raw < 0) pts = pts.reverse(); cache.set(key, pts); return pts;
  }
  function ring(indexes) {
    const out = [];
    for (const raw of indexes) for (const [i, p] of arc(raw).entries()) if (!out.length || i) out.push(p);
    return out;
  }
  function geom(g) {
    if (!g) return [];
    if (g.type === 'Polygon') return g.arcs.map(ring);
    if (g.type === 'MultiPolygon') return g.arcs.flatMap((poly) => poly.map(ring));
    return [];
  }
  return { geom };
}
function topoFeatures(topology, objectName) {
  const object = topology.objects?.[objectName] || Object.values(topology.objects || {})[0];
  if (!object?.geometries) return [];
  const decoder = decodeTopo(topology);
  return object.geometries.map((g, i) => ({ id: g.id || i, rings: decoder.geom(g) })).filter((f) => f.rings.length);
}

function goodNode(n) {
  const lat = Number(n.lat ?? n.latitude), lon = Number(n.lon ?? n.lng ?? n.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, tone: n.tone || 'green', size: clamp(Number(n.size) || 3.6, 2.4, 9), label: n.label || n.name || '', priority: !!n.priority };
}
function goodRoute(r) {
  const coords = r.coordinates || r.path || [];
  const out = coords.map((p) => Array.isArray(p) ? [Number(p[0]), Number(p[1])] : [Number(p.lon ?? p.lng), Number(p.lat)]).filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
  return out.length > 1 ? { coordinates: out, color: r.color || palette.route, width: Number(r.width) || .75, alpha: Number(r.alpha) || .34 } : null;
}

async function hydrate() {
  try { model.world = topoFeatures(await loadJson(urls.world, 2592000000, urls.worldCdn), 'countries'); model.ready.world = true; }
  catch { model.world = fallbackWorld; }
  try { model.states = topoFeatures(await loadJson(urls.states, 2592000000, urls.statesCdn), 'states'); model.ready.states = true; } catch {}
  try {
    const live = await loadJson(urls.live, 900000);
    const nodes = Array.isArray(live.nodes) ? live.nodes.map(goodNode).filter(Boolean) : [];
    const routes = Array.isArray(live.routes) ? live.routes.map(goodRoute).filter(Boolean) : [];
    if (nodes.length || routes.length) {
      model.nodes = nodes; model.routes = routes; model.liveAt = live.generatedAt; model.ready.live = true;
      if (feedCount) feedCount.textContent = String(live.counts?.totalNodes || nodes.length);
      if (systemState) systemState.textContent = 'LIVE CACHE';
      if (eventTitle) eventTitle.textContent = 'REPO DATA CACHE ONLINE';
      if (eventMeta) eventMeta.textContent = `${nodes.length.toLocaleString()} nodes · ${routes.length.toLocaleString()} repo routes`;
    }
  } catch {
    if (feedCount) feedCount.textContent = String(model.nodes.length);
    if (systemState) systemState.textContent = 'CACHE MISS';
    if (eventTitle) eventTitle.textContent = 'WAITING FOR REPO DATA CACHE';
    if (eventMeta) eventMeta.textContent = 'Run the Pages data cache workflow to populate live nodes and routes.';
  }
}

function setZoom(z) { model.view.zoom = clamp(z, .74, 4.2); resize(); }
function resetView() { model.view.targetLon = -62; model.view.targetLat = 22; setZoom(1); }
function bind() {
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); model.pointer.map.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId); if (model.pointer.map.size > 1) { const [a,b] = [...model.pointer.map.values()]; model.pointer.pinchDistance = Math.hypot(a.x-b.x,a.y-b.y) || 1; model.pointer.pinchZoom = model.view.zoom; model.pointer.dragging = false; } else { model.pointer.dragging = true; model.pointer.id = e.pointerId; model.pointer.x = e.clientX; model.pointer.y = e.clientY; } });
  canvas.addEventListener('pointermove', (e) => { if (!model.pointer.map.has(e.pointerId)) return; e.preventDefault(); model.pointer.map.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (model.pointer.map.size > 1) { const [a,b] = [...model.pointer.map.values()]; setZoom(model.pointer.pinchZoom * ((Math.hypot(a.x-b.x,a.y-b.y) || 1) / model.pointer.pinchDistance)); return; } if (!model.pointer.dragging || model.pointer.id !== e.pointerId) return; const dx = e.clientX - model.pointer.x, dy = e.clientY - model.pointer.y, dragScale = clamp(.24 / Math.sqrt(model.view.zoom), .08, .24); model.view.targetLon = normLon(model.view.targetLon - dx * dragScale); model.view.targetLat = clamp(model.view.targetLat + dy * dragScale * .82, -72, 78); model.pointer.x = e.clientX; model.pointer.y = e.clientY; });
  const end = (e) => { model.pointer.map.delete(e.pointerId); model.pointer.dragging = false; model.pointer.id = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end); canvas.addEventListener('lostpointercapture', end);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); setZoom(model.view.zoom + (e.deltaY > 0 ? -.12 : .12) * Math.max(1, model.view.zoom * .62)); }, { passive: false });
  locateBtn?.addEventListener('click', resetView);
  orbitBtn?.addEventListener('click', () => { model.showRoutes = !model.showRoutes; orbitBtn.classList.toggle('disabled', !model.showRoutes); if (eventTitle) eventTitle.textContent = model.showRoutes ? 'REPO ROUTES ONLINE' : 'REPO ROUTES MUTED'; });
  document.querySelectorAll('.bottom-nav button').forEach((b) => b.addEventListener('click', () => { document.querySelectorAll('.bottom-nav button').forEach((x) => x.classList.remove('active')); b.classList.add('active'); if (eventTitle) eventTitle.textContent = `${(b.dataset.layer || 'recon').toUpperCase()} LAYER SELECTED`; }));
  addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'r') resetView(); if (e.key.toLowerCase() === 'o') orbitBtn?.click(); if (e.key === '+' || e.key === '=') setZoom(model.view.zoom + .18); if (e.key === '-' || e.key === '_') setZoom(model.view.zoom - .18); });
  addEventListener('resize', resize);
}

resize(); bind(); hydrate(); requestAnimationFrame(frame);
