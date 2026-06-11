'use client';

import { memo, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plane, Satellite, Activity, AlertTriangle, Camera, Flame,
  CloudLightning, Radiation, Ship, Network, Radio, Globe,
  Map, Crosshair, Target, Eye, ArrowUpRight,
  Shield, Zap, Search, BarChart3, ExternalLink
} from 'lucide-react';

interface GothamDashboardProps {
  data: Record<string, any[]>;
  activeLayers: Record<string, boolean>;
  globalStats: any;
  spaceWeather: any;
  mapView: any;
  onLocate: (lat: number, lng: number) => void;
  onRefresh: () => void;
}

type SectionId = 'overview' | 'threats' | 'entities' | 'network' | 'events';

const SECTIONS: { id: SectionId; label: string; color: string }[] = [
  { id: 'overview', label: 'SITUATIONAL OVERVIEW', color: '#E8913A' },
  { id: 'threats', label: 'THREAT MATRIX', color: '#FF3D3D' },
  { id: 'entities', label: 'ENTITY CATALOG', color: '#39FF14' },
  { id: 'network', label: 'NETWORK INTELLIGENCE', color: '#00E5FF' },
  { id: 'events', label: 'RECENT EVENTS', color: '#D4AF37' },
];

/** Format number for Gotham display */
function fmt(n: number | undefined | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function GothamDashboard({ data, activeLayers, globalStats, spaceWeather, mapView, onLocate, onRefresh }: GothamDashboardProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Computed metrics ──
  const metrics = useMemo(() => {
    const flights = (data.commercial_flights?.length || 0) + (data.private_flights?.length || 0) +
      (data.military_flights?.length || 0) + (data.private_jets?.length || 0);
    const satellites = data.satellites?.length || 0;
    const cameras = data.cameras?.length || 0;
    const maritime = data.maritime_ships?.length || 0;
    const earthquakes = data.earthquakes?.length || 0;
    const fires = data.fires?.length || 0;
    const threats = data.malware_threats?.length || 0;
    const outages = data.ioda_outages?.length || 0;
    const incidents = data.gdelt?.length || 0;
    return { flights, satellites, cameras, maritime, earthquakes, fires, threats, outages, incidents, total: flights + satellites + cameras + maritime + earthquakes + fires + threats + outages + incidents };
  }, [data]);

  const activeFeedCount = Object.values(activeLayers).filter(Boolean).length;

  // ── Render section content ──
  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="grid grid-cols-4 gap-3 h-full">
            {/* Globe / map preview */}
            <div className="col-span-2 flex flex-col gap-3">
              <div className="gotham-card flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: 'radial-gradient(circle at 50% 50%, #E8913A 0%, transparent 70%)'
                }} />
                <Globe className="w-16 h-16 text-[#E8913A] mb-3 opacity-40" />
                <span className="text-[9px] font-mono text-[#E8913A]/60 tracking-widest mb-1">CURRENT VIEW</span>
                <span className="text-[11px] font-mono text-white/70">
                  {mapView.latitude.toFixed(2)}°N, {mapView.longitude.toFixed(2)}°E
                </span>
                <span className="text-[9px] font-mono text-white/40">ZOOM {mapView.zoom.toFixed(1)}</span>
                <button
                  onClick={() => onLocate(mapView.latitude, mapView.longitude)}
                  className="mt-3 px-4 py-1.5 rounded border border-[#E8913A]/30 text-[#E8913A] text-[9px] font-mono tracking-widest hover:bg-[#E8913A]/10 transition-colors"
                >
                  OPEN MAP VIEW
                </button>
              </div>
              {/* Space weather + status */}
              <div className="gotham-card p-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${spaceWeather?.kp_index > 5 ? 'bg-red-500 animate-pulse' : 'bg-[#39FF14]'}`} />
                  <span className="text-[9px] font-mono text-white/60">SOLAR: </span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: spaceWeather?.storm_color || '#39FF14' }}>
                    Kp{spaceWeather?.kp_index ?? '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#39FF14]" />
                  <span className="text-[9px] font-mono text-white/60">FEEDS: </span>
                  <span className="text-[10px] font-mono font-bold text-[#39FF14]">{activeFeedCount}</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-[9px] font-mono text-white/60">TOTAL ENTITIES: </span>
                  <span className="text-[10px] font-mono font-bold text-[#E8913A]">{fmt(metrics.total)}</span>
                </div>
              </div>
            </div>

            {/* Key metrics grid */}
            <div className="col-span-2 grid grid-cols-2 gap-3">
              {[
                { label: 'AIRCRAFT', value: metrics.flights, icon: Plane, color: '#00E5FF', key: 'flights' },
                { label: 'SATELLITES', value: metrics.satellites, icon: Satellite, color: '#D4AF37', key: 'satellites' },
                { label: 'CCTV FEEDS', value: metrics.cameras, icon: Camera, color: '#39FF14', key: 'cctv' },
                { label: 'MARITIME', value: metrics.maritime, icon: Ship, color: '#00BCD4', key: 'maritime' },
                { label: 'EARTHQUAKES', value: metrics.earthquakes, icon: Activity, color: '#FF9500', key: 'earthquakes' },
                { label: 'WILDFIRES', value: metrics.fires, icon: Flame, color: '#FF6B00', key: 'fires' },
                { label: 'CYBER THREATS', value: metrics.threats, icon: Shield, color: '#FF3D3D', key: 'malware' },
                { label: 'GLOBAL INCIDENTS', value: metrics.incidents, icon: AlertTriangle, color: '#FF4444', key: 'global_incidents' },
              ].map(m => {
                const Icon = m.icon;
                return (
                  <div key={m.key} className="gotham-card p-3 flex flex-col justify-center relative overflow-hidden group cursor-pointer hover:border-[#E8913A]/30 transition-colors">
                    <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Icon className="w-8 h-8" style={{ color: m.color }} />
                    </div>
                    <span className="text-[9px] font-mono text-white/40 tracking-widest mb-1">{m.label}</span>
                    <span className="text-xl font-mono font-bold" style={{ color: m.color }}>{fmt(m.value)}</span>
                    <div className="mt-1.5 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full" style={{ backgroundColor: m.color, boxShadow: `0 0 4px ${m.color}` }} />
                      <span className="text-[7px] font-mono text-white/30 tracking-wider">
                        {activeLayers[m.key] ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'threats':
        return (
          <div className="grid grid-cols-2 gap-3 h-full">
            {/* Threat categories */}
            <div className="gotham-card p-4 overflow-y-auto styled-scrollbar">
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                <Shield className="w-4 h-4 text-[#FF3D3D]" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#FF3D3D]">THREAT CATEGORIES</span>
              </div>
              {[
                { label: 'MALWARE / RANSOMWARE', count: metrics.threats, color: '#FF1744', active: activeLayers.malware },
                { label: 'GPS JAMMING', count: data.gps_jamming?.length || 0, color: '#FF4444', active: activeLayers.gps_jamming },
                { label: 'INTERNET OUTAGES', count: metrics.outages, color: '#FF6B00', active: activeLayers.internet_outages },
                { label: 'NUCLEAR FACILITIES', count: data.infrastructure?.length || 0, color: '#76FF03', active: activeLayers.infrastructure },
                { label: 'GLOBAL INCIDENTS', count: metrics.incidents, color: '#FF3D3D', active: activeLayers.global_incidents },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${t.active ? 'animate-pulse' : ''}`} style={{ backgroundColor: t.color, boxShadow: t.active ? `0 0 6px ${t.color}` : 'none' }} />
                  <span className="text-[9px] font-mono text-white/70 flex-1">{t.label}</span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: t.color }}>{fmt(t.count)}</span>
                </div>
              ))}
            </div>
            {/* Threat map / heat */}
            <div className="gotham-card p-4 flex flex-col items-center justify-center relative">
              <div className="absolute inset-0 opacity-[0.02]" style={{
                backgroundImage: 'radial-gradient(circle at 30% 40%, #FF3D3D 0%, transparent 50%), radial-gradient(circle at 70% 60%, #FF6B00 0%, transparent 40%)'
              }} />
              <Target className="w-12 h-12 text-[#FF3D3D] mb-3 opacity-30" />
              <span className="text-[9px] font-mono text-white/40 tracking-widest">THREAT LANDSCAPE</span>
              <span className="text-[24px] font-mono font-bold text-[#FF3D3D] mt-2">{fmt(metrics.threats + (data.gps_jamming?.length || 0) + metrics.outages + metrics.incidents)}</span>
              <span className="text-[8px] font-mono text-white/30 tracking-wider">ACTIVE THREATS MONITORED</span>
              <button className="mt-4 px-4 py-1.5 rounded border border-[#FF3D3D]/30 text-[#FF3D3D] text-[9px] font-mono tracking-widest hover:bg-[#FF3D3D]/10 transition-colors"
                onClick={onRefresh}>
                REFRESH INTEL
              </button>
            </div>
          </div>
        );

      case 'entities':
        return (
          <div className="grid grid-cols-3 gap-3 h-full">
            {[
              { label: 'AIRCRAFT', count: metrics.flights, icon: Plane, color: '#00E5FF', items: data.commercial_flights?.slice(0, 5) || [] },
              { label: 'SATELLITES', count: metrics.satellites, icon: Satellite, color: '#D4AF37', items: data.satellites?.slice(0, 5) || [] },
              { label: 'VESSELS', count: metrics.maritime, icon: Ship, color: '#00BCD4', items: data.maritime_ships?.slice(0, 5) || [] },
            ].map(cat => (
              <div key={cat.label} className="gotham-card p-3 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                  <cat.icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                  <span className="text-[9px] font-mono font-bold tracking-widest flex-1" style={{ color: cat.color }}>{cat.label}</span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: cat.color }}>{fmt(cat.count)}</span>
                </div>
                <div className="flex-1 overflow-y-auto styled-scrollbar space-y-1">
                  {(cat.items as any[]).slice(0, 8).map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-white/[0.03] transition-colors cursor-pointer">
                      <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-[8px] font-mono text-white/60 truncate flex-1">
                        {item.callsign || item.name || item.id || `#${i + 1}`}
                      </span>
                      {item.lat && (
                        <button onClick={() => onLocate(item.lat, item.lng || item.lon)} className="text-white/20 hover:text-[#E8913A] transition-colors">
                          <Crosshair className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {cat.count === 0 && <span className="text-[8px] font-mono text-white/20">NO DATA</span>}
                </div>
              </div>
            ))}
          </div>
        );

      case 'network':
        return (
          <div className="grid grid-cols-2 gap-3 h-full">
            <div className="gotham-card p-4 overflow-y-auto styled-scrollbar">
              <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                <Network className="w-4 h-4 text-[#00E5FF]" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#00E5FF]">INTERNET OUTAGES</span>
                <span className="text-[10px] font-mono font-bold text-[#00E5FF] ml-auto">{fmt(metrics.outages)}</span>
              </div>
              {(data.ioda_outages as any[] || []).slice(0, 15).map((o: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/[0.03] last:border-0">
                  <div className="w-1 h-1 rounded-full bg-[#FF6B00] shrink-0" />
                  <span className="text-[8px] font-mono text-white/60 truncate flex-1">{o.country || o.region || `Region #${i + 1}`}</span>
                  <span className="text-[8px] font-mono text-[#FF6B00]">{o.severity || 'MAJOR'}</span>
                </div>
              ))}
              {metrics.outages === 0 && <span className="text-[8px] font-mono text-white/20">NO CURRENT OUTAGES</span>}
            </div>
            <div className="gotham-card p-4 overflow-y-auto styled-scrollbar">
              <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                <Radio className="w-4 h-4 text-[#FF1744]" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#FF1744]">CYBER THREATS</span>
                <span className="text-[10px] font-mono font-bold text-[#FF1744] ml-auto">{fmt(metrics.threats)}</span>
              </div>
              {(data.malware_threats as any[] || []).slice(0, 15).map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/[0.03] last:border-0">
                  <div className="w-1 h-1 rounded-full bg-[#FF1744] shrink-0 animate-pulse" />
                  <span className="text-[8px] font-mono text-white/60 truncate flex-1">{t.name || t.type || `Threat #${i + 1}`}</span>
                  <span className="text-[8px] font-mono text-[#FF1744]">{t.risk || 'CRITICAL'}</span>
                </div>
              ))}
              {metrics.threats === 0 && <span className="text-[8px] font-mono text-white/20">NO CURRENT THREATS</span>}
            </div>
          </div>
        );

      case 'events':
        return (
          <div className="grid grid-cols-1 gap-3 h-full">
            <div className="gotham-card p-4 overflow-y-auto styled-scrollbar">
              <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                <Zap className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#D4AF37]">LIVE EVENT FEED</span>
                <div className="ml-auto flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-pulse" />
                  <span className="text-[8px] font-mono text-[#39FF14] tracking-widest">LIVE</span>
                </div>
              </div>
              {[
                ...(data.earthquakes as any[] || []).slice(0, 5).map((e: any) => ({ type: 'EARTHQUAKE', label: `${e.mag || '?'}M @ ${e.place || 'Unknown'}`, color: '#FF9500', lat: e.lat, lng: e.lng })),
                ...(data.gdelt as any[] || []).slice(0, 5).map((g: any) => ({ type: 'INCIDENT', label: g.title || g.event || 'Global Incident', color: '#FF3D3D', lat: g.lat, lng: g.lng })),
                ...(data.fires as any[] || []).slice(0, 3).map((f: any) => ({ type: 'WILDFIRE', label: f.name || `Fire at ${f.lat?.toFixed(2)}`, color: '#FF6B00', lat: f.lat, lng: f.lng })),
              ].slice(0, 20).map((evt, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer group">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: evt.color, boxShadow: `0 0 4px ${evt.color}` }} />
                  <span className="text-[8px] font-mono tracking-widest" style={{ color: evt.color }}>{evt.type}</span>
                  <span className="text-[8px] font-mono text-white/60 flex-1 truncate">{evt.label}</span>
                  {evt.lat && (
                    <button onClick={() => onLocate(evt.lat, evt.lng || 0)} className="text-white/20 hover:text-[#E8913A] transition-colors opacity-0 group-hover:opacity-100">
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {metrics.earthquakes + metrics.incidents + metrics.fires === 0 && <span className="text-[8px] font-mono text-white/20">NO RECENT EVENTS</span>}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="absolute inset-0 z-[100] bg-[#0a0a0f] flex flex-col overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E8913A]" style={{ boxShadow: '0 0 8px #E8913A' }} />
          <span className="text-[11px] font-bold font-mono tracking-[0.3em] text-[#E8913A]">GOTHAM</span>
        </div>
        <span className="text-[7px] font-mono text-white/20 tracking-widest">C2 DASHBOARD</span>

        {/* Section tabs */}
        <div className="flex items-center gap-1 ml-6">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`px-3 py-1.5 rounded text-[9px] font-mono tracking-widest transition-all ${
                activeSection === s.id
                  ? 'bg-white/[0.08] text-white border border-white/10'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03] border border-transparent'
              }`}
              style={activeSection === s.id ? { borderColor: `${s.color}40`, color: s.color } : {}}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="SEARCH ENTITIES..."
            className="w-48 bg-white/[0.04] border border-white/[0.08] rounded pl-7 pr-3 py-1.5 text-[9px] font-mono text-white/60 placeholder:text-white/20 focus:outline-none focus:border-[#E8913A]/40 focus:text-white/80 transition-colors"
          />
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 p-4 overflow-hidden">
        {renderSection()}
      </div>

      {/* ── Bottom Status Bar ── */}
      <div className="flex items-center gap-4 px-5 py-1.5 border-t border-white/[0.06] shrink-0 bg-black/40">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-pulse" />
          <span className="text-[8px] font-mono text-[#39FF14] tracking-widest">SYSTEM ONLINE</span>
        </div>
        <span className="text-[8px] font-mono text-white/20">|</span>
        <span className="text-[8px] font-mono text-white/30 tracking-wider">
          {metrics.total.toLocaleString()} ACTIVE ENTITIES · {activeFeedCount} FEEDS
        </span>
        <span className="text-[8px] font-mono text-white/20">|</span>
        <span className="text-[8px] font-mono text-white/30 tracking-wider">
          COORD {mapView.latitude.toFixed(2)}°N, {mapView.longitude.toFixed(2)}°E · ZOOM {mapView.zoom.toFixed(1)}
        </span>
        <div className="ml-auto flex items-center gap-3">
          {spaceWeather && (
            <span className="text-[8px] font-mono text-white/30 tracking-wider">
              SOLAR KP<span className="text-[#E8913A]">{spaceWeather.kp_index}</span>
            </span>
          )}
          <button
            onClick={onRefresh}
            className="text-[8px] font-mono text-white/30 hover:text-[#E8913A] tracking-widest transition-colors"
          >
            REFRESH
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(GothamDashboard);
