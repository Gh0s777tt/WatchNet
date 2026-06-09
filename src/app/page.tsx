'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, BarChart3, Newspaper, Search, X, Globe, MapPinned, MapPin, Radar, Satellite, Sun, Moon, ExternalLink, AlertTriangle, Activity, Database, Wifi, Play, Crosshair } from 'lucide-react';
import IntelFeed from '@/components/IntelFeed';
import MarketsPanel from '@/components/MarketsPanel';
import ScmPanel from '@/components/ScmPanel';
import ScaleBar from '@/components/ScaleBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import SharePanel from '@/components/SharePanel';
import ViewPresets from '@/components/ViewPresets';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import GlobalStatusBar from '@/components/GlobalStatusBar';
import LiveAlerts from '@/components/LiveAlerts';
import BookmarksPanel from '@/components/BookmarksPanel';
import LayerPresets from '@/components/LayerPresets';
import GeoJSONOverlay from '@/components/GeoJSONOverlay';
import TimelineSlider from '@/components/TimelineSlider';
import AiAnalyst from '@/components/AiAnalyst';
import SearchBar from '@/components/SearchBar';
import SearchPanel from '@/components/SearchPanel';

const OsirisMap = dynamic(() => import('@/components/OsirisMap'));
const LayerPanel = dynamic(() => import('@/components/LayerPanel'));
const CameraViewer = dynamic(() => import('@/components/CameraViewer'));
const OsintPanel = dynamic(() => import('@/components/OsintPanel'));
const CorrelationPanel = dynamic(() => import('@/components/CorrelationPanel'));

