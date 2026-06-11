'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Plus, Trash2, AlertTriangle, Radio, Plane, Skull, Globe, Flame, MapPin, Eye, Crosshair, Layers, BrainCircuit, Search, Bell, FileText, Maximize2, Minimize2, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import type { Playbook, PlaybookTrigger, PlaybookAction, TriggerType, ActionType } from '@/lib/playbook-engine';
import { PLAYBOOK_TEMPLATES, createPlaybookId } from '@/lib/playbook-engine';

interface PlaybookPanelProps {
  playbooks: Playbook[];
  setPlaybooks: (pbs: Playbook[]) => void;
  onFirePlaybook: (playbook: Playbook, location: { lat: number; lng: number }) => void;
}

const TRIGGER_TYPES: { type: TriggerType; label: string; icon: React.ComponentType<any>; color: string }[] = [
  { type: 'earthquake_magnitude', label: 'Earthquake Magnitude', icon: AlertTriangle, color: '#FF9500' },
  { type: 'gps_jamming_detected', label: 'GPS Jamming', icon: Radio, color: '#FF1744' },
  { type: 'malware_severity', label: 'Malware Risk', icon: Skull, color: '#D500F9' },
  { type: 'conflict_severity', label: 'Conflict Event', icon: Globe, color: '#FF3D3D' },
  { type: 'fire_detected', label: 'Fire Detected', icon: Flame, color: '#FF6B00' },
  { type: 'pin_proximity', label: 'Near Intel Pin', icon: MapPin, color: '#D4AF37' },
];

const ACTION_TYPES: { type: ActionType; label: string; icon: React.ComponentType<any>; color: string }[] = [
  { type: 'fly_to', label: 'Fly to Location', icon: Crosshair, color: '#00E5FF' },
  { type: 'drop_pin', label: 'Drop Intel Pin', icon: MapPin, color: '#D4AF37' },
  { type: 'toggle_layer', label: 'Toggle Layer', icon: Layers, color: '#448AFF' },
  { type: 'run_deep_dive', label: 'AI Deep Dive', icon: BrainCircuit, color: '#39FF14' },
  { type: 'run_region_dossier', label: 'Region Dossier', icon: FileText, color: '#00BCD4' },
  { type: 'run_osint_sweep', label: 'OSINT Sweep', icon: Search, color: '#87CEEB' },
  { type: 'generate_briefing', label: 'Generate Briefing', icon: Bell, color: '#D4AF37' },
];

