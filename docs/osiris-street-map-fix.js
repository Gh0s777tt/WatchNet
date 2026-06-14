(() => {
  const PRIMARY_MAP = !!window.__OSIRIS_PRIMARY_MAP__;
  const MAX_STREET_ZOOM = 20;
  const MIN_MAP_ZOOM = 1;
  const BASE_MAP_ZOOM = 2.2;
  const OLD_SCALE = 2.25;
  const STREET_SCALE = 4.25;
  const AUTO_ENTER_APP_ZOOM = 3.35;
  const AUTO_EXIT_APP_ZOOM = 1.18;

  function clampValue(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function appZoomToStreetZoom(appZoom) {
    if (PRIMARY_MAP) return clampValue(Number(appZoom) || 1, MIN_MAP_ZOOM, MAX_STREET_ZOOM);
    return clampValue(BASE_MAP_ZOOM + Math.log2(Math.max(0.72, appZoom)) * STREET_SCALE, MIN_MAP_ZOOM, MAX_STREET_ZOOM);
  }

  function oldMapZoomToAppZoom(oldMapZoom) {
    return clampValue(2 ** ((oldMapZoom - BASE_MAP_ZOOM) / OLD_SCALE), 0.72, 16);
  }

  function appZoomFromStreetZoom(mapZoom) {
    if (PRIMARY_MAP) return clampValue(Number(mapZoom) || 1, 0.72, MAX_STREET_ZOOM);
    return clampValue(2 ** ((mapZoom - BASE_MAP_ZOOM) / STREET_SCALE), 0.72, 16);
  }

  function shouldRemapZoom(zoom) {
    return !PRIMARY_MAP && Number.isFinite(zoom) && zoom >= MIN_MAP_ZOOM && zoom <= 12.4;
  }

  function remapSyncZoom(zoom) {
    if (!shouldRemapZoom(zoom)) return zoom;
    return appZoomToStreetZoom(oldMapZoomToAppZoom(zoom));
  }

  function syncModelFromMap(map) {
    if (typeof model === 'undefined' || !map) return;
    try {
      const center = map.getCenter();
      model.view.targetLon = ((center.lng + 540) % 360) - 180;
      model.view.targetLat = clampValue(center.lat, -72, 78);
      model.view.zoom = appZoomFromStreetZoom(map.getZoom());
      if (typeof resize === 'function') resize();
    } catch {}
  }

  function patchMapInstance(map) {
    if (!map || map.__osirisStreetPatch) return map;
    map.__osirisStreetPatch = true;
    window.__osirisRealMap = map;

    try { map.setMaxZoom(MAX_STREET_ZOOM); } catch {}
    try { map.setMinZoom(MIN_MAP_ZOOM); } catch {}
    try { map.dragPan.enable(); } catch {}
    try { map.scrollZoom.enable(); } catch {}
    try { map.touchZoomRotate.enable(); } catch {}
    try { map.doubleClickZoom.enable(); } catch {}
    try { map.dragRotate.disable(); } catch {}
    try { map.touchPitch.disable(); } catch {}

    for (const method of ['jumpTo', 'easeTo', 'flyTo']) {
      const original = map[method]?.bind(map);
      if (!original) continue;
      map[method] = (options = {}, eventData) => {
        const next = { ...options };
        if (typeof next.zoom === 'number') next.zoom = remapSyncZoom(next.zoom);
        if (typeof next.pitch !== 'number') next.pitch = PRIMARY_MAP ? 0 : ((next.zoom || map.getZoom()) >= 15 ? 0 : 28);
        return original(next, eventData);
      };
    }

    map.on?.('zoomend', () => {
      syncModelFromMap(map);
      if (!PRIMARY_MAP) autoModeTick();
    });
    map.on?.('moveend', () => syncModelFromMap(map));
    return map;
  }

  function patchMapLibre(lib) {
    if (!lib || lib.__osirisStreetPatch || !lib.Map) return lib;
    lib.__osirisStreetPatch = true;
    const OriginalMap = lib.Map;

    function StreetLevelMap(options = {}) {
      const next = { ...options, maxZoom: MAX_STREET_ZOOM, minZoom: MIN_MAP_ZOOM };
      if (typeof next.zoom === 'number') next.zoom = remapSyncZoom(next.zoom);
      if (PRIMARY_MAP) {
        next.pitch = 0;
        next.fadeDuration = 0;
        next.refreshExpiredTiles = false;
      }
      const map = new OriginalMap(next);
      return patchMapInstance(map);
    }

    StreetLevelMap.prototype = OriginalMap.prototype;
    Object.setPrototypeOf(StreetLevelMap, OriginalMap);
    lib.Map = StreetLevelMap;
    return lib;
  }

  function installMapLibreHook() {
    let cached = window.maplibregl;
    if (cached) {
      window.maplibregl = patchMapLibre(cached);
      return;
    }

    try {
      Object.defineProperty(window, 'maplibregl', {
        configurable: true,
        get() { return cached; },
        set(value) {
          cached = patchMapLibre(value);
          Object.defineProperty(window, 'maplibregl', {
            value: cached,
            configurable: true,
            writable: true
          });
        }
      });
    } catch {}
  }

  function installNodeStreetZoom() {
    if (typeof selectNode !== 'function') return setTimeout(installNodeStreetZoom, 60);
    const originalSelectNode = selectNode;
    if (originalSelectNode.__osirisStreetPatch) return;

    selectNode = function streetLevelSelectNode(node) {
      const result = originalSelectNode(node);
      const map = window.__osirisRealMap;
      if (node && map && document.body.classList.contains('real-map-mode')) {
        const targetZoom = Math.max(map.getZoom(), node.layer === 'cctv' ? 18 : 16);
        try {
          map.easeTo({ center: [Number(node.lon), Number(node.lat)], zoom: clampValue(targetZoom, MIN_MAP_ZOOM, MAX_STREET_ZOOM), pitch: 0, duration: PRIMARY_MAP ? 260 : 420 });
        } catch {}
      }
      return result;
    };
    selectNode.__osirisStreetPatch = true;
  }

  function getMapToggle() {
    return document.querySelector('[data-real-map]');
  }

  function isRealMapMode() {
    return document.body.classList.contains('real-map-mode');
  }

  function setHiddenMapMode(on) {
    const button = getMapToggle();
    if (!button || isRealMapMode() === !!on) return;
    button.click();
  }

  function appZoomNow() {
    const map = window.__osirisRealMap;
    if (map && isRealMapMode()) return appZoomFromStreetZoom(map.getZoom());
    if (typeof model !== 'undefined') return Number(model.view?.zoom || 1);
    return 1;
  }

  function autoModeTick() {
    if (PRIMARY_MAP) return;
    const zoom = appZoomNow();
    if (!isRealMapMode() && zoom >= AUTO_ENTER_APP_ZOOM) {
      setHiddenMapMode(true);
      const map = window.__osirisRealMap;
      if (map) {
        try { map.easeTo({ zoom: Math.max(map.getZoom(), appZoomToStreetZoom(zoom)), pitch: 28, duration: 180 }); } catch {}
      }
      const eventMeta = document.getElementById('eventMeta');
      if (eventMeta) eventMeta.textContent = 'PINCH TO STREET LEVEL · TAP NODES FOR DETAIL';
      return;
    }
    if (isRealMapMode() && zoom <= AUTO_EXIT_APP_ZOOM) {
      setHiddenMapMode(false);
      const eventMeta = document.getElementById('eventMeta');
      if (eventMeta) eventMeta.textContent = 'DRAG TO ORBIT · PINCH TO ZOOM INTO MAP';
    }
  }

  function installAutomaticMapMode() {
    const style = document.createElement('style');
    style.textContent = `
      .real-map-toggle{display:none!important;}
      .deep-zoom-controls{grid-template-rows:repeat(2,auto)!important;}
    `;
    document.head.appendChild(style);

    if (PRIMARY_MAP) return;

    document.addEventListener('wheel', autoModeTick, { passive: true });
    document.addEventListener('touchend', () => setTimeout(autoModeTick, 80), { passive: true });
    document.addEventListener('pointerup', () => setTimeout(autoModeTick, 80), { passive: true });
    document.addEventListener('click', (event) => {
      if (event.target?.closest?.('.bottom-nav button')) setTimeout(() => setHiddenMapMode(false), 40);
    }, true);

    const originalSetZoomInstaller = () => {
      if (typeof setZoom !== 'function') return setTimeout(originalSetZoomInstaller, 60);
      if (setZoom.__osirisAutoMapPatch) return;
      const originalSetZoom = setZoom;
      setZoom = function autoMapSetZoom(value) {
        const result = originalSetZoom(value);
        setTimeout(autoModeTick, 0);
        return result;
      };
      setZoom.__osirisAutoMapPatch = true;
    };
    originalSetZoomInstaller();

    const canvas = document.getElementById('globeCanvas');
    canvas?.addEventListener('pointermove', () => {
      if (typeof model !== 'undefined' && Number(model.view?.zoom || 1) >= AUTO_ENTER_APP_ZOOM) setTimeout(autoModeTick, 0);
    }, { passive: true });
  }

  installMapLibreHook();
  installNodeStreetZoom();
  installAutomaticMapMode();
})();
