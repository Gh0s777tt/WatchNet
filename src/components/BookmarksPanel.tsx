'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, X, MapPin, Trash2, Plus } from 'lucide-react';

const STORAGE_KEY = 'osiris_bookmarks';

interface Bookmark {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  ts: number;
}

export default function BookmarksPanel({ onNavigate }: { onNavigate: (lat: number, lng: number, zoom: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setBookmarks(JSON.parse(raw));
    } catch {}
  }, []);

  const save = useCallback((b: Bookmark[]) => {
    setBookmarks(b);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
  }, []);

  const addBookmark = useCallback(() => {
    if (!newName.trim()) return;
    const b: Bookmark = { name: newName.trim(), lat: 20, lng: 0, zoom: 3, ts: Date.now() };
    save([b, ...bookmarks]);
    setNewName('');
    setAdding(false);
  }, [newName, bookmarks, save]);

  const removeBookmark = useCallback((ts: number) => {
    save(bookmarks.filter(b => b.ts !== ts));
  }, [bookmarks, save]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'b' && !e.ctrlKey && !e.metaKey && !['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) {
        setIsOpen(p => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="glass-panel w-8 h-8 flex items-center justify-center pointer-events-auto hover:border-[var(--gold-primary)] transition-colors"
        title="Segnalibri (B)"
      >
        <Bookmark className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute bottom-14 right-0 w-64 glass-panel p-3 pointer-events-auto z-[300]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono tracking-widest text-[var(--text-primary)]">SEGNALIBRI</span>
              <button onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-3 h-3" />
              </button>
            </div>

            {adding ? (
              <div className="flex gap-1 mb-2">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addBookmark(); if (e.key === 'Escape') setAdding(false); }}
                  placeholder="NOME SEGNALIBRO..."
                  className="flex-1 bg-[var(--bg-void)] border border-[var(--border-primary)] rounded px-2 py-1 text-[10px] font-mono text-[var(--text-primary)] outline-none"
                  autoFocus
                />
                <button onClick={addBookmark} className="px-2 py-1 rounded bg-[var(--gold-primary)]/10 text-[var(--gold-primary)] border border-[var(--gold-primary)]/30 text-[9px] font-mono hover:bg-[var(--gold-primary)]/20">OK</button>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-[10px] font-mono text-[var(--text-muted)] hover:bg-[var(--hover-accent)] hover:text-[var(--gold-primary)] transition-colors mb-2">
                <Plus className="w-3 h-3" /> AGGIUNGI VISTA ATTUALE
              </button>
            )}

            <div className="max-h-48 overflow-y-auto styled-scrollbar space-y-1">
              {bookmarks.length === 0 && (
                <div className="text-[9px] font-mono text-[var(--text-muted)] text-center py-4">NESSUN SEGNALIBRO SALVATO</div>
              )}
              {bookmarks.map(b => (
                <div key={b.ts} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-[var(--hover-accent)] group">
                  <button onClick={() => onNavigate(b.lat, b.lng, b.zoom)} className="flex items-center gap-1.5 flex-1 text-left">
                    <MapPin className="w-2.5 h-2.5 text-[var(--gold-primary)] flex-shrink-0" />
                    <span className="text-[10px] font-mono text-[var(--text-secondary)] truncate">{b.name}</span>
                  </button>
                  <button onClick={() => removeBookmark(b.ts)} className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--alert-red)] transition-all">
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-2 text-center text-[7px] font-mono text-[var(--text-muted)] tracking-widest">PREMI [B] PER ATTIVARE/DISATTIVARE</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
