'use strict';

const boot = document.getElementById('boot');
const bootSequence = document.getElementById('bootSequence');
const canvas = document.getElementById('globeCanvas');
const zulu = document.getElementById('zulu');
const readout = document.getElementById('readout');
const eventTitle = document.getElementById('eventTitle');
const eventMeta = document.getElementById('eventMeta');
const locateBtn = document.getElementById('locateBtn');
const orbitBtn = document.getElementById('orbitBtn');

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const WORLD_TOPOJSON_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const bootMessages = [
  'INITIALIZING GLOBAL INTELLIGENCE COMMAND...',
  'SYNCING ORBITAL LATTICE...',
  'LOADING TRUE EARTH GEOMETRY...',
  'RECON LAYER ONLINE'
];

let bootStep = 0;
const bootTimer = window.setInterval(() => {
  bootStep += 1;
  if (bootSequence) bootSequence.textContent = bootMessages[Math.min(bootStep, bootMessages.length - 1)];
  if (bootStep >= bootMessages.length - 1) {
    window.clearInterval(bootTimer);
    window.setTimeout(() => boot?.classList.add('hide'), 450);
  }
}, 340);

function pad(value) {
  return String(value).padStart(2, '0');
}

function updateZulu() {
  const now = new Date();
  if (zulu) zulu.textContent = `ZULU ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}Z`;
}
updateZulu();
window.setInterval(updateZulu, 1000);

const palette = {
  ocean: '#283640',
  oceanDark: '#111923',
  land: '#05080a',
  landEdge: 'rgba(176, 190, 198, 0.32)',
  boundary: 'rgba(44, 139, 205, 0.42)'
};

const fallbackLand = [
  { name: 'NORTH AMERICA', rings: [[[-168,72],[-150,70],[-135,61],[-126,52],[-123,42],[-116,33],[-106,27],[-96,22],[-86,24],[-80,30],[-73,41],[-61,49],[-56,57],[-72,64],[-94,70],[-121,73],[-148,73],[-168,72]]] },
  { name: 'SOUTH AMERICA', rings: [[[-81,12],[-71,10],[-61,2],[-51,-8],[-44,-18],[-45,-30],[-55,-43],[-67,-55],[-73,-45],[-76,-28],[-81,-10],[-81,12]]] },
  { name: 'GREENLAND', rings: [[[-73,78],[-58,83],[-32,78],[-23,69],[-38,61],[-57,60],[-70,68],[-73,78]]] },
  { name: 'EUROPE', rings: [[[-11,36],[-9,51],[2,59],[18,69],[37,62],[44,49],[33,39],[18,36],[4,41],[-11,36]]] },
  { name: 'AFRICA', rings: [[[-17,35],[6,37],[27,31],[42,16],[50,2],[43,-20],[31,-34],[14,-35],[2,-24],[-9,-2],[-17,18],[-17,35]]] },
  { name: 'ASIA', rings: [[[35,32],[48,47],[70,56],[96,70],[128,62],[160,49],[151,31],[127,23],[105,8],[86,7],[69,18],[49,25],[35,32]]] },
  { name: 'AUSTRALIA', rings: [[[113,-12],[133,-10],[153,-24],[147,-39],[122,-38],[112,-28],[113,-12]]] }
];

let worldLand = fallbackLand;
let worldReady = false;

const hubs = [
  { lat: 39.9, lon: -75.1 }, { lat: 40.7, lon: -74.0 }, { lat: 33.7, lon: -84.3 },
  { lat: -23.5, lon: -46.6 }, { lat: 51.5, lon: -0.1 }, { lat: 48.8, lon: 2.3 },
  { lat: 50.4, lon: 30.5 }, { lat: 24.7, lon: 46.7 }, { lat: 35.6, lon: 139.6 }, { lat: -33.8, lon: 151.2 }
];

