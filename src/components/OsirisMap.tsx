'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface OsirisMapProps {
  data: any;
  activeLayers: Record<string, boolean>;
  onEntityClick?: (entity: any) => void;
  onMouseCoords?: (coords: { lat: number; lng: number }) => void;
  onRightClick?: (coords: { lat: number; lng: number }) => void;
  onViewStateChange?: (vs: { zoom: number; latitude: number }) => void;
  flyToLocation?: { lat: number; lng: number; ts: number } | null;
  projection?: 'mercator' | 'globe';
  mapStyle?: string;
}

function computeSolarTerminator(): [number, number][] {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const decRad = declination * Math.PI / 180;
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const subsolarLng = (12 - utcHours) * 15;
  const points: [number, number][] = [];
  for (let lng = -180; lng <= 180; lng += 2) {
    const lngRad = (lng - subsolarLng) * Math.PI / 180;
    const lat = Math.atan(-Math.cos(lngRad) / Math.tan(decRad)) * 180 / Math.PI;
    points.push([lng, lat]);
  }
  const darkSide = declination >= 0 ? -90 : 90;
  points.push([180, darkSide]);
  points.push([-180, darkSide]);
  points.push(points[0]);
  return points;
}

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

export default function OsirisMap({ data, activeLayers, onEntityClick, onMouseCoords, onRightClick, onViewStateChange, flyToLocation, projection = 'globe', mapStyle = 'dark' }: OsirisMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const prevStyleRef = useRef(mapStyle);

  // Create aircraft icon on canvas (for WebGL symbol layer)
  const createIcon = useCallback((map: maplibregl.Map, id: string, color: string, size: number) => {
    if (map.hasImage(id)) return;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2, cy = size / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.4);
    ctx.lineTo(cx - size * 0.12, cy + size * 0.1);
    ctx.lineTo(cx - size * 0.4, cy + size * 0.2);
    ctx.lineTo(cx - size * 0.4, cy + size * 0.3);
    ctx.lineTo(cx - size * 0.12, cy + size * 0.15);
    ctx.lineTo(cx, cy + size * 0.35);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.15);
    ctx.lineTo(cx + size * 0.4, cy + size * 0.3);
    ctx.lineTo(cx + size * 0.4, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.1);
    ctx.closePath();
    ctx.fill();
    map.addImage(id, { width: size, height: size, data: new Uint8Array(ctx.getImageData(0, 0, size, size).data) });
  }, []);

  const createDot = useCallback((map: maplibregl.Map, id: string, color: string, size: number) => {
    if (map.hasImage(id)) return;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 1, 0, Math.PI * 2);
    ctx.fill();
    map.addImage(id, { width: size, height: size, data: new Uint8Array(ctx.getImageData(0, 0, size, size).data) });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [20, 20], zoom: 2.5, minZoom: 1.5, maxZoom: 18,
      attributionControl: false, antialias: true,
      maxPitch: 85,
    });

    map.on('load', () => {
      mapRef.current = map;
      // Create icons
      createIcon(map, 'plane-cyan', '#00E5FF', 24);
      createIcon(map, 'plane-green', '#00E676', 24);
      createIcon(map, 'plane-pink', '#FF69B4', 24);
      createIcon(map, 'plane-red', '#FF3D3D', 24);
      createIcon(map, 'plane-grey', '#555555', 24);
      createDot(map, 'dot-gold', '#D4AF37', 8);
      createDot(map, 'dot-red', '#FF3D3D', 10);
      createDot(map, 'dot-orange', '#FF9500', 10);
      createDot(map, 'dot-green', '#00E676', 10);
      createDot(map, 'dot-fire', '#FF6B00', 10);
      createDot(map, 'dot-cctv', '#39FF14', 10);

      // Sources
      const sources = ['flights','military','jets','private-fl','satellites','earthquakes','gdelt','gps-jamming','day-night','cctv','fires','weather','infrastructure'];
      sources.forEach(s => map.addSource(s, { type: 'geojson', data: EMPTY_FC }));

      // Day/Night
      map.addLayer({ id: 'day-night-fill', type: 'fill', source: 'day-night', paint: { 'fill-color': '#000022', 'fill-opacity': 0.35 }});

      // Earthquakes
      map.addLayer({ id: 'eq-circles', type: 'circle', source: 'earthquakes', paint: {
        'circle-radius': ['interpolate',['linear'],['get','magnitude'], 2.5,4, 5,12, 7,24],
        'circle-color': ['interpolate',['linear'],['get','magnitude'], 2.5,'#FFD700', 4,'#FF9500', 6,'#FF1744'],
        'circle-opacity': 0.6, 'circle-blur': 0.3, 'circle-stroke-width': 1, 'circle-stroke-color': '#FFD700', 'circle-stroke-opacity': 0.3,
      }});
      map.addLayer({ id: 'eq-label', type: 'symbol', source: 'earthquakes', filter: ['>=',['get','magnitude'],4.5], layout: {
        'text-field': ['concat','M',['to-string',['get','magnitude']]], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0,1.5],
      }, paint: { 'text-color': '#FFD700', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Fires
      map.addLayer({ id: 'fires-heat', type: 'circle', source: 'fires', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,2, 5,4, 10,8],
        'circle-color': '#FF6B00', 'circle-opacity': 0.5, 'circle-blur': 0.5,
      }});

      // CCTV — outer glow ring
      map.addLayer({ id: 'cctv-glow', type: 'circle', source: 'cctv', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,14, 14,20],
        'circle-color': '#39FF14', 'circle-opacity': 0.08, 'circle-blur': 1,
      }});
      // CCTV — main dot
      map.addLayer({ id: 'cctv-dots', type: 'circle', source: 'cctv', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8, 14,12],
        'circle-color': '#39FF14', 'circle-opacity': 0.8,
        'circle-stroke-width': 2, 'circle-stroke-color': '#39FF14', 'circle-stroke-opacity': 0.5,
      }});
      // CCTV — labels at zoom 10+
      map.addLayer({ id: 'cctv-label', type: 'symbol', source: 'cctv', minzoom: 10, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#39FF14', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // GDELT
      map.addLayer({ id: 'gdelt-dots', type: 'circle', source: 'gdelt', paint: {
        'circle-radius': 4, 'circle-color': '#FF3D3D', 'circle-opacity': 0.5, 'circle-stroke-width': 1, 'circle-stroke-color': '#FF3D3D', 'circle-stroke-opacity': 0.3,
      }});

      // GPS Jamming
      map.addLayer({ id: 'jam-fill', type: 'circle', source: 'gps-jamming', paint: { 'circle-radius': 30, 'circle-color': '#FF0000', 'circle-opacity': 0.15, 'circle-blur': 1 }});
      map.addLayer({ id: 'jam-label', type: 'symbol', source: 'gps-jamming', layout: {
        'text-field': ['concat','GPS JAM ',['to-string',['get','severity']],'%'], 'text-size': 10, 'text-font': ['Open Sans Bold'], 'text-allow-overlap': true,
      }, paint: { 'text-color': '#FF4444', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Weather Events (NASA EONET — storms, volcanoes)
      map.addLayer({ id: 'weather-glow', type: 'circle', source: 'weather', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,12, 5,20, 10,30],
        'circle-color': '#E040FB', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'weather-dots', type: 'circle', source: 'weather', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,14],
        'circle-color': ['match', ['get','icon'], 'cyclone','#E040FB', 'volcano','#FF1744', '#E040FB'],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2, 'circle-stroke-color': '#E040FB', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'weather-label', type: 'symbol', source: 'weather', layout: {
        'text-field': ['get','title'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#E040FB', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 }});

      // Nuclear Infrastructure
      map.addLayer({ id: 'infra-glow', type: 'circle', source: 'infrastructure', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#76FF03', 'circle-opacity': 0.08, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'infra-dots', type: 'circle', source: 'infrastructure', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,10],
        'circle-color': ['match', ['get','status'], 'Active Conflict Zone','#FF1744', 'Destroyed / Decommissioning','#757575', '#76FF03'],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2, 'circle-stroke-color': '#76FF03', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'infra-label', type: 'symbol', source: 'infrastructure', minzoom: 5, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#76FF03', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // Satellites
      map.addLayer({ id: 'sat-dots', type: 'circle', source: 'satellites', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,1.5, 5,3], 'circle-color': ['get','color'], 'circle-opacity': 0.7,
      }});

      // Flight layers (WebGL symbol — GPU rendered, handles 50K+ smooth)
      const flightLayers = [
        { id: 'fl-commercial', src: 'flights', icon: 'plane-cyan' },
        { id: 'fl-private', src: 'private-fl', icon: 'plane-green' },
        { id: 'fl-jets', src: 'jets', icon: 'plane-pink' },
        { id: 'fl-military', src: 'military', icon: 'plane-red' },
      ];
      flightLayers.forEach(l => {
        map.addLayer({ id: l.id, type: 'symbol', source: l.src, layout: {
          'icon-image': l.icon, 'icon-size': ['interpolate',['linear'],['zoom'], 1,0.4, 5,0.7, 10,1],
          'icon-rotate': ['get','heading'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
        }, paint: { 'icon-opacity': 0.85 }});
      });

      setMapReady(true);
    });

    // Events
    map.on('mousemove', e => onMouseCoords?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
    map.on('contextmenu', e => { e.preventDefault(); onRightClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }); });
    map.on('moveend', () => { const c = map.getCenter(); onViewStateChange?.({ zoom: map.getZoom(), latitude: c.lat }); });

    // ── POPUP HELPER ──
    const popup = (coords: any, html: string) => {
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '360px', offset: 12 }).setLngLat(coords).setHTML(html).addTo(map);
    };
    const pStyle = `background:rgba(12,14,26,0.95);backdrop-filter:blur(16px);border-radius:8px;padding:14px;font-family:'JetBrains Mono',monospace;`;
    const linkStyle = `display:inline-block;margin-top:8px;padding:4px 10px;font-size:8px;letter-spacing:0.15em;text-decoration:none;border-radius:4px;font-family:'JetBrains Mono',monospace;`;

    // ── Flights (with FlightAware + ADS-B Exchange links) ──
    ['fl-commercial','fl-private','fl-jets','fl-military'].forEach(layer => {
      map.on('click', layer, e => {
        if (!e.features?.length) return;
        const p = e.features[0].properties as any;
        const coords = (e.features[0].geometry as any).coordinates;
        const cs = (p.callsign||'').trim();
        popup(coords, `<div style="${pStyle}border:1px solid rgba(212,175,55,0.3);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <span style="color:#D4AF37;font-size:14px;font-weight:700;letter-spacing:0.1em;">${cs}</span>
            <span style="color:#5C5A54;font-size:8px;">${p.icao24||''}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:9px;">
            <div><span style="color:#5C5A54;">MODEL</span><br/><span style="color:#E8E6E0;">${p.model||'—'}</span></div>
            <div><span style="color:#5C5A54;">ALT</span><br/><span style="color:#00E5FF;">${p.alt?Math.round(p.alt)+'m':'—'}</span></div>
            <div><span style="color:#5C5A54;">SPEED</span><br/><span style="color:#E8E6E0;">${p.speed_knots||'—'}kt</span></div>
            <div><span style="color:#5C5A54;">HDG</span><br/><span style="color:#E8E6E0;">${Math.round(p.heading||0)}°</span></div>
            <div><span style="color:#5C5A54;">REG</span><br/><span style="color:#E8E6E0;">${p.registration||'—'}</span></div>
            <div><span style="color:#5C5A54;">POS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(2)},${coords[0].toFixed(2)}</span></div>
          </div>
          <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">
            <a href="https://www.flightaware.com/live/flight/${cs}" target="_blank" style="${linkStyle}color:#D4AF37;border:1px solid rgba(212,175,55,0.4);background:rgba(212,175,55,0.1);">⚡ FLIGHTAWARE</a>
            <a href="https://globe.adsbexchange.com/?icao=${p.icao24||''}" target="_blank" style="${linkStyle}color:#00E5FF;border:1px solid rgba(0,229,255,0.4);background:rgba(0,229,255,0.1);">📡 ADS-B EXCHANGE</a>
            <a href="https://www.radarbox.com/data/flights/${cs}" target="_blank" style="${linkStyle}color:#FF69B4;border:1px solid rgba(255,105,180,0.4);background:rgba(255,105,180,0.1);">📍 RADARBOX</a>
          </div>
        </div>`);
        onEntityClick?.(p);
      });
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    });

    // ── CCTV (opens CameraViewer panel) ──
    map.on('click', 'cctv-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      // Emit the camera data so the CameraViewer opens
      onEntityClick?.({
        type: 'cctv',
        id: p.id,
        name: p.name,
        city: p.city,
        country: p.country,
        source: p.source,
        feed_url: p.feed_url,
        lat: coords[1],
        lng: coords[0],
      });
      // Also fly to the camera
      map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 13), duration: 1000 });
    });

    // ── Earthquakes (with USGS link) ──
    map.on('click', 'eq-circles', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,149,0,0.3);">
        <div style="color:#FF9500;font-size:14px;font-weight:700;margin-bottom:4px;">M${p.magnitude} EARTHQUAKE</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${p.place||'Unknown location'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          <div><span style="color:#5C5A54;">DEPTH</span><br/><span style="color:#E8E6E0;">${p.depth||'—'}km</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}, ${coords[0].toFixed(3)}</span></div>
        </div>
        <a href="https://earthquake.usgs.gov/earthquakes/eventpage/${p.id||''}" target="_blank" style="${linkStyle}color:#FF9500;border:1px solid rgba(255,149,0,0.4);background:rgba(255,149,0,0.1);">📊 USGS DETAILS</a>
      </div>`);
    });

    // ── Satellites (with N2YO tracking) ──
    map.on('click', 'sat-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(212,175,55,0.3);">
        <div style="color:#D4AF37;font-size:12px;font-weight:700;letter-spacing:0.1em;margin-bottom:4px;">🛰️ ${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">MISSION</span><br/><span style="color:${p.color||'#aaa'};">${p.mission||'Unknown'}</span></div>
          <div><span style="color:#5C5A54;">POS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(2)}°, ${coords[0].toFixed(2)}°</span></div>
        </div>
        <a href="https://www.n2yo.com/?s=${encodeURIComponent(p.name||'')}" target="_blank" style="${linkStyle}color:#D4AF37;border:1px solid rgba(212,175,55,0.4);background:rgba(212,175,55,0.1);">🔭 TRACK ON N2YO</a>
      </div>`);
    });

    // ── Fires (with NASA FIRMS link) ──
    map.on('click', 'fires-heat', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,107,0,0.3);">
        <div style="color:#FF6B00;font-size:12px;font-weight:700;margin-bottom:6px;">🔥 ACTIVE FIRE DETECTED</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">BRIGHTNESS</span><br/><span style="color:#FF6B00;">${p.brightness||'—'}K</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        <a href="https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;l:noaa20-viirs,viirs,modis_a,modis_t;@${coords[0]},${coords[1]},10z" target="_blank" style="${linkStyle}color:#FF6B00;border:1px solid rgba(255,107,0,0.4);background:rgba(255,107,0,0.1);">🛰️ NASA FIRMS MAP</a>
      </div>`);
    });

    // ── GDELT Conflicts (with source article) ──
    map.on('click', 'gdelt-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,61,61,0.3);">
        <div style="color:#FF3D3D;font-size:12px;font-weight:700;margin-bottom:6px;">⚠️ CONFLICT EVENT</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;line-height:1.4;">${p.name||'Unclassified incident'}</div>
        <div style="display:flex;gap:6px;">
          ${p.url ? `<a href="${p.url}" target="_blank" style="${linkStyle}color:#FF3D3D;border:1px solid rgba(255,61,61,0.4);background:rgba(255,61,61,0.1);">📰 SOURCE</a>` : ''}
          <a href="https://www.google.com/maps/@${coords[1]},${coords[0]},12z" target="_blank" style="${linkStyle}color:#448AFF;border:1px solid rgba(68,138,255,0.4);background:rgba(68,138,255,0.1);">🗺️ MAP</a>
        </div>
      </div>`);
    });

    // Cursor handlers for all clickable layers
    ['cctv-dots','eq-circles','sat-dots','fires-heat','gdelt-dots','weather-dots','infra-dots'].forEach(layer => {
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    });

    // ── Weather Events (NASA EONET) ──
    map.on('click', 'weather-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const iconEmoji = p.icon === 'cyclone' ? '🌀' : p.icon === 'volcano' ? '🌋' : '⚡';
      popup(coords, `<div style="${pStyle}border:1px solid rgba(224,64,251,0.3);">
        <div style="color:#E040FB;font-size:14px;font-weight:700;margin-bottom:6px;">${iconEmoji} ${p.type || 'Weather Event'}</div>
        <div style="font-size:10px;color:#E8E6E0;margin-bottom:8px;line-height:1.4;">${p.title || 'Unknown event'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">SEVERITY</span><br/><span style="color:${p.severity === 'high' ? '#FF1744' : '#FFD700'};">${(p.severity||'low').toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        <div style="display:flex;gap:6px;">
          ${p.source ? `<a href="${p.source}" target="_blank" style="${linkStyle}color:#E040FB;border:1px solid rgba(224,64,251,0.4);background:rgba(224,64,251,0.1);">📡 SOURCE</a>` : ''}
          <a href="https://eonet.gsfc.nasa.gov/api/v3/events/${p.id || ''}" target="_blank" style="${linkStyle}color:#D4AF37;border:1px solid rgba(212,175,55,0.4);background:rgba(212,175,55,0.1);">🛰️ NASA EONET</a>
        </div>
      </div>`);
    });

    // ── Nuclear Infrastructure ──
    map.on('click', 'infra-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const statusColor = p.status === 'Active Conflict Zone' ? '#FF1744' : p.status === 'Operational' ? '#76FF03' : '#757575';
      popup(coords, `<div style="${pStyle}border:1px solid rgba(118,255,3,0.3);">
        <div style="color:#76FF03;font-size:14px;font-weight:700;margin-bottom:4px;">☢️ ${p.name || 'Nuclear Facility'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">STATUS</span><br/><span style="color:${statusColor};">${p.status || '—'}</span></div>
          <div><span style="color:#5C5A54;">CITY</span><br/><span style="color:#E8E6E0;">${p.city || '—'}, ${p.country || ''}</span></div>
          <div><span style="color:#5C5A54;">REACTORS</span><br/><span style="color:#76FF03;">${p.reactors || '—'}</span></div>
          <div><span style="color:#5C5A54;">CAPACITY</span><br/><span style="color:#E8E6E0;">${p.capacityMW ? p.capacityMW.toLocaleString() + ' MW' : '—'}</span></div>
          <div><span style="color:#5C5A54;">OWNER</span><br/><span style="color:#E8E6E0;">${p.owner || '—'}</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        <a href="https://www.google.com/maps/@${coords[1]},${coords[0]},14z/data=!3m1!1e3" target="_blank" style="${linkStyle}color:#76FF03;border:1px solid rgba(118,255,3,0.4);background:rgba(118,255,3,0.1);">🗺️ SATELLITE VIEW</a>
      </div>`);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Day/Night
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const update = () => {
      const src = map.getSource('day-night') as any;
      if (!src) return;
      if (!activeLayers.day_night) { src.setData(EMPTY_FC); return; }
      src.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [computeSolarTerminator()] }, properties: {} }] });
    };
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [mapReady, activeLayers.day_night]);

  // Helper to set GeoJSON
  const setGeo = useCallback((source: string, features: any[]) => {
    const src = mapRef.current?.getSource(source) as any;
    if (src) src.setData({ type: 'FeatureCollection', features });
  }, []);

  const setVis = useCallback((ids: string[], visible: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    ids.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'); });
  }, []);

  // Flight data → GeoJSON (GPU rendered)
  useEffect(() => {
    if (!mapReady) return;
    const toFeatures = (arr: any[]) => (arr || []).map((f: any) => ({
      type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] },
      properties: { callsign: f.callsign, heading: f.heading || 0, alt: f.alt, model: f.model, speed_knots: f.speed_knots, registration: f.registration, icao24: f.icao24 },
    }));
    setGeo('flights', activeLayers.flights ? toFeatures(data.commercial_flights) : []);
    setGeo('private-fl', activeLayers.private ? toFeatures(data.private_flights) : []);
    setGeo('jets', activeLayers.jets ? toFeatures(data.private_jets) : []);
    setGeo('military', activeLayers.military ? toFeatures(data.military_flights) : []);
  }, [mapReady, data.commercial_flights, data.private_flights, data.private_jets, data.military_flights, activeLayers.flights, activeLayers.private, activeLayers.jets, activeLayers.military]);

  // Other layers
  useEffect(() => {
    if (!mapReady) return;
    setGeo('earthquakes', activeLayers.earthquakes && data.earthquakes ? data.earthquakes.map((eq: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [eq.lng, eq.lat] }, properties: { magnitude: eq.magnitude, place: eq.place } })) : []);
    setGeo('satellites', activeLayers.satellites && data.satellites ? data.satellites.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { name: s.name, color: s.color, mission: s.mission } })) : []);
    setGeo('gdelt', activeLayers.global_incidents && data.gdelt ? data.gdelt.map((e: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [e.lng, e.lat] }, properties: { name: e.name } })) : []);
    setGeo('gps-jamming', activeLayers.gps_jamming && data.gps_jamming ? data.gps_jamming.map((z: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [z.lng, z.lat] }, properties: { severity: z.severity } })) : []);
    setGeo('cctv', activeLayers.cctv && data.cameras ? data.cameras.map((c: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lng, c.lat] }, properties: { id: c.id, name: c.name, city: c.city, country: c.country, source: c.source, feed_url: c.feed_url } })) : []);
    setGeo('fires', activeLayers.fires && data.fires ? data.fires.map((f: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.lng, f.lat] }, properties: { brightness: f.brightness } })) : []);
    setGeo('weather', activeLayers.weather && data.weather_events ? data.weather_events.map((w: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [w.lng, w.lat] }, properties: { title: w.title, type: w.type, icon: w.icon, severity: w.severity, source: w.source, id: w.id } })) : []);
    setGeo('infrastructure', activeLayers.infrastructure && data.infrastructure ? data.infrastructure.map((i: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [i.lng, i.lat] }, properties: { name: i.name, city: i.city, country: i.country, status: i.status, reactors: i.reactors, capacityMW: i.capacityMW, owner: i.owner } })) : []);
  }, [mapReady, data, activeLayers]);

  // Visibility
  useEffect(() => {
    if (!mapReady) return;
    setVis(['eq-circles','eq-label'], activeLayers.earthquakes);
    setVis(['sat-dots'], activeLayers.satellites);
    setVis(['gdelt-dots'], activeLayers.global_incidents);
    setVis(['jam-fill','jam-label'], activeLayers.gps_jamming);
    setVis(['day-night-fill'], activeLayers.day_night);
    setVis(['fl-commercial'], activeLayers.flights);
    setVis(['fl-private'], activeLayers.private);
    setVis(['fl-jets'], activeLayers.jets);
    setVis(['fl-military'], activeLayers.military);
    setVis(['cctv-glow','cctv-dots','cctv-label'], activeLayers.cctv);
    setVis(['fires-heat'], activeLayers.fires);
    setVis(['weather-glow','weather-dots','weather-label'], activeLayers.weather);
    setVis(['infra-glow','infra-dots','infra-label'], activeLayers.infrastructure);
  }, [mapReady, activeLayers]);

  // Fly-to
  useEffect(() => {
    if (!mapReady || !mapRef.current || !flyToLocation) return;
    mapRef.current.flyTo({ center: [flyToLocation.lng, flyToLocation.lat], zoom: 8, duration: 2000 });
  }, [mapReady, flyToLocation]);

  // Dynamic projection switching (lightweight — no terrain DEM)
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    try {
      (map as any).setProjection({ type: projection });
      if (projection === 'globe') {
        map.easeTo({ pitch: 20, duration: 1200 });
        try {
          (map as any).setSky({
            'sky-color': '#04040A',
            'sky-horizon-blend': 0.5,
            'horizon-color': '#0a0a1a',
            'horizon-fog-blend': 0.3,
            'fog-color': '#04040A',
            'fog-ground-blend': 0.9,
          });
        } catch {}
      } else {
        map.easeTo({ pitch: 0, duration: 800 });
      }
    } catch (e) {
      console.warn('Projection switch failed:', e);
    }
  }, [mapReady, projection]);

  // Satellite / Dark style switching
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (mapStyle === prevStyleRef.current) return;
    prevStyleRef.current = mapStyle;
    const map = mapRef.current;

    try {
      if (mapStyle !== 'dark') {
        // Add satellite raster tiles
        if (!map.getSource('satellite-tiles')) {
          map.addSource('satellite-tiles', {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 18,
          });
          map.addLayer({ id: 'satellite-layer', type: 'raster', source: 'satellite-tiles', paint: { 'raster-opacity': 0.85 } }, 'day-night-fill');
        } else {
          map.setLayoutProperty('satellite-layer', 'visibility', 'visible');
        }
      } else {
        if (map.getLayer('satellite-layer')) {
          map.setLayoutProperty('satellite-layer', 'visibility', 'none');
        }
      }
    } catch (e) {
      console.warn('Style switch failed:', e);
    }
  }, [mapReady, mapStyle]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}
