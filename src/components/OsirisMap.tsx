'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Building2, Camera, Download } from 'lucide-react';

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
  sweepData?: any;
  scanTargets?: any[];
  demoMode?: boolean;
  geoJSONData?: any[];
  timeRange?: { start: number; end: number } | null;
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

function OsirisMap({ data, activeLayers, onEntityClick, onMouseCoords, onRightClick, onViewStateChange, flyToLocation, projection = 'globe', mapStyle = 'dark', sweepData, scanTargets = [], demoMode = false, geoJSONData = [], timeRange = null }: OsirisMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [show3DBuildings, setShow3DBuildings] = useState(false);
  const prevStyleRef = useRef(mapStyle);

  // Crea icona aeromobile su canvas (per layer simboli WebGL)
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
    if (!mapRef.current) return;
    const map = mapRef.current;

    // ── ROTAZIONE MODALITÀ DEMO ──
    let spinReq: number | undefined = undefined;
    let isSpinning = false;
    
    const startSpinning = () => {
      if (!map) return;
      isSpinning = true;
      let lastTime = performance.now();
      
      const frame = (time: number) => {
        if (!isSpinning) return;
        
        // Ruota solo se l'utente non sta trascinando o zoomando la mappa
        if (!map.isMoving() && !map.isZooming()) {
          const dt = time - lastTime;
          const center = map.getCenter();
          // Regola velocità rotazione: 0.5 gradi al secondo
          center.lng += (0.5 * dt) / 1000;
          map.setCenter(center);
        }
        
        lastTime = time;
        spinReq = requestAnimationFrame(frame);
      };
      
      spinReq = requestAnimationFrame(frame);
    };

    if (demoMode) {
      startSpinning();
    } else {
      isSpinning = false;
      if (spinReq) cancelAnimationFrame(spinReq);
    }

    return () => {
      isSpinning = false;
      if (spinReq) cancelAnimationFrame(spinReq);
      if (typeof window !== 'undefined' && (window as any)._globeSpinTimer) {
        clearInterval((window as any)._globeSpinTimer);
      }
    };
  }, [mapReady, demoMode]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [25.48, 42.70], zoom: 6.5, minZoom: 1.5, maxZoom: 24,
      attributionControl: false,
      maxPitch: 85,
    });

    map.on('load', () => {
      mapRef.current = map;
      // Crea icone
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
      createDot(map, 'dot-amber', '#FFB300', 10);

      // Sorgenti
      const sources = ['flights','military','jets','private-fl','satellites','earthquakes','gdelt','gps-jamming','day-night','cctv','fires','weather','infrastructure','maritime','maritime-choke','maritime-ships','live-news','sigint-news','conflict-zones', 'war-alerts-targets', 'war-alerts-lines', 'balloons', 'radiation', 'ransomware', 'tor-nodes', 'volcanoes', 'datacenters', 'ixp-points', 'ip-sweep-devices', 'ip-sweep-pulse', 'ip-sweep-connections', 'scan-targets', 'sdk-entities', 'sdk-links', 'custom-geojson', 'weather-alerts', 'disasters', 'wikipedia-articles', 'military-bases', 'embassies', 'meteorites', 'airports', 'power-plants', 'fault-lines', 'maritime-routes', 'shipwrecks', 'radio-towers', 'ufo-reports', 'nuclear-facilities', 'italy-cameras', 'bluetooth-devices', 'network-devices', 'mines', 'pyramids', 'caves', 'lost-cities', 'antarctica-anomalies'];
      sources.forEach(s => map.addSource(s, { type: 'geojson', data: EMPTY_FC }));

      // Generatore icone avviso (parametrizzato — elimina copia-incolla 3x)
      const createWarningIcon = (id: string, color: string) => {
        const s = 20;
        const c = document.createElement('canvas');
        c.width = s; c.height = s;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(s/2, 1);
        ctx.lineTo(s - 1, s - 1);
        ctx.lineTo(1, s - 1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', s/2, s - 4);
        map.addImage(id, { width: s, height: s, data: new Uint8Array(ctx.getImageData(0, 0, s, s).data) });
      };
      createWarningIcon('warn-icon', '#FF1744');
      createWarningIcon('warn-orange', '#FF9500');
      createWarningIcon('warn-yellow', '#FFD500');

      map.addLayer({ id: 'conflict-icons', type: 'symbol', source: 'conflict-zones', layout: {
        'icon-image': ['match', ['get','severity'], 'war','warn-icon', 'high','warn-orange', 'warn-yellow'],
        'icon-size': ['interpolate',['linear'],['zoom'], 1,0.6, 4,0.8, 8,1],
        'icon-allow-overlap': true,
        'text-field': ['get','label'],
        'text-size': ['interpolate',['linear'],['zoom'], 1,7, 4,9, 8,11],
        'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.4],
        'text-allow-overlap': false,
      }, paint: {
        'text-color': ['match', ['get','severity'], 'war','#FF1744', 'high','#FF9500', '#FFD500'],
        'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.9,
      }});

      // Allerte di guerra (overlay di consapevolezza situazionale pulsante)
      map.addLayer({ id: 'war-alert-glow', type: 'circle', source: 'war-alerts-targets', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,15, 5,30, 10,50],
        'circle-color': '#FF1744', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'war-alert-dots', type: 'circle', source: 'war-alerts-targets', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,7, 10,10],
        'circle-color': '#FF1744', 'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.7,
      }});
      map.addLayer({ id: 'war-alert-label', type: 'symbol', source: 'war-alerts-targets', layout: {
        'text-field': ['get','label'], 'text-size': 10, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.6], 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FF1744', 'text-halo-color': '#000', 'text-halo-width': 1.5 }});


      // Giorno/Notte
      map.addLayer({ id: 'day-night-fill', type: 'fill', source: 'day-night', paint: { 'fill-color': '#000022', 'fill-opacity': 0.35 }});

      // Edifici 3D
      map.addSource('buildings-3d', {
        type: 'vector',
        tiles: ['https://tiles.openfreemap.org/buildings/{z}/{x}/{y}.pbf'],
        maxzoom: 16,
      });
      map.addLayer({
        id: 'buildings-3d-fill',
        source: 'buildings-3d',
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': '#334455',
          'fill-extrusion-height': ['get', 'render_height'],
          'fill-extrusion-base': ['get', 'render_min_height'],
          'fill-extrusion-opacity': 0.3,
        },
      });
      map.addLayer({
        id: 'buildings-3d-outline',
        source: 'buildings-3d',
        'source-layer': 'building',
        type: 'line',
        minzoom: 14,
        paint: {
          'line-color': '#445566',
          'line-width': 0.5,
          'line-opacity': 0.2,
        },
      });

      // Terremoti
      map.addLayer({ id: 'eq-circles', type: 'circle', source: 'earthquakes', paint: {
        'circle-radius': ['interpolate',['linear'],['get','magnitude'], 2.5,4, 5,12, 7,24],
        'circle-color': ['interpolate',['linear'],['get','magnitude'], 2.5,'#FFD700', 4,'#FF9500', 6,'#FF1744'],
        'circle-opacity': 0.6, 'circle-blur': 0.3, 'circle-stroke-width': 1, 'circle-stroke-color': '#FFD700', 'circle-stroke-opacity': 0.3,
      }});
      map.addLayer({ id: 'eq-label', type: 'symbol', source: 'earthquakes', filter: ['>=',['get','magnitude'],4.5], layout: {
        'text-field': ['concat','M',['to-string',['get','magnitude']]], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0,1.5],
      }, paint: { 'text-color': '#FFD700', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Incendi
      map.addLayer({ id: 'fires-heat', type: 'circle', source: 'fires', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,2, 5,4, 10,8],
        'circle-color': '#FF6B00', 'circle-opacity': 0.5, 'circle-blur': 0.5,
      }});

      // Vulcani
      map.addLayer({ id: 'volcanoes-dots', type: 'circle', source: 'volcanoes', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,6, 10,10],
        'circle-color': ['match', ['get','status'], 'active','#FF4500', '#FF8C00'],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FF4500', 'circle-stroke-opacity': 0.5,
      }});

      // CCTV — anello bagliore esterno
      map.addLayer({ id: 'cctv-glow', type: 'circle', source: 'cctv', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,14, 14,20],
        'circle-color': '#39FF14', 'circle-opacity': 0.08, 'circle-blur': 1,
      }});
      // CCTV — punto principale
      map.addLayer({ id: 'cctv-dots', type: 'circle', source: 'cctv', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8, 14,12],
        'circle-color': '#39FF14', 'circle-opacity': 0.8,
        'circle-stroke-width': 2, 'circle-stroke-color': '#39FF14', 'circle-stroke-opacity': 0.5,
      }});
      // CCTV — etichette a zoom 10+
      map.addLayer({ id: 'cctv-label', type: 'symbol', source: 'cctv', minzoom: 10, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#39FF14', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // GDELT
      map.addLayer({ id: 'gdelt-dots', type: 'circle', source: 'gdelt', paint: {
        'circle-radius': 4, 'circle-color': '#FF3D3D', 'circle-opacity': 0.5, 'circle-stroke-width': 1, 'circle-stroke-color': '#FF3D3D', 'circle-stroke-opacity': 0.3,
      }});

      // Disturbo GPS
      map.addLayer({ id: 'jam-fill', type: 'circle', source: 'gps-jamming', paint: { 'circle-radius': 30, 'circle-color': '#FF0000', 'circle-opacity': 0.15, 'circle-blur': 1 }});
      map.addLayer({ id: 'jam-label', type: 'symbol', source: 'gps-jamming', layout: {
        'text-field': ['concat','DISTURBO GPS ',['to-string',['get','severity']],'%'], 'text-size': 10, 'text-font': ['Open Sans Bold'], 'text-allow-overlap': true,
      }, paint: { 'text-color': '#FF4444', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Eventi Meteo (NASA EONET — tempeste, vulcani)
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

      // Allerte Meteo (NWS)
      map.addLayer({ id: 'weather-alerts-glow', type: 'circle', source: 'weather-alerts', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,10, 5,18, 10,28],
        'circle-color': '#FFB300', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'weather-alerts-dots', type: 'circle', source: 'weather-alerts', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,7, 10,10],
        'circle-color': '#FFB300', 'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FFB300', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'weather-alerts-label', type: 'symbol', source: 'weather-alerts', layout: {
        'text-field': ['get','headline'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FFB300', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 }});

      // Disastri Naturali (NASA EONET)
      map.addLayer({ id: 'disasters-glow', type: 'circle', source: 'disasters', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,12, 5,22, 10,32],
        'circle-color': '#FF3D3D', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'disasters-dots', type: 'circle', source: 'disasters', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,12],
        'circle-color': '#FF3D3D', 'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FF3D3D', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'disasters-label', type: 'symbol', source: 'disasters', layout: {
        'text-field': ['get','title'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FF3D3D', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 }});

      // Infrastruttura Nucleare
      map.addLayer({ id: 'infra-glow', type: 'circle', source: 'infrastructure', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': ['case', ['in', 'SEISMIC RISK', ['get', 'status']], '#FF9500', '#76FF03'],
        'circle-opacity': 0.08, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'infra-dots', type: 'circle', source: 'infrastructure', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,10],
        'circle-color': ['case', 
          ['in', 'SEISMIC RISK', ['get', 'status']], '#FF9500',
          ['==', ['get','status'], 'Active Conflict Zone'], '#FF1744', 
          ['==', ['get','status'], 'Destroyed / Decommissioning'], '#757575', 
          '#76FF03'
        ],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2, 'circle-stroke-color': ['case', ['in', 'SEISMIC RISK', ['get', 'status']], '#FF9500', '#76FF03'], 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'infra-label', type: 'symbol', source: 'infrastructure', minzoom: 5, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': ['case', ['in', 'SEISMIC RISK', ['get', 'status']], '#FF9500', '#76FF03'], 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // Satelliti
      map.addLayer({ id: 'sat-glow', type: 'circle', source: 'satellites', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,6], 'circle-color': ['get','color'], 'circle-opacity': 0.3, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'sat-dots', type: 'circle', source: 'satellites', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,1.5, 5,3], 'circle-color': ['get','color'], 'circle-opacity': 1.0,
      }});

      // Marittimo — porti e basi navali
      map.addLayer({ id: 'maritime-glow', type: 'circle', source: 'maritime', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,12, 10,20],
        'circle-color': ['match', ['get','type'], 'naval','#FF3D3D', 'energy','#FF9500', '#00BCD4'],
        'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'maritime-dots', type: 'circle', source: 'maritime', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,9],
        'circle-color': ['match', ['get','type'], 'naval','#FF3D3D', 'energy','#FF9500', '#00BCD4'],
        'circle-opacity': 0.85,
        'circle-stroke-width': 2, 'circle-stroke-color': ['match', ['get','type'], 'naval','#FF3D3D', 'energy','#FF9500', '#00BCD4'], 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'maritime-label', type: 'symbol', source: 'maritime', minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#00BCD4', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // Colli di bottiglia marittimi — diamanti di avviso pulsanti
      map.addLayer({ id: 'choke-glow', type: 'circle', source: 'maritime-choke', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,10, 5,18, 10,28],
        'circle-color': '#FF9500', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'choke-dots', type: 'circle', source: 'maritime-choke', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,7, 10,12],
        'circle-color': ['match', ['get','risk'], 'CRITICAL','#FF1744', 'HIGH','#FF9500', 'ELEVATED','#FFD700', '#00E676'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FF9500', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'choke-label', type: 'symbol', source: 'maritime-choke', minzoom: 3, layout: {
        'text-field': ['get','name'], 'text-size': 10, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FF9500', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.9 }});

      // Notizie Live — punti di trasmissione
      map.addLayer({ id: 'news-glow', type: 'circle', source: 'live-news', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#FF4081', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'news-dots', type: 'circle', source: 'live-news', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,10],
        'circle-color': '#FF4081', 'circle-opacity': 0.85,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FF4081', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'news-label', type: 'symbol', source: 'live-news', minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FF4081', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 }});

      // Notizie RSS SIGINT - marcatori dorati
      map.addLayer({ id: 'sigint-news-glow', type: 'circle', source: 'sigint-news', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,10, 10,18],
        'circle-color': '#D4AF37', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'sigint-news-dots', type: 'circle', source: 'sigint-news', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
        'circle-color': '#D4AF37', 'circle-opacity': 0.9,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#FFF8DC', 'circle-stroke-opacity': 0.6,
      }});
      map.addLayer({ id: 'sigint-news-label', type: 'symbol', source: 'sigint-news', minzoom: 5, layout: {
        'text-field': ['get','source'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.6], 'text-max-width': 10, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#D4AF37', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.85 }});

      // ══ IP SWEEP — Visualizzazione dispositivi di vicinato ══
      map.addLayer({ id: 'sweep-connections', type: 'line', source: 'ip-sweep-connections', paint: {
        'line-color': ['get', 'color'], 'line-width': 1, 'line-opacity': 0.3, 'line-dasharray': [2, 4],
      }});
      map.addLayer({ id: 'sweep-pulse-ring', type: 'circle', source: 'ip-sweep-pulse', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 8,40, 12,80, 16,160],
        'circle-color': 'transparent', 'circle-opacity': 0.6,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FF3D3D', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'sweep-device-glow', type: 'circle', source: 'ip-sweep-devices', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 8,8, 12,16, 16,30],
        'circle-color': ['get', 'color'], 'circle-opacity': 0.15, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'sweep-device-dots', type: 'circle', source: 'ip-sweep-devices', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 8,3, 12,6, 16,10],
        'circle-color': ['get', 'color'], 'circle-opacity': 0.95,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-opacity': 0.6,
      }});
      map.addLayer({ id: 'sweep-device-labels', type: 'symbol', source: 'ip-sweep-devices', minzoom: 13, layout: {
        'text-field': ['concat', ['get', 'device_type'], '\n', ['get', 'ip']],
        'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2.2], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: {
        'text-color': ['get', 'color'], 'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.9,
      }});

      // ══ SCAN TARGETS — Scansioni individuali geolocalizzate ══
      map.addLayer({ id: 'scan-targets-glow', type: 'circle', source: 'scan-targets', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,12, 5,25, 10,40],
        'circle-color': '#FF3D3D', 'circle-opacity': 0.2, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'scan-targets-dots', type: 'circle', source: 'scan-targets', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,12],
        'circle-color': '#FF3D3D', 'circle-opacity': 0.95,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-opacity': 0.8,
      }});
      map.addLayer({ id: 'scan-targets-label', type: 'symbol', source: 'scan-targets', layout: {
        'text-field': ['get', 'id'], 'text-size': 11, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FF3D3D', 'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.9 }});

      // Layer volo (simbolo WebGL — renderizzato GPU, gestisce 50K+ fluido)
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

      // Palloni (entità in movimento)
      map.addLayer({ id: 'balloon-dots', type: 'circle', source: 'balloons', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,7],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.8,
        'circle-stroke-width': 1, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'balloon-label', type: 'symbol', source: 'balloons', minzoom: 4, layout: {
        'text-field': ['get','callsign'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.2], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': ['get', 'color'], 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Radiazioni (bagliore in base al livello di lettura)
      map.addLayer({ id: 'rad-glow', type: 'circle', source: 'radiation', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,10, 5,20, 10,40],
        'circle-color': ['match', ['get','status'], 'DANGER','#FF1744', 'WARNING','#FF9500', '#AB47BC'],
        'circle-opacity': 0.15, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'rad-dots', type: 'circle', source: 'radiation', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,8],
        'circle-color': ['match', ['get','status'], 'DANGER','#FF1744', 'WARNING','#FF9500', '#AB47BC'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': ['match', ['get','status'], 'DANGER','#FF1744', 'WARNING','#FF9500', '#AB47BC'], 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'rad-label', type: 'symbol', source: 'radiation', minzoom: 5, layout: {
        'text-field': ['concat', ['to-string', ['get','reading']], ' nSv/h'], 'text-size': 9, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.5], 'text-allow-overlap': false,
      }, paint: { 'text-color': ['match', ['get','status'], 'DANGER','#FF1744', 'WARNING','#FF9500', '#AB47BC'], 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Ransomware (punti di allerta pulsanti)
      map.addLayer({ id: 'ransomware-dots', type: 'circle', source: 'ransomware', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,10],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.6,
      }});
      map.addLayer({ id: 'ransomware-glow', type: 'circle', source: 'ransomware', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,12, 5,20, 10,30],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.2, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'ransomware-label', type: 'symbol', source: 'ransomware', minzoom: 3, layout: {
        'text-field': ['get','group'], 'text-size': 9, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.8], 'text-allow-overlap': false,
      }, paint: { 'text-color': '#fff', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Nodi Tor
      map.addLayer({ id: 'tor-nodes-glow', type: 'circle', source: 'tor-nodes', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,10, 5,16, 10,26],
        'circle-color': '#E040FB', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'tor-nodes-dots', type: 'circle', source: 'tor-nodes', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
        'circle-color': '#E040FB', 'circle-opacity': 0.85,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.5,
      }});

      // Data Center — punti ciano con bagliore
      map.addLayer({ id: 'datacenter-glow', type: 'circle', source: 'datacenters', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#00E5FF', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'datacenter-dots', type: 'circle', source: 'datacenters', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
        'circle-color': '#00E5FF', 'circle-opacity': 0.9,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'datacenter-label', type: 'symbol', source: 'datacenters', minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#00E5FF', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // Internet Exchange — punti blu con bagliore
      map.addLayer({ id: 'ixp-glow', type: 'circle', source: 'ixp-points', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#448AFF', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'ixp-dots', type: 'circle', source: 'ixp-points', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
        'circle-color': '#448AFF', 'circle-opacity': 0.9,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'ixp-label', type: 'symbol', source: 'ixp-points', minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#448AFF', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // ══ OSIRIS SDK — Mesh di Intelligence Lattice ══
      // Stile Polybolos: Mesh sottile, traslucida, acciaio-blu

      // ── Dominio SEA (Linee Solide Distinte) ──
      // Rimosso bagliore per corrispondere all'aspetto pulito e diagrammatico di submarinecablemap.com
      map.addLayer({ id: 'sdk-sea', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'SEA'], paint: {
        'line-color': ['coalesce', ['get', 'color'], '#1976D2'], // Colore solido singolo dalle proprietà
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.8, 5, 1.5, 10, 2.5],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.3, 5, 0.5, 10, 0.7],
      }});

      // ── Dominio AIR (Grigio Acciaio / Ciano) ──
      map.addLayer({ id: 'sdk-air-atmo', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'AIR'], paint: {
        'line-color': '#4DD0E1',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 1.5, 5, 5, 10, 8],
        'line-opacity': 0.04,
        'line-blur': 3,
      }});
      map.addLayer({ id: 'sdk-air-glow', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'AIR'], paint: {
        'line-color': '#80DEEA',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.8, 5, 2, 10, 4],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.08, 5, 0.12, 10, 0.18],
        'line-blur': 1,
      }});
      map.addLayer({ id: 'sdk-air', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'AIR'], paint: {
        'line-color': '#B2EBF2',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.15, 5, 0.6, 10, 1.2],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.2, 5, 0.35, 10, 0.5],
      }});

      // ── Dominio INTEL (Acciaio Scuro / Viola) ──
      map.addLayer({ id: 'sdk-intel-atmo', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'INTEL'], paint: {
        'line-color': '#7986CB',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 2.5, 5, 7, 10, 12],
        'line-opacity': 0.06,
        'line-blur': 5,
      }});
      map.addLayer({ id: 'sdk-intel-glow', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'INTEL'], paint: {
        'line-color': '#9FA8DA',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 1.2, 5, 3, 10, 6],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.12, 5, 0.18, 10, 0.25],
        'line-blur': 2,
      }});
      map.addLayer({ id: 'sdk-intel', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'INTEL'], paint: {
        'line-color': '#C5CAE9',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.3, 5, 1, 10, 2],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.3, 5, 0.45, 10, 0.7],
      }});

      // Navi Marittime (entità in movimento)
      map.addLayer({ id: 'ship-dots', type: 'circle', source: 'maritime-ships', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,2, 5,4, 10,6],
        'circle-color': ['match', ['get','type'], 'military','#FF1744', 'tanker','#FF9500', 'cargo','#00BCD4', '#fff'],
        'circle-opacity': 0.8,
      }});
      map.addLayer({ id: 'ship-label', type: 'symbol', source: 'maritime-ships', minzoom: 5, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.2], 'text-allow-overlap': false,
      }, paint: { 'text-color': ['match', ['get','type'], 'military','#FF1744', 'tanker','#FF9500', 'cargo','#00BCD4', '#fff'], 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // ── Articoli Wikipedia geolocalizzati ──
      map.addLayer({ id: 'wikipedia-glow', type: 'circle', source: 'wikipedia-articles', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#9C27B0', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'wikipedia-dots', type: 'circle', source: 'wikipedia-articles', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
        'circle-color': '#9C27B0', 'circle-opacity': 0.85,
        'circle-stroke-width': 2, 'circle-stroke-color': '#CE93D8', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'wikipedia-labels', type: 'symbol', source: 'wikipedia-articles', minzoom: 8, layout: {
        'text-field': ['get','title'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#CE93D8', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 }});

      // Basi Militari — bagliore verde + punti
      map.addLayer({ id: 'mb-glow', type: 'circle', source: 'military-bases', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#4CAF50', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'mb-dots', type: 'circle', source: 'military-bases', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,10],
        'circle-color': '#4CAF50', 'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': '#4CAF50', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'mb-label', type: 'symbol', source: 'military-bases', minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#4CAF50', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // Ambasciate — bagliore dorato + punti
      map.addLayer({ id: 'emb-glow', type: 'circle', source: 'embassies', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#FFD700', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'emb-dots', type: 'circle', source: 'embassies', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,10],
        'circle-color': '#FFD700', 'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FFD700', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'emb-label', type: 'symbol', source: 'embassies', minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FFD700', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // ── Meteoriti ──
      map.addLayer({ id: 'meteorites-glow', type: 'circle', source: 'meteorites', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,10, 10,16],
        'circle-color': '#FF9500', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'meteorites-dots', type: 'circle', source: 'meteorites', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,7],
        'circle-color': '#FF9500', 'circle-opacity': 0.85,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.5,
      }});

      // ── Aeroporti ──
      map.addLayer({ id: 'airports-glow', type: 'circle', source: 'airports', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,10, 10,18],
        'circle-color': '#00E5FF', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'airports-dots', type: 'circle', source: 'airports', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
        'circle-color': '#00E5FF', 'circle-opacity': 0.9,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'airports-label', type: 'symbol', source: 'airports', minzoom: 6, layout: {
        'text-field': ['concat', ['get','iata'], '\n', ['get','name']],
        'text-size': 8, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 10, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#00E5FF', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // ── Centrali Elettriche ──
      map.addLayer({ id: 'power-plants-glow', type: 'circle', source: 'power-plants', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#FFB300', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'power-plants-dots', type: 'circle', source: 'power-plants', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,9],
        'circle-color': '#FFB300', 'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FFB300', 'circle-stroke-opacity': 0.4,
      }});

      // ── Faglie Sismiche ──
      map.addLayer({ id: 'fault-lines-line', type: 'line', source: 'fault-lines', paint: {
        'line-color': '#FF3D3D', 'line-width': ['interpolate',['linear'],['zoom'], 1,1, 5,2, 10,3],
        'line-opacity': 0.7, 'line-blur': 0.5,
      }});
      map.addLayer({ id: 'fault-lines-glow', type: 'line', source: 'fault-lines', paint: {
        'line-color': '#FF3D3D', 'line-width': ['interpolate',['linear'],['zoom'], 1,4, 5,8, 10,12],
        'line-opacity': 0.08, 'line-blur': 3,
      }});

      // ── Rotte Marittime ──
      map.addLayer({ id: 'maritime-routes-line', type: 'line', source: 'maritime-routes', paint: {
        'line-color': '#00BCD4', 'line-width': ['interpolate',['linear'],['zoom'], 1,0.8, 5,1.5, 10,2.5],
        'line-opacity': 0.6, 'line-dasharray': [3, 3],
      }});
      map.addLayer({ id: 'maritime-routes-glow', type: 'line', source: 'maritime-routes', paint: {
        'line-color': '#00BCD4', 'line-width': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,10],
        'line-opacity': 0.06, 'line-blur': 3,
      }});

      // ── Relitti ──
      map.addLayer({ id: 'shipwrecks-glow', type: 'circle', source: 'shipwrecks', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,12, 10,20],
        'circle-color': '#FF1744', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'shipwrecks-dots', type: 'circle', source: 'shipwrecks', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
        'circle-color': '#FF1744', 'circle-opacity': 0.85,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.5,
      }});

      // ── Torri Radio ──
      map.addLayer({ id: 'radio-towers-glow', type: 'circle', source: 'radio-towers', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#E040FB', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'radio-towers-dots', type: 'circle', source: 'radio-towers', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
        'circle-color': '#E040FB', 'circle-opacity': 0.9,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'radio-towers-label', type: 'symbol', source: 'radio-towers', minzoom: 5, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#E040FB', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // ── Avvistamenti UFO ──
      map.addLayer({ id: 'ufo-reports-glow', type: 'circle', source: 'ufo-reports', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#AB47BC', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'ufo-reports-dots', type: 'circle', source: 'ufo-reports', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,9],
        'circle-color': '#AB47BC', 'circle-opacity': 0.85,
        'circle-stroke-width': 2, 'circle-stroke-color': '#CE93D8', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'ufo-reports-label', type: 'symbol', source: 'ufo-reports', minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#CE93D8', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 }});

      // ── Telecamere Italia (divise per categoria con colore) ──
      map.addLayer({ id: 'italy-cameras-glow', type: 'circle', source: 'italy-cameras', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,14, 14,20],
        'circle-color': ['get','colore'], 'circle-opacity': 0.08, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'italy-cameras-dots', type: 'circle', source: 'italy-cameras', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8, 14,12],
        'circle-color': ['get','colore'], 'circle-opacity': 0.8,
        'circle-stroke-width': 2, 'circle-stroke-color': ['get','colore'], 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'italy-cameras-label', type: 'symbol', source: 'italy-cameras', minzoom: 10, layout: {
        'text-field': ['concat', ['get','categoria'], '\n', ['get','name']], 'text-size': 8, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': ['get','colore'], 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // ── Dispositivi Bluetooth ──
      map.addLayer({ id: 'bluetooth-glow', type: 'circle', source: 'bluetooth-devices', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,12, 10,20],
        'circle-color': '#00BFFF', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'bluetooth-dots', type: 'circle', source: 'bluetooth-devices', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
        'circle-color': '#00BFFF', 'circle-opacity': 0.85,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'bluetooth-label', type: 'symbol', source: 'bluetooth-devices', minzoom: 5, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#00BFFF', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // ── Dispositivi Rete ──
      map.addLayer({ id: 'network-devices-glow', type: 'circle', source: 'network-devices', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,12, 10,20],
        'circle-color': '#39FF14', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'network-devices-dots', type: 'circle', source: 'network-devices', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
        'circle-color': '#39FF14', 'circle-opacity': 0.85,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'network-devices-label', type: 'symbol', source: 'network-devices', minzoom: 5, layout: {
        'text-field': ['get','hostname'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#39FF14', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // ── Impianti Nucleari ──
      map.addLayer({ id: 'nuclear-facilities-glow', type: 'circle', source: 'nuclear-facilities', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#76FF03', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'nuclear-facilities-dots', type: 'circle', source: 'nuclear-facilities', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,9],
        'circle-color': '#76FF03', 'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': '#76FF03', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'nuclear-facilities-label', type: 'symbol', source: 'nuclear-facilities', minzoom: 5, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#76FF03', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // ── Miniere ──
      map.addLayer({ id: 'mines-glow', type: 'circle', source: 'mines', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,12, 10,20],
        'circle-color': '#FF6B00', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'mines-dots', type: 'circle', source: 'mines', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
        'circle-color': '#FF6B00', 'circle-opacity': 0.85,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'mines-label', type: 'symbol', source: 'mines', minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FF6B00', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // ── Piramidi ──
      map.addLayer({ id: 'pyramids-glow', type: 'circle', source: 'pyramids', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,12, 10,20],
        'circle-color': '#FFD700', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'pyramids-dots', type: 'circle', source: 'pyramids', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,10],
        'circle-color': '#FFD700', 'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FFD700', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'pyramids-label', type: 'symbol', source: 'pyramids', minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FFD700', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 }});

      // ── Grotte ──
      map.addLayer({ id: 'caves-glow', type: 'circle', source: 'caves', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,12, 10,20],
        'circle-color': '#4FC3F7', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'caves-dots', type: 'circle', source: 'caves', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
        'circle-color': '#4FC3F7', 'circle-opacity': 0.85,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'caves-label', type: 'symbol', source: 'caves', minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#4FC3F7', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // ── Città Perdute ──
      map.addLayer({ id: 'lost-cities-glow', type: 'circle', source: 'lost-cities', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#FF9500', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'lost-cities-dots', type: 'circle', source: 'lost-cities', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,9],
        'circle-color': '#FF9500', 'circle-opacity': 0.85,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FF9500', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'lost-cities-label', type: 'symbol', source: 'lost-cities', minzoom: 3, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FF9500', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 }});

      // ── Anomalie Antartide ──
      map.addLayer({ id: 'antarctica-anomalies-glow', type: 'circle', source: 'antarctica-anomalies', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#00E5FF', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'antarctica-anomalies-dots', type: 'circle', source: 'antarctica-anomalies', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,9],
        'circle-color': '#00E5FF', 'circle-opacity': 0.85,
        'circle-stroke-width': 2, 'circle-stroke-color': '#00E5FF', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'antarctica-anomalies-label', type: 'symbol', source: 'antarctica-anomalies', minzoom: 3, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#00E5FF', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 }});

      // ── Overlay GeoJSON personalizzato (caricato dall'utente) ──
      map.addLayer({ id: 'custom-geojson-fill', type: 'fill', source: 'custom-geojson', filter: ['match', ['geometry-type'], 'Polygon', true, 'MultiPolygon', true, false] as any, paint: {
        'fill-color': '#00BCD4', 'fill-opacity': 0.15, 'fill-outline-color': '#00E5FF',
      }});
      map.addLayer({ id: 'custom-geojson-line', type: 'line', source: 'custom-geojson', filter: ['match', ['geometry-type'], 'LineString', true, 'MultiLineString', true, false] as any, paint: {
        'line-color': '#00E5FF', 'line-width': 2, 'line-opacity': 0.8,
      }});
      map.addLayer({ id: 'custom-geojson-glow', type: 'circle', source: 'custom-geojson', filter: ['match', ['geometry-type'], 'Point', true, 'MultiPoint', true, false] as any, paint: {
        'circle-radius': 14, 'circle-color': '#00E5FF', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'custom-geojson-dots', type: 'circle', source: 'custom-geojson', filter: ['match', ['geometry-type'], 'Point', true, 'MultiPoint', true, false] as any, paint: {
        'circle-radius': 6, 'circle-color': '#00E5FF', 'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': '#00E5FF', 'circle-stroke-opacity': 0.6,
      }});

      setMapReady(true);
    });

    // Eventi
    let lastMove = 0;
    map.on('mousemove', e => {
      const now = Date.now();
      if (now - lastMove > 100) {
        lastMove = now;
        onMouseCoords?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });
    map.on('contextmenu', e => { e.preventDefault(); onRightClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }); });
    map.on('moveend', () => { const c = map.getCenter(); onViewStateChange?.({ zoom: map.getZoom(), latitude: c.lat }); });

    // ── HELPER POPUP ──
    const popup = (coords: any, html: string) => {
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '420px', offset: 14 }).setLngLat(coords).setHTML(html).addTo(map);
    };
    const pStyle = `background:rgba(12,14,26,0.95);backdrop-filter:blur(16px);border-radius:10px;padding:16px;font-family:'JetBrains Mono',monospace;`;
    const linkStyle = `display:inline-block;margin-top:8px;padding:5px 12px;font-size:14px;letter-spacing:0.12em;text-decoration:none;border-radius:5px;font-family:'JetBrains Mono',monospace;`;

    // ── Voli (con link FlightAware + ADS-B Exchange) ──
    ['fl-commercial','fl-private','fl-jets','fl-military'].forEach(layer => {
      map.on('click', layer, e => {
        if (!e.features?.length) return;
        const p = e.features[0].properties as any;
        const coords = (e.features[0].geometry as any).coordinates;
        const cs = (p.callsign||'').trim();
        popup(coords, `<div style="${pStyle}border:1px solid rgba(212,175,55,0.3);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <span style="color:#D4AF37;font-size:16px;font-weight:700;letter-spacing:0.1em;">${cs}</span>
            <span style="color:#5C5A54;font-size:14px;">${p.icao24||''}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:13px;">
            <div><span style="color:#5C5A54;font-size:9px;">MODELLO</span><br/><span style="color:#E8E6E0;">${p.model||'—'}</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">QUOTA</span><br/><span style="color:#00E5FF;">${p.alt?Math.round(p.alt)+'m':'—'}</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">VELOCITÀ</span><br/><span style="color:#E8E6E0;">${p.speed_knots||'—'}kt</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">ROTTA</span><br/><span style="color:#E8E6E0;">${Math.round(p.heading||0)}°</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">IMMATR</span><br/><span style="color:#E8E6E0;">${p.registration||'—'}</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">POS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(2)},${coords[0].toFixed(2)}</span></div>
          </div>
          <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;">
            <a href="https://www.flightaware.com/live/flight/${cs}" target="_blank" style="${linkStyle}color:#D4AF37;border:1px solid rgba(212,175,55,0.4);background:rgba(212,175,55,0.1);">⚡ FLIGHTAWARE</a>
            <a href="https://globe.adsbexchange.com/?icao=${p.icao24||''}" target="_blank" style="${linkStyle}color:#00E5FF;border:1px solid rgba(0,229,255,0.4);background:rgba(0,229,255,0.1);">📡 ADS-B</a>
            <a href="https://www.radarbox.com/data/flights/${cs}" target="_blank" style="${linkStyle}color:#FF69B4;border:1px solid rgba(255,105,180,0.4);background:rgba(255,105,180,0.1);">📍 RADARBOX</a>
          </div>
        </div>`);
        onEntityClick?.(p);
      });
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    });

    // ── CCTV (apre pannello CameraViewer) ──
    map.on('click', 'cctv-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      // Emette i dati della telecamera per aprire CameraViewer
      onEntityClick?.({
        type: 'cctv',
        id: p.id,
        name: p.name,
        city: p.city,
        country: p.country,
        source: p.source,
        feed_url: p.feed_url,
        stream_url: p.stream_url,
        stream_type: p.stream_type,
        external_url: p.external_url,
        lat: coords[1],
        lng: coords[0],
      });
      // Vola anche verso la telecamera
      map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 13), duration: 1000 });
    });

    // ── Terremoti (con link USGS) ──
    map.on('click', 'eq-circles', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,149,0,0.3);">
        <div style="color:#FF9500;font-size:14px;font-weight:700;margin-bottom:4px;">M${p.magnitude} TERREMOTO</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${p.place||'Posizione sconosciuta'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          <div><span style="color:#5C5A54;">PROFONDITÀ</span><br/><span style="color:#E8E6E0;">${p.depth||'—'}km</span></div>
          <div><span style="color:#5C5A54;">COORD</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}, ${coords[0].toFixed(3)}</span></div>
        </div>
        <a href="${p.source === 'NIGGG-BAS' ? 'https://ndc.niggg.bas.bg/' : `https://earthquake.usgs.gov/earthquakes/eventpage/${p.id||''}`}" target="_blank" style="${linkStyle}color:#FF9500;border:1px solid rgba(255,149,0,0.4);background:rgba(255,149,0,0.1);">📊 ${p.source === 'NIGGG-BAS' ? 'NIGGG-BAS' : 'DETTAGLI USGS'}</a>
      </div>`);
    });

    // ── Satelliti (alimentato da SatNOGS) ──
    map.on('click', 'sat-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(212,175,55,0.3);">
        <div style="color:#D4AF37;font-size:14px;font-weight:700;letter-spacing:0.1em;margin-bottom:4px;">🛰️ ${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">MISSIONE</span><br/><span style="color:${p.color||'#aaa'};">${p.mission||'Sconosciuta'}</span></div>
          <div><span style="color:#5C5A54;">QUOTA</span><br/><span style="color:#00E5FF;">${p.alt ? p.alt+' km' : '—'}</span></div>
          <div><span style="color:#5C5A54;">POS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(2)}°, ${coords[0].toFixed(2)}°</span></div>
        </div>
        ${p.noradId ? `<a href="https://db.satnogs.org/satellite/${p.noradId}/" target="_blank" style="display:block;text-align:center;padding:4px;margin-top:6px;font-size:10px;font-family:monospace;letter-spacing:0.1em;text-decoration:none;color:#00E5FF;border:1px solid rgba(0,229,255,0.4);background:rgba(0,229,255,0.1);border-radius:2px;cursor:pointer;">🔭 FONTE: SATNOGS</a>` : ''}
      </div>`);
    });

    // ── Incendi (con link NASA FIRMS) ──
    map.on('click', 'fires-heat', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,107,0,0.3);">
        <div style="color:#FF6B00;font-size:14px;font-weight:700;margin-bottom:6px;">🔥 INCENDIO ATTIVO RILEVATO</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">LUMINOSITÀ</span><br/><span style="color:#FF6B00;">${p.brightness||'—'}K</span></div>
          <div><span style="color:#5C5A54;">COORD</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        <a href="https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;l:noaa20-viirs,viirs,modis_a,modis_t;@${coords[0]},${coords[1]},10z" target="_blank" style="${linkStyle}color:#FF6B00;border:1px solid rgba(255,107,0,0.4);background:rgba(255,107,0,0.1);">🛰️ MAPPA NASA FIRMS</a>
      </div>`);
    });

    // ── Vulcani (con popup) ──
    map.on('click', 'volcanoes-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const statusColor = p.status === 'active' ? '#FF4500' : '#FF8C00';
      popup(coords, `<div style="${pStyle}border:1px solid ${statusColor}40;">
        <div style="color:${statusColor};font-size:14px;font-weight:700;margin-bottom:4px;">🌋 ${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
          <div><span style="color:#5C5A54;">REGIONE</span><br/><span style="color:#E8E6E0;">${p.region||'—'}</span></div>
          <div><span style="color:#5C5A54;">ALTITUDINE</span><br/><span style="color:#E8E6E0;">${p.elevation ? p.elevation + 'm' : '—'}</span></div>
          <div><span style="color:#5C5A54;">STATO</span><br/><span style="color:${statusColor};">${(p.status||'sconosciuto').toUpperCase()}</span></div>
        </div>
      </div>`);
    });

    // ── Conflitti GDELT (con articolo sorgente) ──
    map.on('click', 'gdelt-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,61,61,0.3);">
        <div style="color:#FF3D3D;font-size:14px;font-weight:700;margin-bottom:6px;">⚠️ EVENTO CONFLITTO</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;line-height:1.4;">${p.name||'Incidente non classificato'}</div>
        <div style="display:flex;gap:6px;">
          ${p.url ? `<a href="${p.url}" target="_blank" style="${linkStyle}color:#FF3D3D;border:1px solid rgba(255,61,61,0.4);background:rgba(255,61,61,0.1);">FONTE</a>` : ''}
          <a href="https://www.google.com/maps/@${coords[1]},${coords[0]},12z" target="_blank" style="${linkStyle}color:#448AFF;border:1px solid rgba(68,138,255,0.4);background:rgba(68,138,255,0.1);">MAPPA</a>
        </div>
      </div>`);
    });

    // ── Eventi Globali / Marcatori di Conflitto ──
    map.on('click', 'conflict-icons', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const color = p.severity === 'war' ? '#FF1744' : p.severity === 'high' ? '#FF9500' : '#FFD500';
      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
        <div style="color:${color};font-size:14px;font-weight:700;margin-bottom:6px;">⚠️ ${p.label || 'EVENTO DI ALLERTA'}</div>
        <div style="font-size:14px;color:#E8E6E0;margin-bottom:8px;line-height:1.4;">${p.description || 'Evento globale rilevato in questa posizione.'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">GRAVITÀ</span><br/><span style="color:${color};">${(p.severity||'sconosciuta').toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;">COORD</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
      </div>`);
    });


    // ── Click link OSIRIS SDK ──
    const SDK_SOURCE_URLS: Record<string, string> = {
      'AIS Maritime': 'https://www.marinetraffic.com',
      'AIS Stream': 'https://aisstream.io',
      'AIS → Lattice': 'https://aisstream.io',
      'ADS-B / OpenSky': 'https://opensky-network.org',
      'ADS-B → Lattice': 'https://opensky-network.org',
      'Naval Intelligence': 'https://www.odni.gov',
    };
    ['sdk-sea','sdk-sea-glow','sdk-air','sdk-air-glow','sdk-intel','sdk-intel-glow'].forEach(layer => {
      map.on('click', layer, e => {
        if (!e.features?.length) return;
        const p = e.features[0].properties as any;
        const coords = e.lngLat;
        const srcUrl = p.url || SDK_SOURCE_URLS[p.source] || 'https://osirisai.live';
        const domainLabel = p.domain === 'SEA' ? '⚓ MARITTIMO' : p.domain === 'AIR' ? '✈ CORRIDOIO AEREO' : '🛡 INTEL NAVALE';
        const domainColor = p.domain === 'SEA' ? '#4FC3F7' : p.domain === 'AIR' ? '#B3E5FC' : '#81D4FA';
        const linkStyle = 'text-decoration:none;padding:3px 8px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:0.05em;';
        popup([coords.lng, coords.lat], `<div style="${pStyle}border:1px solid ${domainColor}40;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${domainColor};box-shadow:0 0 8px ${domainColor};"></div>
            <span style="color:${domainColor};font-size:13px;font-weight:700;letter-spacing:0.1em;">${domainLabel}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9px;margin-bottom:8px;">
            <div><span style="color:#5C5A54;">DA</span><br/><span style="color:#E8E6E0;">${p.fromName || 'Origine'}</span></div>
            <div><span style="color:#5C5A54;">A</span><br/><span style="color:#E8E6E0;">${p.toName || 'Destinazione'}</span></div>
            <div><span style="color:#5C5A54;">DOMINIO</span><br/><span style="color:${domainColor};">${p.domain}</span></div>
            <div><span style="color:#5C5A54;">FONTE</span><br/><a href="${srcUrl}" target="_blank" style="color:${domainColor};text-decoration:underline;cursor:pointer;">${p.source || 'OSIRIS'}</a></div>
          </div>
          <a href="${srcUrl}" target="_blank" style="${linkStyle}color:${domainColor};border:1px solid ${domainColor}40;background:${domainColor}18;display:inline-block;margin-top:4px;">APRI FONTE ↗</a>
        </div>`);
      });
    });

    // ── Hover generico per elementi cliccabili ──
    ['conflict-icons','cctv-dots','eq-circles','sat-dots','fires-heat','volcanoes-dots','gdelt-dots','weather-dots','infra-dots','maritime-dots','choke-dots','news-dots','sigint-news-dots','balloon-dots','rad-dots','ship-dots','tor-nodes-dots','datacenter-dots','datacenter-glow','ixp-dots','ixp-glow','sweep-device-dots','scan-targets-dots','sdk-sea','sdk-sea-glow','sdk-sea-atmo','sdk-air','sdk-air-glow','sdk-air-atmo','sdk-intel','sdk-intel-glow','sdk-intel-atmo','weather-alerts-dots','disasters-dots','wikipedia-dots','mb-dots','mb-label','emb-dots','emb-label','meteorites-dots','airports-dots','power-plants-dots','fault-lines-line','maritime-routes-line','shipwrecks-dots','radio-towers-dots','ufo-reports-dots','nuclear-facilities-dots','mines-dots','pyramids-dots','caves-dots','lost-cities-dots','antarctica-anomalies-dots','italy-cameras-dots','bluetooth-dots','network-devices-dots'].forEach(layer => {
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    });

    // ── Click bersagli scansione ──
    map.on('click', 'scan-targets-dots', (e: any) => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = e.features[0].geometry.coordinates.slice();
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,61,61,0.5);">
        <div style="color:#FF3D3D;font-size:14px;font-weight:700;margin-bottom:6px;">🎯 BERSAGLIO: ${p.id}</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${p.city || 'Sconosciuta'}, ${p.country || 'Sconosciuto'} — ${p.isp || 'ISP sconosciuto'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#00E5FF;">${(p.type || 'SCONOSCIUTO').toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;">COORD</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
      </div>`);
    });

    // ── Fornitori SCM ──
    map.on('click', 'scm-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const color = p.risk_level === 'CRITICAL' ? '#FF1744' : p.risk_level === 'HIGH' ? '#FF9500' : '#00BCD4';
      const activeThreats = p.active_threats ? JSON.parse(p.active_threats) : [];
      
      let threatsHtml = '';
      if (activeThreats.length > 0) {
        threatsHtml = `<div style="margin-top:8px;padding-top:6px;border-top:1px solid ${color}40;color:${color};font-size:9px;font-weight:bold;">
          MINACCE ATTIVE:<br/>${activeThreats.map((t: string) => `⚠ ${t}`).join('<br/>')}
        </div>`;
      }

      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
        <div style="color:${color};font-size:14px;font-weight:700;margin-bottom:4px;">🏢 ${p.name}</div>
        <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${p.category} | ${p.city}, ${p.country}</div>
        <div style="display:grid;grid-template-columns:1fr;gap:4px;font-size:13px;">
          <div><span style="color:#5C5A54;font-size:9px;">LIVELLO RISCHIO SCM</span><br/><span style="color:${color};font-weight:bold;">${p.risk_level}</span></div>
        </div>
        ${threatsHtml}
      </div>`);
    });

    // ── Click dispositivo IP Sweep ──
    map.on('click', 'sweep-device-dots', (e: any) => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = e.features[0].geometry.coordinates.slice();
      const ports = JSON.parse(p.ports || '[]');
      const vulns = JSON.parse(p.vulns || '[]');
      const hostnames = JSON.parse(p.hostnames || '[]');
      const riskColors: Record<string, string> = { CRITICAL: '#FF3D3D', HIGH: '#FF6B00', MEDIUM: '#FFD700', LOW: '#76FF03', INFO: '#5C5A54' };
      popup(coords, `<div style="font-family:monospace;font-size:13px;color:#E8E6E0;">
        <div style="font-size:13px;font-weight:bold;margin-bottom:6px;color:${p.color};">${p.device_type}</div>
        <div style="font-size:14px;margin-bottom:8px;color:#fff;">${p.ip}</div>
        ${hostnames.length > 0 ? `<div style="font-size:9px;color:#8A8880;margin-bottom:6px;">${hostnames.join(', ')}</div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">PORTE</span><br/><span style="color:#E8E6E0;">${ports.length}</span></div>
          <div><span style="color:#5C5A54;">RISCHIO</span><br/><span style="color:${riskColors[p.risk_level] || '#666'};">${p.risk_level}</span></div>
        </div>
        <div style="font-size:9px;color:#8A8880;margin-bottom:6px;">Aperte: ${ports.slice(0, 12).join(', ')}${ports.length > 12 ? ' ...' : ''}</div>
        ${vulns.length > 0 ? `<div style="font-size:9px;color:#FF3D3D;margin-bottom:6px;">⚠ CVE: ${vulns.slice(0, 5).join(', ')}${vulns.length > 5 ? ` +${vulns.length - 5} altre` : ''}</div>` : ''}
      </div>`);
    });

    // ── Palloni / Sonde ──
    map.on('click', 'balloon-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid ${p.color}40;">
        <div style="color:${p.color};font-size:14px;font-weight:700;letter-spacing:0.1em;margin-bottom:4px;">🎈 ${p.callsign}</div>
        <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${p.type.toUpperCase()} / STATO: ${p.status.toUpperCase()}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          <div><span style="color:#5C5A54;">ALTITUDINE</span><br/><span style="color:#E8E6E0;">${p.altitude} m</span></div>
          <div><span style="color:#5C5A54;">VELOCITÀ</span><br/><span style="color:#E8E6E0;">${Math.round(p.speed)} km/h</span></div>
          <div><span style="color:#5C5A54;">VELOC. VERT.</span><br/><span style="color:${p.verticalRate > 0 ? '#00E676' : '#FF3D3D'};">${p.verticalRate.toFixed(1)} m/s</span></div>
          <div><span style="color:#5C5A54;">TEMP</span><br/><span style="color:#E8E6E0;">${p.temperature}°C</span></div>
        </div>
      </div>`);
    });

    // ── Radiazioni ──
    map.on('click', 'rad-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const color = p.status === 'DANGER' ? '#FF1744' : p.status === 'WARNING' ? '#FF9500' : '#AB47BC';
      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
        <div style="color:${color};font-size:14px;font-weight:700;margin-bottom:4px;">☢️ ${p.name}</div>
        <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${p.city}, ${p.country}</div>
        <div style="display:grid;grid-template-columns:1fr;gap:4px;font-size:13px;">
          <div><span style="color:#5C5A54;font-size:9px;">LETTURA</span><br/><span style="color:${color};font-weight:bold;">${p.reading} nSv/h</span></div>
          <div><span style="color:#5C5A54;font-size:9px;">STATO</span><br/><span style="color:${color};">${p.status}</span></div>
          <div><span style="color:#5C5A54;font-size:9px;">RETE</span><br/><span style="color:#E8E6E0;">${p.network}</span></div>
        </div>
      </div>`);
    });

    // ── Nodi Tor ──
    map.on('click', 'tor-nodes-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(224,64,251,0.3);">
        <div style="color:#E040FB;font-size:14px;font-weight:700;margin-bottom:6px;">🟣 NODO TOR</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">IP</span><br/><span style="color:#E8E6E0;">${p.ip||'—'}</span></div>
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
          <div><span style="color:#5C5A54;">REGIONE</span><br/><span style="color:#E8E6E0;">${p.region||'—'}</span></div>
          <div><span style="color:#5C5A54;">CITTÀ</span><br/><span style="color:#E8E6E0;">${p.city||'—'}</span></div>
          <div><span style="color:#5C5A54;">ISP</span><br/><span style="color:#E8E6E0;">${p.isp||'—'}</span></div>
          <div><span style="color:#5C5A54;">ORG</span><br/><span style="color:#E8E6E0;">${p.org||'—'}</span></div>
        </div>
      </div>`);
    });

    // ── Data Center ──
    map.on('click', 'datacenter-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(0,229,255,0.3);">
        <div style="color:#00E5FF;font-size:14px;font-weight:700;margin-bottom:6px;">🏢 DATA CENTER</div>
        <div style="font-size:13px;color:#E8E6E0;margin-bottom:8px;">${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">GESTORE</span><br/><span style="color:#E8E6E0;">${p.operator||'—'}</span></div>
          <div><span style="color:#5C5A54;">CAPACITÀ</span><br/><span style="color:#00E5FF;">${p.capacity_mw||'—'} MW</span></div>
          <div><span style="color:#5C5A54;">CITTÀ</span><br/><span style="color:#E8E6E0;">${p.city||'—'}</span></div>
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
        </div>
      </div>`);
    });

    // ── Internet Exchange ──
    map.on('click', 'ixp-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(68,138,255,0.3);">
        <div style="color:#448AFF;font-size:14px;font-weight:700;margin-bottom:6px;">🌐 INTERNET EXCHANGE</div>
        <div style="font-size:13px;color:#E8E6E0;margin-bottom:8px;">${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">MEMBRI</span><br/><span style="color:#448AFF;">${p.members||'—'}</span></div>
          <div><span style="color:#5C5A54;">PICCO</span><br/><span style="color:#E8E6E0;">${p.peak_gbps||'—'} Gbps</span></div>
          <div><span style="color:#5C5A54;">CITTÀ</span><br/><span style="color:#E8E6E0;">${p.city||'—'}</span></div>
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
        </div>
      </div>`);
    });

    // ── Navi Marittime ──
    map.on('click', 'ship-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const color = p.type === 'military' ? '#FF1744' : p.type === 'tanker' ? '#FF9500' : '#00BCD4';
      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:${color};font-size:14px;font-weight:700;letter-spacing:0.1em;">🚢 ${p.name}</span>
          <span style="color:#aaa;font-size:9px;">${p.flag}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:${color};">${p.type.toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;">VELOCITÀ</span><br/><span style="color:#E8E6E0;">${p.speed} nodi</span></div>
          <div><span style="color:#5C5A54;">ROTTA</span><br/><span style="color:#E8E6E0;">${p.heading}°</span></div>
          <div><span style="color:#5C5A54;">DEST</span><br/><span style="color:#E8E6E0;">${p.destination || 'SCONOSCIUTA'}</span></div>
        </div>
      </div>`);
    });

    // ── Eventi Meteo (NASA EONET) ──
    map.on('click', 'weather-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const iconEmoji = p.icon === 'cyclone' ? '🌀' : p.icon === 'volcano' ? '🌋' : '⚡';
      popup(coords, `<div style="${pStyle}border:1px solid rgba(224,64,251,0.3);">
        <div style="color:#E040FB;font-size:14px;font-weight:700;margin-bottom:6px;">${iconEmoji} ${p.type || 'Evento Meteorologico'}</div>
        <div style="font-size:14px;color:#E8E6E0;margin-bottom:8px;line-height:1.4;">${p.title || 'Evento sconosciuto'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">GRAVITÀ</span><br/><span style="color:${p.severity === 'high' ? '#FF1744' : '#FFD700'};">${(p.severity||'bassa').toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;">COORD</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        <div style="display:flex;gap:6px;">
          ${p.source ? `<a href="${p.source}" target="_blank" style="${linkStyle}color:#E040FB;border:1px solid rgba(224,64,251,0.4);background:rgba(224,64,251,0.1);">📡 FONTE</a>` : ''}
          <a href="https://eonet.gsfc.nasa.gov/api/v3/events/${p.id || ''}" target="_blank" style="${linkStyle}color:#D4AF37;border:1px solid rgba(212,175,55,0.4);background:rgba(212,175,55,0.1);">🛰️ NASA EONET</a>
        </div>
      </div>`);
    });

    // ── Allerte Meteo (NWS) ──
    map.on('click', 'weather-alerts-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const sevColors: Record<string,string> = { Extreme:'#FF1744', Severe:'#FF3D3D', Moderate:'#FFB300', Minor:'#FFD700', Unknown:'#aaa' };
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,179,0,0.3);">
        <div style="color:#FFB300;font-size:14px;font-weight:700;margin-bottom:6px;">⚠️ ${p.event || 'Allerta Meteo'}</div>
        <div style="font-size:15px;color:#E8E6E0;margin-bottom:8px;line-height:1.4;">${p.headline || 'Allerta'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:13px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;font-size:9px;">GRAVITÀ</span><br/><span style="color:${sevColors[p.severity]||'#FFB300'};font-weight:bold;">${p.severity}</span></div>
          <div><span style="color:#5C5A54;font-size:9px;">CERTEZZA</span><br/><span style="color:#E8E6E0;">${p.type||'—'}</span></div>
          <div><span style="color:#5C5A54;font-size:9px;">AREA</span><br/><span style="color:#E8E6E0;">${p.area||'—'}</span></div>
          <div><span style="color:#5C5A54;font-size:9px;">SCADENZA</span><br/><span style="color:#E8E6E0;">${p.expires ? new Date(p.expires).toLocaleString() : '—'}</span></div>
        </div>
        ${p.description ? `<div style="font-size:13px;color:#aaa;border-top:1px solid rgba(255,179,0,0.15);padding-top:6px;">${p.description}</div>` : ''}
        <a href="https://www.weather.gov/" target="_blank" style="${linkStyle}color:#FFB300;border:1px solid rgba(255,179,0,0.4);background:rgba(255,179,0,0.1);">🌤 DETTAGLI NWS</a>
      </div>`);
    });

    // ── Disastri Naturali (NASA EONET) ──
    map.on('click', 'disasters-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,61,61,0.3);">
        <div style="color:#FF3D3D;font-size:14px;font-weight:700;margin-bottom:6px;">🌍 ${p.type || 'Disastro Naturale'}</div>
        <div style="font-size:15px;color:#E8E6E0;margin-bottom:8px;line-height:1.4;">${p.title || 'Evento'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:13px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;font-size:9px;">CATEGORIA</span><br/><span style="color:#FF3D3D;">${(p.category||'sconosciuta').toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;font-size:9px;">COORD</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        ${p.description ? `<div style="font-size:13px;color:#aaa;border-top:1px solid rgba(255,61,61,0.15);padding-top:6px;">${p.description?.slice(0, 300)}</div>` : ''}
        <div style="display:flex;gap:6px;margin-top:8px;">
          ${p.link ? `<a href="${p.link}" target="_blank" style="${linkStyle}color:#FF3D3D;border:1px solid rgba(255,61,61,0.4);background:rgba(255,61,61,0.1);">📡 NASA EONET</a>` : ''}
        </div>
      </div>`);
    });

    // ── Articoli Wikipedia ──
    map.on('click', 'wikipedia-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(156,39,176,0.3);">
        <div style="color:#9C27B0;font-size:14px;font-weight:700;margin-bottom:6px;">📖 ${p.title}</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${p.distance}m dal centro</div>
        <a href="${p.url}" target="_blank" style="${linkStyle}color:#9C27B0;border:1px solid rgba(156,39,176,0.4);background:rgba(156,39,176,0.1);">🔗 APRI WIKIPEDIA</a>
      </div>`);
    });

    // ── Infrastruttura Nucleare ──
    map.on('click', 'infra-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const statusColor = p.status.includes('SEISMIC RISK') ? '#FF9500' : p.status === 'Active Conflict Zone' ? '#FF1744' : p.status === 'Operational' ? '#76FF03' : '#757575';
      popup(coords, `<div style="${pStyle}border:1px solid rgba(118,255,3,0.3);">
        <div style="color:#76FF03;font-size:14px;font-weight:700;margin-bottom:4px;">☢️ ${p.name || 'Impianto Nucleare'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">STATO</span><br/><span style="color:${statusColor};">${p.status || '—'}</span></div>
          <div><span style="color:#5C5A54;">CITTÀ</span><br/><span style="color:#E8E6E0;">${p.city || '—'}, ${p.country || ''}</span></div>
          <div><span style="color:#5C5A54;">REATTORI</span><br/><span style="color:#76FF03;">${p.reactors || '—'}</span></div>
          <div><span style="color:#5C5A54;">CAPACITÀ</span><br/><span style="color:#E8E6E0;">${p.capacityMW ? p.capacityMW.toLocaleString() + ' MW' : '—'}</span></div>
          <div><span style="color:#5C5A54;">GESTORE</span><br/><span style="color:#E8E6E0;">${p.owner || '—'}</span></div>
          <div><span style="color:#5C5A54;">COORD</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        <a href="https://www.google.com/maps/@${coords[1]},${coords[0]},14z/data=!3m1!1e3" target="_blank" style="${linkStyle}color:#76FF03;border:1px solid rgba(118,255,3,0.4);background:rgba(118,255,3,0.1);">VISTA SATELLITARE</a>
      </div>`);
    });

    // ── Porti Marittimi e Basi Navali ──
    map.on('click', 'maritime-dots', e => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      const typeColor = p.type === 'naval' ? '#FF3D3D' : p.type === 'energy' ? '#FF9500' : '#00BCD4';
      const typeLabel = p.type === 'naval' ? 'BASE NAVALE' : p.type === 'energy' ? 'PORTO ENERGETICO' : 'PORTO COMMERCIALE';
      
      const congestionHtml = p.congestion ? `
        <div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.1);">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
            <div><span style="color:#5C5A54;font-size:9px;">CONGESTIONE</span><br/><span style="color:${p.congestion === 'SEVERE' ? '#FF1744' : p.congestion === 'CONGESTED' ? '#FF9500' : '#00E676'};font-weight:bold;font-size:14px;">${p.congestion}</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">SOSTA STIMATA</span><br/><span style="color:#E8E6E0;font-weight:bold;font-size:14px;">${p.dwell_time || 'Sconosciuto'}</span></div>
          </div>
        </div>` : '';

      popup(coords, `<div style="${pStyle}border:1px solid ${typeColor}40;">
        <div style="color:${typeColor};font-weight:bold;font-size:13px;margin-bottom:4px;">${p.name}</div>
        <div style="color:#999;font-size:9px;margin-bottom:6px;">${typeLabel} — ${p.country}</div>
        ${p.volume ? `<div style="font-size:9px;color:#aaa;">Volume: <span style="color:${typeColor};font-weight:bold;">${p.volume}</span></div>` : ''}
        ${p.fleet ? `<div style="font-size:9px;color:#aaa;">Flotta: <span style="color:${typeColor};font-weight:bold;">${p.fleet}</span></div>` : ''}
        ${p.rank ? `<div style="font-size:9px;color:#aaa;">Rank Globale: <span style="color:${typeColor};font-weight:bold;">#${p.rank}</span></div>` : ''}
        ${congestionHtml}
      </div>`);
    });

    // ── Colli di Bottiglia Marittimi ──
    map.on('click', 'choke-dots', e => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      const riskCol = p.risk === 'CRITICAL' ? '#FF1744' : p.risk === 'HIGH' ? '#FF9500' : p.risk === 'ELEVATED' ? '#FFD700' : '#00E676';
      popup(coords, `<div style="${pStyle}border:1px solid ${riskCol}40;">
        <div style="color:#FF9500;font-weight:bold;font-size:13px;margin-bottom:4px;">${p.name}</div>
        <div style="font-size:9px;color:#aaa;">Traffico: <span style="color:#fff;">${p.traffic}</span></div>
        <div style="font-size:9px;color:#aaa;">Rischio: <span style="color:${riskCol};font-weight:bold;">${p.risk}</span></div>
      </div>`);
    });

    // ── Notizie Live (apre visualizzatore feed) ──
    map.on('click', 'news-dots', e => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      onEntityClick?.({
        type: 'live_news',
        name: p.name,
        city: p.city,
        country: p.country,
        url: p.url,
        category: p.category,
        embed_allowed: p.embed_allowed !== false && p.embed_allowed !== 'false',
      });
    });

    // ── Basi Militari ──
    map.on('click', 'mb-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(76,175,80,0.3);">
        <div style="color:#4CAF50;font-size:14px;font-weight:700;margin-bottom:6px;">🏛 ${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#4CAF50;">${p.type||'—'}</span></div>
          <div><span style="color:#5C5A54;">FORMA</span><br/><span style="color:#E8E6E0;">${p.branch||'—'}</span></div>
          <div><span style="color:#5C5A54;">COORD</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
      </div>`);
    });

    // ── Ambasciate e Consolati ──
    map.on('click', 'emb-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,215,0,0.3);">
        <div style="color:#FFD700;font-size:14px;font-weight:700;margin-bottom:6px;">🏛 ${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
          <div><span style="color:#5C5A54;">CITTÀ</span><br/><span style="color:#E8E6E0;">${p.city||'—'}</span></div>
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#FFD700;">${p.type||'—'}</span></div>
          <div><span style="color:#5C5A54;">COORD</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
      </div>`);
    });

    // ── Meteoriti ──
    map.on('click', 'meteorites-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,149,0,0.3);">
        <div style="color:#FF9500;font-size:14px;font-weight:700;margin-bottom:6px;">☄️ ${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">ANNO</span><br/><span style="color:#E8E6E0;">${p.year||'—'}</span></div>
          <div><span style="color:#5C5A54;">MASSA</span><br/><span style="color:#E8E6E0;">${p.mass_kg ? p.mass_kg.toLocaleString() + ' kg' : '—'}</span></div>
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#FF9500;">${p.type||'—'}</span></div>
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
        </div>
      </div>`);
    });

    // ── Aeroporti ──
    map.on('click', 'airports-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(0,229,255,0.3);">
        <div style="color:#00E5FF;font-size:14px;font-weight:700;margin-bottom:6px;">✈️ ${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">IATA</span><br/><span style="color:#00E5FF;">${p.iata||'—'}</span></div>
          <div><span style="color:#5C5A54;">ICAO</span><br/><span style="color:#E8E6E0;">${p.icao||'—'}</span></div>
          <div><span style="color:#5C5A54;">CITTÀ</span><br/><span style="color:#E8E6E0;">${p.city||'—'}</span></div>
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
          <div><span style="color:#5C5A54;">PISTE</span><br/><span style="color:#E8E6E0;">${p.runways||'—'}</span></div>
        </div>
      </div>`);
    });

    // ── Centrali Elettriche ──
    map.on('click', 'power-plants-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,179,0,0.3);">
        <div style="color:#FFB300;font-size:14px;font-weight:700;margin-bottom:6px;">⚡ ${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#FFB300;">${p.type||'—'}</span></div>
          <div><span style="color:#5C5A54;">CAPACITÀ</span><br/><span style="color:#E8E6E0;">${p.capacity_mw ? p.capacity_mw.toLocaleString() + ' MW' : '—'}</span></div>
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
        </div>
      </div>`);
    });

    // ── Faglie Sismiche ──
    map.on('click', 'fault-lines-line', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      popup(e.lngLat, `<div style="${pStyle}border:1px solid rgba(255,61,61,0.3);">
        <div style="color:#FF3D3D;font-size:14px;font-weight:700;margin-bottom:6px;">🌍 FAGLIA SISMICA: ${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#E8E6E0;">${p.type||'—'}</span></div>
          <div><span style="color:#5C5A54;">LUNGHEZZA</span><br/><span style="color:#E8E6E0;">${p.length_km ? p.length_km.toLocaleString() + ' km' : '—'}</span></div>
          <div><span style="color:#5C5A54;">REGIONE</span><br/><span style="color:#E8E6E0;">${p.region||'—'}</span></div>
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
        </div>
      </div>`);
    });

    // ── Rotte Marittime ──
    map.on('click', 'maritime-routes-line', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      popup(e.lngLat, `<div style="${pStyle}border:1px solid rgba(0,188,212,0.3);">
        <div style="color:#00BCD4;font-size:14px;font-weight:700;margin-bottom:6px;">🚢 ${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">DA</span><br/><span style="color:#E8E6E0;">${p.from||'—'}</span></div>
          <div><span style="color:#5C5A54;">A</span><br/><span style="color:#E8E6E0;">${p.to||'—'}</span></div>
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#00BCD4;">${p.type||'—'}</span></div>
          <div><span style="color:#5C5A54;">DISTANZA</span><br/><span style="color:#E8E6E0;">${p.distance_km ? p.distance_km.toLocaleString() + ' km' : '—'}</span></div>
        </div>
      </div>`);
    });

    // ── Relitti ──
    map.on('click', 'shipwrecks-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,20,68,0.3);">
        <div style="color:#FF1744;font-size:14px;font-weight:700;margin-bottom:6px;">🚢 ${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">ANNO</span><br/><span style="color:#E8E6E0;">${p.year||'—'}</span></div>
          <div><span style="color:#5C5A54;">PROFONDITÀ</span><br/><span style="color:#E8E6E0;">${p.depth_m ? p.depth_m + ' m' : '—'}</span></div>
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#FF1744;">${p.type||'—'}</span></div>
          <div><span style="color:#5C5A54;">CAUSA</span><br/><span style="color:#E8E6E0;">${p.cause||'—'}</span></div>
          <div><span style="color:#5C5A54;">UBICAZIONE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
        </div>
      </div>`);
    });

    // ── Torri Radio ──
    map.on('click', 'radio-towers-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(224,64,251,0.3);">
        <div style="color:#E040FB;font-size:14px;font-weight:700;margin-bottom:6px;">📡 ${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">ALTEZZA</span><br/><span style="color:#E8E6E0;">${p.height_m ? p.height_m + ' m' : '—'}</span></div>
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#E040FB;">${p.type||'—'}</span></div>
          <div><span style="color:#5C5A54;">CITTÀ</span><br/><span style="color:#E8E6E0;">${p.city||'—'}</span></div>
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
        </div>
      </div>`);
    });

    // ── Avvistamenti UFO ──
    map.on('click', 'ufo-reports-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(171,71,188,0.3);">
        <div style="color:#AB47BC;font-size:14px;font-weight:700;margin-bottom:6px;">🛸 ${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">ANNO</span><br/><span style="color:#E8E6E0;">${p.year||'—'}</span></div>
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#AB47BC;">${p.type||'—'}</span></div>
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
          <div><span style="color:#5C5A54;">REGIONE</span><br/><span style="color:#E8E6E0;">${p.region||'—'}</span></div>
        </div>
        ${p.description ? `<div style="font-size:13px;color:#aaa;border-top:1px solid rgba(171,71,188,0.15);padding-top:6px;margin-top:4px;">${p.description}</div>` : ''}
      </div>`);
    });

    // ── Telecamere Italia click ──
    map.on('click', 'italy-cameras-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(212,175,55,0.3);">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${p.colore||'#39FF14'};flex-shrink:0;"></div>
          <span style="color:#D4AF37;font-size:14px;font-weight:700;">${(p.name||'Telecamera Italia').substring(0,50)}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
          <div><span style="color:#5C5A54;">CATEGORIA</span><br/><span style="color:#E8E6E0;">${p.categoria||'—'}</span></div>
          <div><span style="color:#5C5A54;">FONTE</span><br/><span style="color:#E8E6E0;">${p.source||'—'}</span></div>
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#00E5FF;">${(p.url_type||'—').toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;">QUALITÀ</span><br/><span style="color:#E8E6E0;">${p.quality_tier||'—'}</span></div>
        </div>
        ${p.stream_url ? `<a href="${p.stream_url}" target="_blank" style="${linkStyle}background:#39FF14;color:#000;">APRI STREAM</a>` : ''}
      </div>`);
    });

    // ── Impianti Nucleari ──
    map.on('click', 'nuclear-facilities-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(118,255,3,0.3);">
        <div style="color:#76FF03;font-size:14px;font-weight:700;margin-bottom:6px;">☢️ ${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#76FF03;">${p.type||'—'}</span></div>
          <div><span style="color:#5C5A54;">STATO</span><br/><span style="color:#E8E6E0;">${p.status||'—'}</span></div>
          <div><span style="color:#5C5A54;">CAPACITÀ</span><br/><span style="color:#E8E6E0;">${p.capacity_mw ? p.capacity_mw.toLocaleString() + ' MW' : '—'}</span></div>
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
        </div>
        </div>`);
    });

    // ── Piramidi click ──
    map.on('click', 'pyramids-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,215,0,0.3);">
        <div style="color:#FFD700;font-size:15px;font-weight:700;margin-bottom:8px;">${p.name||'Piramide'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
          <div><span style="color:#5C5A54;">CULTURA</span><br/><span style="color:#E8E6E0;">${p.culture||'—'}</span></div>
          <div><span style="color:#5C5A54;">ALTEZZA</span><br/><span style="color:#00E5FF;">${p.height_m?p.height_m+'m':'—'}</span></div>
        </div>
        <p style="color:#8A8880;font-size:11px;margin-top:6px;">${(p.description||'').substring(0,200)}</p>
      </div>`);
    });

    // ── Città Perdute click ──
    map.on('click', 'lost-cities-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,149,0,0.3);">
        <div style="color:#FF9500;font-size:15px;font-weight:700;margin-bottom:8px;">${p.name||'Città Perduta'}</div>
        <div style="font-size:12px;margin-bottom:4px;"><span style="color:#FF9500;">●</span> <span style="color:#5C5A54;">${p.type||'—'}</span> · <span style="color:#E8E6E0;">${p.country||'—'}</span></div>
        <p style="color:#8A8880;font-size:11px;">${(p.description||'').substring(0,200)}</p>
      </div>`);
    });

    // ── Miniere click ──
    map.on('click', 'mines-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,107,0,0.3);">
        <div style="color:#FF6B00;font-size:14px;font-weight:700;margin-bottom:6px;">⛏ ${p.name||'Miniera'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#FF6B00;">${p.type||'—'}</span></div>
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
        </div>
      </div>`);
    });

    // ── Grotte click ──
    map.on('click', 'caves-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(79,195,247,0.3);">
        <div style="color:#4FC3F7;font-size:14px;font-weight:700;margin-bottom:6px;">🕳 ${p.name||'Grotta/Caverna'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#4FC3F7;">${p.type||'—'}</span></div>
          <div><span style="color:#5C5A54;">PAESE</span><br/><span style="color:#E8E6E0;">${p.country||'—'}</span></div>
          <div><span style="color:#5C5A54;">PROFONDITÀ</span><br/><span style="color:#E8E6E0;">${p.depth_m?p.depth_m+'m':'—'}</span></div>
        </div>
        <p style="color:#8A8880;font-size:11px;">${(p.description||'').substring(0,200)}</p>
      </div>`);
    });

    // ── Anomalie Antartide click ──
    map.on('click', 'antarctica-anomalies-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(0,229,255,0.3);">
        <div style="color:#00E5FF;font-size:14px;font-weight:700;margin-bottom:6px;">❄️ ${p.name||'Anomalia Antartide'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">TIPO</span><br/><span style="color:#00E5FF;">${p.type||'—'}</span></div>
          <div><span style="color:#5C5A54;">COORD</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        <p style="color:#8A8880;font-size:11px;">${(p.description||'').substring(0,300)}</p>
      </div>`);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Giorno/Notte
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
    const iv = setInterval(update, 300000); // 5 min (era 1 min — l'ombra si muove a malapena)
    return () => clearInterval(iv);
  }, [mapReady, activeLayers.day_night]);

  // Helper per impostare GeoJSON
  const setGeo = useCallback((source: string, features: any[]) => {
    const src = mapRef.current?.getSource(source) as any;
    if (src) src.setData({ type: 'FeatureCollection', features });
  }, []);

  const setVis = useCallback((ids: string[], visible: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    ids.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'); });
  }, []);

  // Dati volo → GeoJSON (renderizzato GPU)
  useEffect(() => {
    if (!mapReady) return;
    const toFeatures = (arr: any[], decimate: number = 1) => {
      let filtered = arr || [];
      if (decimate > 1) {
        filtered = filtered.filter((_, i) => i % decimate === 0);
      }
      return filtered.map((f: any) => ({
        type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] },
        properties: { callsign: f.callsign, heading: f.heading || 0, alt: f.alt, model: f.model, speed_knots: f.speed_knots, registration: f.registration, icao24: f.icao24 },
      }));
    };
    setGeo('flights', activeLayers.flights ? toFeatures(data.commercial_flights, 10) : []);
    setGeo('private-fl', activeLayers.private ? toFeatures(data.private_flights, 2) : []);
    setGeo('jets', activeLayers.jets ? toFeatures(data.private_jets, 2) : []);
    setGeo('military', activeLayers.military ? toFeatures(data.military_flights) : []);
  }, [mapReady, data.commercial_flights, data.private_flights, data.private_jets, data.military_flights, activeLayers.flights, activeLayers.private, activeLayers.jets, activeLayers.military]);

  // ── RENDERIZZATORI LAYER DISACCOPPIATI (Ottimizzati per Prestazioni) ──

  useEffect(() => {
    if (!mapReady) return;
    setGeo('earthquakes', activeLayers.earthquakes && data.earthquakes ? data.earthquakes.map((eq: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [eq.lng, eq.lat] }, properties: { magnitude: eq.magnitude, place: eq.place } })) : []);
  }, [mapReady, data.earthquakes, activeLayers.earthquakes, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('satellites', activeLayers.satellites && data.satellites ? data.satellites.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { name: s.name, color: s.color, mission: s.mission, alt: s.alt, noradId: s.noradId } })) : []);
  }, [mapReady, data.satellites, activeLayers.satellites, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('gdelt', activeLayers.global_incidents && data.gdelt ? data.gdelt.map((e: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [e.lng, e.lat] }, properties: { name: e.name } })) : []);
  }, [mapReady, data.gdelt, activeLayers.global_incidents, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('gps-jamming', activeLayers.gps_jamming && data.gps_jamming ? data.gps_jamming.map((z: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [z.lng, z.lat] }, properties: { severity: z.severity } })) : []);
  }, [mapReady, data.gps_jamming, activeLayers.gps_jamming, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    const eqs = activeLayers.earthquakes && data.earthquakes ? data.earthquakes.filter((eq: any) => {
      if (!timeRange) return true;
      const t = eq.time || 0;
      return t >= timeRange.start && t <= timeRange.end;
    }).map((eq: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [eq.lng, eq.lat] }, properties: { magnitude: eq.magnitude, place: eq.place } })) : [];
    setGeo('earthquakes', eqs);
  }, [mapReady, data.earthquakes, activeLayers.earthquakes, setGeo, timeRange]);

  useEffect(() => {
    if (!mapReady) return;
    const fData = activeLayers.fires && data.fires ? data.fires.filter((f: any) => {
      if (!timeRange) return true;
      const t = f.acq_date ? new Date(f.acq_date + (f.acq_time ? ' ' + String(f.acq_time).padStart(4,'0') : '')).getTime() : 0;
      return t >= timeRange.start && t <= timeRange.end;
    }).map((f: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.lng, f.lat] }, properties: { brightness: f.brightness } })) : [];
    setGeo('fires', fData);
  }, [mapReady, data.fires, activeLayers.fires, setGeo, timeRange]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('weather', activeLayers.weather && data.weather_events ? data.weather_events.map((w: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [w.lng, w.lat] }, properties: { title: w.title, type: w.type, icon: w.icon, severity: w.severity, source: w.source, id: w.id } })) : []);
  }, [mapReady, data.weather_events, activeLayers.weather, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('weather-alerts', activeLayers.weather_alerts && data.alerts ? data.alerts.map((a: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [a.lng, a.lat] }, properties: { headline: a.headline, severity: a.severity, event: a.event, type: a.type, area: a.area, expires: a.expires, description: a.description } })) : []);
  }, [mapReady, data.alerts, activeLayers.weather_alerts, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('disasters', activeLayers.natural_disasters && data.disasters ? data.disasters.map((d: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [d.lng, d.lat] }, properties: { title: d.title, type: d.type, category: d.category, description: d.description, link: d.link } })) : []);
  }, [mapReady, data.disasters, activeLayers.natural_disasters, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('wikipedia-articles', activeLayers.wikipedia_geo && data.wikipedia_articles ? data.wikipedia_articles.map((a: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [a.lng, a.lat] }, properties: { title: a.title, id: a.id, distance: a.distance, url: a.url } })) : []);
  }, [mapReady, data.wikipedia_articles, activeLayers.wikipedia_geo, setGeo]);

  // Basi Militari
  useEffect(() => {
    if (!mapReady) return;
    setGeo('military-bases', activeLayers.military_bases && data.military_bases ? data.military_bases.map((b: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [b.lng, b.lat] }, properties: { name: b.name, country: b.country, type: b.type, branch: b.branch, id: b.id } })) : []);
  }, [mapReady, data.military_bases, activeLayers.military_bases, setGeo]);

  // Ambasciate
  useEffect(() => {
    if (!mapReady) return;
    setGeo('embassies', activeLayers.embassies && data.embassies ? data.embassies.map((e: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [e.lng, e.lat] }, properties: { name: e.name, country: e.country, city: e.city, type: e.type, id: e.id } })) : []);
  }, [mapReady, data.embassies, activeLayers.embassies, setGeo]);

  // Meteoriti
  useEffect(() => {
    if (!mapReady) return;
    setGeo('meteorites', activeLayers.meteorites && data.meteorites ? data.meteorites.map((m: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [m.lng, m.lat] }, properties: { name: m.name, year: m.year, mass_kg: m.mass_kg, type: m.type, country: m.country, id: m.id } })) : []);
  }, [mapReady, data.meteorites, activeLayers.meteorites, setGeo]);

  // Aeroporti
  useEffect(() => {
    if (!mapReady) return;
    setGeo('airports', activeLayers.airports && data.airports ? data.airports.map((a: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [a.lng, a.lat] }, properties: { name: a.name, iata: a.iata, icao: a.icao, city: a.city, country: a.country, runways: a.runways, id: a.id } })) : []);
  }, [mapReady, data.airports, activeLayers.airports, setGeo]);

  // Centrali Elettriche
  useEffect(() => {
    if (!mapReady) return;
    setGeo('power-plants', activeLayers.power_plants && data.power_plants ? data.power_plants.map((p: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { name: p.name, type: p.type, capacity_mw: p.capacity_mw, country: p.country, id: p.id } })) : []);
  }, [mapReady, data.power_plants, activeLayers.power_plants, setGeo]);

  // Faglie Sismiche
  useEffect(() => {
    if (!mapReady) return;
    setGeo('fault-lines', activeLayers.fault_lines && data.fault_lines ? data.fault_lines.map((f: any) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: f.coordinates }, properties: { name: f.name, type: f.type, length_km: f.length_km, country: f.country, region: f.region, id: f.id } })) : []);
  }, [mapReady, data.fault_lines, activeLayers.fault_lines, setGeo]);

  // Rotte Marittime
  useEffect(() => {
    if (!mapReady) return;
    setGeo('maritime-routes', activeLayers.maritime_routes && data.maritime_routes ? data.maritime_routes.map((r: any) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: r.coordinates }, properties: { name: r.name, type: r.type, from: r.from, to: r.to, distance_km: r.distance_km, id: r.id } })) : []);
  }, [mapReady, data.maritime_routes, activeLayers.maritime_routes, setGeo]);

  // Relitti
  useEffect(() => {
    if (!mapReady) return;
    setGeo('shipwrecks', activeLayers.shipwrecks && data.shipwrecks ? data.shipwrecks.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { name: s.name, year: s.year, depth_m: s.depth_m, type: s.type, cause: s.cause, country: s.country, id: s.id } })) : []);
  }, [mapReady, data.shipwrecks, activeLayers.shipwrecks, setGeo]);

  // Torri Radio
  useEffect(() => {
    if (!mapReady) return;
    setGeo('radio-towers', activeLayers.radio_towers && data.radio_towers ? data.radio_towers.map((t: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [t.lng, t.lat] }, properties: { name: t.name, height_m: t.height_m, type: t.type, city: t.city, country: t.country, id: t.id } })) : []);
  }, [mapReady, data.radio_towers, activeLayers.radio_towers, setGeo]);

  // Avvistamenti UFO
  useEffect(() => {
    if (!mapReady) return;
    setGeo('ufo-reports', activeLayers.ufo_reports && data.ufo_reports ? data.ufo_reports.map((u: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [u.lng, u.lat] }, properties: { name: u.name, year: u.year, type: u.type, country: u.country, region: u.region, description: u.description, id: u.id } })) : []);
  }, [mapReady, data.ufo_reports, activeLayers.ufo_reports, setGeo]);

  // Impianti Nucleari
  useEffect(() => {
    if (!mapReady) return;
    setGeo('nuclear-facilities', activeLayers.nuclear_facilities && data.nuclear_facilities ? data.nuclear_facilities.map((n: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [n.lng, n.lat] }, properties: { name: n.name, type: n.type, status: n.status, capacity_mw: n.capacity_mw, country: n.country, id: n.id } })) : []);
  }, [mapReady, data.nuclear_facilities, activeLayers.nuclear_facilities, setGeo]);

  // Telecamere Italia
  useEffect(() => {
    if (!mapReady) return;
    setGeo('italy-cameras', activeLayers.italy_cameras && data.italy_cameras ? data.italy_cameras.map((c: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lng, c.lat] }, properties: { name: c.name, categoria: c.categoria, colore: c.colore, source: c.source, url_type: c.url_type, quality_tier: c.quality_tier, stream_url: c.stream_url } })) : []);
  }, [mapReady, data.italy_cameras, activeLayers.italy_cameras, setGeo]);

  // Dispositivi Bluetooth
  useEffect(() => {
    if (!mapReady) return;
    setGeo('bluetooth-devices', activeLayers.bluetooth_devices && data.bluetooth_devices ? data.bluetooth_devices.map((d: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [d.lng, d.lat] }, properties: { name: d.name, id: d.id } })) : []);
  }, [mapReady, data.bluetooth_devices, activeLayers.bluetooth_devices, setGeo]);

  // Dispositivi Rete
  useEffect(() => {
    if (!mapReady) return;
    setGeo('network-devices', activeLayers.network_devices && data.network_devices ? data.network_devices.map((n: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [n.lng, n.lat] }, properties: { hostname: n.hostname, ip: n.ip, id: n.id } })) : []);
  }, [mapReady, data.network_devices, activeLayers.network_devices, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('volcanoes', activeLayers.volcanoes && data.volcanoes ? data.volcanoes.map((v: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [v.lng, v.lat] }, properties: { name: v.name, country: v.country, region: v.region, elevation: v.elevation, status: v.status, id: v.id } })) : []);
  }, [mapReady, data.volcanoes, activeLayers.volcanoes, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('infrastructure', activeLayers.infrastructure && data.infrastructure ? data.infrastructure.map((i: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [i.lng, i.lat] }, properties: { name: i.name, city: i.city, country: i.country, status: i.status, reactors: i.reactors, capacityMW: i.capacityMW, owner: i.owner } })) : []);
  }, [mapReady, data.infrastructure, activeLayers.infrastructure, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('maritime', activeLayers.maritime && data.maritime_ports ? data.maritime_ports.map((p: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { name: p.name, country: p.country, type: p.type, volume: p.volume, fleet: p.fleet, rank: p.rank } })) : []);
    setGeo('maritime-choke', activeLayers.maritime && data.maritime_chokepoints ? data.maritime_chokepoints.map((c: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lng, c.lat] }, properties: { name: c.name, traffic: c.traffic, risk: c.risk } })) : []);
    setGeo('maritime-ships', activeLayers.maritime && data.maritime_ships ? data.maritime_ships.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { name: s.name || s.mmsi?.toString(), type: s.type || 'cargo', speed: s.speed, heading: s.heading, destination: s.destination, flag: s.flag } })) : []);
  }, [mapReady, data.maritime_ports, data.maritime_chokepoints, data.maritime_ships, activeLayers.maritime, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('balloons', activeLayers.balloons && data.balloons ? data.balloons.map((b: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [b.lng, b.lat] }, properties: { callsign: b.callsign, type: b.type, status: b.status, altitude: b.altitude, speed: b.speed, verticalRate: b.verticalRate, temperature: b.temperature, color: b.color } })) : []);
  }, [mapReady, data.balloons, activeLayers.balloons, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('radiation', activeLayers.radiation && data.radiation ? data.radiation.map((r: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lng, r.lat] }, properties: { name: r.name, city: r.city, country: r.country, reading: r.reading, status: r.status, network: r.network } })) : []);
  }, [mapReady, data.radiation, activeLayers.radiation, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('ransomware', activeLayers.sdk_ransomware && data.ransomware_alerts ? data.ransomware_alerts.map((r: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lng, r.lat] }, properties: { group: r.group, color: r.color, sector: r.sector, status: r.status, severity: r.severity, ransom_usd: r.ransom_usd, country: r.country, description: r.description } })) : []);
  }, [mapReady, data.ransomware_alerts, activeLayers.sdk_ransomware, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('tor-nodes', activeLayers.tor_nodes && data.tor_exit_nodes ? data.tor_exit_nodes.map((n: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [n.lon, n.lat] }, properties: { ip: n.ip, country: n.country, region: n.region, city: n.city, isp: n.isp, org: n.org } })) : []);
  }, [mapReady, data.tor_exit_nodes, activeLayers.tor_nodes, setGeo]);

  // Data Center
  useEffect(() => {
    if (!mapReady) return;
    setGeo('datacenters', activeLayers.datacenters && data.datacenters ? data.datacenters.map((d: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [d.lng, d.lat] }, properties: { name: d.name, city: d.city, country: d.country, operator: d.operator, capacity_mw: d.capacity_mw } })) : []);
  }, [mapReady, data.datacenters, activeLayers.datacenters, setGeo]);

  // Internet Exchange
  useEffect(() => {
    if (!mapReady) return;
    setGeo('ixp-points', activeLayers.ixps && data.ixps ? data.ixps.map((i: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [i.lng, i.lat] }, properties: { name: i.name, city: i.city, country: i.country, members: i.members, peak_gbps: i.peak_gbps } })) : []);
  }, [mapReady, data.ixps, activeLayers.ixps, setGeo]);

  // ══ OSIRIS SDK — Mesh Sensori Lattice ══
  // Usa dati reali di cavi sottomarini per dominio SEA, rotte curate per AIR/INTEL
  useEffect(() => {
    if (!mapReady) return;
    setGeo('sdk-entities', []);

    const anySDK = activeLayers.sdk_sea || activeLayers.sdk_air || activeLayers.sdk_naval;
    if (!anySDK) {
      setGeo('sdk-links', []);
      return;
    }

    const links: any[] = [];

    // ── DOMINIO SEA: Dati reali cavi sottomarini (Corrispondenza 1:1) ──
    if (activeLayers.sdk_sea && data.submarine_cables) {
      const ignoredColors = new Set(['#9BB5CC', '#A0B8CD', '#8EABC2', '#9bb5cc', '#a0b8cd', '#8eabc2']);
      for (const cable of data.submarine_cables) {
        if (!cable.geometry) continue;
        
        // Rimuove gli archi di sfondo azzurro chiaro
        if (cable.properties?.color && ignoredColors.has(cable.properties.color)) continue;
        
        links.push({
          type: 'Feature',
          geometry: cable.geometry, // Percorsi topografici grezzi esattamente dalla mappa dei cavi sottomarini
          properties: {
            domain: 'SEA',
            fromName: cable.properties?.name || 'Submarine Cable',
            toName: cable.properties?.landing_points || '',
            source: 'Global Subsea Cable Network',
            url: 'https://www.submarinecablemap.com/',
            ...cable.properties,
            color: '#1976D2', // Blu più scuro come richiesto, più trasparente nella vernice del layer
          },
        });
      }
    }

    setGeo('sdk-links', links);
  }, [mapReady, activeLayers.sdk_sea, activeLayers.sdk_air, activeLayers.sdk_naval, data.submarine_cables, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('live-news', activeLayers.live_news && data.live_feeds ? data.live_feeds.map((f: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.lng, f.lat] }, properties: { name: f.name, city: f.city, country: f.country, url: f.url, category: f.category, embed_allowed: f.embed_allowed !== false } })) : []);
  }, [mapReady, data.live_feeds, activeLayers.live_news, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    const items = data.news || [];
    setGeo('sigint-news', activeLayers.news_intel && items.length > 0
      ? items.filter((n: any) => n.coords?.length === 2).map((n: any) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [n.coords[1], n.coords[0]] },
          properties: { title: n.title, source: n.source, risk_score: n.risk_score, link: n.link }
        }))
      : []);
  }, [mapReady, data.news, activeLayers.news_intel, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    // ── ZONE DI CONFLITTO — marcatori di avviso punto centrale ──
    const CONFLICT_ZONES = [
      { label: 'GUERRA UCRAINA', severity: 'war', lat: 48.5, lng: 31.2 },
      { label: 'CONFLITTO GAZA', severity: 'war', lat: 31.35, lng: 34.35 },
      { label: 'CONFINE LIBANO', severity: 'high', lat: 33.4, lng: 35.8 },
      { label: 'GUERRA CIVILE SUDAN', severity: 'war', lat: 15.0, lng: 30.0 },
      { label: 'CONFLITTO MYANMAR', severity: 'war', lat: 19.5, lng: 96.5 },
      { label: 'CONFLITTO EST RDC', severity: 'war', lat: -1.0, lng: 28.5 },
      { label: 'GUERRA YEMEN', severity: 'war', lat: 15.5, lng: 48.0 },
      { label: 'SIRIA', severity: 'high', lat: 35.0, lng: 38.5 },
      { label: 'STRETTO TAIWAN', severity: 'elevated', lat: 24.0, lng: 119.5 },
      { label: 'ZDC COREANA', severity: 'elevated', lat: 38.3, lng: 127.0 },
      { label: 'INSTABILITÀ SAHEL', severity: 'high', lat: 14.0, lng: 5.0 },
      { label: 'SOMALIA', severity: 'high', lat: 5.0, lng: 46.0 },
      { label: 'MINACCIA MAR ROSSO', severity: 'high', lat: 16.0, lng: 40.0 },
    ];
    const conflictFeatures = CONFLICT_ZONES.map(z => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [z.lng, z.lat] },
      properties: { label: z.label, severity: z.severity },
    }));
    setGeo('conflict-zones', conflictFeatures);
    setGeo('war-alerts-targets', conflictFeatures);
  }, [mapReady, setGeo]);


  // Visibilità
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
    setVis(['weather-alerts-glow','weather-alerts-dots','weather-alerts-label'], activeLayers.weather_alerts);
    setVis(['disasters-glow','disasters-dots','disasters-label'], activeLayers.natural_disasters);
    setVis(['wikipedia-glow','wikipedia-dots','wikipedia-labels'], activeLayers.wikipedia_geo);
    setVis(['infra-glow','infra-dots','infra-label'], activeLayers.infrastructure);
    setVis(['maritime-glow','maritime-dots','maritime-label'], activeLayers.maritime);
    setVis(['choke-glow','choke-dots','choke-label'], activeLayers.maritime);
    setVis(['ship-dots','ship-label'], activeLayers.maritime);
    setVis(['news-glow','news-dots','news-label'], activeLayers.live_news);
    setVis(['sigint-news-glow','sigint-news-dots','sigint-news-label'], activeLayers.news_intel);
    setVis(['conflict-icons'], activeLayers.conflict_zones !== false);
    setVis(['war-alert-glow','war-alert-dots','war-alert-label'], activeLayers.war_alerts);

    setVis(['volcanoes-dots'], activeLayers.volcanoes);
    setVis(['balloon-dots','balloon-label'], activeLayers.balloons);
    setVis(['rad-glow','rad-dots','rad-label'], activeLayers.radiation);
    setVis(['ransomware-glow','ransomware-dots','ransomware-label'], activeLayers.sdk_ransomware);
    setVis(['tor-nodes-glow','tor-nodes-dots'], activeLayers.tor_nodes);
    setVis(['datacenter-glow','datacenter-dots','datacenter-label'], activeLayers.datacenters);
    setVis(['ixp-glow','ixp-dots','ixp-label'], activeLayers.ixps);
    setVis(['mb-glow','mb-dots','mb-label'], activeLayers.military_bases);
    setVis(['emb-glow','emb-dots','emb-label'], activeLayers.embassies);
    setVis(['meteorites-glow','meteorites-dots'], activeLayers.meteorites);
    setVis(['airports-glow','airports-dots','airports-label'], activeLayers.airports);
    setVis(['power-plants-glow','power-plants-dots'], activeLayers.power_plants);
    setVis(['fault-lines-line','fault-lines-glow'], activeLayers.fault_lines);
    setVis(['maritime-routes-line','maritime-routes-glow'], activeLayers.maritime_routes);
    setVis(['shipwrecks-glow','shipwrecks-dots'], activeLayers.shipwrecks);
    setVis(['radio-towers-glow','radio-towers-dots','radio-towers-label'], activeLayers.radio_towers);
    setVis(['ufo-reports-glow','ufo-reports-dots','ufo-reports-label'], activeLayers.ufo_reports);
    setVis(['nuclear-facilities-glow','nuclear-facilities-dots','nuclear-facilities-label'], activeLayers.nuclear_facilities);
    setVis(['mines-glow','mines-dots','mines-label'], activeLayers.mines);
    setVis(['pyramids-glow','pyramids-dots','pyramids-label'], activeLayers.pyramids);
    setVis(['caves-glow','caves-dots','caves-label'], activeLayers.caves);
    setVis(['lost-cities-glow','lost-cities-dots','lost-cities-label'], activeLayers.lost_cities);
    setVis(['antarctica-anomalies-glow','antarctica-anomalies-dots','antarctica-anomalies-label'], activeLayers.antarctica_anomalies);
    setVis(['italy-cameras-glow','italy-cameras-dots','italy-cameras-label'], activeLayers.italy_cameras);
    setVis(['bluetooth-glow','bluetooth-dots','bluetooth-label'], activeLayers.bluetooth_devices);
    setVis(['network-devices-glow','network-devices-dots','network-devices-label'], activeLayers.network_devices);
    setVis(['sdk-sea','sdk-sea-glow','sdk-sea-atmo'], activeLayers.sdk_sea !== false);
    setVis(['sdk-air','sdk-air-glow','sdk-air-atmo'], activeLayers.sdk_air !== false);
    setVis(['sdk-intel','sdk-intel-glow','sdk-intel-atmo'], activeLayers.sdk_naval !== false);
    // Layer sweep sempre visibili quando i dati sono presenti (controllato da useEffect)
    setVis(['sweep-connections','sweep-pulse-ring','sweep-device-glow','sweep-device-dots','sweep-device-labels'], true);
  }, [mapReady, activeLayers, setVis]);

  // Visibilità Edifici 3D
  useEffect(() => {
    if (!mapReady) return;
    setVis(['buildings-3d-fill', 'buildings-3d-outline'], show3DBuildings);
  }, [mapReady, show3DBuildings, setVis]);

  // Visualizzazione IP Sweep
  useEffect(() => {
    if (!mapReady) return;
    if (!sweepData?.devices?.length) {
      setGeo('ip-sweep-devices', []);
      setGeo('ip-sweep-pulse', []);
      setGeo('ip-sweep-connections', []);
      return;
    }

    const map = mapRef.current;
    if (!map) return;

    const { center, devices } = sweepData;
    const centerCoord: [number, number] = [center.lng, center.lat];

    // Passa a globo e vola verso la posizione dello sweep
    try {
      (map as any).setProjection({ type: 'globe' });
      map.setSky({ 'sky-color': '#0A0A0F', 'sky-horizon-blend': 0.02, 'horizon-color': '#0A0A0F', 'horizon-fog-blend': 0.02 });
    } catch { /* proiezione potrebbe non essere supportata */ }

    map.flyTo({ center: centerCoord, zoom: 14, pitch: 50, bearing: -20, duration: 3000, essential: true });

    // Imposta impulso centrale
    setGeo('ip-sweep-pulse', [{
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: centerCoord },
      properties: { ip: sweepData.target_ip },
    }]);

    // Costruisce features dispositivi distribuiti in cerchio attorno al centro
    const allDeviceFeatures = devices.map((d: any, i: number) => {
      const angle = (i / devices.length) * Math.PI * 2;
      const radius = 0.001 + ((i % 7 + 1) * 0.0004);
      const dLng = centerCoord[0] + Math.cos(angle) * radius * (1 / Math.cos(center.lat * Math.PI / 180));
      const dLat = centerCoord[1] + Math.sin(angle) * radius;
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [dLng, dLat] },
        properties: {
          ip: d.ip, device_type: d.device_type, device_icon: d.device_icon,
          color: d.device_color, risk_level: d.risk_level,
          ports: JSON.stringify(d.ports), hostnames: JSON.stringify(d.hostnames),
          vulns: JSON.stringify(d.vulns), cpes: JSON.stringify(d.cpes), tags: JSON.stringify(d.tags),
        },
      };
    });

    // Linee di connessione dal centro a ciascun dispositivo
    const connectionFeatures = allDeviceFeatures.map((f: any) => ({
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: [centerCoord, f.geometry.coordinates] },
      properties: { color: f.properties.color },
    }));

    // Scagliona l'apparizione dopo il completamento del flyTo di 3s
    const timer = setTimeout(() => {
      setGeo('ip-sweep-connections', connectionFeatures);
      const batchSize = 5;
      const batches = Math.ceil(allDeviceFeatures.length / batchSize);
      for (let b = 0; b < batches; b++) {
        setTimeout(() => {
          setGeo('ip-sweep-devices', allDeviceFeatures.slice(0, (b + 1) * batchSize));
        }, b * 100);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [mapReady, sweepData, setGeo]);

  // Visualizzazione bersagli scansione
  useEffect(() => {
    if (!mapReady || !mapRef.current || !scanTargets) return;
    const map = mapRef.current;
    
    const features = scanTargets.map(t => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [t.lng, t.lat] },
      properties: { ...t }
    }));
    
    const src = map.getSource('scan-targets') as maplibregl.GeoJSONSource;
    if (src) src.setData({ type: 'FeatureCollection', features });
  }, [scanTargets, mapReady]);

  // Overlay GeoJSON personalizzato
  useEffect(() => {
    if (!mapReady) return;
    const features = (geoJSONData || []).map((f: any) => {
      if (f.type === 'Feature' && f.geometry) return f;
      return { type: 'Feature', geometry: f, properties: f.properties || {} };
    });
    setGeo('custom-geojson', features);
  }, [mapReady, geoJSONData, setGeo]);

  // Vai a
  useEffect(() => {
    if (!mapReady || !mapRef.current || !flyToLocation) return;
    mapRef.current.flyTo({ center: [flyToLocation.lng, flyToLocation.lat], zoom: 8, duration: 2000 });
  }, [mapReady, flyToLocation]);

  // Cambio proiezione dinamico (leggero — nessun DEM terreno)
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
        } catch (e) { console.warn('[OSIRIS] Suppressed error:', e instanceof Error ? e.message : e); }
      } else {
        map.easeTo({ pitch: 0, duration: 800 });
      }
    } catch (e) {
      console.warn('Projection switch failed:', e);
    }
  }, [mapReady, projection]);

  // Cambio stile Satellite / Scuro
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (mapStyle === prevStyleRef.current) return;
    prevStyleRef.current = mapStyle;
    const map = mapRef.current;

    try {
      if (mapStyle !== 'dark') {
        // Aggiunge tile raster satellitari
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

  const exportMap = useCallback(() => {
    if (!mapRef.current) return;
    const canvas = mapRef.current.getCanvas();
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `osiris-map-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      <button
        onClick={() => setShow3DBuildings(!show3DBuildings)}
        className={`absolute bottom-16 left-4 z-50 w-8 h-8 rounded-full glass-panel flex items-center justify-center transition-colors pointer-events-auto ${
          show3DBuildings ? 'border-[var(--cyan-primary)] text-[var(--cyan-primary)]' : 'hover:border-[var(--gold-primary)]'
        }`}
        title="Edifici 3D"
      >
        <Building2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={exportMap}
        className="absolute bottom-4 right-4 z-50 w-8 h-8 rounded-full glass-panel flex items-center justify-center hover:border-[var(--gold-primary)] transition-colors pointer-events-auto"
        title="Esporta mappa come PNG"
      >
        <Download className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
      </button>
    </div>
  );
}

export default memo(OsirisMap);