// ── QuickSearch — Ricerca universale generica ──
function QuickSearch({ onLocate, data: searchData, onSearchResults }: { onLocate: (lat: number, lng: number) => void; data?: any; onSearchResults?: (results: any[], query: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [results, setResults] = useState<{ label: string; lat?: number; lng?: number; type: string; url?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'auto'|'places'|'mystery'|'ufo'|'antartide'>('auto');
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const searchAll = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const allResults: { label: string; lat: number; lng: number; type: string }[] = [];

      // Coordinate dirette
      const cm = q.trim().match(/^([+-]?\d+\.?\d*)[,\s]+([+-]?\d+\.?\d*)$/);
      if (cm) {
        const lat = parseFloat(cm[1]), lng = parseFloat(cm[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          allResults.push({ label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng, type: 'COORD' });
        }
      }

      // Place search via Nominatim
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`, {
        headers: { 'Accept-Language': 'it' },
      });
      const geoData = await res.json();
          for (const r of geoData) {
        allResults.push({ label: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon), type: 'LUOGO', source: 'nominatim' });
      }

      // Ricerca locale su mystery locations, UFO, underground, etc.
      for (const [endpoint, type] of [
        ['/api/mystery-locations', 'MISTERO'],
        ['/api/ufo-reports', 'UFO'],
        ['/api/underground-bases', 'SOTTERRANEO'],
        ['/api/underground-cities', 'CITTÀ SOTTERRANEA'],
        ['/api/mines', 'MINIERA'],
        ['/api/pyramids', 'PIRAMIDE'],
        ['/api/caves', 'GROTTA'],
        ['/api/lost-cities', 'CITTÀ PERDUTA'],
        ['/api/antarctica-anomalies', 'ANTARTIDE'],
      ] as const) {
        try {
          const r = await fetch(endpoint);
          const data = await r.json();
          const items = data[Object.keys(data)[0]] || [];
          for (const item of items) {
            if ((item.name||'').toLowerCase().includes(q.toLowerCase()) ||
                (item.description||'').toLowerCase().includes(q.toLowerCase()) ||
                (item.country||'').toLowerCase().includes(q.toLowerCase())) {
              allResults.push({ label: `${item.name} (${item.country||''})`, lat: item.lat, lng: item.lng, type, source: type === 'ANTARTIDE' ? 'antonimi' : type.toLowerCase() });
            }
          }
        } catch {}
      }

      // Ricerca Wikipedia + Wikidata (intera rete)
      try {
        const { searchInternet } = await import('@/lib/search-utils');
        const netResults = await searchInternet(q, 5);
        for (const r of netResults) {
          allResults.push({ ...r, source: r.type === 'PERSONA' ? 'wikidata' : 'wikipedia_en' });
        }
      } catch {}

      // Ricerca su tutti i dati OSINT già caricati in memoria
      if (searchData) {
        const ql = q.toLowerCase();
        for (const [key, value] of Object.entries(searchData)) {
          if (!Array.isArray(value)) continue;
          for (const item of value) {
            if (!item || typeof item !== 'object') continue;
            const name = String(item.name || item.title || item.label || item.callsign || item.id || '');
            const desc = String(item.description || item.summary || item.remarks || item.text || '');
            const country = String(item.country || item.nationality || item.region || '');
            const city = String(item.city || item.municipality || '');
            const combined = `${name} ${desc} ${country} ${city}`.toLowerCase();
            if (!combined.includes(ql)) continue;
            const lat = item.lat ?? item.latitude ?? item.coords?.[1];
            const lng = item.lng ?? item.longitude ?? item.coords?.[0];
            if (lat == null || lng == null) continue;
            const typeLabel = (item.type || key).toString().toUpperCase().replace(/_/g, ' ');
            const srcLabel = (item.category || key).toString().toLowerCase().replace(/\s+/g, '_');
            allResults.push({
              label: `${name}${country ? ` (${country})` : ''}`,
              lat: Number(lat), lng: Number(lng),
              type: typeLabel,
              source: srcLabel,
            });
          }
        }
      }

      // Ricerca web globale (Wikipedia + DuckDuckGo + OpenCorporates)
      try {
        const { searchWeb } = await import('@/lib/search-utils');
        const webResults = await searchWeb(q);
        for (const r of webResults) {
          const entry: any = { label: r.title, url: r.url, type: r.lat ? 'WIKIPEDIA' : 'WEB', description: r.snippet, thumbnail: r.thumbnail, source: r.source };
          if (r.lat != null && r.lng != null) {
            entry.lat = r.lat;
            entry.lng = r.lng;
          }
          allResults.push(entry);
        }
      } catch {}

      // Deduplica per coordinate vicine + URL
      const seen = new Set<string>();
      const unique = allResults.filter(r => {
        if (r.url && !r.lat) {
          if (seen.has(r.url)) return false;
          seen.add(r.url);
          return true;
        }
        const k = `${r.lat?.toFixed(2) || ''},${r.lng?.toFixed(2) || ''}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      const finalResults = unique.slice(0, 30);
      setResults(finalResults);
      onSearchResults?.(finalResults, q);
    } catch { setResults([]); }
    setLoading(false);
  }, [onSearchResults]);

  const handleSearch = (q: string) => {
    setValue(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchAll(q), 300);
  };

  const handleSelect = (r: { lat?: number; lng?: number; url?: string }) => {
    if (r.lat != null && r.lng != null) {
      onLocate(r.lat, r.lng);
    }
    if (r.url) {
      window.open(r.url, '_blank', 'noopener,noreferrer');
    }
    setOpen(false);
    setValue('');
    setResults([]);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="glass-panel px-3 py-2 text-[11px] font-mono tracking-[0.15em] text-[var(--text-muted)] hover:text-[var(--gold-primary)] hover:border-[var(--border-active)] transition-all flex items-center gap-2">
        <Search className="w-3 h-3" />
        <span>RICERCA VELOCE</span>
      </button>
    );
  }

  return (
    <div className="relative" style={{ minWidth: '320px' }}>
      <div className="flex items-center gap-2 glass-panel px-3 py-2.5 !border-[var(--border-active)]">
        <Search className="w-3.5 h-3.5 text-[var(--gold-primary)] flex-shrink-0" />
        <input ref={inputRef} value={value}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setValue(''); setResults([]); } }}
          placeholder="Cerca qualsiasi cosa: luoghi, UFO, piramidi, misteri..."
          className="flex-1 bg-transparent text-[12px] text-[var(--text-primary)] font-mono tracking-wider outline-none placeholder:text-[var(--text-muted)]" />
        {loading && <div className="w-3 h-3 border border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin" />}
        <button onClick={() => { setOpen(false); setValue(''); setResults([]); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <X className="w-3 h-3" />
        </button>
      </div>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 glass-panel overflow-hidden shadow-xl max-h-[300px] overflow-y-auto styled-scrollbar z-[999]">
          {results.map((r, i) => (
            <button key={i} onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2 hover:bg-[var(--hover-accent)] transition-colors border-b border-[var(--border-secondary)] last:border-0 flex items-start gap-2">
              {r.url && !r.lat ? (
                <Globe className="w-3 h-3 shrink-0 mt-0.5 text-[var(--gold-primary)]" />
              ) : (
                <MapPin className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 
                  r.type === 'COORD' ? '#00E5FF' :
                  r.type === 'LUOGO' ? '#FFD700' :
                  r.type === 'WIKIPEDIA' ? '#448AFF' :
                  r.type === 'PERSONA' ? '#39FF14' :
                  r.type === 'MISTERO' ? '#9400D3' :
                  r.type === 'UFO' ? '#AB47BC' :
                  r.type === 'PIRAMIDE' ? '#FFD700' :
                  r.type === 'MINIERA' ? '#FF6B00' :
                  r.type === 'GROTTA' ? '#4FC3F7' :
                  r.type === 'CITTÀ PERDUTA' ? '#FF9500' :
                  r.type === 'ANTARTIDE' ? '#00E5FF' :
                  r.type === 'FIRE' ? '#FF4500' :
                  r.type === 'EARTHQUAKE' ? '#FF9500' :
                  r.type === 'WEATHER EVENT' ? '#E040FB' :
                  r.type === 'VOLCANO' ? '#FF6B00' :
                  '#39FF14'
                }} />
              )}
              {(r as any).thumbnail && (
                <img src={(r as any).thumbnail} alt="" className="w-7 h-7 rounded object-cover shrink-0 mr-1.5 mt-0.5" loading="lazy" />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[11px] text-[var(--text-secondary)] font-mono truncate block">{r.label}</span>
                {(r as any).description && (
                  <span className="text-[9px] text-white/40 font-mono truncate block mt-0.5">{(r as any).description}</span>
                )}
                <span className="text-[8px] font-mono tracking-widest" style={{ color:
                  r.type === 'COORD' ? '#00E5FF' :
                  r.type === 'LUOGO' ? '#FFD700' :
                  r.type === 'WIKIPEDIA' ? '#448AFF' :
                  r.type === 'PERSONA' ? '#39FF14' :
                  r.type === 'MISTERO' ? '#9400D3' :
                  r.type === 'UFO' ? '#AB47BC' :
                  r.type === 'PIRAMIDE' ? '#FFD700' :
                  r.type === 'MINIERA' ? '#FF6B00' :
                  r.type === 'GROTTA' ? '#4FC3F7' :
                  r.type === 'CITTÀ PERDUTA' ? '#FF9500' :
                  r.type === 'ANTARTIDE' ? '#00E5FF' :
                  r.type === 'WEB' ? '#D4AF37' :
                  r.type === 'OPENCORPORATES' ? '#FF9800' :
                  '#39FF14'
                }}>{{
                  'wikipedia_en': 'WIKIPEDIA EN',
                  'wikipedia_it': 'WIKIPEDIA IT',
                  'wikidata': 'PERSONA',
                  'duckduckgo': 'WEB',
                  'opencorporates': 'AZIENDA',
                  'google': 'GOOGLE',
                }[(r as any).source] || r.type}</span>
              </div>
              {r.url && !r.lat && (
                <ExternalLink className="w-2.5 h-2.5 text-white/20 shrink-0 mt-1" />
              )}
            </button>
          ))}

          {/* OSINT links per ricerche persone — link diretti a fonti pubbliche */}
          {value.trim().split(/\s+/).length >= 2 && (
            <div className="px-3 py-2 border-t border-[var(--border-secondary)] bg-[var(--bg-secondary)]/50">
              <div className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest mb-1.5">CERCA SU OSINT</div>
              <div className="flex flex-wrap gap-1">
                {[
                  { href: `https://www.facebook.com/search/top/?q=${encodeURIComponent(value)}`, label: 'FB', color: '#1877F2' },
                  { href: `https://www.instagram.com/web/search/topsearch/?query=${encodeURIComponent(value)}`, label: 'IG', color: '#E4405F' },
                  { href: `https://twitter.com/search?q=${encodeURIComponent(value)}&f=user`, label: 'X', color: '#1DA1F2' },
                  { href: `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(value)}`, label: 'IN', color: '#0A66C2' },
                  { href: `https://www.tiktok.com/search?q=${encodeURIComponent(value)}`, label: 'TT', color: '#000000' },
                  { href: `https://www.youtube.com/results?search_query=${encodeURIComponent(value)}`, label: 'YT', color: '#FF0000' },
                  { href: `https://www.google.com/search?q=${encodeURIComponent(value)}`, label: 'G', color: '#4285F4' },
                  { href: `https://www.bing.com/search?q=${encodeURIComponent(value)}&cc=it`, label: 'BING', color: '#008373' },
                  { href: `https://www.paginebianche.it/ricerca?qs=${encodeURIComponent(value)}`, label: 'PB', color: '#D40000' },
                  { href: `https://www.paginegialle.it/ricerca?qs=${encodeURIComponent(value)}`, label: 'PG', color: '#FFCC00' },
                ].map(sm => (
                  <a key={sm.label} href={sm.href} target="_blank" rel="noopener noreferrer"
                    className="text-[9px] font-mono px-2 py-0.5 rounded border border-white/10 hover:border-white/30 transition-all"
                    style={{ color: sm.color }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {sm.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Mobile se stretto, OPPURE telefono in orizzontale (altezza ridotta + larghezza moderata)
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
const UptimeClock = () => {
  const [uptime, setUptime] = useState('00:00:00');
  const startTime = useRef(Date.now());
  useEffect(() => {
    const iv = setInterval(() => {
      const e = Math.floor((Date.now() - startTime.current) / 1000);
      setUptime(`${String(Math.floor(e/3600)).padStart(2,'0')}:${String(Math.floor((e%3600)/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className="hidden lg:inline">ATTIVO DA: <span className="text-[var(--gold-primary)]">{uptime}</span></span>;
};

const ZuluClock = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      setTime(`ZULU ${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')}Z`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className="text-[var(--cyan-primary)] font-bold tabular-nums">{time || 'ZULU --:--:--Z'}</span>;
};

/** Conteggio entità reale — nessuna metrica falsa */
const ActiveEntityCount = ({ data }: { data: Record<string, unknown[]> }) => {
  const count = useMemo(() => {
    if (!data) return 0;
    return Object.values(data).reduce((sum, v) => sum + (Array.isArray(v) ? v.length : 0), 0);
  }, [data]);
  return <span className="text-[var(--alert-green)] font-bold tabular-nums">{count.toLocaleString()}</span>;
};

/** Estrae un URL YouTube guardabile da URL embed/canale */
function getYouTubeWatchUrl(url: string): string {
  if (url.includes('channel=')) return `https://www.youtube.com/channel/${url.split('channel=')[1].split('&')[0]}/live`;
  if (url.includes('/embed/')) return `https://www.youtube.com/watch?v=${url.split('/embed/')[1].split('?')[0]}`;
  return url;
}

export default function Dashboard() {
  const dataRef = useRef<any>({});
  const [dataVersion, setDataVersion] = useState(0);
  const data = dataRef.current;

  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [mapView, setMapView] = useState({ zoom: 2.5, latitude: 20 });
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const mouseCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const coordsDisplayRef = useRef<HTMLDivElement>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [regionDossier, setRegionDossier] = useState<any>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [activeCamera, setActiveCamera] = useState<any>(null);
  const [spaceWeather, setSpaceWeather] = useState<any>(null);
  const [showLayers, setShowLayers] = useState(true);
  const [showMarkets, setShowMarkets] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showCorrelation, setShowCorrelation] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showScmPanel, setShowScmPanel] = useState(true);
  const [showIntel, setShowIntel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'layers'|'markets'|'intel'|'search'|'recon'|null>(null);
  const [mapProjection, setMapProjection] = useState<'globe'|'mercator'>('globe');
  const [mapStyle, setMapStyle] = useState<'dark'|'satellite'>('dark');
  const [lightTheme, setLightTheme] = useState(false);
  const [sweepData, setSweepData] = useState<any>(null);
  const [scanTargets, setScanTargets] = useState<any[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [geoJSONData, setGeoJSONData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<{ start: number; end: number } | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  const isMobile = useIsMobile();
  const startTime = useRef(Date.now());
  const geocodeCache = useRef<Map<string, string>>(new Map());
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedPos = useRef<{ lat: number; lng: number } | null>(null);

  // ── DEFAULT: Maggior parte layer OFF — caricamento iniziale veloce ──
  const [activeLayers, setActiveLayers] = useState({
    flights: false,
    private: false,
    jets: false,
    military: false,
    maritime: true,
    satellites: false,
    balloons: false,
    cctv: true,
    live_news: false,
    news_intel: false,
    earthquakes: true,
    fires: false,
    weather: false,
    radiation: false,
    infrastructure: false,
    global_incidents: true,
    war_alerts: false,
    gps_jamming: false,
    day_night: true,
    cables: true,
    sdk_sea: true,
    sdk_air: true,
    sdk_naval: true,
    sdk_ransomware: false,
    tor_nodes: false,
    volcanoes: false,
    datacenters: false,
    ixps: false,
    weather_alerts: false,
    natural_disasters: false,
    military_bases: false,
    embassies: false,
    wikipedia_geo: false,
    underground_bases: false,
    underground_cities: false,
    crop_circles: false,
    mystery_locations: false,
    airports: false,
    maritime_routes: false,
    shipwrecks: false,
    meteorites: false,
    fault_lines: false,
    power_plants: false,
    radio_towers: false,
    nuclear_facilities: false,
    ufo_reports: false,
    mines: false,
    pyramids: false,
    caves: false,
    lost_cities: false,
    antarctica_anomalies: false,
    italy_cameras: false,
    bluetooth_devices: false,
    network_devices: false,
  });
  const [liveFeedUrl, setLiveFeedUrl] = useState<string | null>(null);
  const [liveFeedName, setLiveFeedName] = useState('');
  const [liveFeedEmbedAllowed, setLiveFeedEmbedAllowed] = useState(true);

  // Schermata splash
  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(splashTimer);
  }, []);

  // Cambio tema
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', lightTheme ? 'light' : 'dark');
  }, [lightTheme]);

  // Stato URL: analisi al montaggio
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

  // Stato URL: aggiornamento URL al cambio vista (debounced)
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const p = new URLSearchParams();
      p.set('lat', (mapView.latitude ?? 20).toFixed(4));
      p.set('lon', '0');
      p.set('zoom', mapView.zoom.toFixed(2));
      const active = Object.entries(activeLayers).filter(([,v]) => v).map(([k]) => k).join(',');
      p.set('layers', active);
      const url = `${window.location.pathname}?${p.toString()}`;
      window.history.replaceState(null, '', url);
    }, 1500);
  }, [mapView, activeLayers]);

  // Recupero statistiche globali
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(d => {
        if (d.stats) setGlobalStats(d.stats);
      })
      .catch(console.error);
  }, []);

  // Scorciatoie da tastiera
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if (e.key === 'f' && !e.ctrlKey) {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
      if (e.key === 'l') setShowLayers(p => !p);
      if (e.key === 'm') setShowMarkets(p => !p);
      if (e.key === 'c') setShowScmPanel(p => !p);
      if (e.key === 'i') setShowIntel(p => !p);
      if (e.key === 'r') setFlyToLocation({ lat: 20, lng: 0, ts: Date.now() });
      if (e.key === 'g') setMapProjection(p => p === 'globe' ? 'mercator' : 'globe');
    };
    const fsHandler = () => setIsFullscreen(!!document.fullscreenElement);
    window.addEventListener('keydown', handler);
    document.addEventListener('fullscreenchange', fsHandler);
    return () => { window.removeEventListener('keydown', handler); document.removeEventListener('fullscreenchange', fsHandler); };
  }, []);

  // Coordinate mouse + geocodifica inversa (Zero-Render)
  const handleMouseCoords = useCallback((coords: { lat: number; lng: number }) => {
    mouseCoordsRef.current = coords;
    if (coordsDisplayRef.current) {
      coordsDisplayRef.current.innerText = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
    }
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      if (lastGeocodedPos.current) {
        const d = Math.abs(coords.lat - lastGeocodedPos.current.lat) + Math.abs(coords.lng - lastGeocodedPos.current.lng);
        if (d < 0.5) return; // soglia aumentata — meno chiamate geocode
      }
      const gk = `${coords.lat.toFixed(1)},${coords.lng.toFixed(1)}`; // griglia più grossolana = più cache hit
      if (geocodeCache.current.has(gk)) { setLocationLabel(geocodeCache.current.get(gk)!); lastGeocodedPos.current = coords; return; }
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&zoom=10&addressdetails=1`, { headers: { 'Accept-Language': 'it' } });
        if (res.ok) {
          const d = await res.json();
          const a = d.address || {};
          const label = [a.city||a.town||a.village||a.county, a.state||a.region, a.country].filter(Boolean).join(', ') || 'Sconosciuto';
          if (geocodeCache.current.size > 500) { const it = geocodeCache.current.keys(); for (let i=0;i<100;i++) { const k = it.next().value; if(k) geocodeCache.current.delete(k); }}
          geocodeCache.current.set(gk, label);
          setLocationLabel(label);
          lastGeocodedPos.current = coords;
        }
      } catch (e) { console.warn('[OSIRIS] Suppressed error:', e instanceof Error ? e.message : e); }
    }, 3000); // 3s debounce (era 1.5s)
  }, []);

  // Dossier regione (tasto destro)
  const handleRightClick = useCallback(async (coords: { lat: number; lng: number }) => {
    setDossierLoading(true); setRegionDossier(null);
    try {
      const res = await fetch(`/api/region-dossier?lat=${coords.lat}&lng=${coords.lng}`);
      if (res.ok) setRegionDossier(await res.json());
    } catch (e) { console.warn('[OSIRIS] Suppressed error:', e instanceof Error ? e.message : e); } finally { setDossierLoading(false); }
  }, []);

  // Gestore click entità (spostato da JSX per conformarsi alle Rules of Hooks — Fix #113)
  const handleEntityClick = useCallback((entity: any) => {
    if (entity?.type === 'cctv') setActiveCamera(entity);
    if (entity?.type === 'live_news' && entity.url) {
      setLiveFeedUrl(entity.url);
      setLiveFeedName(entity.name);
      setLiveFeedEmbedAllowed(entity.embed_allowed !== false);
    }
  }, []);

  // ── UTILITY FETCH CONDIVISA (Fix #107 — definizione singola, non 3 copie) ──
  const fetchEndpoint = useCallback(async (url: string, transform?: (d: any) => any, options?: RequestInit) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      // Forza il browser a bypassare la cache disco locale per dati in tempo reale
      const res = await fetch(url, { ...options, cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const d = transform ? transform(json) : json;
        dataRef.current = { ...dataRef.current, ...d };
        setDataVersion(v => v + 1);
        setBackendStatus('connected');
      }
    } catch (e) {
      console.warn('[OSIRIS] Suppressed error:', e instanceof Error ? e.message : e);
      setBackendStatus('error');
    }
  }, []);

  // ── CARICAMENTO DATI PROGRESSIVO (richieste ottimizzate) ──
  useEffect(() => {
    // Priorità 1: Flussi core (sempre necessari per i pannelli)
    fetchEndpoint('/api/earthquakes');
    fetchEndpoint('/api/news');
    const marketTimer = setTimeout(() => fetchEndpoint('/api/markets', d => ({ markets: d })), 800);

    // Priorità 2: Meteo spaziale (necessario per MarketsPanel)
    const spaceTimer = setTimeout(async () => {
      try {
        const r = await fetch('/api/space-weather');
        if (r.ok) setSpaceWeather(await r.json());
      } catch (e) { console.warn('[OSIRIS] Suppressed error:', e instanceof Error ? e.message : e); }
    }, 5000);

    // Polling — Intervalli OTTIMIZZATI per minimizzare richieste edge
    const intervals = [
      setInterval(() => fetchEndpoint('/api/earthquakes'), 900000),  // 15 min (era 5)
      setInterval(() => fetchEndpoint('/api/news'), 1800000),        // 30 min (era 10)
      setInterval(() => fetchEndpoint('/api/markets', d => ({ markets: d })), 900000), // 15 min (era 5)
    ];
    return () => {
      clearTimeout(marketTimer);
      clearTimeout(spaceTimer);
      intervals.forEach(clearInterval);
    };
  }, [fetchEndpoint]);

  // ── CARICAMENTO DATI PER LAYER — fetch solo quando layer è attivo ──
  const layerFetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {

    // Voli
    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      if (!layerFetchedRef.current.has('flights')) {
        fetchEndpoint('/api/flights');
        layerFetchedRef.current.add('flights');
      }
    }
    // Satelliti
    if (activeLayers.satellites && !layerFetchedRef.current.has('satellites')) {
      fetchEndpoint('/api/satellites');
      layerFetchedRef.current.add('satellites');
    }
    // Incendi
    if (activeLayers.fires && !layerFetchedRef.current.has('fires')) {
      fetchEndpoint('/api/fires');
      layerFetchedRef.current.add('fires');
    }
    // CCTV
    if (activeLayers.cctv && !layerFetchedRef.current.has('cctv')) {
      fetchEndpoint('/api/cctv?region=all&v=2');
      layerFetchedRef.current.add('cctv');
    }
    // Marittimo
    if (activeLayers.maritime && !layerFetchedRef.current.has('maritime')) {
      fetchEndpoint('/api/maritime', d => ({ maritime_ports: d.ports, maritime_chokepoints: d.chokepoints, maritime_ships: d.ships }));
      layerFetchedRef.current.add('maritime');
    }
    // Palloni
    if (activeLayers.balloons && !layerFetchedRef.current.has('balloons')) {
      fetchEndpoint('/api/balloons', d => ({ balloons: d.balloons }));
      layerFetchedRef.current.add('balloons');
    }
    // Radiazioni
    if (activeLayers.radiation && !layerFetchedRef.current.has('radiation')) {
      fetchEndpoint('/api/radiation', d => ({ radiation: d.stations }));
      layerFetchedRef.current.add('radiation');
    }
    // Notizie Live
    if (activeLayers.live_news && !layerFetchedRef.current.has('live_news')) {
      fetchEndpoint('/api/live-news', d => ({ live_feeds: d.feeds }));
      layerFetchedRef.current.add('live_news');
    }
    // Meteo
    if (activeLayers.weather && !layerFetchedRef.current.has('weather')) {
      fetchEndpoint('/api/weather', d => ({ weather_events: d.events }));
      layerFetchedRef.current.add('weather');
    }
    // Infrastrutture
    if (activeLayers.infrastructure && !layerFetchedRef.current.has('infrastructure')) {
      fetchEndpoint('/api/infrastructure', d => ({ infrastructure: d.infrastructure }));
      layerFetchedRef.current.add('infrastructure');
    }
    // Incidenti Globali (GDELT)
    if (activeLayers.global_incidents && !layerFetchedRef.current.has('gdelt')) {
      fetchEndpoint('/api/gdelt', d => ({ gdelt: d.events }));
      layerFetchedRef.current.add('gdelt');
    }

    // Cavi sottomarini
    if (activeLayers.cables && !layerFetchedRef.current.has('cables')) {
      (async () => {
        try {
          const ts = Date.now();
      const res = await fetch(`/data/submarine-cables.json?v=${ts}`);
          if (res.ok) {
             const cablesData = await res.json();
             dataRef.current = { ...dataRef.current, submarine_cables: cablesData.features };
             setDataVersion(v => v + 1);
          }
        } catch (e) { console.warn('Cables fetch failed'); }
      })();
      layerFetchedRef.current.add('cables');
    }

    // Ransomware
    if (activeLayers.sdk_ransomware && !layerFetchedRef.current.has('ransomware')) {
      fetchEndpoint('/api/ransomware', d => ({ ransomware_alerts: d.alerts }));
      layerFetchedRef.current.add('ransomware');
    }

    // Nodi di Uscita Tor
    if (activeLayers.tor_nodes && !layerFetchedRef.current.has('tor_nodes')) {
      fetchEndpoint('/api/tor-nodes', d => ({ tor_exit_nodes: d.tor_exit_nodes }));
      layerFetchedRef.current.add('tor_nodes');
    }

    // Vulcani
    if (activeLayers.volcanoes && !layerFetchedRef.current.has('volcanoes')) {
      fetchEndpoint('/api/volcanoes', d => ({ volcanoes: d.volcanoes }));
      layerFetchedRef.current.add('volcanoes');
    }

    // Data Center
    if (activeLayers.datacenters && !layerFetchedRef.current.has('datacenters')) {
      fetchEndpoint('/api/datacenters', d => ({ datacenters: d.datacenters }));
      layerFetchedRef.current.add('datacenters');
    }

    // Punti di Scambio Internet
    if (activeLayers.ixps && !layerFetchedRef.current.has('ixps')) {
      fetchEndpoint('/api/ixp', d => ({ ixps: d.ixps }));
      layerFetchedRef.current.add('ixps');
    }

    // Allerte Meteo
    if (activeLayers.weather_alerts && !layerFetchedRef.current.has('weather_alerts')) {
      fetchEndpoint('/api/weather-alerts', d => ({ alerts: d.alerts }));
      layerFetchedRef.current.add('weather_alerts');
    }
    // Disastri Naturali
    if (activeLayers.natural_disasters && !layerFetchedRef.current.has('natural_disasters')) {
      fetchEndpoint('/api/natural-disasters', d => ({ disasters: d.disasters }));
      layerFetchedRef.current.add('natural_disasters');
    }

    // Basi Militari
    if (activeLayers.military_bases && !layerFetchedRef.current.has('military_bases')) {
      fetchEndpoint('/api/military-bases', d => ({ military_bases: d.military_bases }));
      layerFetchedRef.current.add('military_bases');
    }

    // Ambasciate
    if (activeLayers.embassies && !layerFetchedRef.current.has('embassies')) {
      fetchEndpoint('/api/embassies', d => ({ embassies: d.embassies }));
      layerFetchedRef.current.add('embassies');
    }

    // Wikipedia Geo
    if (activeLayers.wikipedia_geo && !layerFetchedRef.current.has('wikipedia')) {
      const { latitude, zoom } = mapView;
      const rad = Math.max(5000, Math.min(50000, 20000 / (zoom || 1)));
      fetchEndpoint(`/api/wikipedia-geo?lat=${latitude}&lon=0&radius=${rad}`, d => ({ wikipedia_articles: d.articles }));
      layerFetchedRef.current.add('wikipedia');
    }

    // Basi Sotterranee
    if (activeLayers.underground_bases && !layerFetchedRef.current.has('underground_bases')) {
      fetchEndpoint('/api/underground-bases');
      layerFetchedRef.current.add('underground_bases');
    }

    // Città Sotterranee
    if (activeLayers.underground_cities && !layerFetchedRef.current.has('underground_cities')) {
      fetchEndpoint('/api/underground-cities');
      layerFetchedRef.current.add('underground_cities');
    }

    // Cerchi nel Grano
    if (activeLayers.crop_circles && !layerFetchedRef.current.has('crop_circles')) {
      fetchEndpoint('/api/crop-circles');
      layerFetchedRef.current.add('crop_circles');
    }

    // Luoghi Misteriosi
    if (activeLayers.mystery_locations && !layerFetchedRef.current.has('mystery_locations')) {
      fetchEndpoint('/api/mystery-locations');
      layerFetchedRef.current.add('mystery_locations');
    }

    // Aeroporti
    if (activeLayers.airports && !layerFetchedRef.current.has('airports')) {
      fetchEndpoint('/api/airports');
      layerFetchedRef.current.add('airports');
    }

    // Rotte Marittime
    if (activeLayers.maritime_routes && !layerFetchedRef.current.has('maritime_routes')) {
      fetchEndpoint('/api/maritime-routes');
      layerFetchedRef.current.add('maritime_routes');
    }

    // Relitti
    if (activeLayers.shipwrecks && !layerFetchedRef.current.has('shipwrecks')) {
      fetchEndpoint('/api/shipwrecks');
      layerFetchedRef.current.add('shipwrecks');
    }

    // Meteoriti
    if (activeLayers.meteorites && !layerFetchedRef.current.has('meteorites')) {
      fetchEndpoint('/api/meteorites');
      layerFetchedRef.current.add('meteorites');
    }

    // Faglie
    if (activeLayers.fault_lines && !layerFetchedRef.current.has('fault_lines')) {
      fetchEndpoint('/api/fault-lines');
      layerFetchedRef.current.add('fault_lines');
    }

    // Centrali Elettriche
    if (activeLayers.power_plants && !layerFetchedRef.current.has('power_plants')) {
      fetchEndpoint('/api/power-plants');
      layerFetchedRef.current.add('power_plants');
    }

    // Torri Radio
    if (activeLayers.radio_towers && !layerFetchedRef.current.has('radio_towers')) {
      fetchEndpoint('/api/radio-towers');
      layerFetchedRef.current.add('radio_towers');
    }

    // Impianti Nucleari
    if (activeLayers.nuclear_facilities && !layerFetchedRef.current.has('nuclear_facilities')) {
      fetchEndpoint('/api/nuclear-facilities');
      layerFetchedRef.current.add('nuclear_facilities');
    }

    // Avvistamenti UFO
    if (activeLayers.ufo_reports && !layerFetchedRef.current.has('ufo_reports')) {
      fetchEndpoint('/api/ufo-reports');
      layerFetchedRef.current.add('ufo_reports');
    }

    // Miniere
    if (activeLayers.mines && !layerFetchedRef.current.has('mines')) {
      fetchEndpoint('/api/mines', d => ({ mines: d.mines || [] }));
      layerFetchedRef.current.add('mines');
    }

    // Piramidi
    if (activeLayers.pyramids && !layerFetchedRef.current.has('pyramids')) {
      fetchEndpoint('/api/pyramids', d => ({ pyramids: d.pyramids || [] }));
      layerFetchedRef.current.add('pyramids');
    }

    // Grotte
    if (activeLayers.caves && !layerFetchedRef.current.has('caves')) {
      fetchEndpoint('/api/caves', d => ({ caves: d.caves || [] }));
      layerFetchedRef.current.add('caves');
    }

    // Città Perdute
    if (activeLayers.lost_cities && !layerFetchedRef.current.has('lost_cities')) {
      fetchEndpoint('/api/lost-cities', d => ({ lost_cities: d.lost_cities || [] }));
      layerFetchedRef.current.add('lost_cities');
    }

    // Anomalie Antartide
    if (activeLayers.antarctica_anomalies && !layerFetchedRef.current.has('antarctica_anomalies')) {
      fetchEndpoint('/api/antarctica-anomalies', d => ({ antarctica_anomalies: d.anomalies || [] }));
      layerFetchedRef.current.add('antarctica_anomalies');
    }

    // Telecamere Italia
    if (activeLayers.italy_cameras && !layerFetchedRef.current.has('italy_cameras')) {
      fetchEndpoint('/api/cameras/italy', d => ({ italy_cameras: d.features || [] }));
      layerFetchedRef.current.add('italy_cameras');
    }

    // Dispositivi Bluetooth
    if (activeLayers.bluetooth_devices && !layerFetchedRef.current.has('bluetooth_devices')) {
      fetchEndpoint('/api/osint/bluetooth', d => ({ bluetooth_devices: d.devices || [] }));
      layerFetchedRef.current.add('bluetooth_devices');
    }

    // Dispositivi Rete
    if (activeLayers.network_devices && !layerFetchedRef.current.has('network_devices')) {
      const ip = '192.168.1.1';
      fetchEndpoint(`/api/osint/network-scan?ip=${ip}&range=24`, d => ({ network_devices: d.devices || [] }));
      layerFetchedRef.current.add('network_devices');
    }

  }, [activeLayers]);

  // ── POLLING PER LAYER — polling solo per layer attivi ──
  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = [];
    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      intervals.push(setInterval(() => fetchEndpoint('/api/flights'), 300000)); // 5 min (era 2 min)
    }

    if (activeLayers.balloons) {
      intervals.push(setInterval(() => fetchEndpoint('/api/balloons', d => ({ balloons: d.balloons })), 300000)); // 5m
    }
    if (activeLayers.radiation) {
      intervals.push(setInterval(() => fetchEndpoint('/api/radiation', d => ({ radiation: d.stations })), 300000)); // 5m
    }
    if (activeLayers.maritime) {
      intervals.push(setInterval(() => fetchEndpoint('/api/maritime', d => ({ maritime_ports: d.ports, maritime_chokepoints: d.chokepoints, maritime_ships: d.ships })), 10000)); // 10s
    }
    if (activeLayers.sdk_ransomware) {
      intervals.push(setInterval(() => fetchEndpoint('/api/ransomware', d => ({ ransomware_alerts: d.alerts })), 300000)); // 5m
    }
    if (activeLayers.tor_nodes) {
      intervals.push(setInterval(() => fetchEndpoint('/api/tor-nodes', d => ({ tor_exit_nodes: d.tor_exit_nodes })), 300000)); // 5m
    }
    if (activeLayers.weather_alerts) {
      intervals.push(setInterval(() => fetchEndpoint('/api/weather-alerts', d => ({ alerts: d.alerts })), 300000)); // 5m
    }
    if (activeLayers.natural_disasters) {
      intervals.push(setInterval(() => fetchEndpoint('/api/natural-disasters', d => ({ disasters: d.disasters })), 300000)); // 5m
    }
    return () => intervals.forEach(clearInterval);
  }, [activeLayers, fetchEndpoint]);

  // CCTV: caricato una volta all'attivazione del layer tramite layerFetchedRef (nessun polling viewport)

  // Fetch reattivo layer: gestito da layerFetchedRef sopra (nessun duplicato)

  // ── OSIRIS SDK — Layer di Fusione Intelligence ──
  // Produce coordinate nodi per la visualizzazione mesh della rete SDK.
  // NON duplica le visuali dei layer esistenti — il layer SDK è SOLO LINEE.
  // Le telecamere sono escluse — hanno il loro layer dedicato.
  useEffect(() => {
    const anyActive = activeLayers.sdk_sea || activeLayers.sdk_air || activeLayers.sdk_naval;
    if (!anyActive) {
      dataRef.current = { ...dataRef.current, sdk_entities: [] };
      return;
    }

    const sdkEntities: any[] = [];

    // Dominio Aereo (solo nodi — nessuna duplicazione visiva)
    const allFlights = [
      ...(data.commercial_flights || []),
      ...(data.private_flights || []),
      ...(data.private_jets || []),
      ...(data.military_flights || []),
    ];
    // Campiona voli per mantenere pulito (ogni N-esimo)
    const flightStep = Math.max(1, Math.floor(allFlights.length / 60));
    for (let i = 0; i < allFlights.length; i += flightStep) {
      const f = allFlights[i];
      if (!f.lat || !f.lng) continue;
      sdkEntities.push({
        type: 'Feature', geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
        properties: { domain: 'AIR', name: f.callsign?.trim() || 'TRACK', source: 'ADS-B / OpenSky' },
      });
    }

    // Dominio Marittimo
    const ships = data.maritime_ships || [];
    const shipStep = Math.max(1, Math.floor(ships.length / 60));
    for (let i = 0; i < ships.length; i += shipStep) {
      const s = ships[i];
      if (!s.lat || !s.lng) continue;
      sdkEntities.push({
        type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: { domain: 'SEA', name: s.name || `MMSI-${s.mmsi}`, source: 'AIS Stream' },
      });
    }

    // Eventi — Terremoti
    if (data.earthquakes?.length) {
      for (const eq of data.earthquakes) {
        if (!eq.lat || !eq.lng) continue;
        sdkEntities.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: [eq.lng, eq.lat] },
          properties: { domain: 'LAND', name: `M${eq.magnitude} ${eq.place || ''}`, source: 'USGS' },
        });
      }
    }

    // Eventi GDELT
    if (data.gdelt?.length) {
      for (const g of data.gdelt) {
        if (!g.lat || !g.lng) continue;
        sdkEntities.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: [g.lng, g.lat] },
          properties: { domain: 'INTEL', name: g.name || 'GDELT Event', source: 'GDELT Project' },
        });
      }
    }

    // Intel notizie
    if (data.news?.length) {
      for (const n of data.news) {
        if (!n.coords || n.coords.length < 2) continue;
        sdkEntities.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: [n.coords[1], n.coords[0]] },
          properties: { domain: 'INTEL', name: n.title || 'SIGINT', source: n.source || 'RSS Feed' },
        });
      }
    }

    dataRef.current = { ...dataRef.current, sdk_entities: sdkEntities };
  }, [dataVersion, activeLayers.sdk_sea, activeLayers.sdk_air, activeLayers.sdk_naval]);

  // ── NOTIFICHE DESKTOP per eventi critici ──
  const notifiedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission === 'denied') return;
    if (Notification.permission === 'default') Notification.requestPermission();
    if (Notification.permission !== 'granted') return;

    // Grandi terremoti (M≥6.0)
    const bigEqs = (data.earthquakes || []).filter((eq: any) => eq.magnitude >= 6.0);
    for (const eq of bigEqs) {
      const key = `eq-${eq.id}`;
      if (!notifiedRef.current.has(key)) {
        notifiedRef.current.add(key);
        new Notification(`⚠ M${eq.magnitude} TERREMOTO`, {
          body: eq.place || `${eq.lat?.toFixed(2)}, ${eq.lng?.toFixed(2)}`,
          silent: true,
        });
      }
    }

    // Grandi incendi (alta luminosità)
    const bigFires = (data.fires || []).filter((f: any) => f.brightness > 400);
    if (bigFires.length > 5) {
      const key = `fire-burst-${Date.now()}`;
      if (!notifiedRef.current.has('fire-burst')) {
        notifiedRef.current.add('fire-burst');
        new Notification(`🔥 ${bigFires.length} INCENDI ATTIVI`, {
          body: 'Grande cluster di incendi rilevato',
          silent: true,
        });
        setTimeout(() => notifiedRef.current.delete('fire-burst'), 3600000);
      }
    }

    // Allerte ransomware critiche
    const criticalRansom = (data.ransomware_alerts || []).filter((r: any) => r.severity === 'critical');
    for (const r of criticalRansom) {
      const key = `ransom-${r.group}-${r.country}`;
      if (!notifiedRef.current.has(key)) {
        notifiedRef.current.add(key);
        new Notification(`💀 ${r.group} RANSOMWARE`, {
          body: `${r.sector} settore · ${r.country} · $${(r.ransom_usd / 1e6).toFixed(1)}M richiesti`,
          silent: true,
        });
      }
    }

    // Pulisci vecchie chiavi notifica
    if (notifiedRef.current.size > 200) {
      const keys = Array.from(notifiedRef.current);
      notifiedRef.current = new Set(keys.slice(-100));
    }
  }, [dataVersion]);

  const totalFlights = useMemo(() => (
    (data.commercial_flights?.length||0)+(data.private_flights?.length||0)+(data.private_jets?.length||0)+(data.military_flights?.length||0)
  ), [data.commercial_flights, data.private_flights, data.private_jets, data.military_flights]);




  return (
    <main className="fixed inset-0 w-full h-full bg-[var(--bg-void)] overflow-hidden">

      {/* ── SPLASH ── */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at center, #0a0a14 0%, var(--bg-void) 70%)' }}
          >
            {/* ── Overlay CRT scanline ── */}
            <div className="absolute inset-0 pointer-events-none z-[1]" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,175,55,0.015) 2px, rgba(212,175,55,0.015) 4px)',
              animation: 'splashScanDrift 8s linear infinite',
            }} />

            {/* ── Badge V4.2 — in alto a sinistra ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute top-6 left-6 z-[2] font-mono text-[12px] tracking-[0.3em] text-[var(--gold-primary)]"
            >
              V4.2
            </motion.div>



            {/* ── Logo geometrico tattico ── */}
            <div className="relative w-40 h-40 mb-8 flex items-center justify-center z-[2]">
              {/* Anello esterno — lento orario */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                transition={{ opacity: { duration: 0.6 }, scale: { duration: 0.8, ease: 'easeOut' }, rotate: { duration: 20, repeat: Infinity, ease: 'linear' } }}
                className="absolute inset-0 rounded-full"
                style={{ border: '1px solid rgba(212,175,55,0.2)' }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ background: 'var(--gold-primary)', boxShadow: '0 0 12px var(--gold-primary), 0 0 24px rgba(212,175,55,0.3)' }} />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1 rounded-full" style={{ background: 'rgba(212,175,55,0.5)', boxShadow: '0 0 6px rgba(212,175,55,0.3)' }} />
              </motion.div>

              {/* Anello medio — più veloce antiorario */}
              <motion.div
                initial={{ opacity: 0, scale: 0.4, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: -360 }}
                transition={{ opacity: { duration: 0.6, delay: 0.15 }, scale: { duration: 0.8, delay: 0.15, ease: 'easeOut' }, rotate: { duration: 12, repeat: Infinity, ease: 'linear' } }}
                className="absolute rounded-full"
                style={{ inset: '18px', border: '1px solid rgba(0,229,255,0.15)' }}
              >
                <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cyan-primary)', boxShadow: '0 0 10px var(--cyan-primary), 0 0 20px rgba(0,229,255,0.2)' }} />
                <div className="absolute bottom-0 left-1/4 translate-y-1/2 w-1 h-1 rounded-full" style={{ background: 'rgba(0,229,255,0.4)' }} />
              </motion.div>

              {/* Anello interno — più veloce orario */}
              <motion.div
                initial={{ opacity: 0, scale: 0.2, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                transition={{ opacity: { duration: 0.6, delay: 0.3 }, scale: { duration: 0.8, delay: 0.3, ease: 'easeOut' }, rotate: { duration: 7, repeat: Infinity, ease: 'linear' } }}
                className="absolute rounded-full"
                style={{ inset: '40px', border: '1px solid rgba(212,175,55,0.25)' }}
              >
                <div className="absolute top-0 left-1/4 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold-primary)', boxShadow: '0 0 8px var(--gold-primary)' }} />
              </motion.div>

              {/* Cerchio centrale + mirino */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                className="relative w-12 h-12 rounded-full flex items-center justify-center"
                style={{ border: '2px solid var(--gold-primary)', boxShadow: '0 0 20px rgba(212,175,55,0.15), inset 0 0 20px rgba(212,175,55,0.05)' }}
              >
                <motion.div
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-5 h-5 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.4) 0%, rgba(212,175,55,0.05) 70%)' }}
                />
                {/* Linee del mirino */}
                <div className="absolute w-[1px] h-full" style={{ background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,0.3), transparent)' }} />
                <div className="absolute w-full h-[1px]" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.3), transparent)' }} />
              </motion.div>

              {/* Debole spazzata radar pulsante */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.15, 0], rotate: [0, 360] }}
                transition={{ opacity: { duration: 3, repeat: Infinity }, rotate: { duration: 3, repeat: Infinity, ease: 'linear' }, delay: 0.6 }}
                className="absolute inset-[10px] rounded-full"
                style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(212,175,55,0.15) 40deg, transparent 80deg)' }}
              />
            </div>

            {/* ── Titolo OSIRIS — sfasamento lettera per lettera ── */}
            <div className="flex items-center gap-[2px] mb-3 z-[2]">
              {'OSIRIS'.split('').map((letter, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.5 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                  className="text-4xl md:text-5xl font-bold tracking-[0.5em] font-mono"
                  style={{ color: 'var(--text-heading)', textShadow: '0 0 30px rgba(212,175,55,0.2)' }}
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            {/* ── Sottotitolo — rivelazione macchina da scrivere ── */}
            <div className="overflow-hidden mb-8 z-[2]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 1.2, duration: 0.8, ease: 'easeInOut' }}
                className="overflow-hidden whitespace-nowrap"
              >
                <p className="text-[12px] md:text-[13px] font-mono tracking-[0.5em] text-[var(--gold-primary)]" style={{ opacity: 0.8 }}>
                  PIATTAFORMA DI INTELLIGENCE GLOBALE
                </p>
              </motion.div>
            </div>

            {/* ── Barra di progresso multistadio ── */}
            <div className="w-64 md:w-80 z-[2]">
              {/* Sottile traccia di progresso */}
              <div className="relative w-full h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(212,175,55,0.1)' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: ['0%', '25%', '50%', '78%', '100%'] }}
                  transition={{ duration: 2.2, delay: 0.5, times: [0, 0.25, 0.5, 0.75, 1], ease: 'easeInOut' }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--gold-primary), var(--cyan-primary), var(--gold-primary))', boxShadow: '0 0 12px rgba(212,175,55,0.4)' }}
                />
              </div>

              {/* Messaggi di stato — ciclici */}
              <div className="mt-3 h-4 flex items-center justify-center">
                {[
                  { text: 'CONNESSIONE SICURA IN CORSO...', delay: 0.5 },
                  { text: 'INIZIALIZZAZIONE FLUSSI...', delay: 1.1 },
                  { text: 'CALIBRAZIONE SENSORI...', delay: 1.7 },
                  { text: 'SISTEMA PRONTO', delay: 2.2 },
                ].map((stage, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ delay: stage.delay, duration: 0.6, times: [0, 0.1, 0.7, 1] }}
                    className="absolute text-[13px] font-mono tracking-[0.25em]"
                    style={{ color: i === 3 ? 'var(--cyan-primary)' : 'var(--text-muted)' }}
                  >
                    {stage.text}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* ── Linee griglia decorative ── */}
            <div className="absolute inset-0 pointer-events-none z-[0]" style={{ opacity: 0.03 }}>
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(212,175,55,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.5) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }} />
            </div>

            {/* ── Accenti angolari ── */}
            {[
              { t: '10px', l: '10px', bw: '2px 0 0 2px' },
              { t: '10px', r: '10px', bw: '2px 2px 0 0' },
              { b: '10px', l: '10px', bw: '0 0 2px 2px' },
              { b: '10px', r: '10px', bw: '0 2px 2px 0' },
            ].map((pos, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                className="absolute w-8 h-8 z-[2]"
                style={{ top: pos.t, bottom: pos.b, left: pos.l, right: pos.r, borderWidth: pos.bw, borderStyle: 'solid', borderColor: 'var(--gold-primary)' }}
              />
            ))}



            {/* ── Keyframe inline per deriva scanline ── */}

          </motion.div>
        )}
      </AnimatePresence>



      {/* ── MAPPA ── */}
      <ErrorBoundary name="Map">
        {isClient && <OsirisMap 
          data={data} 
          activeLayers={activeLayers} 
          projection={mapProjection} 
          mapStyle={mapStyle === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'dark'} 
          onEntityClick={handleEntityClick} 
          onMouseCoords={handleMouseCoords} 
          onRightClick={handleRightClick} 
          onViewStateChange={setMapView} 
          flyToLocation={flyToLocation}
          sweepData={sweepData}
          scanTargets={scanTargets}
          demoMode={demoMode}
          geoJSONData={geoJSONData}
          timeRange={timeRange}
        />}
      </ErrorBoundary>


      {/* ── CONTROLLI VISTA MAPPA (3D/2D + ATTIVAZIONE SATELLITE) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.5 }}
        className="absolute bottom-[75px] md:bottom-6 left-3 md:left-[315px] z-[200] flex items-center gap-2 pointer-events-none"
      >
        {/* Attivazione 3D/2D */}
        <button
          onClick={() => setMapProjection(p => p === 'globe' ? 'mercator' : 'globe')}
          className="glass-panel p-3.5 pointer-events-auto hover:border-[var(--gold-primary)]/40 transition-colors group relative"
          title={mapProjection === 'globe' ? 'Passa a mappa 2D' : 'Passa a globo 3D'}
        >
          {mapProjection === 'globe' ? (
            <MapPinned className="w-5 h-5 text-[var(--gold-primary)] group-hover:scale-110 transition-transform" />
          ) : (
            <Globe className="w-5 h-5 text-[var(--cyan-primary)] group-hover:scale-110 transition-transform" />
          )}
          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-[13px] font-mono text-[var(--text-muted)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity glass-panel px-2 py-1 z-[300]">
            {mapProjection === 'globe' ? 'MAPPA 2D' : 'GLOBO 3D'}
          </span>
        </button>

        {/* Attivazione stile mappa */}
        <button
          onClick={() => setMapStyle(s => s === 'dark' ? 'satellite' : 'dark')}
          className="glass-panel p-3.5 pointer-events-auto hover:border-[var(--gold-primary)]/40 transition-colors group relative"
          title={mapStyle === 'dark' ? 'Vista satellite' : 'Vista notturna'}
        >
          {mapStyle === 'dark' ? (
            <Satellite className="w-5 h-5 text-[var(--alert-green)] group-hover:scale-110 transition-transform" />
          ) : (
            <Moon className="w-5 h-5 text-[var(--cyan-primary)] group-hover:scale-110 transition-transform" />
          )}
          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-[13px] font-mono text-[var(--text-muted)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity glass-panel px-2 py-1 z-[300]">
            {mapStyle === 'dark' ? 'SATELLITE' : 'MODALITÀ NOTTE'}
          </span>
        </button>

        {/* Attivazione tema */}
        <button
          onClick={() => setLightTheme(!lightTheme)}
          className="w-8 h-8 rounded-full glass-panel flex items-center justify-center hover:border-[var(--gold-primary)] transition-colors pointer-events-auto"
          title="Cambia tema"
        >
          {lightTheme ? <Moon className="w-3.5 h-3.5 text-[var(--gold-primary)]" /> : <Sun className="w-3.5 h-3.5 text-[var(--gold-primary)]" />}
        </button>

      </motion.div>

      {/* ── OVERLAY GEOJSON ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.5 }}
        className="absolute bottom-[130px] left-3 md:left-[315px] z-[200] pointer-events-auto"
      >
        <GeoJSONOverlay onData={setGeoJSONData} />
      </motion.div>

      {/* Cursore temporale */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.5 }}
        className="absolute bottom-[180px] left-3 md:left-[315px] z-[200] pointer-events-auto"
      >
        <TimelineSlider timeRange={timeRange} onChange={setTimeRange} />
      </motion.div>

      {/* ── INTESTAZIONE ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 2.5 }} className="absolute top-4 left-6 z-[200] pointer-events-none flex items-start gap-4">
        <button onClick={() => setShowLayers(!showLayers)}
          className="pointer-events-auto mt-1 w-9 h-9 rounded-lg flex items-center justify-center border border-white/10 hover:border-[var(--gold-primary)]/40 transition-colors bg-black/30 relative z-[400]"
          title={showLayers ? 'NASCONDI LAYER' : 'MOSTRA LAYER'}>
          <Layers className={`w-4 h-4 ${showLayers ? 'text-[var(--gold-primary)]' : 'text-white/40'}`} />
        </button>
        <div className="flex flex-col pointer-events-auto">
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-bold tracking-[0.4em] text-[var(--gold-primary)] font-mono">OSIRIS</h1>
            <span className="text-[12px] text-[var(--text-muted)] font-mono tracking-[0.15em] opacity-80">COMANDO INTELLIGENCE GLOBALE</span>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-[5px] text-[var(--text-muted)] font-mono tracking-[0.3em] uppercase opacity-40">
              ALIMENTATO DA OSIRIS INTELLIGENCE OPEN SOURCE · MOTORE C2: PHYSICAL COMMAND CORE · SENSORI: ORBITAL LATTICE · RETE: LYCAN NETWORK
            </span>
          </div>
        </div>
        <div className="pointer-events-auto mt-0.5 flex items-center gap-2">
          <SearchBar onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })} />
        </div>
      </motion.div>

      {/* ── STATO IN ALTO A DESTRA (desktop) — DISPLAY C2 ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }} className="status-bar-desktop absolute top-4 right-6 z-[200] pointer-events-none flex items-center gap-4 text-[13px] font-mono tracking-widest text-[var(--text-muted)]">

        <span className="hidden lg:inline-flex items-center gap-1.5">
          <ZuluClock />
        </span>

        <span className="flex items-center gap-1">SIST: <span className={backendStatus === 'connected' ? 'text-[var(--alert-green)]' : 'text-[var(--alert-red)]'}>{backendStatus.toUpperCase()}</span></span>

        {spaceWeather && <span className="hidden lg:inline">SOLARE: <span style={{ color: spaceWeather.storm_color, fontWeight: 700 }}>Kp{spaceWeather.kp_index}</span></span>}

        <span className="hidden lg:inline-flex items-center gap-1">
          <span className="text-[var(--cyan-primary)] font-bold">{Object.values(activeLayers).filter(Boolean).length}</span>
          <span className="text-[var(--text-muted)]/60">FLUSSI</span>
        </span>

        <UptimeClock />
        <span className="text-[12px] font-bold tracking-[0.2em] text-[var(--text-muted)] opacity-50 ml-2">V.4.1</span>
      </motion.div>

      {/* ── MOBILE: Stato compatto in alto ── */}
      {isMobile && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="absolute top-3 right-3 z-[200] pointer-events-auto flex items-center gap-2">
          <a href='https://ko-fi.com/M8D41ZYW4Z' target='_blank' className="glass-panel px-2 py-1 flex items-center gap-1.5 text-[13px] font-mono tracking-widest hover:opacity-80 transition-opacity border-[var(--gold-primary)]/40 bg-[var(--gold-primary)]/10">
            <div className="w-1 h-1 rounded-full bg-[var(--gold-primary)] animate-osiris-pulse" />
            <span className="text-[var(--gold-primary)] font-bold">SUPPORTA IL PROGETTO</span>
          </a>
        </motion.div>
      )}



      {/* ── NUOVA SIDEBAR (Livello Radice) ── */}
      {showLayers && !isMobile && <LayerPanel data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} onClose={() => setShowLayers(false)} />}

      {/* ── STRISCIA STRUMENTI DESTRA (solo desktop — mobile usa nav inferiore) ── */}
      {!isMobile && <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[250] pointer-events-auto bg-black/40 backdrop-blur-sm p-1.5 rounded-xl border border-white/5">
        <div className="relative group flex flex-col items-center">
          <button onClick={() => { setShowIntel(!showIntel); setShowMarkets(false); setShowAlerts(false); }} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showIntel ? 'bg-[var(--cyan-primary)]/20' : 'hover:bg-white/10'}`}>
            <Radar className={`w-4 h-4 ${showIntel ? 'text-[var(--cyan-primary)]' : 'text-white/60'}`} />
          </button>
          <span className={`text-[7px] font-mono tracking-widest mt-0.5 ${showIntel ? 'text-[var(--cyan-primary)]' : 'text-white/40'}`}>INTEL</span>
          <AnimatePresence>
            {showIntel && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-14 top-1/2 -translate-y-1/2 w-96 resize-x overflow-auto" style={{ minWidth: '320px', maxWidth: '800px' }}>
                <OsintPanel onSweepVisualize={setSweepData} onScanGeolocate={(target, data) => {
                  setScanTargets(prev => {
                    const existing = prev.filter(t => t.id !== target);
                    return [{ id: target, timestamp: Date.now(), ...data }, ...existing].slice(0, 10);
                  });
                  setFlyToLocation({ lat: data.lat, lng: data.lng, ts: Date.now() });
                }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative group flex flex-col items-center">
          <button onClick={() => { setShowMarkets(!showMarkets); setShowIntel(false); setShowAlerts(false); }} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showMarkets ? 'bg-[var(--gold-primary)]/20' : 'hover:bg-white/10'}`}>
            <BarChart3 className={`w-4 h-4 ${showMarkets ? 'text-[var(--gold-primary)]' : 'text-white/60'}`} />
          </button>
          <span className={`text-[7px] font-mono tracking-widest mt-0.5 ${showMarkets ? 'text-[var(--gold-primary)]' : 'text-white/40'}`}>MERCATI</span>
          <AnimatePresence>
            {showMarkets && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-14 top-1/2 -translate-y-1/2 w-96 resize-x overflow-auto" style={{ minWidth: '320px', maxWidth: '800px' }}>
                <MarketsPanel data={data} spaceWeather={spaceWeather} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative group flex flex-col items-center">
          <button onClick={() => { setShowAlerts(!showAlerts); setShowIntel(false); setShowMarkets(false); setShowCorrelation(false); }} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showAlerts ? 'bg-[#FF3D3D]/20' : 'hover:bg-white/10'}`}>
            <AlertTriangle className={`w-4 h-4 ${showAlerts ? 'text-[#FF3D3D]' : 'text-white/60'}`} />
          </button>
          <span className={`text-[7px] font-mono tracking-widest mt-0.5 ${showAlerts ? 'text-[#FF3D3D]' : 'text-white/40'}`}>ALLERTE</span>
          <AnimatePresence>
            {showAlerts && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-14 top-1/2 -translate-y-1/2 w-96 resize-x overflow-auto" style={{ minWidth: '320px', maxWidth: '800px' }}>
                <LiveAlerts data={data} onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })} onWatchFeed={(url, name) => { setLiveFeedUrl(url); setLiveFeedName(name); }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative group flex flex-col items-center">
          <button onClick={() => { setShowCorrelation(!showCorrelation); setShowIntel(false); setShowMarkets(false); setShowAlerts(false); setShowSearch(false); }} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showCorrelation ? 'bg-[#FF6B35]/20' : 'hover:bg-white/10'}`}>
            <Crosshair className={`w-4 h-4 ${showCorrelation ? 'text-[#FF6B35]' : 'text-white/60'}`} />
          </button>
          <span className={`text-[7px] font-mono tracking-widest mt-0.5 ${showCorrelation ? 'text-[#FF6B35]' : 'text-white/40'}`}>CORRELA</span>
          <AnimatePresence>
            {showCorrelation && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-14 top-1/2 -translate-y-1/2 w-96 resize-x overflow-auto" style={{ minWidth: '320px', maxWidth: '800px' }}>
                <div className="glass-panel flex flex-col overflow-hidden pointer-events-auto shrink-0 h-[500px] max-h-[80vh]">
                  <CorrelationPanel />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative group flex flex-col items-center">
          <button onClick={() => { setShowSearch(!showSearch); setShowIntel(false); setShowMarkets(false); setShowAlerts(false); setShowCorrelation(false); }} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showSearch ? 'bg-[var(--cyan-primary)]/20' : 'hover:bg-white/10'}`}>
            <Search className={`w-4 h-4 ${showSearch ? 'text-[var(--cyan-primary)]' : 'text-white/60'}`} />
          </button>
          <span className={`text-[7px] font-mono tracking-widest mt-0.5 ${showSearch ? 'text-[var(--cyan-primary)]' : 'text-white/40'}`}>CERCA</span>
          <AnimatePresence>
            {showSearch && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-14 top-1/2 -translate-y-1/2 w-96 resize-x overflow-auto" style={{ minWidth: '320px', maxWidth: '800px' }}>
                <QuickSearch data={data} onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setShowSearch(false); }} onSearchResults={(results, q) => { setSearchResults(results); setSearchQuery(q); setShowSearchPanel(true); }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>}

      {/* ── PANNELLO RISULTATI RICERCA ── */}
      <AnimatePresence>
        {showSearchPanel && searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-[300]"
          >
            <SearchPanel
              results={searchResults}
              query={searchQuery}
              onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); }}
              onClose={() => setShowSearchPanel(false)}
              onClear={() => { setSearchResults([]); setSearchQuery(''); setShowSearchPanel(false); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── OVERLAY VISUALIZZATORE FEED LIVE ── */}
      <AnimatePresence>
        {liveFeedUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setLiveFeedUrl(null)}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="w-[90vw] max-w-[900px] flex flex-col relative rounded-xl overflow-hidden border border-[var(--border-primary)] shadow-2xl bg-black"
              onClick={e => e.stopPropagation()}
            >
              {/* Intestazione */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#111] border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF4081] animate-osiris-pulse" />
                  <span className="text-[12px] font-mono font-bold text-white tracking-wider">{liveFeedName}</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-mono text-[13px] font-bold">STREAMING LIVE</span>
                  {!liveFeedEmbedAllowed && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[13px]">SOLO ESTERNO</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={getYouTubeWatchUrl(liveFeedUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--border-primary)] hover:bg-[var(--gold-primary)] hover:text-black text-white transition-colors text-[13px] font-mono"
                  >
                    <span>APRI IN YOUTUBE</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button onClick={() => setLiveFeedUrl(null)} className="text-white/70 hover:text-white transition-colors p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Corpo — iframe o scheda esterna */}
              {liveFeedEmbedAllowed ? (
                <div className="w-full aspect-video relative bg-black">
                  <iframe
                    src={liveFeedUrl}
                    className="w-full h-full absolute inset-0"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-black/95">
                  <div className="text-center px-8">
                    <div className="w-14 h-14 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center mx-auto mb-4">
                      <ExternalLink className="w-6 h-6 text-[#39FF14]" />
                    </div>
                    <p className="text-[13px] font-mono font-bold text-white tracking-widest mb-2">EMBED LIMITATO</p>
                    <p className="text-[13px] font-mono text-white/50 mb-6 max-w-xs">
                      {liveFeedName} non consente l'embedding di terze parti. Clicca sotto per aprire lo streaming live direttamente.
                    </p>
                    <a
                      href={getYouTubeWatchUrl(liveFeedUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded border border-[#39FF14]/40 text-[#39FF14] font-mono text-[12px] hover:bg-[#39FF14]/10 transition-colors tracking-wider"
                    >
                      <ExternalLink className="w-4 h-4" />
                      APRI STREAMING LIVE
                    </a>
                  </div>
                </div>
              )}

              {/* Footer — mostra solo per feed embeddabili */}
              {liveFeedEmbedAllowed && (
                <div className="bg-[#111]/90 px-4 py-2.5 border-t border-[var(--border-primary)] flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[var(--gold-primary)] shrink-0" />
                  <span className="text-[13px] font-mono text-white/70 leading-relaxed">
                    Se vedi &ldquo;Video non disponibile&rdquo;, usa <strong className="text-[var(--gold-primary)]">APRI IN YOUTUBE</strong> qui sopra.
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ UI MOBILE ═══ */}
      {isMobile && (
        <>
          {/* Navigazione inferiore mobile */}
          <div className="mobile-nav">
            <div className="glass-panel mobile-nav-inner">
              {[
                { id: 'layers' as const, icon: Layers, label: 'LAYER' },
                { id: 'markets' as const, icon: BarChart3, label: 'MERCATI' },
                { id: 'intel' as const, icon: Newspaper, label: 'INTEL' },
                { id: 'recon' as const, icon: Radar, label: 'RICOGNIZIONE' },
                { id: 'search' as const, icon: Search, label: 'CERCA' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setMobilePanel(mobilePanel === tab.id ? null : tab.id)}
                  className={`mobile-nav-btn ${mobilePanel === tab.id ? 'active' : ''}`}>
                  <tab.icon className={`w-4 h-4 ${tab.id === 'recon' ? 'text-[var(--cyan-primary)]' : ''}`} />
                  <span className={tab.id === 'recon' ? 'text-[var(--cyan-primary)]' : ''}>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cassetto mobile */}
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
                    <span className="hud-text text-[13px] text-[var(--text-primary)]">
                      {mobilePanel === 'layers' ? 'LAYER E STATISTICHE' : mobilePanel === 'markets' ? 'MERCATI E INTEL' : mobilePanel === 'intel' ? 'FLUSSO INTEL' : mobilePanel === 'recon' ? 'RICOGNIZIONE OSIRIS' : 'CERCA'}
                    </span>
                    <button onClick={() => setMobilePanel(null)} className="text-[var(--text-muted)] p-1"><X className="w-4 h-4" /></button>
                  </div>
                  {mobilePanel === 'layers' && (
                    <>
                      <div className="glass-panel-sm p-2 mb-2">
                        <div className="grid grid-cols-5 gap-1 text-center">
                          <div><div className="hud-label" style={{fontSize:'8px'}}>AER</div><div className="hud-value text-[13px]">{totalFlights.toLocaleString()}</div></div>
                          <div><div className="hud-label" style={{fontSize:'8px'}}>SAT</div><div className="hud-value text-[13px]">{(data.satellites?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'8px'}}>CAM</div><div className="hud-value text-[13px]">{(data.cameras?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'8px'}}>METEO</div><div className="hud-value text-[13px]" style={{color:'var(--accent-weather)'}}>{(data.weather_events?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'8px'}}>NUC</div><div className="hud-value text-[13px]" style={{color:'var(--accent-nuclear)'}}>{(data.infrastructure?.length||0)}</div></div>
                        </div>
                      </div>
                      <LayerPanel data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} isMobile={true} />
                      <div className="mt-2">
                        <ViewPresets onNavigate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMapView(v => ({ ...v, zoom })); setMobilePanel(null); }} />
                      </div>
                    </>
                  )}
                  {mobilePanel === 'markets' && <MarketsPanel data={data} spaceWeather={spaceWeather} />}
                  {mobilePanel === 'intel' && <IntelFeed data={data} onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }} />}
                  {mobilePanel === 'search' && (
                    <div className="space-y-2">
                      <QuickSearch data={data} onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }} />
                      <SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={null} />
                    </div>
                  )}
                  {mobilePanel === 'recon' && (
                    <div className="space-y-2">
                      <OsintPanel isOpen={true} onClose={() => setMobilePanel(null)} isMobile={true} onSweepVisualize={setSweepData} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── METRICHE GREZZE INFERIORI (desktop) ── */}
      {!isMobile && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3, duration: 0.8 }} className="desktop-only absolute bottom-4 left-20 z-[200] pointer-events-auto">
          <div className="flex items-center gap-6 text-[12px] font-mono tracking-widest text-[var(--text-muted)] opacity-60">
            <div className="flex gap-2 items-center">
              <span>COORD</span>
              <span ref={coordsDisplayRef} className="text-[var(--gold-primary)] font-bold tabular-nums">—</span>
            </div>
            <div className="flex gap-2 items-center">
              <span>LOC</span>
              <span className="text-[var(--cyan-primary)] truncate max-w-[200px]">{locationLabel || 'MAPPA'}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span>Z</span>
              <span className="text-[var(--gold-primary)] font-bold tabular-nums">{mapView.zoom.toFixed(1)}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Barra scala (desktop) ── */}
      <div className="desktop-only absolute bottom-[4.5rem] left-[20rem] z-[201] pointer-events-none">
        <ScaleBar zoom={mapView.zoom} latitude={mapView.latitude} />
      </div>

      {/* ── Dossier Regione ── */}
      {(regionDossier || dossierLoading) && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-16 md:top-20 left-2 right-2 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[300] md:w-[480px] max-h-[65vh] overflow-y-auto styled-scrollbar">
          <div className="glass-panel p-5 osiris-glow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-mono font-bold text-[var(--gold-primary)] tracking-wider">DOSSIER REGIONE</h2>
              <button onClick={() => { setRegionDossier(null); setDossierLoading(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">✕</button>
            </div>
            {dossierLoading ? (
              <div className="text-center py-8">
                <div className="w-5 h-5 border-2 border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-[12px] font-mono text-[var(--text-muted)] tracking-widest">COMPILAZIONE INTELLIGENCE...</span>
              </div>
            ) : regionDossier && (
              <div className="space-y-3">
                <div><div className="hud-label mb-0.5">POSIZIONE</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.location?.display_name}</div></div>
                {regionDossier.country && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><div className="hud-label mb-0.5">NAZIONE</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.flag} {regionDossier.country.name}</div></div>
                    <div><div className="hud-label mb-0.5">CAPITALE</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.capital}</div></div>
                    <div><div className="hud-label mb-0.5">POPOLAZIONE</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.population?.toLocaleString()}</div></div>
                    <div><div className="hud-label mb-0.5">REGIONE</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.subregion || regionDossier.country.region}</div></div>
                    <div><div className="hud-label mb-0.5">LINGUE</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.languages?.join(', ')}</div></div>
                    <div><div className="hud-label mb-0.5">AREA</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.area?.toLocaleString()} km²</div></div>
                  </div>
                )}
                {regionDossier.head_of_state && (<div><div className="hud-label mb-0.5">CAPO DI STATO</div><div className="text-xs text-[var(--gold-primary)]">{regionDossier.head_of_state.name}</div><div className="text-[12px] text-[var(--text-muted)]">{regionDossier.head_of_state.position}</div></div>)}
                {regionDossier.wikipedia && (<div><div className="hud-label mb-1">BRIEF INTELLIGENCE</div><div className="flex gap-3">{regionDossier.wikipedia.thumbnail && <img src={regionDossier.wikipedia.thumbnail} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />}<p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{regionDossier.wikipedia.extract}</p></div></div>)}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Visualizzatore Telecamera ── */}
      <CameraViewer
        camera={activeCamera}
        onClose={() => setActiveCamera(null)}
        onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })}
      />


      {/* ── OVERLAY ── */}
      <div className="vignette absolute inset-0 pointer-events-none z-[2]" />
      <div className="crt-scanlines absolute inset-0 pointer-events-none z-[3] opacity-[0.02]" />
      {/* Cornici angolari — usando classi esplicite per compatibilità Tailwind JIT */}
      {[
        { pos: 'top-0 left-0', vAnchor: 'top-0', hAnchor: 'left-0', hGrad: 'bg-gradient-to-r', vGrad: 'bg-gradient-to-b' },
        { pos: 'top-0 right-0', vAnchor: 'top-0', hAnchor: 'right-0', hGrad: 'bg-gradient-to-l', vGrad: 'bg-gradient-to-b' },
        { pos: 'bottom-0 left-0', vAnchor: 'bottom-0', hAnchor: 'left-0', hGrad: 'bg-gradient-to-r', vGrad: 'bg-gradient-to-t' },
        { pos: 'bottom-0 right-0', vAnchor: 'bottom-0', hAnchor: 'right-0', hGrad: 'bg-gradient-to-l', vGrad: 'bg-gradient-to-t' },
      ].map((c, i) => (
        <div key={i} className={`absolute ${c.pos} w-16 h-16 pointer-events-none z-[1]`}>
          <div className={`absolute ${c.vAnchor} ${c.hAnchor} w-full h-[1px] ${c.hGrad} from-[var(--gold-primary)]/30 to-transparent`} />
          <div className={`absolute ${c.vAnchor} ${c.hAnchor} w-[1px] h-full ${c.vGrad} from-[var(--gold-primary)]/30 to-transparent`} />
        </div>
      ))}

      {/* Overlay scorciatoie da tastiera */}
      <KeyboardShortcuts />

      {/* ── TICKER STATO GLOBALE (in basso) ── */}
      <GlobalStatusBar />

      {/* Segnalibri */}
      <div className="desktop-only absolute bottom-[26px] right-36 z-[200] pointer-events-auto">
        <div className="relative">
          <BookmarksPanel onNavigate={(lat, lng, zoom) => setFlyToLocation({ lat, lng, ts: Date.now() })} />
        </div>
      </div>

      {/* Preimpostazioni layer */}
      <div className="desktop-only absolute bottom-[26px] right-52 z-[200] pointer-events-auto">
        <div className="relative">
          <LayerPresets activeLayers={activeLayers} onLoad={(layers) => setActiveLayers(layers)} />
        </div>
      </div>

      {/* Suggerimento scorciatoie */}
      <div className="desktop-only absolute bottom-[26px] right-5 z-[200] pointer-events-none text-[8px] font-mono text-[var(--text-muted)]/40 tracking-widest">
        [?] SCORCIATOIE · [F] SCHERMO INTERO · [S] CONDIVIDI · [R] RESET VISUALIZZAZIONE
      </div>

      {/* ── AI Analyst — Chat Intelligence floating ── */}
      <AiAnalyst data={data} />

    </main>
  );
}