const routePairs = [[0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [1, 4], [1, 5], [1, 7], [1, 9], [2, 3], [2, 4], [2, 7], [3, 4], [3, 5], [4, 7], [5, 8], [6, 7], [7, 8]];

function lcg(seed) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const random = lcg(424242);
const clusters = [
  { lat: 40.7, lon: -74.0, spreadLat: 10, spreadLon: 18, count: 42, tone: 'green' },
  { lat: 34.0, lon: -84.0, spreadLat: 12, spreadLon: 20, count: 22, tone: 'green' },
  { lat: -23.5, lon: -46.6, spreadLat: 10, spreadLon: 16, count: 26, tone: 'green' },
  { lat: 50.4, lon: 10.0, spreadLat: 14, spreadLon: 28, count: 34, tone: 'green' },
  { lat: 24.7, lon: 46.7, spreadLat: 18, spreadLon: 32, count: 22, tone: 'green' },
  { lat: 4.0, lon: 20.0, spreadLat: 26, spreadLon: 34, count: 18, tone: 'green' }
];

const sensorNodes = [];
for (const cluster of clusters) {
  for (let i = 0; i < cluster.count; i += 1) {
    sensorNodes.push({
      lat: cluster.lat + (random() - 0.5) * cluster.spreadLat,
      lon: cluster.lon + (random() - 0.5) * cluster.spreadLon,
      tone: cluster.tone,
      size: 3.1 + random() * 2.3
    });
  }
}

sensorNodes.push(
  { lat: 61.2, lon: -149.9, tone: 'orange', size: 7, label: 'M5.1' },
  { lat: 58.3, lon: -151.8, tone: 'orange', size: 5.5, label: 'M5' },
  { lat: 15.1, lon: -92.0, tone: 'orange', size: 7, label: 'M4.5' },
  { lat: -35.6, lon: -72.1, tone: 'orange', size: 6.2, label: 'M5.1' },
  { lat: 50.45, lon: 30.52, tone: 'red', size: 4.8, label: 'EUROPE ALERT' },
  { lat: 31.7, lon: 35.2, tone: 'magenta', size: 5.8 },
  { lat: 25.2, lon: 55.3, tone: 'cyan', size: 5.2 },
  { lat: 35.7, lon: 139.7, tone: 'magenta', size: 5.2 },
  { lat: 64.2, lon: -51.7, tone: 'gold', size: 4.2 },
  { lat: -33.9, lon: 151.2, tone: 'cyan', size: 4.9 }
);

const state = {
  ctx: null,
  dpr: 1,
  width: 0,
  height: 0,
  cx: 0,
  cy: 0,
  radius: 0,
  centerLon: -62,
  centerLat: 22,
  targetLon: -62,
  targetLat: 22,
  zoom: 1,
  dragging: false,
  pointerId: null,
  lastX: 0,
  lastY: 0,
  showRoutes: true,
  lastTime: 0,
  activeLayer: 'recon'
};

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

function toneColor(tone, alpha = 1) {
  const map = {
    green: `rgba(0, 240, 138, ${alpha})`,
    orange: `rgba(213, 106, 0, ${alpha})`,
    red: `rgba(221, 39, 49, ${alpha})`,
    magenta: `rgba(232, 59, 127, ${alpha})`,
    cyan: `rgba(36, 220, 233, ${alpha})`,
    gold: `rgba(215, 183, 57, ${alpha})`
  };
  return map[tone] || map.green;
}

function resize() {
  if (!canvas) return;
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = Math.floor(state.width * state.dpr);
  canvas.height = Math.floor(state.height * state.dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  state.ctx = canvas.getContext('2d');
  state.ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  const mobile = state.width < 760;
  state.cx = mobile ? state.width * 0.48 : state.width * 0.52;
  state.cy = mobile ? state.height * 0.50 : state.height * 0.53;
  const baseRadius = mobile ? state.width * 0.72 : Math.min(state.width, state.height) * 0.44;
  state.radius = clamp(baseRadius * state.zoom, 220, Math.min(state.width, state.height) * 0.92);
}

function normalizeLon(lon) {
  return ((lon + 540) % 360) - 180;
}

function project(lat, lon, lift = 1) {
  const phi = lat * DEG;
  const lambda = normalizeLon(lon - state.centerLon) * DEG;
  const cosPhi = Math.cos(phi);
  const x = cosPhi * Math.sin(lambda);
  const y = Math.sin(phi);
  const z = cosPhi * Math.cos(lambda);
  const tilt = state.centerLat * DEG;
  const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
  const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
  return { x: state.cx + state.radius * lift * x, y: state.cy - state.radius * lift * y2, z: z2, visible: z2 > -0.04 };
}

function appendProjectedRing(ctx, ring) {
  let drawing = false;
  let visible = 0;
  for (const [lon, lat] of ring) {
    const p = project(lat, lon);
    if (!p.visible) {
      drawing = false;
      continue;
    }
    visible += 1;
    if (!drawing) {
      ctx.moveTo(p.x, p.y);
      drawing = true;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  return visible;
}

function drawPolyline(points, stroke, width = 1, fill = null, alpha = 1) {
  const ctx = state.ctx;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  const visible = appendProjectedRing(ctx, points);
  if (visible < 2) {
    ctx.restore();
    return;
  }
  if (fill && visible > 3) {
    ctx.fillStyle = fill;
    ctx.fill('evenodd');
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

function drawGrid() {
  for (let lat = -60; lat <= 75; lat += 15) {
    const points = [];
    for (let lon = -180; lon <= 180; lon += 3) points.push([lon, lat]);
    drawPolyline(points, 'rgba(38, 132, 198, 0.16)', 0.8);
  }
  for (let lon = -180; lon <= 180; lon += 15) {
    const points = [];
    for (let lat = -80; lat <= 80; lat += 3) points.push([lon, lat]);
    drawPolyline(points, 'rgba(38, 132, 198, 0.14)', 0.75);
  }
}

function drawLand() {
  const ctx = state.ctx;
  for (const feature of worldLand) {
    ctx.save();
    ctx.beginPath();
    let visible = 0;
    for (const ring of feature.rings) {
      visible += appendProjectedRing(ctx, ring);
    }
    if (visible > 2) {
      ctx.fillStyle = palette.land;
      ctx.strokeStyle = worldReady ? palette.landEdge : 'rgba(176, 190, 198, 0.22)';
      ctx.lineWidth = worldReady ? 0.78 : 0.95;
      ctx.fill('evenodd');
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawCountryBoundaries() {
  if (!worldReady) return;
  const ctx = state.ctx;
  ctx.save();
  ctx.strokeStyle = palette.boundary;
  ctx.lineWidth = 0.45;
  ctx.globalAlpha = 0.42;
  for (const feature of worldLand) {
    ctx.beginPath();
    let visible = 0;
    for (const ring of feature.rings) visible += appendProjectedRing(ctx, ring);
    if (visible > 2) ctx.stroke();
  }
  ctx.restore();
}

function interpolateGreatCircle(a, b, steps = 90, altitude = 0.08) {
  const phi1 = a.lat * DEG;
  const lam1 = a.lon * DEG;
  const phi2 = b.lat * DEG;
  const lam2 = b.lon * DEG;
  const v1 = [Math.cos(phi1) * Math.cos(lam1), Math.cos(phi1) * Math.sin(lam1), Math.sin(phi1)];
  const v2 = [Math.cos(phi2) * Math.cos(lam2), Math.cos(phi2) * Math.sin(lam2), Math.sin(phi2)];
  const dot = clamp(v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2], -1, 1);
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega) || 1;
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const aScale = Math.sin((1 - t) * omega) / sinOmega;
    const bScale = Math.sin(t * omega) / sinOmega;
    const x = aScale * v1[0] + bScale * v2[0];
    const y = aScale * v1[1] + bScale * v2[1];
    const z = aScale * v1[2] + bScale * v2[2];
    const lon = Math.atan2(y, x) / DEG;
    const hyp = Math.sqrt(x * x + y * y);
    const lat = Math.atan2(z, hyp) / DEG;
    points.push({ lat, lon, lift: 1 + Math.sin(Math.PI * t) * altitude });
  }
  return points;
}

function drawRoute(a, b) {
  const ctx = state.ctx;
  const points = interpolateGreatCircle(a, b, 80, 0.11);
  let drawing = false;
  let visible = 0;
  ctx.beginPath();
  for (const point of points) {
    const p = project(point.lat, point.lon, point.lift);
    if (!p.visible) {
      drawing = false;
      continue;
    }
    visible += 1;
    if (!drawing) {
      ctx.moveTo(p.x, p.y);
      drawing = true;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  if (visible < 2) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(25, 128, 205, 0.34)';
  ctx.lineWidth = 1.25;
  ctx.shadowColor = 'rgba(0, 174, 255, 0.24)';
  ctx.shadowBlur = 9;
  ctx.stroke();
  ctx.restore();
}

function drawRoutes() {
  if (!state.showRoutes) return;
  for (const [aIndex, bIndex] of routePairs) drawRoute(hubs[aIndex], hubs[bIndex]);
}

function drawNode(node) {
  const ctx = state.ctx;
  const p = project(node.lat, node.lon, 1.015);
  if (!p.visible) return;
  const color = toneColor(node.tone, 1);
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(4, 7, 10, 0.88)';
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = node.size > 6 ? 20 : 9;
  ctx.beginPath();
  ctx.arc(p.x, p.y, node.size, 0, TWO_PI);
  ctx.fill();
  ctx.stroke();
  if (node.label) {
    ctx.shadowBlur = 8;
    ctx.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.strokeText(node.label, p.x + 8, p.y + 13);
    ctx.fillStyle = color;
    ctx.fillText(node.label, p.x + 8, p.y + 13);
  }
  ctx.restore();
}

function drawNodes() {
  for (const node of sensorNodes) drawNode(node);
}

function drawLabels() {
  const labels = [
    { text: 'NORTH\nAMERICA', lat: 38, lon: -103, size: 28 },
    { text: 'EUROPE', lat: 50, lon: 14, size: 24 },
    { text: 'SOUTH\nAMERICA', lat: -18, lon: -58, size: 20 },
    { text: 'AFRICA', lat: 5, lon: 20, size: 22 },
    { text: 'ASIA', lat: 43, lon: 88, size: 24 }
  ];
  const ctx = state.ctx;
  ctx.save();
  ctx.fillStyle = 'rgba(221, 232, 239, 0.68)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 8;
  for (const label of labels) {
    const p = project(label.lat, label.lon, 1.018);
    if (!p.visible) continue;
    ctx.font = `800 ${label.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const lines = label.text.split('\n');
    lines.forEach((line, index) => ctx.fillText(line, p.x, p.y + (index - (lines.length - 1) / 2) * (label.size + 2)));
  }
  ctx.restore();
}

function drawGlobeBase() {
  const ctx = state.ctx;
  const gradient = ctx.createRadialGradient(state.cx - state.radius * 0.35, state.cy - state.radius * 0.55, state.radius * 0.15, state.cx, state.cy, state.radius);
  gradient.addColorStop(0, '#3b4d57');
  gradient.addColorStop(0.54, palette.ocean);
  gradient.addColorStop(1, palette.oceanDark);

  ctx.save();
  ctx.beginPath();
  ctx.arc(state.cx, state.cy, state.radius, 0, TWO_PI);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = 'rgba(42, 117, 168, 0.42)';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.clip();
  drawGrid();
  drawLand();
  drawCountryBoundaries();
  drawRoutes();
  drawNodes();
  drawLabels();

  const shade = ctx.createRadialGradient(state.cx + state.radius * 0.35, state.cy + state.radius * 0.05, state.radius * 0.15, state.cx + state.radius * 0.45, state.cy + state.radius * 0.08, state.radius * 1.1);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(0.52, 'rgba(0,0,0,0.1)');
  shade.addColorStop(1, 'rgba(0,0,0,0.64)');
  ctx.fillStyle = shade;
  ctx.fillRect(state.cx - state.radius, state.cy - state.radius, state.radius * 2, state.radius * 2);

  ctx.restore();
}

function drawOuterOrbit(time) {
  const ctx = state.ctx;
  ctx.save();
  ctx.translate(state.cx, state.cy);
  ctx.rotate(time * 0.00008);
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 0, state.radius * (1.05 + i * 0.024), state.radius * (0.78 + i * 0.014), i * 0.18, 0, TWO_PI);
    ctx.strokeStyle = `rgba(21, 124, 203, ${0.16 - i * 0.012})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.restore();
}

function drawScene(time = 0) {
  if (!state.ctx) return;
  const ctx = state.ctx;
  state.centerLon += (state.targetLon - state.centerLon) * 0.08;
  state.centerLat += (state.targetLat - state.centerLat) * 0.08;
  if (!state.dragging) {
    state.targetLon = normalizeLon(state.targetLon + 0.018);
  }

  ctx.clearRect(0, 0, state.width, state.height);
  drawOuterOrbit(time);
  drawGlobeBase();

  state.lastTime = time;
  window.requestAnimationFrame(drawScene);
}

function decodeTopoArcs(topology) {
  const scale = topology.transform?.scale || [1, 1];
  const translate = topology.transform?.translate || [0, 0];
  const cache = new Map();

  function decodeArc(rawIndex) {
    const arcIndex = rawIndex < 0 ? ~rawIndex : rawIndex;
    const key = `${arcIndex}:${rawIndex < 0 ? 'r' : 'f'}`;
    if (cache.has(key)) return cache.get(key);

    const arc = topology.arcs[arcIndex];
    let x = 0;
    let y = 0;
    let points = arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });

    if (rawIndex < 0) points = points.reverse();
    cache.set(key, points);
    return points;
  }

  function stitchRing(arcIndexes) {
    const ring = [];
    for (const rawIndex of arcIndexes) {
      const arc = decodeArc(rawIndex);
      for (let i = 0; i < arc.length; i += 1) {
        if (ring.length && i === 0) continue;
        ring.push(arc[i]);
      }
    }
    return ring;
  }

  return { stitchRing };
}

function topoGeometryToRings(topology, geometry) {
  const { stitchRing } = decodeTopoArcs(topology);
  if (geometry.type === 'Polygon') {
    return geometry.arcs.map(stitchRing);
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.arcs.flatMap((polygon) => polygon.map(stitchRing));
  }
  return [];
}

async function loadWorldGeometry() {
  try {
    const response = await fetch(WORLD_TOPOJSON_URL, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`World geometry request failed: ${response.status}`);
    const topology = await response.json();
    const geometries = topology.objects?.countries?.geometries || [];
    const countries = geometries
      .map((geometry) => ({
        name: geometry.properties?.name || geometry.id || 'land',
        rings: topoGeometryToRings(topology, geometry)
      }))
      .filter((feature) => feature.rings.length);

    if (!countries.length) throw new Error('World geometry contained no country rings.');

    worldLand = countries;
    worldReady = true;
    if (eventTitle) eventTitle.textContent = 'TRUE EARTH GEOMETRY ONLINE';
    if (eventMeta) eventMeta.textContent = 'COUNTRY COASTLINES · WORLD ATLAS 110M';
    if (readout) readout.textContent = 'REAL COASTLINES · RECON';
  } catch (error) {
    console.warn(error);
    worldLand = fallbackLand;
    worldReady = false;
    if (eventTitle) eventTitle.textContent = 'FALLBACK GEOMETRY ONLINE';
    if (eventMeta) eventMeta.textContent = 'NETWORK MAP DATA UNAVAILABLE · USING LOCAL ROUGH SHAPES';
  }
}

function resetView() {
  state.targetLon = -62;
  state.targetLat = 22;
  state.zoom = 1;
  resize();
}

function bindControls() {
  if (!canvas) return;
  canvas.addEventListener('pointerdown', (event) => {
    state.dragging = true;
    state.pointerId = event.pointerId;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!state.dragging || state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    state.targetLon = normalizeLon(state.targetLon - dx * 0.22);
    state.targetLat = clamp(state.targetLat + dy * 0.18, -62, 72);
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    if (readout) readout.textContent = `${state.targetLat.toFixed(1)}° · ${normalizeLon(state.targetLon).toFixed(1)}°`;
  });

  function endDrag(event) {
    if (state.pointerId === event.pointerId) {
      state.dragging = false;
      state.pointerId = null;
    }
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    state.zoom = clamp(state.zoom + (event.deltaY > 0 ? -0.08 : 0.08), 0.74, 1.42);
    resize();
  }, { passive: false });

  locateBtn?.addEventListener('click', resetView);
  orbitBtn?.addEventListener('click', () => {
    state.showRoutes = !state.showRoutes;
    orbitBtn.classList.toggle('disabled', !state.showRoutes);
    if (eventTitle) eventTitle.textContent = state.showRoutes ? 'ORBITAL ROUTES ONLINE' : 'ORBITAL ROUTES MUTED';
  });

  document.querySelectorAll('.bottom-nav button').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.bottom-nav button').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.activeLayer = button.dataset.layer || 'recon';
      if (eventTitle) eventTitle.textContent = `${state.activeLayer.toUpperCase()} LAYER SELECTED`;
      if (eventMeta) eventMeta.textContent = worldReady ? 'TRUE COASTLINES · LIVE ROUTES · SENSOR CLUSTERS' : 'LOCAL GEOMETRY · LIVE ROUTES · SENSOR CLUSTERS';
    });
  });

  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r') resetView();
    if (event.key.toLowerCase() === 'o') orbitBtn?.click();
  });

  window.addEventListener('resize', resize);
}

resize();
bindControls();
loadWorldGeometry();
window.requestAnimationFrame(drawScene);
