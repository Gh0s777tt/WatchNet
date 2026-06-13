'use strict';

const bootMessages = [
  'ESTABLISHING SECURE CONNECTION...',
  'INITIALIZING FEEDS...',
  'CALIBRATING SENSORS...',
  'SYSTEM READY'
];

const bootSequence = document.getElementById('bootSequence');
const boot = document.getElementById('boot');
const zulu = document.getElementById('zulu');
const uptime = document.getElementById('uptime');
const systemState = document.getElementById('systemState');
const feedCount = document.getElementById('feedCount');
const coords = document.getElementById('coords');
const locLabel = document.getElementById('locLabel');
const mapStage = document.getElementById('mapStage');
const globeCanvas = document.getElementById('globeCanvas');
const consoleFeed = document.getElementById('consoleFeed');
const zoomLevel = document.getElementById('zoomLevel');
const start = Date.now();
const DEG = Math.PI / 180;

let bootIndex = 0;
const bootTimer = window.setInterval(() => {
  bootIndex += 1;
  if (bootSequence) bootSequence.textContent = bootMessages[Math.min(bootIndex, bootMessages.length - 1)];
  if (bootIndex >= bootMessages.length - 1) {
    window.clearInterval(bootTimer);
    window.setTimeout(() => boot?.classList.add('hide'), 550);
  }
}, 520);

function pad(value) {
  return String(value).padStart(2, '0');
}

