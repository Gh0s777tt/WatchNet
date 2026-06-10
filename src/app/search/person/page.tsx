'use client';

import { useState, useEffect } from 'react';

interface PersonResult {
  name: string;
  source: string;
  type: string;
  url?: string;
  confidence: 'alta' | 'media' | 'bassa';
  details?: string;
}

export default function PersonSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonResult[]>([]);
  const [total, setTotal] = useState(0);
  const [sources, setSources] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('name') || params.get('q') || '';
    if (q) {
      setQuery(q);
      searchPerson(q);
    }
  }, []);

  async function searchPerson(name: string) {
    if (!name || name.length < 2) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/search/person?name=${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(data.results || []);
      setTotal(data.total || 0);
      setSources(data.sources || {});
    } catch (e: any) {
      setError(e.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      window.history.pushState({}, '', `/search/person?name=${encodeURIComponent(query.trim())}`);
      searchPerson(query.trim());
    }
  }

  const confidenceColors: Record<string, string> = {
    alta: '#39FF14',
    media: '#FFCC00',
    bassa: '#FF6600',
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-3 h-3 rounded-full bg-[#39FF14] animate-pulse" />
          <h1 className="text-sm md:text-base font-bold text-[#39FF14] tracking-widest uppercase">OSIRIS — Person Search</h1>
        </div>

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for a person by name..."
              className="flex-1 bg-black border border-[#39FF14]/30 rounded px-4 py-2 text-xs font-mono text-white placeholder-[#39FF14]/40 focus:outline-none focus:border-[#39FF14]"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#39FF14]/10 border border-[#39FF14]/30 rounded text-xs font-mono text-[#39FF14] hover:bg-[#39FF14]/20 transition-colors disabled:opacity-50"
            >
              {loading ? 'SEARCHING...' : 'SEARCH'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-4 p-3 border border-red-500/30 rounded text-[10px] text-red-400">
            Error: {error}
          </div>
        )}

        {total > 0 && (
          <div className="mb-4 flex items-center gap-3 text-[9px] text-[var(--text-muted)]">
            <span>{total} results</span>
            {Object.entries(sources).map(([key, val]) => (
              <span key={key} className="px-2 py-0.5 rounded bg-[var(--hover-accent)]">
                {key}: {val as number}
              </span>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#39FF14] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && results.length === 0 && query && !error && (
          <div className="text-center py-12 text-[10px] text-[var(--text-muted)]">
            No results found for &quot;{query}&quot;
          </div>
        )}

        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={i}
              className="p-3 border border-[var(--border-secondary)] rounded hover:border-[#39FF14]/30 transition-colors bg-black/40"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: confidenceColors[r.confidence] || '#666' }}
                  />
                  <span className="text-[11px] font-bold text-white truncate">{r.name}</span>
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[var(--hover-accent)] text-[var(--text-muted)]">
                    {r.source}
                  </span>
                  <span className="text-[8px] text-[var(--text-muted)]">({r.type})</span>
                </div>
                <span
                  className="text-[7px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{
                    backgroundColor: `${confidenceColors[r.confidence] || '#666'}20`,
                    color: confidenceColors[r.confidence] || '#666',
                  }}
                >
                  {r.confidence.toUpperCase()}
                </span>
              </div>
              {r.details && (
                <p className="text-[9px] text-[var(--text-muted)] ml-4 mb-1">{r.details}</p>
              )}
              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 text-[8px] text-[var(--cyan-primary)] hover:underline truncate block"
                >
                  {r.url}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
