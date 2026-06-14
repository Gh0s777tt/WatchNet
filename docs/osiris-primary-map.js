(() => {
  const DEFAULT_CENTER = { lat: 40.4168, lon: 0, zoom: 6.03 };
  const MAX_WAIT_MS = 12000;
  const startedAt = Date.now();

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function params() {
    const q = new URLSearchParams(location.search);
    const lat = Number(q.get('lat'));
    const lon = Number(q.get('lon'));
    const zoom = Number(q.get('zoom'));
    return {
      lat: Number.isFinite(lat) ? clamp(lat, -85, 85) : DEFAULT_CENTER.lat,
      lon: Number.isFinite(lon) ? ((lon + 540) % 360) - 180 : DEFAULT_CENTER.lon,
      zoom: Number.isFinite(zoom) ? clamp(zoom, 1, 20) : DEFAULT_CENTER.zoom,
      layers: (q.get('layers') || '').split(',').map((v) => v.trim()).filter(Boolean)
    };
  }

  function setInitialModelView(view) {
    if (typeof model === 'undefined') return false;
    model.view.targetLon = view.lon;
    model.view.lon = view.lon;
    model.view.targetLat = view.lat;
    model.view.lat = view.lat;
    model.view.zoom = view.zoom;
    if (view.layers.length && model.activeLayers) {
      for (const key of Object.keys(model.activeLayers)) model.activeLayers[key] = false;
      for (const key of view.layers) if (key in model.activeLayers) model.activeLayers[key] = true;
      if (typeof updateLayerStatus === 'function') updateLayerStatus();
    }
    if (typeof resize === 'function') resize();
    return true;
  }

  function forceMapMode() {
    document.body.classList.add('primary-real-map', 'real-map-mode');
    const button = document.querySelector('[data-real-map]');
    if (button && !button.classList.contains('active')) button.click();
  }

  function copyMapCameraToModel(map) {
    if (typeof model === 'undefined' || !map) return;
    try {
      const center = map.getCenter();
      model.view.targetLon = ((center.lng + 540) % 360) - 180;
      model.view.lon = model.view.targetLon;
      model.view.targetLat = clamp(center.lat, -85, 85);
      model.view.lat = model.view.targetLat;
      model.view.zoom = clamp(map.getZoom(), 1, 20);
    } catch {}
  }

  function configureMap(map, view) {
    if (!map || map.__osirisPrimaryMap) return;
    map.__osirisPrimaryMap = true;
    window.__osirisRealMap = map;

    try { map.setMaxZoom(20); } catch {}
    try { map.setMinZoom(1); } catch {}
    try { map.dragPan.enable(); } catch {}
    try { map.scrollZoom.enable(); } catch {}
    try { map.touchZoomRotate.enable(); } catch {}
    try { map.doubleClickZoom.enable(); } catch {}
    try { map.dragRotate.disable(); } catch {}
    try { map.touchPitch.disable(); } catch {}

    const apply = () => {
      try {
        map.jumpTo({ center: [view.lon, view.lat], zoom: view.zoom, pitch: 0, bearing: 0 });
        map.resize();
        copyMapCameraToModel(map);
      } catch {}
      const eventMeta = document.getElementById('eventMeta');
      if (eventMeta) eventMeta.textContent = 'PINCH TO ZOOM · PAN MAP · TAP NODES FOR DETAIL';
      const readout = document.getElementById('readout');
      if (readout) readout.textContent = `MAP READY · Z ${view.zoom.toFixed(2)}`;
    };

    if (map.loaded?.()) apply();
    else map.once?.('load', apply);

    map.on?.('move', () => copyMapCameraToModel(map));
    map.on?.('moveend', () => setTimeout(() => copyMapCameraToModel(map), 0));
    map.on?.('zoomend', () => setTimeout(() => copyMapCameraToModel(map), 0));
  }

  function waitForMap(view) {
    forceMapMode();
    const map = window.__osirisRealMap;
    if (map) {
      configureMap(map, view);
      return;
    }
    if (Date.now() - startedAt > MAX_WAIT_MS) return;
    setTimeout(() => waitForMap(view), 80);
  }

  function install() {
    const view = params();
    const modelReady = setInitialModelView(view);
    forceMapMode();
    if (!modelReady && Date.now() - startedAt < MAX_WAIT_MS) {
      setTimeout(install, 60);
      return;
    }
    waitForMap(view);
  }

  const style = document.createElement('style');
  style.textContent = `
    body.primary-real-map .real-map-layer{opacity:1!important;pointer-events:auto!important;transition:none!important;z-index:6!important;}
    body.primary-real-map .globe-canvas{opacity:0!important;pointer-events:none!important;}
    body.primary-real-map .space-vignette{background:linear-gradient(180deg,rgba(2,3,10,.84),rgba(2,3,10,.08) 22%,rgba(2,3,10,.08) 72%,rgba(2,3,10,.76))!important;}
    body.primary-real-map .scan-lines{opacity:.06;pointer-events:none;}
    body.primary-real-map .floating-actions{display:none!important;}
    body.primary-real-map .event-card{pointer-events:none;}
    body.primary-real-map .maplibregl-canvas{touch-action:none!important;}
  `;
  document.head.appendChild(style);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