function updateClocks() {
  const now = new Date();
  if (zulu) zulu.textContent = `ZULU ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}Z`;

  const elapsed = Math.floor((Date.now() - start) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  if (uptime) uptime.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

updateClocks();
window.setInterval(updateClocks, 1000);

window.setTimeout(() => {
  if (systemState) systemState.textContent = 'CONNECTED';
  if (feedCount) feedCount.textContent = '11';
}, 2300);

const landMasses = [
  {
    name: 'NORTH AMERICA',
    points: [[-168, 71], [-142, 70], [-124, 59], [-122, 48], [-112, 32], [-98, 24], [-82, 25], [-66, 44], [-60, 53], [-73, 62], [-96, 71], [-130, 73], [-168, 71]]
  },
  {
    name: 'SOUTH AMERICA',
    points: [[-81, 12], [-68, 7], [-52, -10], [-45, -24], [-54, -39], [-69, -55], [-77, -32], [-81, 12]]
  },
  {
    name: 'EURASIA',
    points: [[-10, 36], [-5, 54], [24, 69], [58, 60], [94, 72], [135, 58], [160, 42], [139, 30], [109, 22], [93, 8], [75, 15], [56, 27], [35, 31], [21, 43], [-10, 36]]
  },
  {
    name: 'AFRICA',
    points: [[-17, 35], [8, 36], [32, 30], [51, 9], [43, -20], [28, -34], [15, -35], [1, -22], [-8, -2], [-17, 18], [-17, 35]]
  },
  {
    name: 'AUSTRALIA',
    points: [[113, -12], [133, -10], [153, -25], [147, -39], [117, -36], [111, -22], [113, -12]]
  },
  {
    name: 'GREENLAND',
    points: [[-52, 82], [-30, 75], [-42, 61], [-63, 62], [-73, 74], [-52, 82]]
  },
  {
    name: 'ANTARCTIC TRACE',
    points: [[-180, -69], [-120, -75], [-60, -72], [0, -80], [60, -72], [120, -75], [180, -69]]
  }
];

const missionNodes = [
  { name: 'ATLANTIC GRID', lat: 34.42, lon: -77.31, tone: 'cyan' },
  { name: 'EUCOM WATCH', lat: 50.11, lon: 8.68, tone: 'gold' },
  { name: 'CENTCOM LANE', lat: 25.20, lon: 55.27, tone: 'red' },
  { name: 'PACIFIC NODE', lat: 35.68, lon: 139.69, tone: 'cyan' },
  { name: 'SOUTHCOM RELAY', lat: -15.79, lon: -47.88, tone: 'green' },
  { name: 'ORBITAL HANDOFF', lat: -33.86, lon: 151.21, tone: 'gold' }
];

const networkRoutes = [
  [missionNodes[0], missionNodes[1]],
  [missionNodes[1], missionNodes[2]],
  [missionNodes[2], missionNodes[3]],
  [missionNodes[3], missionNodes[5]],
  [missionNodes[0], missionNodes[4]],
  [missionNodes[4], missionNodes[5]]
];

const globe = {
  ctx: null,
  dpr: 1,
  width: 0,
  height: 0,
  cx: 0,
  cy: 0,
  radius: 0,
  rotation: -42 * DEG,
  tilt: -10 * DEG,
  zoom: 2.5,
  pointer: null,
  lastTime: 0,
  paused: false
};

function resizeGlobe() {
  if (!globeCanvas || !mapStage) return;
  const rect = mapStage.getBoundingClientRect();
  globe.dpr = Math.min(window.devicePixelRatio || 1, 2);
  globe.width = Math.max(1, rect.width);
  globe.height = Math.max(1, rect.height);
  globeCanvas.width = Math.floor(globe.width * globe.dpr);
  globeCanvas.height = Math.floor(globe.height * globe.dpr);
  globeCanvas.style.width = `${globe.width}px`;
  globeCanvas.style.height = `${globe.height}px`;
  globe.ctx = globeCanvas.getContext('2d');
  globe.ctx.setTransform(globe.dpr, 0, 0, globe.dpr, 0, 0);
  globe.cx = globe.width * 0.54;
  globe.cy = globe.height * 0.52;
  globe.radius = Math.max(128, Math.min(globe.width, globe.height) * 0.38);
}

function normalizeLon(lon) {
  let value = lon;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function toneColor(tone, alpha = 1) {
  const colors = {
    cyan: `rgba(0, 229, 255, ${alpha})`,
    gold: `rgba(212, 175, 55, ${alpha})`,
    green: `rgba(0, 255, 136, ${alpha})`,
    red: `rgba(255, 59, 79, ${alpha})`
  };
  return colors[tone] || colors.cyan;
}

function projectLatLon(lat, lon, scale = 1) {
  const phi = lat * DEG;
  const lambda = lon * DEG + globe.rotation;
  const cosPhi = Math.cos(phi);
  const x = cosPhi * Math.sin(lambda);
  const y = Math.sin(phi);
  const z = cosPhi * Math.cos(lambda);
  const cosTilt = Math.cos(globe.tilt);
  const sinTilt = Math.sin(globe.tilt);
  const y2 = y * cosTilt - z * sinTilt;
  const z2 = y * sinTilt + z * cosTilt;

  return {
    x: globe.cx + globe.radius * scale * x,
    y: globe.cy - globe.radius * scale * y2,
    z: z2,
    visible: z2 > -0.02
  };
}

function drawVisiblePolyline(points, stroke, width, alpha = 1, fill = null) {
  const ctx = globe.ctx;
  let drawing = false;
  let visibleCount = 0;
  ctx.beginPath();
  for (const [lon, lat] of points) {
    const p = projectLatLon(lat, lon);
    if (!p.visible) {
      drawing = false;
      continue;
    }
    visibleCount += 1;
    if (!drawing) {
      ctx.moveTo(p.x, p.y);
      drawing = true;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }

  if (visibleCount < 2) return;
  if (fill && visibleCount > 3) {
    ctx.globalAlpha = alpha * 0.42;
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawGrid() {
  for (let lat = -60; lat <= 60; lat += 15) {
    const points = [];
    for (let lon = -180; lon <= 180; lon += 4) points.push([lon, lat]);
    drawVisiblePolyline(points, 'rgba(0, 229, 255, 0.18)', 0.75, 1);
  }

  for (let lon = -180; lon <= 180; lon += 20) {
    const points = [];
    for (let lat = -80; lat <= 80; lat += 3) points.push([lon, lat]);
    drawVisiblePolyline(points, 'rgba(0, 229, 255, 0.12)', 0.65, 1);
  }
}

function slerpRoute(a, b, steps = 72) {
  const toVec = node => {
    const phi = node.lat * DEG;
    const lambda = node.lon * DEG;
    return {
      x: Math.cos(phi) * Math.sin(lambda),
      y: Math.sin(phi),
      z: Math.cos(phi) * Math.cos(lambda)
    };
  };
  const va = toVec(a);
  const vb = toVec(b);
  const dot = Math.max(-1, Math.min(1, va.x * vb.x + va.y * vb.y + va.z * vb.z));
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega) || 1;
  const points = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const wa = Math.sin((1 - t) * omega) / sinOmega;
    const wb = Math.sin(t * omega) / sinOmega;
    const x = wa * va.x + wb * vb.x;
    const y = wa * va.y + wb * vb.y;
    const z = wa * va.z + wb * vb.z;
    const lat = Math.asin(y) / DEG;
    const lon = Math.atan2(x, z) / DEG;
    points.push({ lat, lon, lift: 1 + Math.sin(Math.PI * t) * 0.16 });
  }
  return points;
}

function drawRoutes(time) {
  const ctx = globe.ctx;
  for (const [from, to] of networkRoutes) {
    const route = slerpRoute(from, to);
    ctx.beginPath();
    let drawing = false;
    for (const point of route) {
      const p = projectLatLon(point.lat, point.lon, point.lift);
      if (!p.visible) {
        drawing = false;
        continue;
      }
      if (!drawing) {
        ctx.moveTo(p.x, p.y);
        drawing = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.64)';
    ctx.lineWidth = 1.25;
    ctx.setLineDash([7, 9]);
    ctx.lineDashOffset = -time * 0.025;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawNodes(time) {
  const ctx = globe.ctx;
  let nearest = null;
  let nearestDistance = Infinity;

  for (const node of missionNodes) {
    const p = projectLatLon(node.lat, node.lon, 1.012);
    if (!p.visible) continue;
    const pulse = 1 + Math.sin(time * 0.004 + node.lon) * 0.22;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4.6 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = toneColor(node.tone, 0.88);
    ctx.shadowColor = toneColor(node.tone, 0.55);
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(p.x, p.y, 12 + pulse * 3, 0, Math.PI * 2);
    ctx.strokeStyle = toneColor(node.tone, 0.22);
    ctx.lineWidth = 1;
    ctx.stroke();

    if (globe.pointer) {
      const dx = globe.pointer.x - p.x;
      const dy = globe.pointer.y - p.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = node;
      }
    }
  }

  if (nearest && nearestDistance < 38 && locLabel) {
    locLabel.textContent = nearest.name;
  }
}

function drawGlobe(time = 0) {
  if (!globe.ctx) return;
  const ctx = globe.ctx;
  ctx.clearRect(0, 0, globe.width, globe.height);

  const glow = ctx.createRadialGradient(globe.cx, globe.cy, globe.radius * 0.1, globe.cx, globe.cy, globe.radius * 1.45);
  glow.addColorStop(0, 'rgba(0, 229, 255, 0.14)');
  glow.addColorStop(0.52, 'rgba(0, 229, 255, 0.05)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, globe.width, globe.height);

  const sphere = ctx.createRadialGradient(
    globe.cx - globe.radius * 0.32,
    globe.cy - globe.radius * 0.34,
    globe.radius * 0.08,
    globe.cx,
    globe.cy,
    globe.radius
  );
  sphere.addColorStop(0, 'rgba(0, 229, 255, 0.24)');
  sphere.addColorStop(0.32, 'rgba(5, 24, 42, 0.88)');
  sphere.addColorStop(0.72, 'rgba(1, 5, 14, 0.96)');
  sphere.addColorStop(1, 'rgba(0, 0, 0, 1)');

  ctx.save();
  ctx.beginPath();
  ctx.arc(globe.cx, globe.cy, globe.radius, 0, Math.PI * 2);
  ctx.fillStyle = sphere;
  ctx.fill();
  ctx.clip();

  drawGrid();
  for (const mass of landMasses) {
    drawVisiblePolyline(mass.points, 'rgba(0, 229, 255, 0.52)', 1.05, 1, 'rgba(0, 229, 255, 0.16)');
  }

  ctx.restore();

  drawRoutes(time);
  drawNodes(time);

  const scanAngle = (time * 0.00045) % (Math.PI * 2);
  ctx.save();
  ctx.translate(globe.cx, globe.cy);
  ctx.rotate(scanAngle);
  const sweep = ctx.createLinearGradient(0, 0, globe.radius, 0);
  sweep.addColorStop(0, 'rgba(0, 229, 255, 0.55)');
  sweep.addColorStop(1, 'rgba(0, 229, 255, 0)');
  ctx.strokeStyle = sweep;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(globe.radius * 1.2, 0);
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(globe.cx, globe.cy, globe.radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.42)';
  ctx.lineWidth = 1.3;
  ctx.shadowColor = 'rgba(0, 229, 255, 0.42)';
  ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(globe.cx, globe.cy, globe.radius * 1.035, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function updatePointerReadout(event) {
  if (!mapStage) return;
  const rect = mapStage.getBoundingClientRect();
  globe.pointer = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };

  const dx = (globe.pointer.x - globe.cx) / globe.radius;
  const y2 = -(globe.pointer.y - globe.cy) / globe.radius;
  const distance = dx * dx + y2 * y2;
  if (distance > 1) {
    if (locLabel) locLabel.textContent = 'ORBITAL LATTICE';
    return;
  }

  const z2 = Math.sqrt(1 - distance);
  const cosTilt = Math.cos(globe.tilt);
  const sinTilt = Math.sin(globe.tilt);
  const y = y2 * cosTilt + z2 * sinTilt;
  const z = -y2 * sinTilt + z2 * cosTilt;
  const lat = Math.asin(Math.max(-1, Math.min(1, y))) / DEG;
  const lon = normalizeLon(Math.atan2(dx, z) / DEG - globe.rotation / DEG);
  if (coords) coords.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

function animateGlobe(time) {
  if (!globe.lastTime) globe.lastTime = time;
  const delta = time - globe.lastTime;
  globe.lastTime = time;
  if (!globe.paused && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    globe.rotation += delta * 0.000045;
  }
  drawGlobe(time);
  window.requestAnimationFrame(animateGlobe);
}

resizeGlobe();
window.addEventListener('resize', resizeGlobe);
if (globeCanvas) window.requestAnimationFrame(animateGlobe);

mapStage?.addEventListener('mousemove', updatePointerReadout);
mapStage?.addEventListener('mouseleave', () => {
  globe.pointer = null;
  if (coords) coords.textContent = '34.4200, -77.3100';
  if (locLabel) locLabel.textContent = 'ATLANTIC GRID';
});

mapStage?.addEventListener('wheel', event => {
  event.preventDefault();
  globe.zoom = Math.min(4.5, Math.max(1.6, globe.zoom + (event.deltaY < 0 ? 0.1 : -0.1)));
  globe.radius = Math.max(128, Math.min(globe.width, globe.height) * (0.28 + globe.zoom * 0.04));
  if (zoomLevel) zoomLevel.textContent = globe.zoom.toFixed(1);
}, { passive: false });

const places = missionNodes.map(node => node.name).concat(['ORBITAL LATTICE', 'LYCAN RELAY']);
let placeIndex = 0;
window.setInterval(() => {
  if (globe.pointer || !locLabel) return;
  placeIndex = (placeIndex + 1) % places.length;
  locLabel.textContent = places[placeIndex];
}, 4200);

const feedLines = [
  '[OSIRIS] ROUTE TABLE LOCKED',
  '[SDK] SENSOR LATTICE ACTIVE',
  '[NET] LYCAN NETWORK READY',
  '[C2] PHYSICAL COMMAND CORE ONLINE',
  '[SURVEIL] CCTV INDEX WARM',
  '[THREAT] GHOST PROTOCOL STANDBY',
  '[MAP] 3D WORLD LAYER ONLINE'
];

let feedOffset = 0;
window.setInterval(() => {
  if (!consoleFeed) return;
  feedOffset = (feedOffset + 1) % feedLines.length;
  const visible = [0, 1, 2].map(i => feedLines[(feedOffset + i) % feedLines.length]);
  consoleFeed.innerHTML = visible.map(line => `<span>${line}</span>`).join('');
}, 3600);

document.querySelectorAll('.map-tabs button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.map-tabs button').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    if (button.dataset.mode === 'satellite') {
      mapStage?.classList.add('satellite-mode');
      if (locLabel) locLabel.textContent = 'SATELLITE LAYER';
    } else {
      mapStage?.classList.remove('satellite-mode');
      if (locLabel) locLabel.textContent = '3D WORLD GRID';
    }
  });
});

document.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (key === 'f') {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }
  if (key === 'r') {
    globe.rotation = -42 * DEG;
    globe.zoom = 2.5;
    resizeGlobe();
    if (zoomLevel) zoomLevel.textContent = '2.5';
    if (coords) coords.textContent = '34.4200, -77.3100';
    if (locLabel) locLabel.textContent = 'ATLANTIC GRID';
  }
  if (key === 's') {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: 'OSIRIS', url }).catch(() => {});
    else navigator.clipboard?.writeText(url);
  }
  if (key === ' ') {
    globe.paused = !globe.paused;
  }
});
