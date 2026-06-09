'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Clock } from 'lucide-react';

interface TimelineSliderProps {
  timeRange: { start: number; end: number } | null;
  onChange: (range: { start: number; end: number } | null) => void;
}

export default function TimelineSlider({ timeRange, onChange }: TimelineSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [windowHours, setWindowHours] = useState(6);
  const [currentPos, setCurrentPos] = useState(1);
  const animRef = useRef<number | null>(null);

  // Intervallo 48h
  const totalMs = 48 * 60 * 60 * 1000;
  const now = Date.now();

  // Se nessun timeRange, mostra "LIVE" (tutti i dati, non filtrati)
  const isLive = timeRange === null;

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = parseFloat(e.target.value);
    setCurrentPos(pct);
    const start = now - totalMs + (totalMs * pct);
    const end = Math.min(start + windowHours * 60 * 60 * 1000, now);
    onChange({ start, end });
  }, [now, totalMs, windowHours, onChange]);

  const getTimeLabel = () => {
    if (isLive) return 'LIVE';
    const d = new Date(timeRange!.start);
    return d.toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
  };

  const togglePlay = useCallback(() => {
    if (!isPlaying) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [isPlaying]);

  // Ciclo animazione
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    const step = () => {
      setCurrentPos(prev => {
        const next = prev + 0.0005; // ~2min per frame
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        const start = now - totalMs + (totalMs * next);
        const end = Math.min(start + windowHours * 60 * 60 * 1000, now);
        onChange({ start, end });
        return next;
      });
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isPlaying, onChange, now, totalMs, windowHours]);

  const resetToLive = () => {
    setIsPlaying(false);
    setCurrentPos(1);
    onChange(null);
  };

  return (
    <div className="glass-panel px-4 py-2 flex items-center gap-4 pointer-events-auto z-[200] select-none">
      <button
        onClick={resetToLive}
        className={`text-[10px] font-mono tracking-widest px-2 py-1 rounded transition-colors ${isLive ? 'text-[var(--alert-green)] border border-[var(--alert-green)]/40' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
      >
        <Clock className="w-3 h-3 inline mr-1" />
        LIVE
      </button>

      <button
        onClick={togglePlay}
        className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--hover-accent)] transition-colors"
      >
        {isPlaying ? <Pause className="w-3 h-3 text-[var(--gold-primary)]" /> : <Play className="w-3 h-3 text-[var(--gold-primary)]" />}
      </button>

      <div className="relative flex-1 min-w-[120px] max-w-[200px]">
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={currentPos}
          onChange={handleSliderChange}
          className="w-full h-1 appearance-none bg-[var(--border-primary)] rounded-full outline-none cursor-pointer"
          style={{ accentColor: 'var(--gold-primary)' }}
        />
      </div>

      <span className="text-[10px] font-mono text-[var(--text-secondary)] min-w-[80px] tabular-nums">
        {getTimeLabel()}
      </span>

      <select
        value={windowHours}
        onChange={e => setWindowHours(Number(e.target.value))}
        className="bg-[var(--bg-void)] border border-[var(--border-primary)] rounded text-[9px] font-mono text-[var(--text-muted)] px-1 py-0.5 outline-none"
      >
        <option value={1}>1O</option>
        <option value={3}>3O</option>
        <option value={6}>6O</option>
        <option value={12}>12O</option>
        <option value={24}>24O</option>
      </select>
    </div>
  );
}
