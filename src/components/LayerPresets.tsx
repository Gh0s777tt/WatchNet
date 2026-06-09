'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, FolderOpen, X, Trash2 } from 'lucide-react';

interface LayerPresetsProps {
  activeLayers: Record<string, boolean>;
  onLoad: (layers: Record<string, boolean>) => void;
}

const STORAGE_KEY = 'osiris_layer_presets';

export default function LayerPresets({ activeLayers, onLoad }: LayerPresetsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [presets, setPresets] = useState<Record<string, any>>({});
  const [newName, setNewName] = useState('');

  const loadPresets = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  }, []);

  useEffect(() => {
    setPresets(loadPresets());
  }, [loadPresets]);

  const savePreset = (name: string) => {
    if (!name.trim()) return;
    const p = loadPresets();
    p[name] = { ...activeLayers, _name: name, _ts: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setPresets(p);
    setNewName('');
  };

  const deletePreset = useCallback((name: string) => {
    const p = loadPresets();
    delete p[name];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setPresets(p);
  }, [loadPresets]);

  const entries = Object.entries(presets).filter(([k]) => !k.startsWith('_'));

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="glass-panel w-8 h-8 flex items-center justify-center pointer-events-auto hover:border-[var(--gold-primary)] transition-colors"
        title="Preset Layer"
      >
        <FolderOpen className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
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
              <span className="text-[11px] font-mono tracking-widest text-[var(--text-primary)]">PRESET LAYER</span>
              <button onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="flex gap-1 mb-3">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') savePreset(newName); if (e.key === 'Escape') { setNewName(''); setIsOpen(false); } }}
                placeholder="NOME PRESET..."
                className="flex-1 bg-[var(--bg-void)] border border-[var(--border-primary)] rounded px-2 py-1 text-[10px] font-mono text-[var(--text-primary)] outline-none"
              />
              <button
                onClick={() => savePreset(newName)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--gold-primary)]/10 text-[var(--gold-primary)] border border-[var(--gold-primary)]/30 text-[9px] font-mono hover:bg-[var(--gold-primary)]/20"
              >
                <Save className="w-2.5 h-2.5" /> SALVA
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto styled-scrollbar space-y-1">
              {entries.length === 0 && (
                <div className="text-[9px] font-mono text-[var(--text-muted)] text-center py-4">NESSUN PRESET SALVATO</div>
              )}
              {entries.map(([name, preset]) => (
                <div key={name} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-[var(--hover-accent)] group">
                  <button
                    onClick={() => onLoad(preset)}
                    className="flex items-center gap-1.5 flex-1 text-left"
                  >
                    <FolderOpen className="w-2.5 h-2.5 text-[var(--gold-primary)] flex-shrink-0" />
                    <span className="text-[10px] font-mono text-[var(--text-secondary)] truncate">{name}</span>
                  </button>
                  <button
                    onClick={() => deletePreset(name)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--alert-red)] transition-all"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
