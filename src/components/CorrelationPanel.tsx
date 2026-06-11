'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, X, Maximize2, Minimize2, Crosshair, AlertTriangle, Radio, Plane, Camera, Skull, Shield, Zap, Globe } from 'lucide-react';
import type { Correlation } from '@/lib/correlation-engine';

interface CorrelationsPanelProps {
  data: Record<string, any[]>;
  onLocate: (lat: number, lng: number) => void;
}

const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  GPS_JAMMING_AT_CHOKEPOINT: Radio,
  FLIGHT_DIVERSION_NEAR_QUAKE: Plane,
  CYBER_NEAR_CONFLICT: Skull,
  QUAKE_NEAR_INFRASTRUCTURE: AlertTriangle,
  CCTV_NEAR_CONFLICT: Camera,
  MARITIME_ANOMALY: Zap,
  MULTI_EVENT_CLUSTER: Globe,
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#448AFF',
  ELEVATED: '#FFD500',
  HIGH: '#FF9500',
  CRITICAL: '#FF1744',
};

function CorrelationsPanelInner({ data, onLocate }: CorrelationsPanelProps) {
  const [open, setOpen] = useState(false);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [loading, setLoading] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevDataRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const fetchCorrelations = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/correlations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      setCorrelations(result.correlations || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [data, open]);

  // Auto-refresh correlations when data changes
  useEffect(() => {
    if (!open) return;
    const dataStamp = Date.now();
    if (dataStamp - prevDataRef.current > 30000) {
      prevDataRef.current = dataStamp;
      fetchCorrelations();
    }
  }, [data, open, fetchCorrelations]);

  // Periodic refresh
  useEffect(() => {
    if (open) {
      fetchCorrelations();
      intervalRef.current = setInterval(fetchCorrelations, 60000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open, fetchCorrelations]);

  const criticalCount = correlations.filter(c => c.severity === 'CRITICAL' || c.severity === 'HIGH').length;

  const panelContent = (
    <>
      {/* ── Toggle Button ── */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors relative ${
          open ? 'bg-[var(--gold-primary)]/20' : 'hover:bg-white/10'
        }`}
        title="INTELLIGENCE CORRELATIONS"
      >
        <Activity className={`w-4 h-4 ${open ? 'text-[var(--gold-primary)]' : 'text-white/60'}`} />
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
              <Activity className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
              <span className="text-[12px] font-mono font-bold text-[var(--text-primary)] tracking-wider">CORRELATIONS</span>
              {loading && <div className="w-2.5 h-2.5 border border-[var(--cyan-primary)] border-t-transparent rounded-full animate-spin" />}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={fetchCorrelations}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--cyan-primary)] transition-colors"
                title="REFRESH">
                <Activity className="w-3 h-3" />
              </button>
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

          {/* Content */}
          <div className={`flex-1 overflow-y-auto styled-scrollbar ${maximized ? '' : 'max-h-[400px]'}`}>
            {error ? (
              <div className="px-3 py-4 text-center">
                <span className="text-[10px] font-mono text-[var(--alert-red)]">{error}</span>
              </div>
            ) : correlations.length === 0 && !loading ? (
              <div className="px-3 py-6 text-center">
                <span className="text-[10px] font-mono text-[var(--text-muted)] tracking-widest">NO CORRELATIONS FOUND</span>
                <p className="text-[9px] font-mono text-[var(--text-muted)]/50 mt-1">Enable more data layers to detect patterns</p>
              </div>
            ) : loading && correlations.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <div className="w-3 h-3 border border-[var(--cyan-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-[9px] font-mono text-[var(--text-muted)]">SCANNING FOR PATTERNS...</span>
              </div>
            ) : (
              correlations.map(corr => {
                const Icon = TYPE_ICONS[corr.type] || Activity;
                return (
                  <div
                    key={corr.id}
                    className="px-3 py-2 border-b border-[var(--border-secondary)]/50 last:border-0 hover:bg-[var(--hover-accent)] transition-colors cursor-pointer"
                    onClick={() => onLocate(corr.location.lat, corr.location.lng)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex-shrink-0" style={{ color: SEVERITY_COLORS[corr.severity] }}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-bold text-[var(--text-primary)] truncate">
                            {corr.title}
                          </span>
                          <span
                            className="text-[8px] font-mono px-1 py-0.5 rounded flex-shrink-0"
                            style={{
                              backgroundColor: `${SEVERITY_COLORS[corr.severity]}20`,
                              color: SEVERITY_COLORS[corr.severity],
                            }}
                          >
                            {corr.severity}
                          </span>
                        </div>
                        <p className="text-[9px] font-mono text-[var(--text-secondary)] leading-relaxed mt-0.5 line-clamp-2">
                          {corr.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[8px] font-mono text-[var(--gold-primary)]">
                            RISK {corr.compoundRiskScore}/100
                          </span>
                          <span className="text-[8px] font-mono text-[var(--text-muted)]">
                            {corr.location.label}
                          </span>
                          <span className="text-[8px] font-mono text-[var(--text-muted)]">
                            {corr.entities.length} entities
                          </span>
                        </div>
                        {maximized && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {corr.entities.map((ent, i) => (
                              <span key={i} className="text-[8px] font-mono px-1 py-0.5 rounded bg-black/40 border border-white/[0.06] text-[var(--text-muted)]">
                                {ent.label}: {ent.details}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onLocate(corr.location.lat, corr.location.lng); }}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--cyan-primary)] transition-colors flex-shrink-0"
                        title="LOCATE"
                      >
                        <Crosshair className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {correlations.length > 0 && (
            <div className="px-3 py-1.5 border-t border-[var(--border-secondary)] bg-[var(--bg-void)]/50">
              <span className="text-[8px] font-mono text-[var(--text-muted)]/60 tracking-wider">
                {correlations.length} CORRELATIONS · {criticalCount} ACTIVE · CLICK TO LOCATE
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (maximized && mounted && typeof document !== 'undefined') {
    return createPortal(panelContent, document.body);
  }

  return panelContent;
}

export default memo(CorrelationsPanelInner);
