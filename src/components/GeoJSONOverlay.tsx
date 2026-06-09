'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileJson, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'osiris_geojson_overlay';

interface GeoJSONOverlayProps {
  onData: (features: any[]) => void;
}

export default function GeoJSONOverlay({ onData }: GeoJSONOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.features?.length) {
          setFeatures(saved.features);
          setFileName(saved.fileName);
          onData(saved.features);
        }
      }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      let extracted: any[] = [];

      if (json.type === 'FeatureCollection' && Array.isArray(json.features)) {
        extracted = json.features;
      } else if (json.type === 'Feature') {
        extracted = [json];
      } else {
        console.warn('[GeoJSON] Unrecognized GeoJSON structure');
        return;
      }

      if (!extracted.length) return;

      setFeatures(extracted);
      setFileName(file.name);
      setShowPanel(true);
      onData(extracted);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ fileName: file.name, features: extracted }));
      } catch { /* quota */ }
    } catch (err) {
      console.warn('[GeoJSON] Parse error:', err);
    }

    e.target.value = '';
  }, [onData]);

  const clear = useCallback(() => {
    setFeatures([]);
    setFileName(null);
    setShowPanel(false);
    onData([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, [onData]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept=".json,.geojson"
        onChange={handleFile}
        className="hidden"
      />

      <button
        onClick={() => {
          if (features.length > 0) {
            setShowPanel(p => !p);
          } else {
            inputRef.current?.click();
          }
        }}
        className="glass-panel px-3 py-2.5 flex items-center gap-2 pointer-events-auto hover:border-[var(--gold-primary)]/40 transition-colors group"
        title="Carica overlay GeoJSON"
      >
        <Upload className="w-4 h-4 text-[var(--gold-primary)] group-hover:scale-110 transition-transform" />
        <span className="text-[11px] font-mono tracking-widest text-[var(--text-primary)]">GEOJSON</span>
        {features.length > 0 && (
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--alert-green)] animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {showPanel && fileName && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute bottom-14 left-0 w-64 glass-panel p-3 pointer-events-auto z-[300]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono tracking-widest text-[var(--text-primary)]">OVERLAY GEOJSON</span>
              <button onClick={() => setShowPanel(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-[var(--hover-accent)] mb-2">
              <FileJson className="w-2.5 h-2.5 text-[var(--cyan-primary)] flex-shrink-0" />
              <span className="text-[10px] font-mono text-[var(--text-secondary)] truncate flex-1">{fileName}</span>
            </div>

            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[10px] font-mono text-[var(--text-muted)]">{features.length} FEATURE</span>
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--alert-green)] animate-pulse" />
            </div>

            <button
              onClick={clear}
              className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-[9px] font-mono text-[var(--alert-red)] hover:bg-[var(--alert-red)]/10 transition-colors border border-transparent hover:border-[var(--alert-red)]/30"
            >
              <Trash2 className="w-2.5 h-2.5" /> PULISCI OVERLAY
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
