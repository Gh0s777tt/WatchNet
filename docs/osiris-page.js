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
const consoleFeed = document.getElementById('consoleFeed');
const start = Date.now();

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

const places = ['ATLANTIC GRID', 'EUCOM WATCH', 'PACIFIC NODE', 'CENTCOM LANE', 'ORBITAL HANDOFF', 'LYCAN RELAY'];
let placeIndex = 0;
window.setInterval(() => {
  placeIndex = (placeIndex + 1) % places.length;
  if (locLabel) locLabel.textContent = places[placeIndex];
}, 4200);

mapStage?.addEventListener('mousemove', event => {
  const rect = mapStage.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const lng = (x * 360 - 180).toFixed(4);
  const lat = ((0.5 - y) * 170).toFixed(4);
  if (coords) coords.textContent = `${lat}, ${lng}`;
});

const feedLines = [
  '[OSIRIS] ROUTE TABLE LOCKED',
  '[SDK] SENSOR LATTICE ACTIVE',
  '[NET] LYCAN NETWORK READY',
  '[C2] PHYSICAL COMMAND CORE ONLINE',
  '[SURVEIL] CCTV INDEX WARM',
  '[THREAT] GHOST PROTOCOL STANDBY'
];

let feedOffset = 0;
window.setInterval(() => {
  if (!consoleFeed) return;
  feedOffset = (feedOffset + 1) % feedLines.length;
  const visible = [0, 1, 2].map(i => feedLines[(feedOffset + i) % feedLines.length]);
  consoleFeed.innerHTML = visible.map(line => `<span>${line}</span>`).join('');
}, 3600);

document.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (key === 'f') {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }
  if (key === 'r') {
    if (coords) coords.textContent = '34.4200, -77.3100';
    if (locLabel) locLabel.textContent = 'ATLANTIC GRID';
  }
  if (key === 's') {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: 'OSIRIS', url }).catch(() => {});
    else navigator.clipboard?.writeText(url);
  }
});
