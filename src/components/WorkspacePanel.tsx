'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, FolderOpen, X, Trash2, Clock, MapPin, Layers, Maximize2, Minimize2, Check } from 'lucide-react';

interface WorkspaceMeta {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  pinCount: number;
  layerCount: number;
  hasBriefing: boolean;
}

interface WorkspacePanelProps {
  currentState: {
    pins: any[];
    activeLayers: Record<string, boolean>;
    mapView: { zoom: number; latitude: number; longitude: number };
    mapProjection: string;
    mapStyle: string;
  };
  onLoadWorkspace: (workspace: any) => void;
}

function WorkspacePanelInner({ currentState, onLoadWorkspace }: WorkspacePanelProps) {
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workspaces');
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchWorkspaces();
  }, [open, fetchWorkspaces]);

  const handleSave = useCallback(async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName.trim(),
          pins: currentState.pins,
          activeLayers: currentState.activeLayers,
          mapView: currentState.mapView,
          mapProjection: currentState.mapProjection,
          mapStyle: currentState.mapStyle,
        }),
      });
      if (res.ok) {
        setSaveConfirm(true);
        setTimeout(() => setSaveConfirm(false), 2000);
        setShowSaveDialog(false);
        setSaveName('');
        fetchWorkspaces();
      }
    } catch {} finally {
      setSaving(false);
    }
  }, [saveName, currentState, fetchWorkspaces]);

  const handleLoad = useCallback(async (id: string) => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/workspaces?id=${id}`, { method: 'PUT' });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          onLoadWorkspace(data.workspace);
          setOpen(false);
        }
      } else {
        setLoadError('Failed to load workspace');
      }
    } catch {
      setLoadError('Connection error');
    }
  }, [onLoadWorkspace]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/workspaces?id=${id}`, { method: 'DELETE' });
      setConfirmDelete(null);
      fetchWorkspaces();
    } catch {}
  }, [fetchWorkspaces]);

  const formatDate = (d: string) => {
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  const panelContent = (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          open ? 'bg-[var(--gold-primary)]/20' : 'hover:bg-white/10'
        }`}
        title="WORKSPACES"
      >
        <FolderOpen className={`w-4 h-4 ${open ? 'text-[var(--gold-primary)]' : 'text-white/60'}`} />
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
              <FolderOpen className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
              <span className="text-[12px] font-mono font-bold text-[var(--text-primary)] tracking-wider">WORKSPACES</span>
              {saveConfirm && <Check className="w-3 h-3 text-[var(--cyan-primary)]" />}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => { setShowSaveDialog(true); setSaveName(''); }}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--cyan-primary)] transition-colors"
                title="SAVE CURRENT STATE">
                <Save className="w-3 h-3" />
              </button>
              <button onClick={fetchWorkspaces}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--cyan-primary)] transition-colors"
                title="REFRESH">
                <FolderOpen className="w-3 h-3" />
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

          {/* Save Dialog */}
          <AnimatePresence>
            {showSaveDialog && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-[var(--border-secondary)] overflow-hidden"
              >
                <div className="px-3 py-2">
                  <input
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    placeholder="WORKSPACE NAME"
                    className="w-full bg-[var(--bg-void)] text-[10px] font-mono text-[var(--text-primary)] px-2 py-1.5 rounded outline-none border border-[var(--border-secondary)] focus:border-[var(--gold-primary)] mb-1.5"
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <button onClick={handleSave} disabled={saving || !saveName.trim()}
                      className="flex-1 py-1.5 rounded bg-[var(--gold-primary)]/15 text-[var(--gold-primary)] text-[9px] font-mono font-bold hover:bg-[var(--gold-primary)]/25 transition-colors disabled:opacity-30">
                      {saving ? 'SAVING...' : 'SAVE WORKSPACE'}
                    </button>
                    <button onClick={() => setShowSaveDialog(false)}
                      className="px-3 py-1.5 rounded text-[9px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border-secondary)] transition-colors">
                      CANCEL
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Workspace List */}
          <div className={`flex-1 overflow-y-auto styled-scrollbar ${maximized ? '' : 'max-h-[400px]'}`}>
            {loadError && (
              <div className="px-3 py-2">
                <span className="text-[9px] font-mono text-[var(--alert-red)]">{loadError}</span>
              </div>
            )}
            {loading && workspaces.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <div className="w-3 h-3 border border-[var(--cyan-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-[9px] font-mono text-[var(--text-muted)]">LOADING...</span>
              </div>
            ) : workspaces.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <span className="text-[10px] font-mono text-[var(--text-muted)] tracking-widest">NO WORKSPACES</span>
                <p className="text-[9px] font-mono text-[var(--text-muted)]/50 mt-1">Save your current state to create one</p>
              </div>
            ) : (
              workspaces.map(ws => (
                <div key={ws.id} className="px-3 py-2 border-b border-[var(--border-secondary)]/50 last:border-0 hover:bg-[var(--hover-accent)] transition-colors group">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-bold text-[var(--text-primary)] truncate">{ws.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[8px] font-mono text-[var(--text-muted)] flex items-center gap-0.5">
                          <Clock className="w-2 h-2" /> {formatDate(ws.updatedAt)}
                        </span>
                        <span className="text-[8px] font-mono text-[var(--text-muted)] flex items-center gap-0.5">
                          <MapPin className="w-2 h-2" /> {ws.pinCount} pins
                        </span>
                        <span className="text-[8px] font-mono text-[var(--text-muted)] flex items-center gap-0.5">
                          <Layers className="w-2 h-2" /> {ws.layerCount} layers
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleLoad(ws.id)}
                        className="p-1 text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)]/10 rounded transition-colors"
                        title="LOAD WORKSPACE">
                        <FolderOpen className="w-3 h-3" />
                      </button>
                      {confirmDelete === ws.id ? (
                        <button onClick={() => handleDelete(ws.id)}
                          className="p-1 text-[var(--alert-red)] hover:bg-[var(--alert-red)]/10 rounded transition-colors"
                          title="CONFIRM DELETE">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      ) : (
                        <button onClick={() => setConfirmDelete(ws.id)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--alert-red)] transition-colors"
                          title="DELETE">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-[var(--border-secondary)] bg-[var(--bg-void)]/50">
            <span className="text-[8px] font-mono text-[var(--text-muted)]/60 tracking-wider">
              {workspaces.length} WORKSPACES · CLICK FOLDER TO LOAD
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

export default memo(WorkspacePanelInner);
