'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, BarChart3, Newspaper, Search, Share2, Map as MapIcon, X, Globe, MapPinned, Radar, Satellite, Moon } from 'lucide-react';
import LayerPanel from '@/components/LayerPanel';
import IntelFeed from '@/components/IntelFeed';
import MarketsPanel from '@/components/MarketsPanel';
import SearchBar from '@/components/SearchBar';
import ScaleBar from '@/components/ScaleBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import CameraViewer from '@/components/CameraViewer';
import SharePanel from '@/components/SharePanel';
import ViewPresets from '@/components/ViewPresets';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import GlobalStatusBar from '@/components/GlobalStatusBar';
import OsintPanel from '@/components/OsintPanel';

const OsirisMap = dynamic(() => import('@/components/OsirisMap'), { ssr: false });

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Mobile if narrow, OR landscape phone (short height + moderate width)
      setIsMobile(w < 768 || (h < 500 && w < 1024));
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);
  return isMobile;
}

export default function Dashboard() {
  const dataRef = useRef<any>({});
  const [dataVersion, setDataVersion] = useState(0);
  const data = dataRef.current;

  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [mapView, setMapView] = useState({ zoom: 2.5, latitude: 20 });
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [regionDossier, setRegionDossier] = useState<any>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [uptime, setUptime] = useState('00:00:00');
  const [activeCamera, setActiveCamera] = useState<any>(null);
  const [spaceWeather, setSpaceWeather] = useState<any>(null);
  const [showLayers, setShowLayers] = useState(true);
  const [showMarkets, setShowMarkets] = useState(true);
  const [showIntel, setShowIntel] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'layers'|'markets'|'intel'|'search'|'recon'|null>(null);
  const [mapProjection, setMapProjection] = useState<'globe'|'mercator'>('globe');
  const [mapStyle, setMapStyle] = useState<'dark'|'satellite'>('dark');
  const [showOsint, setShowOsint] = useState(false);
  const isMobile = useIsMobile();
  const startTime = useRef(Date.now());
  const geocodeCache = useRef<Map<string, string>>(new Map());
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedPos = useRef<{ lat: number; lng: number } | null>(null);

  // ── DEFAULT: Most layers OFF — fast initial load ──
  const [activeLayers, setActiveLayers] = useState({
    flights: false,
    private: false,
    jets: false,
    military: false,
    satellites: false,
    cctv: false,
    earthquakes: true,
    fires: false,
    weather: false,
    infrastructure: false,
    global_incidents: false,
    gps_jamming: false,
    day_night: true,
  });

  // Uptime clock
  useEffect(() => {
    const iv = setInterval(() => {
      const e = Math.floor((Date.now() - startTime.current) / 1000);
      setUptime(`${String(Math.floor(e/3600)).padStart(2,'0')}:${String(Math.floor((e%3600)/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Splash screen
  useEffect(() => { setTimeout(() => setShowSplash(false), 2500); }, []);

  // URL state: parse on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const lat = parseFloat(p.get('lat') || '');
    const lon = parseFloat(p.get('lon') || '');
    const zoom = parseFloat(p.get('zoom') || '');
    if (!isNaN(lat) && !isNaN(lon)) {
      setFlyToLocation({ lat, lng: lon, ts: Date.now() });
      if (!isNaN(zoom)) setMapView(v => ({ ...v, zoom }));
    }
    const layers = p.get('layers');
    if (layers) {
      const active = layers.split(',');
      setActiveLayers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { (next as any)[k] = active.includes(k); });
        return next;
      });
    }
  }, []);

  // URL state: update URL on view change (debounced)
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const p = new URLSearchParams();
      p.set('lat', (mouseCoords?.lat ?? mapView.latitude ?? 20).toFixed(4));
      p.set('lon', (mouseCoords?.lng ?? 0).toFixed(4));
      p.set('zoom', mapView.zoom.toFixed(2));
      const active = Object.entries(activeLayers).filter(([,v]) => v).map(([k]) => k).join(',');
      p.set('layers', active);
      const url = `${window.location.pathname}?${p.toString()}`;
      window.history.replaceState(null, '', url);
    }, 1500);
  }, [mapView, activeLayers, mouseCoords]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if (e.key === 'f' && !e.ctrlKey) {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
        setIsFullscreen(!!document.fullscreenElement);
      }
      if (e.key === 'l') setShowLayers(p => !p);
      if (e.key === 'm') setShowMarkets(p => !p);
      if (e.key === 'i') setShowIntel(p => !p);
      if (e.key === 'r') setFlyToLocation({ lat: 20, lng: 0, ts: Date.now() });
      if (e.key === 'g') setMapProjection(p => p === 'globe' ? 'mercator' : 'globe');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Mouse coords + reverse geocode
  const handleMouseCoords = useCallback((coords: { lat: number; lng: number }) => {
    setMouseCoords(coords);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      if (lastGeocodedPos.current) {
        const d = Math.abs(coords.lat - lastGeocodedPos.current.lat) + Math.abs(coords.lng - lastGeocodedPos.current.lng);
        if (d < 0.1) return;
      }
      const gk = `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}`;
      if (geocodeCache.current.has(gk)) { setLocationLabel(geocodeCache.current.get(gk)!); lastGeocodedPos.current = coords; return; }
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&zoom=10&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
        if (res.ok) {
          const d = await res.json();
          const a = d.address || {};
          const label = [a.city||a.town||a.village||a.county, a.state||a.region, a.country].filter(Boolean).join(', ') || 'Unknown';
          if (geocodeCache.current.size > 500) { const it = geocodeCache.current.keys(); for (let i=0;i<100;i++) { const k = it.next().value; if(k) geocodeCache.current.delete(k); }}
          geocodeCache.current.set(gk, label);
          setLocationLabel(label);
          lastGeocodedPos.current = coords;
        }
      } catch {}
    }, 1500);
  }, []);

  // Region dossier (right-click)
  const handleRightClick = useCallback(async (coords: { lat: number; lng: number }) => {
    setDossierLoading(true); setRegionDossier(null);
    try {
      const res = await fetch(`/api/region-dossier?lat=${coords.lat}&lng=${coords.lng}`);
      if (res.ok) setRegionDossier(await res.json());
    } catch {} finally { setDossierLoading(false); }
  }, []);

  // ── PROGRESSIVE DATA LOADING (performance-optimized) ──
  useEffect(() => {
    const fetchEndpoint = async (url: string, transform?: (d: any) => any) => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const d = transform ? transform(json) : json;
          dataRef.current = { ...dataRef.current, ...d };
          setDataVersion(v => v + 1);
          setBackendStatus('connected');
        }
      } catch { setBackendStatus('error'); }
    };

    // Priority 1: Core lightweight feeds (always load)
    fetchEndpoint('/api/earthquakes');
    fetchEndpoint('/api/news');
    setTimeout(() => fetchEndpoint('/api/markets'), 800);

    // Priority 2: Visual layers (stagger by 2s+)
    setTimeout(() => {
      if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
        fetchEndpoint('/api/flights');
      }
    }, 3000);

    // Priority 3: CCTV — only if enabled
    setTimeout(() => {
      if (activeLayers.cctv) fetchEndpoint('/api/cctv?region=uk');
    }, 4000);

    // Priority 4: Secondary layers — 6s+
    setTimeout(() => {
      if (activeLayers.fires) fetchEndpoint('/api/fires');
    }, 6000);
    setTimeout(() => {
      if (activeLayers.satellites) fetchEndpoint('/api/satellites');
    }, 7000);

    // Priority 5: Heavy layers — 8s+
    setTimeout(() => fetchEndpoint('/api/gdelt', d => ({ gdelt: d.events })), 8000);
    setTimeout(() => fetchEndpoint('/api/weather', d => ({ weather_events: d.events })), 5000);
    setTimeout(() => fetchEndpoint('/api/infrastructure', d => ({ infrastructure: d.infrastructure })), 5500);

    // Priority 6: Space Weather + Air Quality — 10s+
    setTimeout(async () => {
      try {
        const r = await fetch('/api/space-weather');
        if (r.ok) setSpaceWeather(await r.json());
      } catch {}
    }, 10000);

    // Polling — RELAXED intervals to reduce load
    const intervals = [
      setInterval(() => {
        if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
          fetchEndpoint('/api/flights');
        }
      }, 120000), // 2 min (was 60s)
      setInterval(() => fetchEndpoint('/api/earthquakes'), 300000),  // 5 min (was 2 min)
      setInterval(() => fetchEndpoint('/api/news'), 600000),         // 10 min (was 5 min)
      setInterval(() => fetchEndpoint('/api/markets'), 300000),      // 5 min (was 2 min)
      setInterval(() => {
        if (activeLayers.fires) fetchEndpoint('/api/fires');
      }, 900000), // 15 min (was 10 min)
    ];
    return () => intervals.forEach(clearInterval);
  }, []);

  // ── VIEWPORT-AWARE CCTV LOADING ──
  const lastCctvRegion = useRef('');
  useEffect(() => {
    if (!activeLayers.cctv || !mouseCoords) return;
    const timer = setTimeout(async () => {
      const lat = mouseCoords.lat;
      const lng = mouseCoords.lng;
      // Larger region buckets (20° instead of 10°) — fewer fetches
      const regionKey = `${Math.round(lat/20)}_${Math.round(lng/20)}`;
      if (regionKey === lastCctvRegion.current) return;
      lastCctvRegion.current = regionKey;
      
      try {
        const res = await fetch(`/api/cctv?lat=${lat}&lng=${lng}&radius=10`);
        if (res.ok) {
          const json = await res.json();
          const existing = dataRef.current.cameras || [];
          const existingIds = new Set(existing.map((c: any) => c.id));
          const newCams = json.cameras.filter((c: any) => !existingIds.has(c.id));
          dataRef.current = {
            ...dataRef.current,
            cameras: [...existing, ...newCams],
          };
          setDataVersion(v => v + 1);
        }
      } catch {}
    }, 5000); // 5s debounce (was 2s)
    return () => clearTimeout(timer);
  }, [mouseCoords?.lat, mouseCoords?.lng, activeLayers.cctv]);

  // ── REACTIVE: Fetch data when layers are toggled ON ──
  const prevLayersRef = useRef(activeLayers);
  useEffect(() => {
    const prev = prevLayersRef.current;
    prevLayersRef.current = activeLayers;

    const fetchEndpoint = async (url: string, transform?: (d: any) => any) => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const d = transform ? transform(json) : json;
          dataRef.current = { ...dataRef.current, ...d };
          setDataVersion(v => v + 1);
        }
      } catch {}
    };

    // Flights: any flight layer turned ON
    const anyFlightNow = activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private;
    const anyFlightBefore = prev.flights || prev.military || prev.jets || prev.private;
    if (anyFlightNow && !anyFlightBefore && !dataRef.current.commercial_flights) {
      fetchEndpoint('/api/flights');
    }

    // CCTV turned ON
    if (activeLayers.cctv && !prev.cctv && !dataRef.current.cameras?.length) {
      fetchEndpoint('/api/cctv?region=all');
    }

    // Fires turned ON
    if (activeLayers.fires && !prev.fires && !dataRef.current.fires?.length) {
      fetchEndpoint('/api/fires');
    }

    // Satellites turned ON
    if (activeLayers.satellites && !prev.satellites && !dataRef.current.satellites?.length) {
      fetchEndpoint('/api/satellites');
    }
  }, [activeLayers]);

  const totalFlights = (data.commercial_flights?.length||0)+(data.private_flights?.length||0)+(data.private_jets?.length||0)+(data.military_flights?.length||0);

  // Dynamic Threat Level based on active global incidents
  const threatScore = (data.earthquakes?.filter((e: any) => e.magnitude >= 5).length || 0)
    + (data.weather_events?.filter((w: any) => w.severity === 'high').length || 0) * 2
    + (data.gdelt?.length || 0) * 0.1
    + (data.fires?.length || 0) * 0.01;
  const threatLevel = threatScore >= 10 ? 'CRITICAL' : threatScore >= 5 ? 'HIGH' : threatScore >= 2 ? 'ELEVATED' : 'NOMINAL';
  const threatColor = threatLevel === 'CRITICAL' ? '#FF1744' : threatLevel === 'HIGH' ? '#FF9500' : threatLevel === 'ELEVATED' ? '#FFD700' : '#00E676';

  return (
    <main className="fixed inset-0 w-full h-full bg-[var(--bg-void)] overflow-hidden">

      {/* ── SPLASH ── */}
      <AnimatePresence>
        {showSplash && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0 z-[999] bg-[var(--bg-void)] flex flex-col items-center justify-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }} className="w-16 h-16 rounded-full border-2 border-[var(--gold-primary)] flex items-center justify-center mb-4 animate-glow-pulse">
              <div className="w-8 h-8 rounded-full bg-[var(--gold-primary)]/20 border border-[var(--gold-primary)]/40" />
            </motion.div>
            <motion.h1 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-3xl font-bold tracking-[0.6em] text-[var(--text-heading)] font-mono">OSIRIS</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-[9px] text-[var(--gold-primary)] font-mono tracking-[0.3em] mt-2">INITIALIZING GLOBAL INTELLIGENCE FEEDS...</motion.p>
            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.8, duration: 1.5 }} className="w-48 h-[2px] bg-gradient-to-r from-transparent via-[var(--gold-primary)] to-transparent mt-6 origin-left" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAP ── */}
      <ErrorBoundary name="Map">
        <OsirisMap data={data} activeLayers={activeLayers} projection={mapProjection} mapStyle={mapStyle === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'dark'} onEntityClick={(entity) => {
          if (entity?.type === 'cctv') setActiveCamera(entity);
        }} onMouseCoords={handleMouseCoords} onRightClick={handleRightClick} onViewStateChange={setMapView} flyToLocation={flyToLocation} />
      </ErrorBoundary>

      {/* ── 3D/2D TOGGLE ── */}
      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.5 }}
        onClick={() => setMapProjection(p => p === 'globe' ? 'mercator' : 'globe')}
        className="absolute bottom-[75px] md:bottom-24 left-3 md:left-5 z-[200] glass-panel p-2 pointer-events-auto hover:border-[var(--gold-primary)]/40 transition-colors group"
        title={mapProjection === 'globe' ? 'Switch to 2D Map' : 'Switch to 3D Globe'}
      >
        {mapProjection === 'globe' ? (
          <MapPinned className="w-4 h-4 text-[var(--gold-primary)] group-hover:scale-110 transition-transform" />
        ) : (
          <Globe className="w-4 h-4 text-[var(--cyan-primary)] group-hover:scale-110 transition-transform" />
        )}
        <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 text-[7px] font-mono text-[var(--text-muted)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          {mapProjection === 'globe' ? '2D MAP' : '3D GLOBE'}
        </span>
      </motion.button>

      {/* ── MAP STYLE TOGGLE ── */}
      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.7 }}
        onClick={() => setMapStyle(s => s === 'dark' ? 'satellite' : 'dark')}
        className="absolute bottom-[120px] md:bottom-36 left-3 md:left-5 z-[200] glass-panel p-2 pointer-events-auto hover:border-[var(--gold-primary)]/40 transition-colors group"
        title={mapStyle === 'dark' ? 'Satellite View' : 'Night View'}
      >
        {mapStyle === 'dark' ? (
          <Satellite className="w-4 h-4 text-[var(--alert-green)] group-hover:scale-110 transition-transform" />
        ) : (
          <Moon className="w-4 h-4 text-[var(--cyan-primary)] group-hover:scale-110 transition-transform" />
        )}
        <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 text-[7px] font-mono text-[var(--text-muted)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          {mapStyle === 'dark' ? 'SATELLITE' : 'NIGHT MODE'}
        </span>
      </motion.button>

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 2.5 }} className={`absolute top-3 left-3 md:top-5 md:left-5 z-[200] pointer-events-none flex items-center gap-2 md:gap-3`}>
        <div className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center relative">
          <div className="w-5 h-5 md:w-7 md:h-7 rounded-full border-2 border-[var(--gold-primary)] flex items-center justify-center animate-glow-pulse">
            <div className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-[var(--gold-primary)]/30 border border-[var(--gold-primary)]/60" />
          </div>
          <div className="absolute w-[1px] h-full bg-[var(--gold-primary)]/30" />
          <div className="absolute w-full h-[1px] bg-[var(--gold-primary)]/30" />
        </div>
        <div>
          <h1 className="text-base md:text-xl font-bold tracking-[0.4em] md:tracking-[0.5em] text-[var(--text-heading)] font-mono">OSIRIS</h1>
          <span className="text-[6px] md:text-[7px] text-[var(--gold-primary)] font-mono tracking-[0.2em] md:tracking-[0.3em] opacity-80">GLOBAL INTELLIGENCE PLATFORM</span>
        </div>
      </motion.div>

      {/* ── TOP-RIGHT STATUS (desktop) ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }} className="status-bar-desktop absolute top-3 right-3 md:top-4 md:right-5 z-[200] pointer-events-none flex items-center gap-2 md:gap-4 text-[6px] md:text-[7px] font-mono tracking-widest text-[var(--text-muted)]">
        <span>SYS: <span className={backendStatus === 'connected' ? 'text-[var(--alert-green)]' : 'text-[var(--alert-red)]'}>{backendStatus.toUpperCase()}</span></span>
        <span>THREAT: <span style={{ color: threatColor, fontWeight: 700 }} className={threatLevel === 'CRITICAL' ? 'animate-threat-flash' : ''}>{threatLevel}</span></span>
        {spaceWeather && <span className="hidden lg:inline">SOLAR: <span style={{ color: spaceWeather.storm_color, fontWeight: 700 }}>Kp{spaceWeather.kp_index}</span></span>}
        <span className="hidden lg:inline">UPTIME: <span className="text-[var(--gold-primary)]">{uptime}</span></span>
        <span>V3.3</span>
      </motion.div>

      {/* ── MOBILE: Compact top status ── */}
      {isMobile && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="absolute top-3 right-3 z-[200] pointer-events-none flex items-center gap-2">
          <div className="glass-panel px-2 py-1 flex items-center gap-2 text-[6px] font-mono tracking-wider">
            <div className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'connected' ? 'bg-[var(--alert-green)]' : 'bg-[var(--alert-red)]'} animate-osiris-pulse`} />
            <span style={{ color: threatColor, fontWeight: 700 }}>{threatLevel}</span>
          </div>
        </motion.div>
      )}

      {/* ── GLOBAL STATUS TICKER ── */}
      <GlobalStatusBar />

      {/* ── LEFT HUD (desktop) ── */}
      <div className="desktop-panel absolute left-5 top-20 bottom-24 w-72 flex flex-col gap-3 z-[200] pointer-events-none overflow-y-auto styled-scrollbar pr-1">
        {showLayers && (
          <>
            <LayerPanel data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} />
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="glass-panel px-3 py-2.5 pointer-events-auto">
              <div className="grid grid-cols-5 gap-2 text-center">
                <div><div className="hud-label">AIRCRAFT</div><div className="hud-value text-[10px] animate-data-pulse">{totalFlights.toLocaleString()}</div></div>
                <div><div className="hud-label">SATS</div><div className="hud-value text-[10px]">{(data.satellites?.length||0).toLocaleString()}</div></div>
                <div><div className="hud-label">CCTV</div><div className="hud-value text-[10px]">{(data.cameras?.length||0).toLocaleString()}</div></div>
                <div><div className="hud-label">WEATHER</div><div className="hud-value text-[10px]" style={{ color: '#E040FB' }}>{(data.weather_events?.length||0)}</div></div>
                <div><div className="hud-label">NUCLEAR</div><div className="hud-value text-[10px]" style={{ color: '#76FF03' }}>{(data.infrastructure?.length||0)}</div></div>
              </div>
            </motion.div>
            <ViewPresets onNavigate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMapView(v => ({ ...v, zoom })); }} />
          </>
        )}
      </div>

      {/* ── RIGHT HUD (desktop) ── */}
      <div className="desktop-panel absolute right-5 top-20 bottom-24 w-80 flex flex-col gap-3 z-[200] pointer-events-auto overflow-y-auto styled-scrollbar pr-1">
        <div className="flex gap-2 items-start">
          <div className="flex-1"><SearchBar onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })} /></div>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowOsint(true)}
            className="glass-panel px-3 py-1.5 flex items-center gap-1.5 pointer-events-auto hover:border-[var(--cyan-primary)]/40 transition-colors"
          >
            <Radar className="w-3.5 h-3.5 text-[var(--cyan-primary)]" />
            <span className="text-[8px] font-mono text-[var(--cyan-primary)] tracking-widest font-bold">RECON</span>
          </motion.button>
          <div className="relative"><SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={mouseCoords} /></div>
        </div>
        {showMarkets && <MarketsPanel data={data} spaceWeather={spaceWeather} />}
        {showIntel && <IntelFeed data={data} onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })} />}
      </div>

      {/* ═══ MOBILE UI ═══ */}
      {isMobile && (
        <>
          {/* Mobile Bottom Navigation */}
          <div className="mobile-nav">
            <div className="glass-panel mobile-nav-inner">
              {[
                { id: 'layers' as const, icon: Layers, label: 'LAYERS' },
                { id: 'markets' as const, icon: BarChart3, label: 'MARKETS' },
                { id: 'intel' as const, icon: Newspaper, label: 'INTEL' },
                { id: 'recon' as const, icon: Radar, label: 'RECON' },
                { id: 'search' as const, icon: Search, label: 'SEARCH' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setMobilePanel(mobilePanel === tab.id ? null : tab.id)}
                  className={`mobile-nav-btn ${mobilePanel === tab.id ? 'active' : ''}`}>
                  <tab.icon className={`w-4 h-4 ${tab.id === 'recon' ? 'text-[var(--cyan-primary)]' : ''}`} />
                  <span className={tab.id === 'recon' ? 'text-[var(--cyan-primary)]' : ''}>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Drawer */}
          <AnimatePresence>
            {mobilePanel && (
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-[52px] left-0 right-0 z-[400] glass-panel rounded-b-none overflow-y-auto styled-scrollbar"
                style={{ maxHeight: 'min(55vh, calc(100dvh - 100px))', paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
              >
                <div className="mobile-drawer-handle" />
                <div className="px-3 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="hud-text text-[9px] text-[var(--text-primary)]">
                      {mobilePanel === 'layers' ? 'LAYERS & STATS' : mobilePanel === 'markets' ? 'MARKETS & INTEL' : mobilePanel === 'intel' ? 'INTEL FEED' : mobilePanel === 'recon' ? 'OSIRIS RECON' : 'SEARCH'}
                    </span>
                    <button onClick={() => setMobilePanel(null)} className="text-[var(--text-muted)] p-1"><X className="w-4 h-4" /></button>
                  </div>
                  {mobilePanel === 'layers' && (
                    <>
                      <div className="glass-panel-sm p-2 mb-2">
                        <div className="grid grid-cols-5 gap-1 text-center">
                          <div><div className="hud-label" style={{fontSize:'6px'}}>AIR</div><div className="hud-value text-[9px]">{totalFlights.toLocaleString()}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>SAT</div><div className="hud-value text-[9px]">{(data.satellites?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>CAM</div><div className="hud-value text-[9px]">{(data.cameras?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>WX</div><div className="hud-value text-[9px]" style={{color:'#E040FB'}}>{(data.weather_events?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>NUC</div><div className="hud-value text-[9px]" style={{color:'#76FF03'}}>{(data.infrastructure?.length||0)}</div></div>
                        </div>
                      </div>
                      <LayerPanel data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} />
                      <div className="mt-2">
                        <ViewPresets onNavigate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMapView(v => ({ ...v, zoom })); setMobilePanel(null); }} />
                      </div>
                    </>
                  )}
                  {mobilePanel === 'markets' && <MarketsPanel data={data} spaceWeather={spaceWeather} />}
                  {mobilePanel === 'intel' && <IntelFeed data={data} onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }} />}
                  {mobilePanel === 'search' && (
                    <div className="space-y-2">
                      <SearchBar onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }} />
                      <SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={mouseCoords} />
                    </div>
                  )}
                  {mobilePanel === 'recon' && (
                    <div className="space-y-2">
                      <OsintPanel isOpen={true} onClose={() => setMobilePanel(null)} isMobile={true} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── BOTTOM CENTER (desktop) ── */}
      {!isMobile && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3, duration: 0.8 }} className="desktop-only absolute bottom-5 left-1/2 -translate-x-1/2 z-[200] pointer-events-auto">
          <div className="glass-panel px-5 py-2.5 flex items-center gap-5 osiris-glow">
            <div className="flex flex-col items-center min-w-[110px]">
              <div className="hud-label">COORDINATES</div>
              <div className="text-[10px] font-mono font-bold text-[var(--gold-primary)] tracking-wide">{mouseCoords ? `${mouseCoords.lat.toFixed(4)}, ${mouseCoords.lng.toFixed(4)}` : '—'}</div>
            </div>
            <div className="w-px h-7 bg-[var(--border-primary)]" />
            <div className="flex flex-col items-center min-w-[160px] max-w-[280px]">
              <div className="hud-label">LOCATION</div>
              <div className="text-[9px] text-[var(--text-secondary)] font-mono truncate max-w-[280px]">{locationLabel || 'Hover over map...'}</div>
            </div>
            <div className="w-px h-7 bg-[var(--border-primary)]" />
            <div className="flex flex-col items-center">
              <div className="hud-label">ZOOM</div>
              <div className="text-[10px] font-mono font-bold text-[var(--gold-primary)]">{mapView.zoom.toFixed(1)}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Scale Bar (desktop) ── */}
      <div className="desktop-only absolute bottom-[4.5rem] left-[20rem] z-[201] pointer-events-none">
        <ScaleBar zoom={mapView.zoom} latitude={mapView.latitude} />
      </div>

      {/* ── Region Dossier ── */}
      {(regionDossier || dossierLoading) && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-16 md:top-20 left-2 right-2 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[300] md:w-[480px] max-h-[65vh] overflow-y-auto styled-scrollbar">
          <div className="glass-panel p-5 osiris-glow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-mono font-bold text-[var(--gold-primary)] tracking-wider">REGION DOSSIER</h2>
              <button onClick={() => { setRegionDossier(null); setDossierLoading(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">✕</button>
            </div>
            {dossierLoading ? (
              <div className="text-center py-8">
                <div className="w-5 h-5 border-2 border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest">COMPILING INTEL...</span>
              </div>
            ) : regionDossier && (
              <div className="space-y-3">
                <div><div className="hud-label mb-0.5">LOCATION</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.location?.display_name}</div></div>
                {regionDossier.country && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><div className="hud-label mb-0.5">COUNTRY</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.flag} {regionDossier.country.name}</div></div>
                    <div><div className="hud-label mb-0.5">CAPITAL</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.capital}</div></div>
                    <div><div className="hud-label mb-0.5">POPULATION</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.population?.toLocaleString()}</div></div>
                    <div><div className="hud-label mb-0.5">REGION</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.subregion || regionDossier.country.region}</div></div>
                    <div><div className="hud-label mb-0.5">LANGUAGES</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.languages?.join(', ')}</div></div>
                    <div><div className="hud-label mb-0.5">AREA</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.area?.toLocaleString()} km²</div></div>
                  </div>
                )}
                {regionDossier.head_of_state && (<div><div className="hud-label mb-0.5">HEAD OF STATE</div><div className="text-xs text-[var(--gold-primary)]">{regionDossier.head_of_state.name}</div><div className="text-[8px] text-[var(--text-muted)]">{regionDossier.head_of_state.position}</div></div>)}
                {regionDossier.wikipedia && (<div><div className="hud-label mb-1">INTELLIGENCE BRIEF</div><div className="flex gap-3">{regionDossier.wikipedia.thumbnail && <img src={regionDossier.wikipedia.thumbnail} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />}<p className="text-[8px] text-[var(--text-secondary)] leading-relaxed">{regionDossier.wikipedia.extract}</p></div></div>)}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Camera Viewer ── */}
      <CameraViewer
        camera={activeCamera}
        onClose={() => setActiveCamera(null)}
        onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })}
      />

      {/* ── OVERLAYS ── */}
      <div className="vignette absolute inset-0 pointer-events-none z-[2]" />
      <div className="crt-scanlines absolute inset-0 pointer-events-none z-[3] opacity-[0.02]" />
      {/* Corner frames */}
      {['top-0 left-0','top-0 right-0','bottom-0 left-0','bottom-0 right-0'].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-16 h-16 pointer-events-none z-[1]`}>
          <div className={`absolute ${pos.includes('top') ? 'top-0' : 'bottom-0'} ${pos.includes('left') ? 'left-0' : 'right-0'} w-full h-[1px] bg-gradient-to-${pos.includes('left') ? 'r' : 'l'} from-[var(--gold-primary)]/30 to-transparent`} />
          <div className={`absolute ${pos.includes('top') ? 'top-0' : 'bottom-0'} ${pos.includes('left') ? 'left-0' : 'right-0'} w-[1px] h-full bg-gradient-to-${pos.includes('top') ? 'b' : 't'} from-[var(--gold-primary)]/30 to-transparent`} />
        </div>
      ))}

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcuts />

      {/* Shortcut hint */}
      <div className="desktop-only absolute bottom-2 right-5 z-[200] pointer-events-none text-[6px] font-mono text-[var(--text-muted)]/40 tracking-widest">
        [?] SHORTCUTS · [F] FULLSCREEN · [S] SHARE · [R] RESET VIEW
      </div>

      {/* ── OSINT RECON PANEL ── */}
      <OsintPanel isOpen={showOsint} onClose={() => setShowOsint(false)} />
    </main>
  );
}
