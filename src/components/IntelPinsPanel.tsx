'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Plus, X, Search, Trash2, Trash, Download, Upload, Clock, AlertTriangle, Info, Eye, Siren, BrainCircuit, Maximize2, Minimize2, Crosshair } from 'lucide-react';
import {
  IntelPin, PinSeverity, PinCategory,
  SEVERITY_COLORS, SEVERITY_LABELS, CATEGORY_ICONS,
  loadPins, savePins, generateId, exportPinsGeoJSON, importPinsGeoJSON
} from '@/lib/intel-pins';

/* ═══════════════════════════════════════════════════════════════
   OSIRIS — Intel Pins Panel
   Drop intel pins on the map, annotate, search, filter, export.
   ═══════════════════════════════════════════════════════════════ */

interface IntelPinsPanelProps {
  pins: IntelPin[];
  setPins: (pins: IntelPin[]) => void;
  onLocate: (lat: number, lng: number) => void;
  pendingPin?: { lat: number; lng: number } | null;
  clearPendingPin?: () => void;
  data?: Record<string, any[]>;
}

const SEVERITY_ICONS: Record<PinSeverity, React.ComponentType<any>> = {
  info: Info,
  watch: Eye,
  alert: AlertTriangle,
  critical: Siren,
};

export default function IntelPinsPanel({
  pins, setPins, onLocate,
  pendingPin, clearPendingPin,
  data = {}
}: IntelPinsPanelProps) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<PinSeverity | 'all'>('all');
  // Cluster detection + AI briefing
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [clusterSize, setClusterSize] = useState(0);
  const [showBriefing, setShowBriefing] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [deepDiveAnalyses, setDeepDiveAnalyses] = useState<Record<string, {analysis: string; loading: boolean; error: string | null}>>({});
  const [expandedDeepDive, setExpandedDeepDive] = useState<string | null>(null);

  /** Log an event from the browser side to the server log */
  const clientLog = useCallback(async (action: string, target: string, ctx: string, status: string, err?: string) => {
    try {
      await fetch('/api/ai/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'IntelPinsPanel', action, target, requestContext: ctx, status, error: err }),
      });
    } catch {} // fire-and-forget
  }, []);

  const runDeepDive = useCallback(async (pin: IntelPin) => {
    const pinId = pin.id;
    clientLog('deep-dive-start', '/api/ai/deep-dive', `${pin.lat.toFixed(4)},${pin.lng.toFixed(4)} ${pin.title}`, 'PENDING');
    setDeepDiveAnalyses(prev => ({...prev, [pinId]: {analysis: '', loading: true, error: null}}));
    setExpandedDeepDive(pinId);
    try {
      const params = new URLSearchParams({
        lat: pin.lat.toString(),
        lng: pin.lng.toString(),
        title: pin.title,
        description: pin.description,
        category: pin.category,
        severity: pin.severity,
      });
      const res = await fetch(`/api/ai/deep-dive?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({error: `HTTP ${res.status}`}));
        throw new Error(err.error || 'Deep dive failed');
      }
      const data = await res.json();
      setDeepDiveAnalyses(prev => ({...prev, [pinId]: {analysis: data.analysis, loading: false, error: null}}));
      clientLog('deep-dive-ok', '/api/ai/deep-dive', `${pin.lat.toFixed(4)},${pin.lng.toFixed(4)}`, 'OK');
    } catch (e: any) {
      setDeepDiveAnalyses(prev => ({...prev, [pinId]: {analysis: '', loading: false, error: e.message}}));
      clientLog('deep-dive-fail', '/api/ai/deep-dive', `${pin.lat.toFixed(4)},${pin.lng.toFixed(4)}`, 'FAIL', e.message);
    }
  }, []);

  // Haversine distance (km)
  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // Detect largest cluster of pins within 500km radius
  const clusters = useMemo(() => {
    const results: { index: number; count: number; pins: IntelPin[]; centerLat: number; centerLng: number }[] = [];
    for (let i = 0; i < pins.length; i++) {
      const group: IntelPin[] = [pins[i]];
      for (let j = 0; j < pins.length; j++) {
        if (i !== j && haversineKm(pins[i].lat, pins[i].lng, pins[j].lat, pins[j].lng) <= 500) {
          group.push(pins[j]);
        }
      }
      if (group.length >= 5) {
        const avgLat = group.reduce((s, p) => s + p.lat, 0) / group.length;
        const avgLng = group.reduce((s, p) => s + p.lng, 0) / group.length;
        results.push({ index: i, count: group.length, pins: group, centerLat: avgLat, centerLng: avgLng });
      }
    }
    // Remove duplicates — keep the largest group
    results.sort((a, b) => b.count - a.count);
    if (results.length > 0) {
      const best = results[0];
      // Deduplicate: filter out overlapping groups
      const unique = [results[0]];
      for (const r of results.slice(1)) {
        if (!unique.some(u => haversineKm(u.centerLat, u.centerLng, r.centerLat, r.centerLng) < 100)) {
          unique.push(r);
        }
      }
      return unique;
    }
    return [];
  }, [pins]);

  // Keep clusterSize in sync
  useEffect(() => {
    if (clusters.length > 0) {
      setClusterSize(clusters[0].count);
    } else {
      setClusterSize(0);
    }
  }, [clusters]);

  // ── ONTOLOGY RELATIONSHIPS ──
  // Fully dynamic: all distances computed per-coordinate, no hardcoded radius thresholds
  const pinRelationships = useMemo(() => {
    // Format a distance nicely
    const fmtDist = (km: number): string =>
      km < 1 ? `${(km * 1000).toFixed(0)}m` : km < 10 ? `${km.toFixed(2)}km` : `${km.toFixed(1)}km`;

    // Helper: "how long ago" from now
    const ago = (ts: number): string => {
      const ms = Date.now() - ts;
      const mins = Math.floor(ms / 60000);
      if (mins < 2) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 48) return `${hrs}h ${mins % 60}m ago`;
      return `${Math.floor(hrs / 24)}d ${hrs % 24}h ago`;
    };

    const entities = {
      flights: [
        ...(data.commercial_flights || []),
        ...(data.private_flights || []),
        ...(data.military_flights || []),
        ...(data.private_jets || []),
      ].filter((e: any) => e && typeof e.lat === 'number' && typeof e.lng === 'number'),
      maritime: (data.maritime_ships || []).filter((e: any) => e && typeof e.lat === 'number' && typeof e.lng === 'number'),
      earthquakes: (data.earthquakes || []).filter((e: any) => e && typeof e.lat === 'number' && typeof e.lng === 'number'),
      satellites: (data.satellites || []).filter((e: any) => e && typeof e.lat === 'number' && typeof e.lng === 'number'),
      cameras: (data.cameras || []).filter((e: any) => e && typeof e.lat === 'number' && typeof e.lng === 'number'),
    };

    return pins.map(pin => {
      // ── Pin-to-pin: ALL sorted by distance, no threshold ──
      const nearbyPins = pins
        .filter(p => p.id !== pin.id)
        .map(p => ({
          ...p,
          distanceKm: haversineKm(pin.lat, pin.lng, p.lat, p.lng),
          timeGap: Math.abs(p.createdAt - pin.createdAt),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 3);

      // ── Pin-to-entity: compute distance to EVERYTHING, sort, return nearest ──
      const sortByDist = (list: any[]) =>
        list
          .map((e: any) => ({ ...e, _dist: haversineKm(pin.lat, pin.lng, e.lat, e.lng || e.lon) }))
          .sort((a: any, b: any) => a._dist - b._dist);

      const allFlights = sortByDist(entities.flights);
      const allMaritime = sortByDist(entities.maritime);
      const allQuakes = sortByDist(entities.earthquakes);
      const allSats = sortByDist(entities.satellites);
      const allCams = sortByDist(entities.cameras);

      // Nearest named of each type (first with a meaningful identifier)
      const nearestNamed = (list: any[], idKey: string) =>
        list.filter((e: any) => e[idKey])[0] || null;

      const nearestFlight = nearestNamed(allFlights, 'callsign')
        || nearestNamed(allFlights, 'flight')
        || nearestNamed(allFlights, 'icao24')
        || allFlights[0] || null;

      const nearestVessel = nearestNamed(allMaritime, 'name')
        || nearestNamed(allMaritime, 'mmsi')
        || nearestNamed(allMaritime, 'imo')
        || allMaritime[0] || null;

      const nearestQuake = allQuakes[0] || null;
      const nearestSat = allSats[0] || null;
      const nearestCam = allCams[0] || null;

      // Dynamic radius: use the 80th percentile distance of the nearest 20 entities
      // This adapts to coordinate density — tight in cities, wide in oceans
      const dynRadius = (sorted: any[], cap = 20): number => {
        const top = sorted.slice(0, cap);
        if (top.length === 0) return 0;
        const idx = Math.min(top.length - 1, Math.ceil(top.length * 0.8));
        return top[idx]._dist;
      };

      const rFlights = dynRadius(allFlights);
      const rMaritime = dynRadius(allMaritime);
      const rQuakes = dynRadius(allQuakes);
      const rSats = dynRadius(allSats);
      const rCams = dynRadius(allCams);

      // Count within dynamic radius
      const countWithin = (list: any[], radius: number) =>
        radius > 0 ? list.filter(e => e._dist <= radius).length : 0;

      return {
        pinId: pin.id,
        nearbyPins,
        // Dynamic metrics per type
        flights: {
          count: countWithin(allFlights, rFlights),
          nearest: nearestFlight,
          nearestDist: allFlights[0]?._dist ?? null,
          dynRadius: rFlights,
          top3: allFlights.slice(0, 3).map(e => ({ label: e.callsign || e.flight || e.icao24 || '?', dist: e._dist })),
        },
        maritime: {
          count: countWithin(allMaritime, rMaritime),
          nearest: nearestVessel,
          nearestDist: allMaritime[0]?._dist ?? null,
          dynRadius: rMaritime,
          top3: allMaritime.slice(0, 3).map(e => ({ label: e.name || e.mmsi || e.imo || '?', dist: e._dist })),
        },
        earthquakes: {
          count: countWithin(allQuakes, rQuakes),
          nearest: nearestQuake,
          nearestDist: allQuakes[0]?._dist ?? null,
          dynRadius: rQuakes,
          top3: allQuakes.slice(0, 3).map(e => ({ label: `M${e.mag || '?'}`, dist: e._dist })),
        },
        satellites: {
          count: countWithin(allSats, rSats),
          nearest: nearestSat,
          nearestDist: allSats[0]?._dist ?? null,
          dynRadius: rSats,
          top3: allSats.slice(0, 3).map(e => ({ label: e.name || e.id || '?', dist: e._dist })),
        },
        cameras: {
          count: countWithin(allCams, rCams),
          nearest: nearestCam,
          nearestDist: allCams[0]?._dist ?? null,
          dynRadius: rCams,
          top3: allCams.slice(0, 3).map(e => ({ label: e.name || e.id || '?', dist: e._dist })),
        },
        // Temporal: most recent timestamp from any entity near the pin
        recentEntities: (() => {
          const all: { label: string; dist: number; ago: string }[] = [];
          const check = (list: any[], typeLabel: string, tsKey: string) => {
            for (const e of list.slice(0, 5)) {
              const ts = e[tsKey] || e.timestamp || e.time || e.last_updated;
              if (ts) {
                const t = typeof ts === 'number' ? ts : new Date(ts).getTime();
                if (!isNaN(t) && (Date.now() - t) < 86400000) { // within 24h
                  all.push({
                    label: `${typeLabel} ${e.callsign || e.name || e.flight || ''}`.trim(),
                    dist: e._dist,
                    ago: ago(t),
                  });
                }
              }
            }
          };
          check(allFlights, '✈', 'last_updated');
          check(allMaritime, '⚓', 'last_updated');
          check(allQuakes, '🌋', 'time');
          return all.sort((a, b) => a.dist - b.dist).slice(0, 3);
        })(),
      };
    });
  }, [pins, data]);

  // Build a lookup map from pinId to relationships
  const relMap = useMemo(() => {
    const m = new Map<string, typeof pinRelationships[0]>();
    for (const r of pinRelationships) m.set(r.pinId, r);
    return m;
  }, [pinRelationships]);

  // Generate AI briefing for a cluster
  const generateBriefing = useCallback(async (cluster: typeof clusters[0]) => {
    setAiLoading(true);
    setAiError(null);
    setAiBriefing(null);
    setShowBriefing(true);

    clientLog('cluster-brief-start', '/api/ai/analyze', `${cluster.count} pins cluster`, 'PENDING');

    try {
      // Build IntelligenceContext from cluster pins
      const threats = cluster.pins.map(p => ({
        id: p.id,
        type: p.category.toUpperCase(),
        title: p.title,
        description: p.description || 'No description',
        severity: p.severity === 'critical' ? 'CRITICAL' as const : p.severity === 'alert' ? 'HIGH' as const : p.severity === 'watch' ? 'ELEVATED' as const : 'LOW' as const,
        region: `${p.lat.toFixed(2)}, ${p.lng.toFixed(2)}`,
        latitude: p.lat,
        longitude: p.lng,
        timestamp: new Date(p.createdAt).toISOString(),
        source: 'INTEL PIN',
      }));

      const context = {
        earthquakes: [],
        news: [],
        threats,
        cyberAlerts: [],
        timestamp: new Date().toISOString(),
      };

      const query = `Analyze this intelligence cluster of ${cluster.count} observation pins within a 500km radius. Identify patterns, connections between the observations, threat assessments, and recommend actions. Format your response with markdown headers: CLUSTER OVERVIEW, PATTERNS DETECTED, THREAT ASSESSMENT, and RECOMMENDED ACTIONS. Be specific — reference pin titles and descriptions directly.`;

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setAiBriefing(data.analysis);
      clientLog('cluster-brief-ok', '/api/ai/analyze', `${cluster.count} pins cluster`, 'OK');
    } catch (e: any) {
      setAiError(e.message || 'Briefing failed');
      clientLog('cluster-brief-fail', '/api/ai/analyze', `${cluster.count} pins cluster`, 'FAIL', e.message);
    } finally {
      setAiLoading(false);
    }
  }, []);
  const [filterCategory, setFilterCategory] = useState<PinCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'severity'>('newest');

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSeverity, setFormSeverity] = useState<PinSeverity>('info');
  const [formCategory, setFormCategory] = useState<PinCategory>('general');
  const [formTags, setFormTags] = useState('');
  const [formLat, setFormLat] = useState<number>(0);
  const [formLng, setFormLng] = useState<number>(0);
  const [formExpiry, setFormExpiry] = useState('never');

  const inputRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ok: number; err: string} | null>(null);

  // When pendingPin arrives from right-click, open form pre-filled
  useEffect(() => {
    if (pendingPin) {
      setFormLat(pendingPin.lat);
      setFormLng(pendingPin.lng);
      setFormTitle('');
      setFormDesc('');
      setFormSeverity('info');
      setFormCategory('general');
      setFormTags('');
      setFormExpiry('never');
      setShowForm(true);
      setOpen(true);
      if (clearPendingPin) clearPendingPin();
    }
  }, [pendingPin, clearPendingPin]);

  useEffect(() => {
    if (open && showForm) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, showForm]);

  const filteredPins = useMemo(() => {
    let result = [...pins];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q)) ||
        p.linkedEntity?.toLowerCase().includes(q)
      );
    }
    if (filterSeverity !== 'all') result = result.filter(p => p.severity === filterSeverity);
    if (filterCategory !== 'all') result = result.filter(p => p.category === filterCategory);
    if (sortBy === 'newest') result.sort((a, b) => b.createdAt - a.createdAt);
    else if (sortBy === 'oldest') result.sort((a, b) => a.createdAt - b.createdAt);
    else if (sortBy === 'severity') {
      const order: PinSeverity[] = ['critical', 'alert', 'watch', 'info'];
      result.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
    }
    return result;
  }, [pins, search, filterSeverity, filterCategory, sortBy]);

  const handleCreate = useCallback(() => {
    if (!formTitle.trim()) return;
    const tags = formTags.split(',').map(t => t.trim()).filter(Boolean);
    let expiresAt: number | undefined;
    if (formExpiry !== 'never') {
      const hrs = parseInt(formExpiry);
      if (!isNaN(hrs)) expiresAt = Date.now() + hrs * 3600000;
    }
    const newPin: IntelPin = {
      id: generateId(),
      title: formTitle.trim(),
      description: formDesc.trim(),
      lat: formLat || 0,
      lng: formLng || 0,
      severity: formSeverity,
      category: formCategory,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt,
      tags,
    };
    setPins([newPin, ...pins]);
    setShowForm(false);
    setFormTitle('');
    setFormDesc('');
  }, [formTitle, formDesc, formSeverity, formCategory, formTags, formExpiry, formLat, formLng, pins, setPins]);

  const handleDelete = useCallback((id: string) => {
    setPins(pins.filter(p => p.id !== id));
  }, [pins, setPins]);

  const handleDeleteAll = useCallback(() => {
    if (pins.length === 0) return;
    if (window.confirm(`DELETE ALL ${pins.length} INTEL PINS?`)) {
      setPins([]);
    }
  }, [pins, setPins]);

  const handleExport = useCallback(() => {
    const geo = exportPinsGeoJSON(pins);
    const blob = new Blob([geo], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `osiris_intel_pins_${new Date().toISOString().slice(0, 10)}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pins]);

  const handleImportGeoJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const imported = importPinsGeoJSON(text);
        if (imported.length === 0) {
          setImportStatus({ ok: 0, err: 'No valid Point features found' });
          return;
        }
        // Merge imported pins at the top with a brief flash
        setPins([...imported, ...pins]);
        setImportStatus({ ok: imported.length, err: '' });
        // Clear flash after 3s
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err: any) {
        setImportStatus({ ok: 0, err: err.message });
        setTimeout(() => setImportStatus(null), 5000);
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-imported
    e.target.value = '';
  }, [pins, setPins]);

  const criticalCount = pins.filter(p => p.severity === 'critical' || p.severity === 'alert').length;

  const IconInfo = Info;
  const IconEye = Eye;
  const IconAlert = AlertTriangle;
  const IconSiren = Siren;

  const severityIcon = (s: PinSeverity, className: string) => {
    if (s === 'info') return <Info className={className} />;
    if (s === 'watch') return <Eye className={className} />;
    if (s === 'alert') return <AlertTriangle className={className} />;
    return <Siren className={className} />;
  };

  const panelContent = (
    <>
      <button
        onClick={() => { setOpen(!open); setShowForm(false); }}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          open ? 'bg-[var(--gold-primary)]/20' : 'hover:bg-white/10'
        } relative`}
        title="INTEL PINS"
      >
        <MapPin className={`w-4 h-4 ${open ? 'text-[var(--gold-primary)]' : 'text-white/60'}`} />
        {criticalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--alert-red)] animate-osiris-pulse" />
        )}
      </button>

      {open && (
        <div className={`glass-panel overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex flex-col transition-all duration-300 ${
          maximized
            ? 'fixed inset-4 z-[9999] bg-[#0a0a09]/95 backdrop-blur-3xl max-h-none'
            : 'absolute right-12 top-1/2 -translate-y-1/2 w-96 max-h-[90vh]'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border-secondary)]">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
              <span className="text-[12px] font-mono font-bold text-[var(--text-primary)] tracking-wider">INTEL PINS</span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">({pins.length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".geojson,.json"
                onChange={handleImportGeoJSON}
                className="hidden"
              />
              <button onClick={() => fileInputRef.current?.click()}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--cyan-primary)] transition-colors"
                title="IMPORT GEOJSON">
                <Upload className="w-3 h-3" />
              </button>
              <button onClick={handleExport} disabled={pins.length === 0}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--cyan-primary)] transition-colors disabled:opacity-30"
                title="EXPORT GEOJSON">
                <Download className="w-3 h-3" />
              </button>
              {pins.length > 0 && (
                <button onClick={handleDeleteAll}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--alert-red)] transition-colors"
                  title="DELETE ALL PINS">
                  <Trash className="w-3 h-3" />
                </button>
              )}
              <button onClick={() => setMaximized(!maximized)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--gold-primary)] transition-colors"
                title={maximized ? 'MINIMIZE' : 'FULLSCREEN'}>
                {maximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
              <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Create Form */}
          {showForm && (
            <div className="px-3 py-2 border-b border-[var(--border-secondary)] bg-[var(--hover-accent)]/50">
              <div className="flex items-center gap-1 mb-2">
                <MapPin className="w-2.5 h-2.5 text-[var(--gold-primary)]" />
                <span className="text-[10px] font-mono text-[var(--gold-primary)] font-bold tracking-wider">NEW INTEL PIN</span>
                <span className="text-[9px] font-mono text-[var(--text-muted)] ml-auto">
                  {(formLat || 0).toFixed(4)}, {(formLng || 0).toFixed(4)}
                </span>
              </div>
              <input ref={inputRef} value={formTitle} onChange={e => setFormTitle(e.target.value)}
                placeholder="TITLE *" maxLength={120}
                className="w-full bg-[var(--bg-void)] text-[11px] font-mono text-[var(--text-primary)] px-2 py-1.5 rounded outline-none border border-[var(--border-secondary)] focus:border-[var(--gold-primary)] mb-1.5 placeholder:text-[var(--text-muted)]" />
              <textarea ref={descRef} value={formDesc} onChange={e => setFormDesc(e.target.value)}
                placeholder="DESCRIPTION (OPTIONAL)" rows={2} maxLength={500}
                className="w-full bg-[var(--bg-void)] text-[10px] font-mono text-[var(--text-secondary)] px-2 py-1.5 rounded outline-none border border-[var(--border-secondary)] focus:border-[var(--gold-primary)] mb-1.5 resize-none placeholder:text-[var(--text-muted)]" />
              <div className="flex gap-1.5 mb-1.5">
                <select value={formSeverity} onChange={e => setFormSeverity(e.target.value as PinSeverity)}
                  className="flex-1 bg-[var(--bg-void)] text-[10px] font-mono text-[var(--text-primary)] px-1.5 py-1 rounded outline-none border border-[var(--border-secondary)]">
                  {(['info','watch','alert','critical'] as PinSeverity[]).map(s => (
                    <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
                  ))}
                </select>
                <select value={formCategory} onChange={e => setFormCategory(e.target.value as PinCategory)}
                  className="flex-1 bg-[var(--bg-void)] text-[10px] font-mono text-[var(--text-primary)] px-1.5 py-1 rounded outline-none border border-[var(--border-secondary)]">
                  {(['observation','threat','infrastructure','source','general'] as PinCategory[]).map(c => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-1.5 mb-2">
                <input value={formTags} onChange={e => setFormTags(e.target.value)}
                  placeholder="TAGS (comma separated)"
                  className="flex-1 bg-[var(--bg-void)] text-[9px] font-mono text-[var(--text-secondary)] px-2 py-1 rounded outline-none border border-[var(--border-secondary)] placeholder:text-[var(--text-muted)]" />
                <select value={formExpiry} onChange={e => setFormExpiry(e.target.value)}
                  className="w-16 bg-[var(--bg-void)] text-[9px] font-mono text-[var(--text-muted)] px-1 py-1 rounded outline-none border border-[var(--border-secondary)]">
                  <option value="never">∞</option>
                  <option value="1">1H</option>
                  <option value="6">6H</option>
                  <option value="24">24H</option>
                  <option value="168">7D</option>
                </select>
              </div>
              <div className="flex gap-1.5">
                <button onClick={handleCreate}
                  className="flex-1 py-1.5 rounded bg-[var(--gold-primary)]/15 text-[var(--gold-primary)] text-[10px] font-mono font-bold hover:bg-[var(--gold-primary)]/25 transition-colors border border-[var(--gold-primary)]/20">
                  DROP PIN
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 rounded text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border-secondary)] transition-colors">
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {/* Search + Filter */}
          <div className="px-3 py-1.5 border-b border-[var(--border-secondary)]">
            <div className="flex items-center gap-1.5 mb-1">
              <Search className="w-2.5 h-2.5 text-[var(--text-muted)] flex-shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="SEARCH PINS..."
                className="flex-1 bg-transparent text-[10px] font-mono text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
              {pins.length >= 0 && !showForm && (
                <button onClick={() => { setFormLat(0); setFormLng(0); setShowForm(true); }}
                  className="p-1 text-[var(--gold-primary)] hover:bg-[var(--gold-primary)]/10 rounded transition-colors"
                  title="CREATE PIN AT CENTER">
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value as PinSeverity | 'all')}
                className="bg-[var(--bg-void)] text-[9px] font-mono text-[var(--text-muted)] px-1 py-0.5 rounded outline-none border border-[var(--border-secondary)] flex-1">
                <option value="all">ALL SEVERITY</option>
                {(['info','watch','alert','critical'] as PinSeverity[]).map(s => (
                  <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
                ))}
              </select>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value as PinCategory | 'all')}
                className="bg-[var(--bg-void)] text-[9px] font-mono text-[var(--text-muted)] px-1 py-0.5 rounded outline-none border border-[var(--border-secondary)] flex-1">
                <option value="all">ALL CATEGORY</option>
                {(['observation','threat','infrastructure','source','general'] as PinCategory[]).map(c => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="bg-[var(--bg-void)] text-[9px] font-mono text-[var(--text-muted)] px-1 py-0.5 rounded outline-none border border-[var(--border-secondary)] flex-shrink-0">
                <option value="newest">NEW</option>
                <option value="oldest">OLD</option>
                <option value="severity">SEV</option>
              </select>
            </div>
          </div>

          {/* Pins List */}
          <div className={`flex-1 overflow-y-auto styled-scrollbar`}
            style={maximized ? {} : { maxHeight: '500px' }}>
            {filteredPins.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <span className="text-[10px] font-mono text-[var(--text-muted)] tracking-widest">
                  {pins.length === 0 ? 'NO INTEL PINS' : 'NO MATCHES'}
                </span>
                <p className="text-[9px] font-mono text-[var(--text-muted)]/50 mt-1">
                  {pins.length === 0 ? 'RIGHT-CLICK ON THE MAP TO DROP A PIN' : 'TRY A DIFFERENT SEARCH OR FILTER'}
                </p>
              </div>
            ) : (
              filteredPins.map(pin => (
                <React.Fragment key={pin.id}>
                <div
                  className="flex items-start gap-2 px-3 py-2 border-b border-[var(--border-secondary)]/50 last:border-0 hover:bg-[var(--hover-accent)] transition-colors cursor-pointer"
                  onClick={() => onLocate(pin.lat, pin.lng)}
                >
                  <div className="mt-0.5 flex-shrink-0" style={{ color: SEVERITY_COLORS[pin.severity] }}>
                    {severityIcon(pin.severity, 'w-3 h-3')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono font-bold text-[var(--text-primary)] truncate">
                        {pin.title}
                      </span>
                      <span className="text-[9px] font-mono text-[var(--text-muted)] flex-shrink-0">{CATEGORY_ICONS[pin.category]}</span>
                    </div>
                    {pin.description && (
                      <p className="text-[9px] font-mono text-[var(--text-secondary)] leading-relaxed mt-0.5 line-clamp-2">
                        {pin.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[8px] font-mono text-[var(--text-muted)]">
                        {new Date(pin.createdAt).toLocaleDateString()} {new Date(pin.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                      </span>
                      <span className="text-[8px] font-mono text-[var(--text-muted)]">
                        {pin.lat.toFixed(3)}, {pin.lng.toFixed(3)}
                      </span>
                      {pin.expiresAt && (
                        <span className="text-[8px] font-mono text-[var(--alert-red)]/70 flex items-center gap-0.5">
                          <Clock className="w-2 h-2" />
                          {Math.ceil((pin.expiresAt - Date.now()) / 3600000)}H
                        </span>
                      )}
                      {pin.tags.map(t => (
                        <span key={t} className="text-[8px] font-mono px-1 py-0.5 rounded bg-[var(--bg-void)] text-[var(--text-muted)]">
                          #{t}
                        </span>
                      ))}
                    </div>
                    {/* ── ONTOLOGY RELATIONSHIPS (dynamic per-coordinate) ── */}
                    {(() => {
                      const rel = relMap.get(pin.id);
                      if (!rel) return null;
                      const items: { label: string; value: string; color: string }[] = [];

                      // Format a distance
                      const fmt = (km: number): string =>
                        km < 1 ? `${(km * 1000).toFixed(0)}m` : km < 10 ? `${km.toFixed(2)}km` : `${km.toFixed(1)}km`;

                      // ── Pin-to-pin: nearest 2 + temporal gap ──
                      for (const np of rel.nearbyPins.slice(0, 2)) {
                        const dist = fmt(np.distanceKm);
                        const gap = np.timeGap < 3600000
                          ? `${Math.floor(np.timeGap / 60000)}m apart`
                          : `${Math.floor(np.timeGap / 3600000)}h apart`;
                        items.push({ label: `⇄ ${np.title}`, value: `${dist}, ${gap}`, color: 'var(--gold-primary)' });
                      }

                      // ── Entity: nearest named + count within dynamic radius ──
                      const ent = (e: any, icon: string, color: string, typeKey: string) => {
                        const t = rel[typeKey];
                        if (!t) return;
                        const name = t.nearest?._dist != null
                          ? (t.nearest.callsign || t.nearest.name || t.nearest.flight || t.nearest.icao24 || t.nearest.mag !== undefined ? `M${t.nearest.mag}` : '')
                          : '';
                        const nearestStr = name && t.nearestDist != null
                          ? `${icon} ${name} ${fmt(t.nearestDist)}`
                          : null;
                        if (nearestStr) items.push({ label: '', value: nearestStr, color });
                        if (t.count > 0 && t.dynRadius > 1) {
                          items.push({ label: icon, value: `${t.count} within ${fmt(t.dynRadius)}`, color });
                        }
                      };
                      ent(rel.flights, '✈', '#00E5FF', 'flights');
                      ent(rel.maritime, '⚓', '#00BCD4', 'maritime');
                      ent(rel.earthquakes, '🌋', '#FF9500', 'earthquakes');
                      ent(rel.satellites, '🛰', '#D4AF37', 'satellites');
                      ent(rel.cameras, '📹', '#39FF14', 'cameras');

                      // ── Top 3 closest entities with actual distances ──
                      const topEntities: { icon: string; name: string; dist: number; color: string }[] = [];
                      const pushTop = (list: { label: string; dist: number }[], icon: string, color: string) => {
                        for (const e of list.slice(0, 1)) {
                          topEntities.push({ icon, name: e.label, dist: e.dist, color });
                        }
                      };
                      pushTop(rel.flights.top3, '✈', '#00E5FF');
                      pushTop(rel.maritime.top3, '⚓', '#00BCD4');
                      pushTop(rel.earthquakes.top3, '🌋', '#FF9500');
                      pushTop(rel.satellites.top3, '🛰', '#D4AF37');
                      pushTop(rel.cameras.top3, '📹', '#39FF14');
                      topEntities.sort((a, b) => a.dist - b.dist);
                      for (const te of topEntities.slice(0, 3)) {
                        items.push({ label: `${te.icon} ${te.name}`, value: fmt(te.dist), color: te.color });
                      }

                      // ── Temporal: most recent activity ──
                      for (const re of rel.recentEntities.slice(0, 2)) {
                        items.push({ label: `⏱ ${re.label}`, value: `${fmt(re.dist)} · ${re.ago}`, color: '#00E5FF' });
                      }

                      if (items.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {items.map((item, i) => (
                            <span key={i} className="text-[8px] font-mono flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/40 border border-white/[0.06]"
                              style={{ color: item.color }}>
                              {item.label && <span className="opacity-70">{item.label}</span>}
                              <span className="font-bold">{item.value}</span>
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); runDeepDive(pin); }}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--cyan-primary)] transition-colors"
                      title="DEEP DIVE INTEL">
                      <Crosshair className="w-2.5 h-2.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(pin.id); }}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--alert-red)] transition-colors flex-shrink-0">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
                {expandedDeepDive === pin.id && deepDiveAnalyses[pin.id] && (
                  <div className="px-3 pb-2 pt-0 border-t border-[var(--border-secondary)]/30 mt-1">
                    {deepDiveAnalyses[pin.id].loading ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="w-2.5 h-2.5 border border-[var(--cyan-primary)] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[9px] font-mono text-[var(--text-muted)]">DEEP DIVING...</span>
                      </div>
                    ) : deepDiveAnalyses[pin.id].error ? (
                      <div className="py-1">
                        <span className="text-[9px] font-mono text-[var(--alert-red)]">DEEP DIVE FAILED: {deepDiveAnalyses[pin.id].error}</span>
                      </div>
                    ) : (
                      <div className="text-[9px] font-mono text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto styled-scrollbar">
                        {deepDiveAnalyses[pin.id].analysis.split('\n').map((line, i) => {
                          if (line.startsWith('###')) {
                            return <p key={i} className="text-[10px] font-bold text-[var(--gold-primary)] mt-2 mb-0.5 tracking-wider">{line.replace(/^###\s*/, '').replace(/\*\*/g, '')}</p>;
                          }
                          if (line.startsWith('**') && line.endsWith('**')) {
                            return <p key={i} className="text-[10px] font-bold text-[var(--cyan-primary)] mt-1.5 mb-0.5">{line.replace(/\*\*/g, '')}</p>;
                          }
                          if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                            return <p key={i} className="pl-2 text-[9px] text-[var(--text-secondary)] my-0.5">{line}</p>;
                          }
                          if (line.trim() === '') return <div key={i} className="h-0.5" />;
                          return <p key={i} className="text-[9px] text-[var(--text-secondary)] my-0.5">{line}</p>;
                        })}
                      </div>
                    )}
                  </div>
                )}
                </React.Fragment>
              ))
            )}
          </div>

          {/* Cluster Briefing */}
          {clusters.length > 0 && (
            <div className="border-t border-[var(--border-secondary)]">
              <button
                onClick={() => { if (!showBriefing) generateBriefing(clusters[0]); else setShowBriefing(!showBriefing); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--hover-accent)] transition-colors"
              >
                <BrainCircuit className="w-3 h-3 text-[var(--cyan-primary)]" />
                <span className="text-[10px] font-mono font-bold text-[var(--cyan-primary)] tracking-wider">
                  AI BRIEF — {clusters[0].count} PINS IN CLUSTER
                </span>
                <span className="ml-auto text-[9px] text-[var(--text-muted)]">{showBriefing ? '▲' : '▼'}</span>
              </button>

              {showBriefing && (
                <div className="px-3 pb-2">
                  {aiLoading ? (
                    <div className="flex items-center gap-2 py-3">
                      <div className="w-3 h-3 border border-[var(--cyan-primary)] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[9px] font-mono text-[var(--text-muted)]">ANALYZING CLUSTER PATTERNS...</span>
                    </div>
                  ) : aiError ? (
                    <div className="py-2">
                      <span className="text-[9px] font-mono text-[var(--alert-red)]">BRIEFING FAILED: {aiError}</span>
                      <p className="text-[8px] font-mono text-[var(--text-muted)] mt-1">Set DEEPSEEK_API_KEY_1 in .env or add x-deepseek-key header.</p>
                    </div>
                  ) : aiBriefing ? (
                    <div className={`py-2 overflow-y-auto styled-scrollbar ${maximized ? 'max-h-[60vh]' : 'max-h-[250px]'}`}>
                      <div className="text-[9px] font-mono text-[var(--text-secondary)] leading-relaxed briefing-content whitespace-pre-wrap">
                        {aiBriefing.split('\n').map((line, i) => {
                          if (line.startsWith('#')) {
                            const level = line.match(/^#+/)?.[0].length || 1;
                            const text = line.replace(/^#+\s*/, '');
                            const sizes = ['text-[11px] font-bold mt-2 mb-1', 'text-[10px] font-bold mt-1.5 mb-0.5', 'text-[10px] font-semibold mt-1 mb-0.5'];
                            const colors = ['text-[var(--gold-primary)]', 'text-[var(--cyan-primary)]', 'text-[var(--text-primary)]'];
                            return <p key={i} className={`${sizes[Math.min(level-1, 2)]} ${colors[Math.min(level-1, 2)]}`}>{text}</p>;
                          }
                          if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                            return <p key={i} className="pl-3 text-[9px] text-[var(--text-secondary)] my-0.5">{line}</p>;
                          }
                          if (line.trim() === '') return <div key={i} className="h-1" />;
                          return <p key={i} className="text-[9px] text-[var(--text-secondary)] my-0.5">{line}</p>;
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-[var(--border-secondary)] bg-[var(--bg-void)]/50">
            {importStatus ? (
              <span className={`text-[9px] font-mono tracking-wider ${
                importStatus.err ? 'text-[var(--alert-red)]' : 'text-[var(--cyan-primary)]'
              }`}>
                {importStatus.err
                  ? `IMPORT FAILED: ${importStatus.err}`
                  : `IMPORTED ${importStatus.ok} PIN${importStatus.ok === 1 ? '' : 'S'} FROM GEOJSON`
                }
              </span>
            ) : (
              <span className="text-[8px] font-mono text-[var(--text-muted)]/60 tracking-wider">
                RIGHT-CLICK MAP → DROP INTEL PIN · {pins.length} TOTAL · {criticalCount} CRITICAL
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );

  if (maximized && mounted && typeof document !== 'undefined') {
    return createPortal(panelContent, document.body);
  }

  return panelContent;
}
