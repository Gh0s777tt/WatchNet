'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Globe, ExternalLink, ChevronDown, Download, Trash2, Search } from 'lucide-react';

interface SearchResult {
  label: string;
  lat?: number;
  lng?: number;
  type: string;
  url?: string;
  description?: string;
  thumbnail?: string;
  source?: string;
}

interface SearchPanelProps {
  results: SearchResult[];
  query: string;
  onLocate: (lat: number, lng: number) => void;
  onClose: () => void;
  onClear: () => void;
}

const SOURCE_ORDER: Record<string, number> = {
  wikidata: 0,
  wikipedia_en: 1,
  wikipedia_it: 2,
  nominatim: 3,
  duckduckgo: 4,
  opencorporates: 5,
  google: 6,
};

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  wikidata: { label: 'PERSONE (WIKIDATA)', color: '#39FF14' },
  wikipedia_en: { label: 'WIKIPEDIA EN', color: '#448AFF' },
  wikipedia_it: { label: 'WIKIPEDIA IT', color: '#448AFF' },
  nominatim: { label: 'LUOGHI (NOMINATIM)', color: '#FFD700' },
  duckduckgo: { label: 'WEB (DUCKDUCKGO)', color: '#D4AF37' },
  opencorporates: { label: 'AZIENDE (OPENCORPORATES)', color: '#FF9800' },
  google: { label: 'WEB (GOOGLE)', color: '#4285F4' },
  mistero: { label: 'MISTERI', color: '#9400D3' },
  ufo: { label: 'UFO', color: '#AB47BC' },
  sotterraneo: { label: 'SOTTERRANEO', color: '#4FC3F7' },
  'città sotterranea': { label: 'CITTÀ SOTTERRANEE', color: '#00BCD4' },
  miniera: { label: 'MINIERE', color: '#FF6B00' },
  piramide: { label: 'PIRAMIDI', color: '#FFD700' },
  grotta: { label: 'GROTTE', color: '#4FC3F7' },
  'città perduta': { label: 'CITTÀ PERDUTE', color: '#FF9500' },
  antartide: { label: 'ANTARTIDE', color: '#00E5FF' },
  antonimi: { label: 'ANTARTIDE', color: '#00E5FF' },
};

function getSourceLabel(src: string): { label: string; color: string } {
  return SOURCE_LABELS[src] || { label: src.toUpperCase().replace(/_/g, ' '), color: '#39FF14' };
}

function parseSource(r: SearchResult): string {
  if (r.source) return r.source;
  if (r.type === 'PERSONA') return 'wikidata';
  if (r.type === 'LUOGO') return 'nominatim';
  if (r.type === 'WIKIPEDIA') return 'wikipedia_en';
  return 'duckduckgo';
}

