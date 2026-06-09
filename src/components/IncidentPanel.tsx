'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Bell, BellOff, ChevronDown, ChevronUp,
  Shield, ShieldAlert, Activity, MapPin, Clock, FileText,
} from 'lucide-react';

interface Incident {
  id: string;
  title: string;
  description: string;
  source: string;
  severityScore: number;
  severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  timestamp: string;
  location?: { lat: number; lng: number; place?: string; country?: string };
  status: string;
  tags: string[];
}

function getSeverityColor(level: string): string {
  switch (level) {
    case 'CRITICAL': return '#FF0044';
    case 'HIGH': return '#FF6600';
    case 'MEDIUM': return '#FFCC00';
    case 'LOW': return '#39FF14';
    default: return '#39FF14';
  }
}

function getSeverityLabel(level: string): string {
  switch (level) {
    case 'CRITICAL': return 'CRITICO';
    case 'HIGH': return 'ALTO';
    case 'MEDIUM': return 'MEDIO';
    case 'LOW': return 'BASSO';
    default: return level;
  }
}

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}g`;
  } catch { return ''; }
}

export default function IncidentPanel({ onLocate }: { onLocate?: (lat: number, lng: number) => void }) {
  const [expanded, setExpanded] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [notifications, setNotifications] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const es = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch('/api/incidents?limit=50')
      .then(r => r.json())
      .then(d => setIncidents(d.incidents || []))
      .catch(() => {});

    fetch('/api/incidents?mode=stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});

    return () => { es.current?.close(); };
  }, []);

  useEffect(() => {
    if (!notifications) return;
    const source = new EventSource('/api/incidents?mode=stream');
    es.current = source;

    source.addEventListener('incident', (e) => {
      try {
        const incident = JSON.parse(e.data) as Incident;
        setIncidents(prev => [incident, ...prev].slice(0, 100));
        setStats((prev: any) => prev ? {
          ...prev,
          total: prev.total + 1,
          bySeverity: {
            ...prev.bySeverity,
            [incident.severityLevel]: (prev.bySeverity[incident.severityLevel] || 0) + 1,
          },
          byStatus: {
            ...prev.byStatus,
            new: (prev.byStatus.new || 0) + 1,
          },
        } : prev);
        if (incident.severityLevel === 'CRITICAL' || incident.severityLevel === 'HIGH') {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`OSIRIS: ${incident.severityLevel} ${incident.title}`, {
              body: incident.description.slice(0, 100),
            });
          }
        }
      } catch {}
    });

    return () => source.close();
  }, [notifications]);

  const criticalCount = incidents.filter(i => i.severityLevel === 'CRITICAL').length;
  const highCount = incidents.filter(i => i.severityLevel === 'HIGH').length;

  return (
    <div className="fixed top-4 right-4 z-40 w-[380px] max-w-[calc(100vw-2rem)]">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-panel osiris-glow overflow-hidden"
        style={{ borderColor: criticalCount > 0 ? 'rgba(255, 0, 68, 0.5)' : highCount > 0 ? 'rgba(255, 102, 0, 0.4)' : 'rgba(57, 255, 20, 0.2)' }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-[var(--border-secondary)] hover:bg-[var(--hover-accent)] transition-colors"
        >
          <div className="flex items-center gap-2">
            {criticalCount > 0 || highCount > 0 ? (
              <ShieldAlert className="w-4 h-4 text-red-500" />
            ) : (
              <Shield className="w-4 h-4 text-[#39FF14]" />
            )}
            <span className="text-[10px] font-mono font-bold text-[#39FF14] tracking-wider">INCIDENTI</span>
            {stats && (
              <span className="text-[8px] font-mono text-[var(--text-muted)]">({stats.total})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="text-[8px] font-mono text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">{criticalCount} CRITICI</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setNotifications(!notifications); }}
              className="p-1 hover:bg-[var(--hover-accent)] rounded transition-colors"
            >
              {notifications ? <Bell className="w-3 h-3 text-[#39FF14]" /> : <BellOff className="w-3 h-3 text-[var(--text-muted)]" />}
            </button>
            {expanded ? <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" /> : <ChevronUp className="w-3 h-3 text-[var(--text-muted)]" />}
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              {stats && (
                <div className="flex gap-1 px-4 py-2 border-b border-[var(--border-secondary)] bg-black/20">
                  {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(level => (
                    <div key={level} className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getSeverityColor(level) }} />
                      <span className="text-[7px] font-mono text-[var(--text-muted)]">
                        {stats.bySeverity[level] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="max-h-[50vh] overflow-y-auto">
                {incidents.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Activity className="w-6 h-6 text-[#39FF14]/30 mx-auto mb-2" />
                    <p className="text-[8px] font-mono text-[var(--text-muted)]">NESSUN INCIDENTE</p>
                    <p className="text-[7px] font-mono text-[var(--text-muted)]/50 mt-1">In attesa di eventi...</p>
                  </div>
                ) : (
                  incidents.map(inc => (
                    <div key={inc.id}>
                      <button
                        onClick={() => setSelected(selected === inc.id ? null : inc.id)}
                        className="w-full text-left px-4 py-2.5 hover:bg-[var(--hover-accent)] transition-colors border-b border-[var(--border-secondary)]/50"
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0"
                            style={{ backgroundColor: getSeverityColor(inc.severityLevel) }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[8px] font-mono font-bold truncate text-white">{inc.title}</span>
                              <span
                                className="text-[6px] font-mono px-1 py-0.5 rounded flex-shrink-0"
                                style={{
                                  backgroundColor: `${getSeverityColor(inc.severityLevel)}20`,
                                  color: getSeverityColor(inc.severityLevel),
                                }}
                              >
                                {getSeverityLabel(inc.severityLevel)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[6px] font-mono text-[var(--text-muted)]">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{timeAgo(inc.timestamp)}</span>
                              <span>{inc.source}</span>
                              {inc.confidence > 0.7 && (
                                <span className="text-[#39FF14]">{(inc.confidence * 100).toFixed(0)}% conf.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {selected === inc.id && (
                        <div className="px-4 py-3 bg-black/40 border-b border-[var(--border-secondary)]/50">
                          <p className="text-[8px] font-mono text-[var(--text-muted)] leading-relaxed mb-2">{inc.description}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {inc.tags.map(tag => (
                              <span key={tag} className="text-[6px] font-mono px-1 py-0.5 rounded bg-[#39FF14]/10 text-[#39FF14]">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            {inc.location && (
                              <button
                                onClick={() => onLocate?.(inc.location!.lat, inc.location!.lng)}
                                className="flex items-center gap-1 text-[7px] font-mono text-[var(--cyan-primary)] hover:underline"
                              >
                                <MapPin className="w-2.5 h-2.5" /> MAPPA
                              </button>
                            )}
                            <span className="text-[7px] font-mono text-[var(--text-muted)]">
                              {inc.severityScore.toFixed(1)} score
                            </span>
                            <span className="text-[7px] font-mono text-[var(--text-muted)]">
                              ID: {inc.id}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