const TRIGGER_PARAM_FORMS: Record<TriggerType, React.FC<{ params: Record<string, any>; onChange: (p: Record<string, any>) => void }>> = {
  earthquake_magnitude: ({ params, onChange }) => (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-[var(--text-muted)]">Min Magnitude:</span>
      <select value={params.minMagnitude || 5} onChange={e => onChange({ ...params, minMagnitude: Number(e.target.value) })}
        className="bg-[var(--bg-void)] text-[8px] font-mono text-[var(--text-primary)] px-1 py-0.5 rounded border border-[var(--border-secondary)]">
        {[4, 5, 6, 7, 8].map(v => <option key={v} value={v}>M{v}+</option>)}
      </select>
    </div>
  ),
  gps_jamming_detected: ({ params, onChange }) => (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-[var(--text-muted)]">Min Intensity:</span>
      <select value={params.minIntensity || 30} onChange={e => onChange({ ...params, minIntensity: Number(e.target.value) })}
        className="bg-[var(--bg-void)] text-[8px] font-mono text-[var(--text-primary)] px-1 py-0.5 rounded border border-[var(--border-secondary)]">
        {[10, 30, 50, 70, 90].map(v => <option key={v} value={v}>{v}+</option>)}
      </select>
    </div>
  ),
  malware_severity: ({ params, onChange }) => (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-[var(--text-muted)]">Min Risk:</span>
      <select value={params.minRisk || 7} onChange={e => onChange({ ...params, minRisk: Number(e.target.value) })}
        className="bg-[var(--bg-void)] text-[8px] font-mono text-[var(--text-primary)] px-1 py-0.5 rounded border border-[var(--border-secondary)]">
        {[3, 5, 7, 9].map(v => <option key={v} value={v}>{v}/10</option>)}
      </select>
    </div>
  ),
  conflict_severity: ({ params, onChange }) => (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-[var(--text-muted)]">Min Severity:</span>
      <select value={params.minSeverity || 'HIGH'} onChange={e => onChange({ ...params, minSeverity: e.target.value })}
        className="bg-[var(--bg-void)] text-[8px] font-mono text-[var(--text-primary)] px-1 py-0.5 rounded border border-[var(--border-secondary)]">
        {['LOW', 'ELEVATED', 'HIGH', 'CRITICAL'].map(v => <option key={v} value={v}>{v}</option>)}
      </select>
    </div>
  ),
  fire_detected: ({ params, onChange }) => (
    <span className="text-[8px] font-mono text-[var(--text-muted)]">Fires any severity</span>
  ),
  pin_proximity: ({ params, onChange }) => (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-[var(--text-muted)]">Near pin type:</span>
      <select value={params.threatType || 'earthquake'} onChange={e => onChange({ ...params, threatType: e.target.value })}
        className="bg-[var(--bg-void)] text-[8px] font-mono text-[var(--text-primary)] px-1 py-0.5 rounded border border-[var(--border-secondary)]">
        <option value="earthquake">Earthquake</option>
        <option value="fire">Fire</option>
        <option value="gdelt">Conflict</option>
      </select>
      <span className="text-[8px] font-mono text-[var(--text-muted)]">km:</span>
      <input type="number" value={params.distance || 200} onChange={e => onChange({ ...params, distance: Number(e.target.value) })}
        className="w-12 bg-[var(--bg-void)] text-[8px] font-mono text-[var(--text-primary)] px-1 py-0.5 rounded border border-[var(--border-secondary)]" />
    </div>
  ),
};

