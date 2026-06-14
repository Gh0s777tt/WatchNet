(() => {
  const startedAt = Date.now();
  const MAX_WAIT_MS = 15000;

  function addVisibilityCss() {
    if (document.getElementById('osiris-map-visibility-css')) return;
    const style = document.createElement('style');
    style.id = 'osiris-map-visibility-css';
    style.textContent = `
      body.primary-real-map .real-map-layer,
      body.real-map-mode .real-map-layer{
        background:#0b0f14!important;
        filter:none!important;
      }
      body.primary-real-map:not(.osiris-map-ready) .real-map-layer,
      body.real-map-mode:not(.osiris-map-ready) .real-map-layer{
        opacity:0!important;
        pointer-events:none!important;
      }
      body.primary-real-map:not(.osiris-map-ready) .globe-canvas,
      body.real-map-mode:not(.osiris-map-ready) .globe-canvas{
        opacity:1!important;
        pointer-events:auto!important;
      }
      body.osiris-map-ready.primary-real-map .real-map-layer,
      body.osiris-map-ready.real-map-mode .real-map-layer{
        opacity:1!important;
        pointer-events:auto!important;
      }
      body.osiris-map-ready.primary-real-map .globe-canvas,
      body.osiris-map-ready.real-map-mode .globe-canvas{
        opacity:0!important;
        pointer-events:none!important;
      }
      body.primary-real-map .maplibregl-canvas,
      body.real-map-mode .maplibregl-canvas{
        filter:none!important;
        opacity:1!important;
      }
      body.primary-real-map .space-vignette,
      body.real-map-mode .space-vignette{
        background:linear-gradient(180deg,rgba(2,3,10,.18),rgba(2,3,10,0) 16%,rgba(2,3,10,0) 82%,rgba(2,3,10,.22))!important;
      }
      body.primary-real-map:not(.osiris-map-ready) .space-vignette,
      body.real-map-mode:not(.osiris-map-ready) .space-vignette{
        background:linear-gradient(180deg,rgba(2,3,10,.76),rgba(2,3,10,.12) 22%,rgba(2,3,10,.12) 72%,rgba(2,3,10,.72))!important;
      }
      body.primary-real-map .scan-lines,
      body.real-map-mode .scan-lines{
        opacity:.025!important;
        mix-blend-mode:screen!important;
      }
      body.primary-real-map .osiris-live,
      body.real-map-mode .osiris-live{
        background:#0b0f14!important;
      }
      body.primary-real-map .live-header,
      body.real-map-mode .live-header{
        text-shadow:0 2px 16px rgba(0,0,0,.72);
      }
      body.primary-real-map .system-copy,
      body.real-map-mode .system-copy{
        opacity:.42!important;
        color:rgba(240,246,250,.48)!important;
      }
      .osiris-map-status{
        position:fixed;
        left:max(22px,env(safe-area-inset-left));
        bottom:calc(118px + env(safe-area-inset-bottom));
        z-index:520;
        color:#f5d96b;
        background:rgba(3,5,12,.78);
        border:1px solid rgba(215,183,57,.32);
        border-radius:12px;
        padding:8px 10px;
        font:700 10px ui-monospace,SFMono-Regular,Menlo,monospace;
        letter-spacing:.12em;
        text-transform:uppercase;
        opacity:.82;
        pointer-events:none;
      }
      body.osiris-map-ready .osiris-map-status{display:none!important;}
    `;
    document.head.appendChild(style);
  }

  function safeCall(fn) {
    try { return fn(); } catch { return undefined; }
  }

  function status(text) {
    let el = document.getElementById('osirisMapStatus');
    if (!el) {
      el = document.createElement('div');
      el.id = 'osirisMapStatus';
      el.className = 'osiris-map-status';
      document.body.appendChild(el);
    }
    el.textContent = text;
  }

  function markMapReady(map) {
    if (!map) return;
    document.body.classList.add('osiris-map-ready');
    safeCall(() => map.resize());
    const readout = document.getElementById('readout');
    if (readout && map.getZoom) readout.textContent = `MAP READY · Z ${map.getZoom().toFixed(2)}`;
  }

  function installTileReadiness(map) {
    if (!map || map.__osirisTileReadinessInstalled) return;
    map.__osirisTileReadinessInstalled = true;
    const ready = () => markMapReady(map);
    safeCall(() => map.once('load', ready));
    safeCall(() => map.once('idle', ready));
    safeCall(() => map.once('sourcedata', ready));
    setTimeout(() => {
      if (safeCall(() => map.loaded()) || safeCall(() => map.isStyleLoaded())) ready();
    }, 1800);
    setTimeout(() => {
      if (!document.body.classList.contains('osiris-map-ready')) {
        const eventTitle = document.getElementById('eventTitle');
        if (eventTitle) eventTitle.textContent = 'MAP TILES STILL LOADING';
        status('Map loading · globe fallback active');
      }
    }, 4500);
  }

  function addReadableLabelOverlay(map) {
    if (!map) return false;
    installTileReadiness(map);
    if (map.__osirisVisibilityFixed) return true;
    if (!safeCall(() => map.isStyleLoaded())) return false;
    map.__osirisVisibilityFixed = true;

    safeCall(() => map.setPaintProperty('carto-base', 'raster-opacity', 1));
    safeCall(() => map.setLayoutProperty('osiris-labels', 'visibility', 'visible'));
    safeCall(() => map.setPaintProperty('osiris-labels', 'text-color', '#fff1a3'));
    safeCall(() => map.setPaintProperty('osiris-labels', 'text-halo-color', '#05070b'));
    safeCall(() => map.setPaintProperty('osiris-labels', 'text-halo-width', 2.2));
    safeCall(() => map.setPaintProperty('osiris-labels', 'text-opacity', 1));

    if (!safeCall(() => map.getSource('osmFallback'))) {
      safeCall(() => map.addSource('osmFallback', {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      }));
    }

    if (!safeCall(() => map.getLayer('osm-fallback-base'))) {
      safeCall(() => map.addLayer({
        id: 'osm-fallback-base',
        type: 'raster',
        source: 'osmFallback',
        paint: {
          'raster-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.08, 6, 0.14, 11, 0.22, 15, 0.34],
          'raster-saturation': -0.65,
          'raster-contrast': 0.2,
          'raster-brightness-min': 0,
          'raster-brightness-max': 0.9
        }
      }, 'osiris-cables'));
    }

    if (!safeCall(() => map.getSource('cartoReadableLabels'))) {
      safeCall(() => map.addSource('cartoReadableLabels', {
        type: 'raster',
        tiles: ['https://basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors © CARTO'
      }));
    }

    if (!safeCall(() => map.getLayer('carto-readable-labels'))) {
      const beforeLayer = safeCall(() => map.getLayer('osiris-cables')) ? 'osiris-cables' : undefined;
      safeCall(() => map.addLayer({
        id: 'carto-readable-labels',
        type: 'raster',
        source: 'cartoReadableLabels',
        paint: {
          'raster-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.68, 6, 0.9, 10, 1],
          'raster-brightness-min': 0.05,
          'raster-brightness-max': 1
        }
      }, beforeLayer));
    }

    if (!safeCall(() => map.getSource('cartoStreetLabels'))) {
      safeCall(() => map.addSource('cartoStreetLabels', {
        type: 'raster',
        tiles: ['https://basemaps.cartocdn.com/voyager_only_labels/{z}/{x}/{y}{r}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors © CARTO'
      }));
    }

    if (!safeCall(() => map.getLayer('carto-street-labels'))) {
      safeCall(() => map.addLayer({
        id: 'carto-street-labels',
        type: 'raster',
        source: 'cartoStreetLabels',
        minzoom: 11,
        paint: {
          'raster-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0, 13, 0.78, 16, 1],
          'raster-brightness-min': 0,
          'raster-brightness-max': 1
        }
      }));
    }

    safeCall(() => map.setMaxZoom(20));
    safeCall(() => map.resize());
    markMapReady(map);
    return true;
  }

  function install() {
    addVisibilityCss();
    if (!document.body.classList.contains('osiris-map-ready')) status('Loading map data');
    const map = window.__osirisRealMap;
    if (addReadableLabelOverlay(map)) return;
    if (Date.now() - startedAt > MAX_WAIT_MS) {
      status('Map unavailable · globe fallback active');
      return;
    }
    setTimeout(install, 120);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
