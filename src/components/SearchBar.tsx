'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, MapPin, Clock } from 'lucide-react';

interface SearchBarProps {
  onLocate: (lat: number, lng: number) => void;
}

const STORAGE_KEY = 'osiris_search_history';
const MAX_HISTORY = 20;

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(q: string) {
  try {
    let h = loadHistory();
    h = [q, ...h.filter(x => x !== q)].slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
  } catch {}
}

export default function SearchBar({ onLocate }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [results, setResults] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setHistory(loadHistory());
      setShowHistory(true);
    } else {
      setShowHistory(false);
    }
  }, [open]);

  const parseCoords = (s: string): { lat: number; lng: number } | null => {
    const m = s.trim().match(/^([+-]?\d+\.?\d*)[,\s]+([+-]?\d+\.?\d*)$/);
    if (!m) return null;
    const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
    return null;
  };

  const handleSearch = useCallback(async (q: string) => {
    setValue(q);
    setShowHistory(false);
    const coords = parseCoords(q);
    if (coords) {
      setResults([{ label: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`, ...coords }]);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.trim().length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`, {
          headers: { 'Accept-Language': 'it' },
        });
        const data = await res.json();
        const nomResults = data.map((r: any) => ({ label: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }));
        
        try {
          const { searchInternet } = await import('@/lib/search-utils');
          const netResults = await searchInternet(q, 5);
          setResults([...nomResults, ...netResults]);
        } catch {
          setResults(nomResults);
        }
      } catch { setResults([]); }
      setLoading(false);
    }, 350);
  }, []);

  const handleSelect = (r: { lat: number; lng: number; label?: string }) => {
    onLocate(r.lat, r.lng);
    if (r.label) saveHistory(r.label);
    setOpen(false);
    setValue('');
    setResults([]);
  };

  const handleHistoryClick = (q: string) => {
    setValue(q);
    handleSearch(q);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 glass-panel-sm px-3 py-2 text-[11px] font-mono tracking-[0.15em] text-[var(--text-muted)] hover:text-[var(--gold-primary)] hover:border-[var(--border-active)] transition-all hover:shadow-[0_0_12px_rgba(212,175,55,0.08)]"
      >
        <Search className="w-3 h-3" />
        CMD: LOCALIZZA
      </button>
    );
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 glass-panel px-3 py-2.5 !border-[var(--border-active)]">
        <Search className="w-3.5 h-3.5 text-[var(--gold-primary)] flex-shrink-0" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setShowHistory(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); setValue(''); setResults([]); }
            if (e.key === 'Enter' && results.length > 0) handleSelect(results[0]);
          }}
          placeholder="INSERISCI COORDINATE O NOME TARGET..."
          className="flex-1 bg-transparent text-[12px] text-[var(--text-primary)] font-mono tracking-wider outline-none placeholder:text-[var(--text-muted)]"
        />
        {loading && <div className="w-3 h-3 border border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin" />}
        <button onClick={() => { setOpen(false); setValue(''); setResults([]); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Search history dropdown */}
      {showHistory && !value && history.length > 0 && !results.length && (
        <div className="absolute top-full left-0 right-0 mt-1 glass-panel overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)] max-h-[160px] overflow-y-auto styled-scrollbar z-50">
          <div className="px-3 py-1.5 text-[8px] font-mono text-[var(--text-muted)] tracking-widest border-b border-[var(--border-secondary)]">RICERCHE RECENTI</div>
          {history.map((q, i) => (
            <button
              key={i}
              onClick={() => handleHistoryClick(q)}
              className="w-full text-left px-3 py-2 hover:bg-[var(--hover-accent)] transition-colors border-b border-[var(--border-secondary)] last:border-0 flex items-center gap-2"
            >
              <Clock className="w-2.5 h-2.5 text-[var(--text-muted)] flex-shrink-0" />
              <span className="text-[10px] text-[var(--text-secondary)] font-mono truncate">{q}</span>
            </button>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 glass-panel overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)] max-h-[200px] overflow-y-auto styled-scrollbar z-50">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2.5 hover:bg-[var(--hover-accent)] transition-colors border-b border-[var(--border-secondary)] last:border-0 flex items-center gap-2"
            >
              <MapPin className="w-3 h-3 text-[var(--gold-primary)] flex-shrink-0" />
              <span className="text-[11px] text-[var(--text-secondary)] font-mono truncate">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