const ACTION_PARAM_FORMS: Record<ActionType, React.FC<{ params: Record<string, any>; onChange: (p: Record<string, any>) => void }>> = {
  fly_to: ({ params, onChange }) => (
    <span className="text-[8px] font-mono text-[var(--text-muted)]">Zoom to incident location</span>
  ),
  drop_pin: ({ params, onChange }) => (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-[var(--text-muted)]">Severity:</span>
      <select value={params.severity || 'alert'} onChange={e => onChange({ ...params, severity: e.target.value })}
        className="bg-[var(--bg-void)] text-[8px] font-mono text-[var(--text-primary)] px-1 py-0.5 rounded border border-[var(--border-secondary)]">
        {['info', 'watch', 'alert', 'critical'].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
      </select>
      <span className="text-[8px] font-mono text-[var(--text-muted)]">Category:</span>
      <select value={params.category || 'threat'} onChange={e => onChange({ ...params, category: e.target.value })}
        className="bg-[var(--bg-void)] text-[8px] font-mono text-[var(--text-primary)] px-1 py-0.5 rounded border border-[var(--border-secondary)]">
        {['observation', 'threat', 'infrastructure', 'source', 'general'].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
      </select>
    </div>
  ),
  toggle_layer: ({ params, onChange }) => (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-[var(--text-muted)]">Layer:</span>
      <select value={params.layer || 'fires'} onChange={e => onChange({ ...params, layer: e.target.value })}
        className="bg-[var(--bg-void)] text-[8px] font-mono text-[var(--text-primary)] px-1 py-0.5 rounded border border-[var(--border-secondary)]">
        {['fires', 'flights', 'maritime', 'cctv', 'gps_jamming', 'malware', 'satellites', 'weather'].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
      </select>
      <span className="text-[8px] font-mono text-[var(--text-muted)]">State:</span>
      <button onClick={() => onChange({ ...params, state: !params.state })}
        className="text-[8px] font-mono px-1 py-0.5 rounded border"
        style={{ borderColor: params.state !== false ? 'var(--cyan-primary)' : 'var(--border-secondary)', color: params.state !== false ? 'var(--cyan-primary)' : 'var(--text-muted)' }}>
        {params.state !== false ? 'ON' : 'OFF'}
      </button>
    </div>
  ),
  run_deep_dive: () => <span className="text-[8px] font-mono text-[var(--text-muted)]">AI analysis of the entity</span>,
  run_region_dossier: () => <span className="text-[8px] font-mono text-[var(--text-muted)]">Fetch regional intel</span>,
  run_osint_sweep: () => <span className="text-[8px] font-mono text-[var(--text-muted)]">Sweep IPs in area</span>,
  generate_briefing: () => <span className="text-[8px] font-mono text-[var(--text-muted)]">Generate AI briefing</span>,
};

function PlaybookPanelInner({ playbooks, setPlaybooks, onFirePlaybook }: PlaybookPanelProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [maximized, setMaximized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const activeCount = playbooks.filter(p => p.enabled).length;
  const firedTotal = playbooks.reduce((s, p) => s + p.fireCount, 0);

  const handleToggle = useCallback((id: string) => {
    setPlaybooks(playbooks.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  }, [playbooks, setPlaybooks]);

  const handleDelete = useCallback((id: string) => {
    setPlaybooks(playbooks.filter(p => p.id !== id));
  }, [playbooks, setPlaybooks]);

  const handleAddTemplate = useCallback((template: Playbook) => {
    const newPb: Playbook = {
      ...template,
      id: createPlaybookId(),
      enabled: false,
      lastFiredAt: 0,
      fireCount: 0,
      createdAt: new Date().toISOString(),
    };
    setPlaybooks([...playbooks, newPb]);
  }, [playbooks, setPlaybooks]);

  const handleUpdate = useCallback((id: string, updates: Partial<Playbook>) => {
    setPlaybooks(playbooks.map(p => p.id === id ? { ...p, ...updates } : p));
  }, [playbooks, setPlaybooks]);

  const panelContent = (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors relative ${
          open ? 'bg-[var(--gold-primary)]/20' : 'hover:bg-white/10'
        }`}
        title="OPERATIONAL PLAYBOOKS"
      >
        <Play className={`w-4 h-4 ${open ? 'text-[var(--gold-primary)]' : 'text-white/60'}`} />
        {activeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--cyan-primary)] animate-osiris-pulse" />
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
              <Play className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
              <span className="text-[12px] font-mono font-bold text-[var(--text-primary)] tracking-wider">PLAYBOOKS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setMaximized(!maximized)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--gold-primary)] transition-colors">
                {maximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
              <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Templates */}
          <div className="px-3 py-2 border-b border-[var(--border-secondary)] bg-[var(--bg-void)]/30">
            <span className="text-[8px] font-mono text-[var(--text-muted)] tracking-wider">TEMPLATES</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {PLAYBOOK_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => handleAddTemplate(t)}
                  className="flex items-center gap-1 px-1.5 py-1 rounded bg-[var(--hover-accent)] hover:bg-white/[0.08] transition-colors border border-white/[0.06]">
                  <Plus className="w-2 h-2 text-[var(--cyan-primary)]" />
                  <span className="text-[7px] font-mono text-[var(--text-muted)]">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Playbook List */}
          <div className={`flex-1 overflow-y-auto styled-scrollbar ${maximized ? '' : 'max-h-[400px]'}`}>
            {playbooks.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <span className="text-[10px] font-mono text-[var(--text-muted)] tracking-widest">NO PLAYBOOKS</span>
                <p className="text-[9px] font-mono text-[var(--text-muted)]/50 mt-1">Add a template above to automate responses</p>
              </div>
            ) : (
              playbooks.map(pb => (
                <div key={pb.id} className="px-3 py-2 border-b border-[var(--border-secondary)]/50 last:border-0 hover:bg-[var(--hover-accent)] transition-colors">
                  <div className="flex items-start gap-2">
                    <button onClick={() => handleToggle(pb.id)}
                      className="mt-0.5 flex-shrink-0"
                      title={pb.enabled ? 'DISABLE' : 'ENABLE'}>
                      {pb.enabled
                        ? <ToggleRight className="w-4 h-4 text-[var(--cyan-primary)]" />
                        : <ToggleLeft className="w-4 h-4 text-[var(--text-muted)]" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-bold text-[var(--text-primary)] truncate">{pb.name}</span>
                        <span className="text-[7px] font-mono text-[var(--text-muted)]">fired {pb.fireCount}x</span>
                      </div>

                      {/* Triggers */}
                      <div className="mt-1 space-y-0.5">
                        {pb.triggers.map((tr, i) => {
                          const tDef = TRIGGER_TYPES.find(t => t.type === tr.type);
                          return (
                            <div key={i} className="flex items-center gap-1 text-[8px] font-mono" style={{ color: tDef?.color || 'var(--text-muted)' }}>
                              {tDef && <tDef.icon className="w-2 h-2" />}
                              <span>{tr.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Actions */}
                      <div className="mt-1 space-y-0.5">
                        {pb.actions.map((ac, i) => {
                          const aDef = ACTION_TYPES.find(a => a.type === ac.type);
                          return (
                            <div key={i} className="flex items-center gap-1 text-[8px] font-mono" style={{ color: aDef?.color || 'var(--text-muted)' }}>
                              <span className="text-white/30">→</span>
                              {aDef && <aDef.icon className="w-2 h-2" />}
                              <span>{ac.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      {maximized && editing === pb.id && (
                        <div className="mt-2 space-y-1.5 pt-1.5 border-t border-white/[0.06]">
                          <span className="text-[8px] font-mono text-[var(--gold-primary)]">TRIGGER PARAMS</span>
                          {pb.triggers.map((tr, i) => {
                            const ParamForm = TRIGGER_PARAM_FORMS[tr.type];
                            return ParamForm ? (
                              <ParamForm key={i}
                                params={tr.params}
                                onChange={(p) => {
                                  const triggers = [...pb.triggers];
                                  triggers[i] = { ...triggers[i], params: p };
                                  handleUpdate(pb.id, { triggers });
                                }}
                              />
                            ) : null;
                          })}
                          <span className="text-[8px] font-mono text-[var(--gold-primary)] block mt-1">ACTION PARAMS</span>
                          {pb.actions.map((ac, i) => {
                            const ParamForm = ACTION_PARAM_FORMS[ac.type];
                            return ParamForm ? (
                              <ParamForm key={i}
                                params={ac.params}
                                onChange={(p) => {
                                  const actions = [...pb.actions];
                                  actions[i] = { ...actions[i], params: p };
                                  handleUpdate(pb.id, { actions });
                                }}
                              />
                            ) : null;
                          })}
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[8px] font-mono text-[var(--text-muted)]">Cooldown:</span>
                            <select value={pb.cooldown} onChange={e => handleUpdate(pb.id, { cooldown: Number(e.target.value) })}
                              className="bg-[var(--bg-void)] text-[8px] font-mono text-[var(--text-primary)] px-1 py-0.5 rounded border border-[var(--border-secondary)]">
                              <option value={300000}>5 min</option>
                              <option value={600000}>10 min</option>
                              <option value={900000}>15 min</option>
                              <option value={1800000}>30 min</option>
                              <option value={3600000}>1 hr</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button onClick={() => setEditing(editing === pb.id ? null : pb.id)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--gold-primary)] transition-colors">
                        <Save className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => handleDelete(pb.id)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--alert-red)] transition-colors">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-[var(--border-secondary)] bg-[var(--bg-void)]/50">
            <span className="text-[8px] font-mono text-[var(--text-muted)]/60 tracking-wider">
              {activeCount} ACTIVE · {firedTotal} FIRED · CLICK TOGGLE TO ENABLE
            </span>
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

export default memo(PlaybookPanelInner);