function ResultCard({ r, onLocate, onOpen }: { r: SearchResult; onLocate: (lat: number, lng: number) => void; onOpen: (url: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasCoords = r.lat != null && r.lng != null;
  const hasImage = !!r.thumbnail;

  return (
    <div className="border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--hover-accent)] transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2 flex items-start gap-2"
      >
        {hasImage ? (
          <img src={r.thumbnail} alt="" className="w-8 h-8 rounded object-cover shrink-0 mt-0.5" loading="lazy" />
        ) : hasCoords ? (
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-1 text-[var(--gold-primary)]" />
        ) : (
          <Globe className="w-3.5 h-3.5 shrink-0 mt-1 text-[var(--gold-primary)]" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] text-[var(--text-secondary)] font-mono leading-tight truncate">{r.label}</span>
            <ChevronDown className={`w-3 h-3 shrink-0 text-[var(--text-muted)] transition-transform mt-0.5 ${expanded ? 'rotate-180' : ''}`} />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[8px] font-mono tracking-widest uppercase" style={{ color: getSourceLabel(parseSource(r)).color }}>
              {r.type}
            </span>
            {hasCoords && (
              <span className="text-[7px] font-mono text-[var(--text-muted)]">
                {r.lat!.toFixed(4)}, {r.lng!.toFixed(4)}
              </span>
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 pl-[42px] space-y-1.5">
              {r.description && (
                <p className="text-[10px] text-white/40 font-mono leading-relaxed">{r.description}</p>
              )}
              {r.url && (
                <button
                  onClick={(e) => { e.stopPropagation(); onOpen(r.url!); }}
                  className="flex items-center gap-1 text-[10px] font-mono text-[var(--gold-primary)] hover:underline"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  Apri link
                </button>
              )}
              {hasCoords && (
                <button
                  onClick={(e) => { e.stopPropagation(); onLocate(r.lat!, r.lng!); }}
                  className="flex items-center gap-1 text-[10px] font-mono text-[var(--cyan-primary)] hover:underline"
                >
                  <MapPin className="w-2.5 h-2.5" />
                  Vai sulla mappa
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SearchPanel({ results, query, onLocate, onClose, onClear }: SearchPanelProps) {
  const [filter, setFilter] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of results) {
      const src = parseSource(r);
      if (!groups[src]) groups[src] = [];
      groups[src].push(r);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => (SOURCE_ORDER[a] ?? 99) - (SOURCE_ORDER[b] ?? 99));
  }, [results]);

  const filtered = useMemo(() => {
    if (!filter) return grouped;
    return grouped.filter(([src]) => src === filter);
  }, [grouped, filter]);

  const geoResults = useMemo(() => results.filter(r => r.lat != null && r.lng != null), [results]);
  const webResults = useMemo(() => results.filter(r => !r.lat && r.url), [results]);

  const handleOpenUrl = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleLocate = useCallback((lat: number, lng: number) => {
    onLocate(lat, lng);
  }, [onLocate]);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(results, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `osiris-search-${query.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results, query]);

  const handleExportMapCSV = useCallback(() => {
    const csv = 'lat,lng,label,type,url,source\n' + geoResults.map(r =>
      `"${r.lat}","${r.lng}","${(r.label||'').replace(/"/g,'""')}","${r.type}","${(r.url||'').replace(/"/g,'""')}","${r.source||''}"`
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `osiris-geo-${query.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [geoResults, query]);

  const allSources = grouped.map(([src]) => src).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="glass-panel flex flex-col overflow-hidden pointer-events-auto"
      style={{ width: '400px', maxHeight: '80vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-secondary)]">
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
          <span className="text-[12px] font-mono tracking-widest text-[var(--text-primary)]">RISULTATI RICERCA</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--gold-primary)]/10 text-[var(--gold-primary)]">
            {results.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleExport} className="p-1 hover:bg-[var(--hover-accent)] rounded transition-colors" title="Esporta JSON">
            <Download className="w-3 h-3 text-[var(--text-muted)] hover:text-[var(--gold-primary)]" />
          </button>
          <button onClick={onClear} className="p-1 hover:bg-[var(--hover-accent)] rounded transition-colors" title="Cancella risultati">
            <Trash2 className="w-3 h-3 text-[var(--text-muted)] hover:text-[var(--gold-primary)]" />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-[var(--hover-accent)] rounded transition-colors">
            <X className="w-3 h-3 text-[var(--text-muted)] hover:text-[var(--gold-primary)]" />
          </button>
        </div>
      </div>

      {/* Query display */}
      {query && (
        <div className="px-4 py-1.5 border-b border-[var(--border-secondary)]">
          <span className="text-[9px] font-mono text-[var(--text-muted)]">{query}</span>
        </div>
      )}

      {/* Filter tabs */}
      {allSources.length > 1 && (
        <div className="flex gap-1 px-3 py-2 border-b border-[var(--border-secondary)] overflow-x-auto styled-scrollbar">
          <button
            onClick={() => setFilter(null)}
            className={`text-[8px] font-mono tracking-widest px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
              !filter ? 'bg-[var(--gold-primary)]/20 text-[var(--gold-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            TUTTI ({results.length})
          </button>
          {grouped.map(([src, items]) => (
            <button
              key={src}
              onClick={() => setFilter(src)}
              className={`text-[8px] font-mono tracking-widest px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                filter === src ? 'bg-[var(--gold-primary)]/20 text-[var(--gold-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              style={{ '--src-color': getSourceLabel(src).color } as React.CSSProperties}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: getSourceLabel(src).color }} />
              {getSourceLabel(src).label} ({items.length})
            </button>
          ))}
        </div>
      )}

      {/* Summary bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-[var(--border-secondary)] bg-[var(--bg-void)]/30">
        <span className="text-[8px] font-mono text-[var(--text-muted)]">
          <MapPin className="w-2.5 h-2.5 inline mr-0.5 align-text-bottom" />
          {geoResults.length} geo
        </span>
        <span className="text-[8px] font-mono text-[var(--text-muted)]">
          <Globe className="w-2.5 h-2.5 inline mr-0.5 align-text-bottom" />
          {webResults.length} web
        </span>
        {geoResults.length > 0 && (
          <button
            onClick={handleExportMapCSV}
            className="text-[8px] font-mono text-[var(--gold-primary)] hover:underline ml-auto"
          >
            <Download className="w-2.5 h-2.5 inline mr-0.5 align-text-bottom" />
            CSV coordinate
          </button>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto styled-scrollbar">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Search className="w-8 h-8 text-[var(--text-muted)] mb-2 opacity-30" />
            <p className="text-[11px] font-mono text-[var(--text-muted)]">Nessun risultato per questo filtro</p>
          </div>
        )}
        {filtered.map(([src, items]) => (
          <div key={src}>
            {/* Source header */}
            <div className="sticky top-0 bg-[var(--bg-panel)]/95 backdrop-blur px-3 py-1.5 border-b border-[var(--border-secondary)] z-10">
              <span className="text-[9px] font-mono tracking-widest" style={{ color: getSourceLabel(src).color }}>
                {getSourceLabel(src).label}
              </span>
              <span className="text-[8px] font-mono text-[var(--text-muted)] ml-2">{items.length}</span>
            </div>
            {/* Items */}
            {items.map((r, i) => (
              <ResultCard key={`${src}-${i}`} r={r} onLocate={handleLocate} onOpen={handleOpenUrl} />
            ))}
          </div>
        ))}
      </div>

      {/* Bottom: social OSINT links */}
      {/* Bottom: OSINT links — sempre visibili */}
      <div className="border-t border-[var(--border-secondary)] bg-[var(--bg-void)]/50">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest">RICERCA MANUALE SU OSINT</span>
            <button onClick={() => {
              // Apre TUTTI i link in nuove tab
              const urls = [
                `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                `https://www.bing.com/search?q=${encodeURIComponent(query)}&cc=it`,
                `https://www.facebook.com/search/top/?q=${encodeURIComponent(query)}`,
                `https://www.instagram.com/web/search/topsearch/?query=${encodeURIComponent(query)}`,
                `https://twitter.com/search?q=${encodeURIComponent(query)}&f=user`,
                `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(query)}`,
                `https://www.paginebianche.it/ricerca?qs=${encodeURIComponent(query)}`,
                `https://www.paginegialle.it/ricerca?qs=${encodeURIComponent(query)}`,
                `https://www.tiktok.com/search?q=${encodeURIComponent(query)}`,
                `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
                `https://opencorporates.com/search?q=${encodeURIComponent(query)}&jurisdiction_code=it`,
              ];
              for (const url of urls) {
                window.open(url, '_blank', 'noopener,noreferrer');
              }
            }} className="text-[8px] font-mono px-2 py-0.5 rounded border border-[var(--gold-primary)]/30 text-[var(--gold-primary)] hover:bg-[var(--gold-primary)]/10 transition-all">
              APRI TUTTO
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { href: `https://www.facebook.com/search/top/?q=${encodeURIComponent(query)}`, label: 'FB', color: '#1877F2' },
              { href: `https://www.instagram.com/web/search/topsearch/?query=${encodeURIComponent(query)}`, label: 'IG', color: '#E4405F' },
              { href: `https://twitter.com/search?q=${encodeURIComponent(query)}&f=user`, label: 'X', color: '#1DA1F2' },
              { href: `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(query)}`, label: 'IN', color: '#0A66C2' },
              { href: `https://www.tiktok.com/search?q=${encodeURIComponent(query)}`, label: 'TT', color: '#000000' },
              { href: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, label: 'YT', color: '#FF0000' },
              { href: `https://www.google.com/search?q=${encodeURIComponent(query)}`, label: 'G', color: '#4285F4' },
              { href: `https://www.bing.com/search?q=${encodeURIComponent(query)}&cc=it`, label: 'BING', color: '#008373' },
              { href: `https://www.paginebianche.it/ricerca?qs=${encodeURIComponent(query)}`, label: 'PB', color: '#D40000' },
              { href: `https://www.paginegialle.it/ricerca?qs=${encodeURIComponent(query)}`, label: 'PG', color: '#FFCC00' },
              { href: `https://opencorporates.com/search?q=${encodeURIComponent(query)}&jurisdiction_code=it`, label: 'OC', color: '#FF9800' },
              { href: `https://www.whitepages.com/search?q=${encodeURIComponent(query)}`, label: 'WP', color: '#333333' },
            ].map(sm => (
              <a key={sm.label} href={sm.href} target="_blank" rel="noopener noreferrer"
                className="text-[9px] font-mono px-2 py-1 rounded border border-white/10 hover:border-white/30 transition-all"
                style={{ color: sm.color }}
              >
                {sm.label}
              </a>
            ))}
          </div>
        </div>
        <div className="px-3 pb-2 text-[7px] font-mono text-[var(--text-muted)] leading-relaxed">
          I dati pubblici su persone private sono limitati. Usa i link sopra per cercare manualmente su social e directory.
          Usa <strong className="text-[var(--gold-primary)]">APRI TUTTO</strong> per aprire tutti i siti contemporaneamente.
        </div>
      </div>
    </motion.div>
  );
}
