'use client';

import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Image, Headphones, Globe, Upload, X, Send,
  CheckCircle, AlertTriangle, Loader2, MapPin, Download,
  Maximize2, Minimize2, Crosshair, Zap, FileType, Terminal,
  BookOpen, Link, ExternalLink, Network, User, Plus
} from 'lucide-react';
import {
  PersonalEntity, PersonalEntityType, PersonalGraphNode, PersonalGraphLink,
  PERSONAL_TYPE_COLORS, PERSONAL_TYPE_LABELS,
  PersonalDomain,
  loadPersonalStore, savePersonalStore, buildGraph,
  crossReferenceStore, generateEntityId,
} from '@/lib/personal-ontology';

type PipelineTab = 'file' | 'image' | 'audio' | 'url' | 'ontology';

interface ClausedPipelinePanelProps {
  onLocate: (lat: number, lng: number) => void;
  onIngest: (data: any) => void;
  embedded?: boolean;
  onClose?: () => void;
  onOpenPersonalGraph?: () => void;
}

const TABS: { id: PipelineTab; label: string; icon: React.ComponentType<any>; color: string }[] = [
  { id: 'file', label: 'FILE', icon: FileText, color: '#448AFF' },
  { id: 'image', label: 'IMAGE', icon: Image, color: '#39FF14' },
  { id: 'audio', label: 'AUDIO', icon: Headphones, color: '#D500F9' },
  { id: 'url', label: 'URL', icon: Globe, color: '#FFD500' },
  { id: 'ontology', label: 'ONTOLOGY', icon: Network, color: '#B388FF' },
];

function ClausedPipelinePanelInner({ onLocate, onIngest, embedded, onClose, onOpenPersonalGraph }: ClausedPipelinePanelProps) {
  const [open, setOpen] = useState(embedded || false);
  const [activeTab, setActiveTab] = useState<PipelineTab>('file');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [maximized, setMaximized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [ingested, setIngested] = useState<string[]>([]);
  const [graphEntities, setGraphEntities] = useState<number>(0);

  // Auto-open when embedded
  useEffect(() => { if (embedded) setOpen(true); }, [embedded]);

  // File tab state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');

  // Image tab state
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Audio tab state
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // URL tab state
  const [urlInput, setUrlInput] = useState('');

  // Ontology tab state
  const [ontologyInput, setOntologyInput] = useState('');
  const [aiEntities, setAiEntities] = useState<PersonalEntity[]>([]);
  const [selectedForGraph, setSelectedForGraph] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
    const store = loadPersonalStore();
    setGraphEntities(store.entities.length);
  }, []);

  const resetResult = () => { setResult(null); setError(null); };

  // ── FILE HANDLERS ──
  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file);
    resetResult();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleProcessFile = useCallback(async () => {
    resetResult();
    const file = selectedFile;
    if (!file && !textInput.trim()) return;
    setLoading(true);
    try {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/claused-pipeline', {
          method: 'POST', body: formData,
        });
        const data = await res.json();
        if (data.success) setResult(data.result);
        else setError(data.error);
      } else {
        const res = await fetch('/api/claused-pipeline', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'process-text', text: textInput, textType: 'general' }),
        });
        const data = await res.json();
        if (data.success) setResult(data.result);
        else setError(data.error);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [selectedFile, textInput]);

  // ── IMAGE HANDLERS ──
  const handleImageSelect = useCallback((file: File | null) => {
    setImageFile(file);
    resetResult();
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else setImagePreview(null);
  }, []);

  const handleProcessImage = useCallback(async () => {
    if (!imageFile) return;
    resetResult(); setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string)?.split(',')[1];
        if (!base64) { setError('Failed to read image'); setLoading(false); return; }
        const res = await fetch('/api/claused-pipeline', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'process-image', image: base64, fileName: imageFile.name }),
        });
        const data = await res.json();
        if (data.success) setResult(data.result); else setError(data.error);
        setLoading(false);
      };
      reader.readAsDataURL(imageFile);
    } catch (e: any) { setError(e.message); setLoading(false); }
  }, [imageFile]);

  // ── AUDIO HANDLERS ──
  const handleProcessAudio = useCallback(async () => {
    if (!audioFile) return;
    resetResult(); setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string)?.split(',')[1];
        if (!base64) { setError('Failed to read audio'); setLoading(false); return; }
        const res = await fetch('/api/claused-pipeline', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'process-audio', audio: base64, fileName: audioFile.name }),
        });
        const data = await res.json();
        if (data.success) setResult(data.result); else setError(data.error);
        setLoading(false);
      };
      reader.readAsDataURL(audioFile);
    } catch (e: any) { setError(e.message); setLoading(false); }
  }, [audioFile]);

  // ── URL HANDLERS ──
  const handleProcessUrl = useCallback(async () => {
    if (!urlInput.trim()) return;
    resetResult(); setLoading(true);
    try {
      const res = await fetch('/api/claused-pipeline', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process-url', url: urlInput.trim() }),
      });
      const data = await res.json();
      if (data.success) setResult(data.result); else setError(data.error);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [urlInput]);

  // ── ONTOLOGY AI PARSING ──
  const handleParseOntology = useCallback(async () => {
    if (!ontologyInput.trim()) return;
    setLoading(true); setError(null); setAiEntities([]);
    try {
      const res = await fetch('/api/claused-pipeline', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process-text', text: ontologyInput, textType: 'personal_ontology' }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.result);
        // If AI returned structured entities, display them
        if (data.result.parsedEntities && data.result.parsedEntities.length > 0) {
          setAiEntities(data.result.parsedEntities);
          setSelectedForGraph(new Set(data.result.parsedEntities.map((e: PersonalEntity) => e.id)));
        }
      } else setError(data.error);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [ontologyInput]);

  const handleAddToGraph = useCallback((entity: PersonalEntity) => {
    const store = loadPersonalStore();
    store.entities.push(entity);
    savePersonalStore(store);
    // Auto cross-reference
    const newRels = crossReferenceStore(store);
    if (newRels.length > 0) {
      store.relationships.push(...newRels);
      savePersonalStore(store);
    }
    setGraphEntities(store.entities.length);
    setSelectedForGraph(prev => { const s = new Set(prev); s.delete(entity.id); return s; });
    onIngest({ title: `Ontology: ${entity.label}`, type: entity.type, lat: entity.coordinates?.lat, lng: entity.coordinates?.lng });
  }, [onIngest]);

  const handleAddAllToGraph = useCallback(() => {
    const store = loadPersonalStore();
    for (const entity of aiEntities) {
      if (selectedForGraph.has(entity.id) && !store.entities.find(e => e.id === entity.id)) {
        store.entities.push(entity);
      }
    }
    savePersonalStore(store);
    const newRels = crossReferenceStore(store);
    if (newRels.length > 0) {
      store.relationships.push(...newRels);
      savePersonalStore(store);
    }
    setGraphEntities(store.entities.length);
    setAiEntities([]);
    setResult(null);
    setOntologyInput('');
    onIngest({ title: `Added ${store.entities.length} ontology entities`, type: 'ontology_batch' });
  }, [aiEntities, selectedForGraph, onIngest]);

  // ── INGEST ──
  const handleIngest = useCallback(async (severity?: string) => {
    if (!result) return;
    setLoading(true);
    try {
      const res = await fetch('/api/claused-pipeline', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ingest',
          data: { ...result, severity: severity || 'info', category: 'intel' },
          coords: result.extractedCoords,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIngested(prev => [data.intelItem.id, ...prev.slice(0, 9)]);
        setResult(null);
        setSelectedFile(null); setImageFile(null); setImagePreview(null);
        setAudioFile(null); setUrlInput(''); setTextInput('');
        if (data.intelItem.lat && data.intelItem.lng) onLocate(data.intelItem.lat, data.intelItem.lng);
        onIngest(data.intelItem);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [result, onLocate, onIngest]);

  const panelContent = (
    <>
      {!embedded && (
        <button onClick={() => setOpen(!open)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors relative ${open ? 'bg-[#FF3D3D]/20' : 'hover:bg-white/10'}`}
          title="CLAUSED PIPELINE">
          <Zap className={`w-4 h-4 ${open ? 'text-[#FF3D3D]' : 'text-white/60'}`} />
          {ingested.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#FF3D3D] animate-osiris-pulse" />}
        </button>
      )}

      {open && (
        <div className={`glass-panel overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex flex-col transition-all duration-300 ${
          maximized ? 'fixed inset-4 z-[9999] bg-[#0a0a09]/95 backdrop-blur-3xl max-h-none' : 'absolute right-12 top-1/2 -translate-y-1/2 w-[420px] max-h-[90vh]'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border-secondary)]" style={{ borderColor: 'rgba(255,61,61,0.2)' }}>
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#FF3D3D]" />
              <span className="text-[12px] font-mono font-bold tracking-wider" style={{ color: '#FF3D3D' }}>CLAUSED PIPELINE</span>
              {graphEntities > 0 && <span className="text-[8px] font-mono text-white/40">{graphEntities} GRAPH</span>}
            </div>
            <div className="flex items-center gap-1.5">
              {result && !loading && (
                <button onClick={() => handleIngest()}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-mono font-bold transition-colors"
                  style={{ backgroundColor: 'rgba(255,61,61,0.2)', color: '#FF3D3D', border: '1px solid rgba(255,61,61,0.3)' }}>
                  <Send className="w-2.5 h-2.5" /> FEED
                </button>
              )}
              {onOpenPersonalGraph && (
                <button onClick={onOpenPersonalGraph}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-mono font-bold transition-colors"
                  style={{ backgroundColor: 'rgba(179,136,255,0.15)', color: '#B388FF', border: '1px solid rgba(179,136,255,0.25)' }}>
                  <Network className="w-2.5 h-2.5" /> GRAPH
                </button>
              )}
              <button onClick={() => setMaximized(!maximized)}
                className="p-1 hover:text-[var(--gold-primary)] transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {maximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
              <button onClick={() => { setOpen(false); onClose?.(); }} className="p-1 hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--border-secondary)]" style={{ borderColor: 'rgba(255,61,61,0.15)' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); resetResult(); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[8px] font-mono font-bold tracking-wider transition-colors"
                style={{
                  color: activeTab === tab.id ? tab.color : 'rgba(255,255,255,0.4)',
                  borderBottom: activeTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
                  backgroundColor: activeTab === tab.id ? `${tab.color}08` : 'transparent',
                }}>
                <tab.icon className="w-2.5 h-2.5" /> {tab.label}
              </button>
            ))}
          </div>

          <div className={`flex-1 overflow-y-auto styled-scrollbar ${maximized ? '' : 'max-h-[500px]'}`}>

            {/* ── FILE TAB ── */}
            {activeTab === 'file' && (
              <div className="p-3 space-y-2">
                <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${dragOver ? 'border-[#448AFF] bg-[#448AFF]/10' : 'border-white/10 hover:border-white/20'}`}>
                  <input ref={fileInputRef} type="file" accept=".json,.pdf,.txt,.csv,.md,.xml,.log" className="hidden"
                    onChange={e => handleFileSelect(e.target.files?.[0] || null)} />
                  {selectedFile ? (
                    <div>
                      <FileText className="w-6 h-6 mx-auto mb-1" style={{ color: '#448AFF' }} />
                      <p className="text-[10px] font-mono font-bold text-white">{selectedFile.name}</p>
                      <p className="text-[8px] font-mono text-[var(--text-muted)]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      <button onClick={e => { e.stopPropagation(); setSelectedFile(null); resetResult(); }}
                        className="mt-1 text-[8px] font-mono text-[var(--text-muted)] hover:text-[var(--alert-red)]">REMOVE</button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-6 h-6 mx-auto mb-1 text-[var(--text-muted)]" />
                      <p className="text-[9px] font-mono text-[var(--text-muted)]">DROP FILE or CLICK TO UPLOAD</p>
                      <p className="text-[7px] font-mono text-[var(--text-muted)]/50 mt-0.5">JSON, PDF, TXT, CSV, MD, XML</p>
                    </div>
                  )}
                </div>
                <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
                  placeholder="OR PASTE TEXT DIRECTLY..." rows={3}
                  className="w-full bg-[var(--bg-void)] text-[9px] font-mono text-[var(--text-primary)] px-2 py-1.5 rounded outline-none border border-[var(--border-secondary)] focus:border-[#448AFF] resize-none placeholder:text-[var(--text-muted)]" />
                <button onClick={handleProcessFile} disabled={(!selectedFile && !textInput.trim()) || loading}
                  className="w-full py-2 rounded text-[9px] font-mono font-bold transition-colors disabled:opacity-30"
                  style={{ backgroundColor: 'rgba(68,138,255,0.15)', color: '#448AFF', border: '1px solid rgba(68,138,255,0.25)' }}>
                  {loading ? 'PROCESSING...' : 'PROCESS FILE / TEXT'}
                </button>
              </div>
            )}

            {/* ── IMAGE TAB ── */}
            {activeTab === 'image' && (
              <div className="p-3 space-y-2">
                <div onClick={() => imageInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${imagePreview ? 'border-[#39FF14]/30' : 'border-white/10 hover:border-white/20'}`}>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageSelect(e.target.files?.[0] || null)} />
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto rounded" />
                      <p className="text-[9px] font-mono font-bold text-white mt-1">{imageFile?.name}</p>
                      <button onClick={e => { e.stopPropagation(); handleImageSelect(null); }}
                        className="text-[8px] font-mono text-[var(--text-muted)] hover:text-[var(--alert-red)]">REMOVE</button>
                    </div>
                  ) : (
                    <div>
                      <Image className="w-6 h-6 mx-auto mb-1 text-[var(--text-muted)]" />
                      <p className="text-[9px] font-mono text-[var(--text-muted)]">CLICK TO UPLOAD IMAGE</p>
                      <p className="text-[7px] font-mono text-[var(--text-muted)]/50 mt-0.5">PNG, JPG, GIF, WEBP</p>
                    </div>
                  )}
                </div>
                <button onClick={handleProcessImage} disabled={!imageFile || loading}
                  className="w-full py-2 rounded text-[9px] font-mono font-bold transition-colors disabled:opacity-30"
                  style={{ backgroundColor: 'rgba(57,255,20,0.15)', color: '#39FF14', border: '1px solid rgba(57,255,20,0.25)' }}>
                  {loading ? 'ANALYZING IMAGE...' : 'ANALYZE IMAGE WITH AI'}
                </button>
              </div>
            )}

            {/* ── AUDIO TAB ── */}
            {activeTab === 'audio' && (
              <div className="p-3 space-y-2">
                <div onClick={() => audioInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${audioFile ? 'border-[#D500F9]/30' : 'border-white/10 hover:border-white/20'}`}>
                  <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={e => setAudioFile(e.target.files?.[0] || null)} />
                  {audioFile ? (
                    <div>
                      <Headphones className="w-6 h-6 mx-auto mb-1" style={{ color: '#D500F9' }} />
                      <p className="text-[10px] font-mono font-bold text-white">{audioFile.name}</p>
                      <p className="text-[8px] font-mono text-[var(--text-muted)]">{(audioFile.size / 1024).toFixed(1)} KB</p>
                      <button onClick={e => { e.stopPropagation(); setAudioFile(null); resetResult(); }}
                        className="mt-1 text-[8px] font-mono text-[var(--text-muted)] hover:text-[var(--alert-red)]">REMOVE</button>
                    </div>
                  ) : (
                    <div>
                      <Headphones className="w-6 h-6 mx-auto mb-1 text-[var(--text-muted)]" />
                      <p className="text-[9px] font-mono text-[var(--text-muted)]">CLICK TO UPLOAD AUDIO</p>
                      <p className="text-[7px] font-mono text-[var(--text-muted)]/50 mt-0.5">MP3, WAV, M4A, OGG</p>
                    </div>
                  )}
                </div>
                <button onClick={handleProcessAudio} disabled={!audioFile || loading}
                  className="w-full py-2 rounded text-[9px] font-mono font-bold transition-colors disabled:opacity-30"
                  style={{ backgroundColor: 'rgba(213,0,249,0.15)', color: '#D500F9', border: '1px solid rgba(213,0,249,0.25)' }}>
                  {loading ? 'PROCESSING AUDIO...' : 'PROCESS AUDIO'}
                </button>
              </div>
            )}

            {/* ── URL TAB ── */}
            {activeTab === 'url' && (
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-1.5 p-2 rounded" style={{ backgroundColor: 'rgba(255,213,0,0.08)', border: '1px solid rgba(255,213,0,0.15)' }}>
                  <Link className="w-3 h-3 flex-shrink-0" style={{ color: '#FFD500' }} />
                  <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="ENTER URL TO INGEST..."
                    className="flex-1 bg-transparent text-[9px] font-mono text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                    onKeyDown={e => e.key === 'Enter' && handleProcessUrl()} />
                </div>
                <button onClick={handleProcessUrl} disabled={!urlInput.trim() || loading}
                  className="w-full py-2 rounded text-[9px] font-mono font-bold transition-colors disabled:opacity-30"
                  style={{ backgroundColor: 'rgba(255,213,0,0.15)', color: '#FFD500', border: '1px solid rgba(255,213,0,0.25)' }}>
                  {loading ? 'FETCHING...' : 'FETCH & ANALYZE'}
                </button>
              </div>
            )}

            {/* ── ONTOLOGY TAB ── */}
            {activeTab === 'ontology' && (
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Network className="w-3 h-3" style={{ color: '#B388FF' }} />
                  <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: '#B388FF' }}>AI PERSONAL ONTOLOGY EXTRACTION</span>
                </div>
                <p className="text-[7px] font-mono text-[var(--text-muted)]/70 leading-relaxed mb-1">
                  Paste any raw text about persons, phones, vehicles, social media, IDs, places, MAC addresses, events — AI will parse and structure it into ontology entities.
                </p>
                <textarea value={ontologyInput} onChange={e => setOntologyInput(e.target.value)}
                  placeholder={`PASTE RAW DATA HERE...\n\ne.g.:\n"John Smith, known as @jsmith on X, drives a black BMW X5 plate ABC123. His phone is +1-555-0100. Lives at 42 Elm St, NYC. Passport US123456."`}
                  rows={5}
                  className="w-full bg-[var(--bg-void)] text-[8px] font-mono text-[var(--text-primary)] px-2 py-1.5 rounded outline-none border border-white/10 focus:border-[#B388FF] resize-none placeholder:text-[var(--text-muted)]/50" />

                <button onClick={handleParseOntology} disabled={!ontologyInput.trim() || loading}
                  className="w-full py-2 rounded text-[9px] font-mono font-bold transition-colors disabled:opacity-30"
                  style={{ backgroundColor: 'rgba(179,136,255,0.15)', color: '#B388FF', border: '1px solid rgba(179,136,255,0.25)' }}>
                  {loading ? 'AI PARSING ENTITIES...' : 'AI PARSE → ONTOLOGY ENTITIES'}
                </button>

                {/* Open Personal Graph shortcut */}
                {onOpenPersonalGraph && (
                  <button onClick={onOpenPersonalGraph}
                    className="w-full py-1.5 rounded text-[8px] font-mono font-bold transition-colors flex items-center justify-center gap-1"
                    style={{ backgroundColor: 'rgba(179,136,255,0.08)', color: '#B388FF', border: '1px solid rgba(179,136,255,0.15)' }}>
                    <Network className="w-3 h-3" /> OPEN PERSONAL ONTOLOGY GRAPH ({graphEntities} entities)
                  </button>
                )}

                {/* Detected entities */}
                {aiEntities.length > 0 && (
                  <div className="space-y-1.5 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono text-white/50">{aiEntities.length} ENTITIES DETECTED</span>
                      <button onClick={handleAddAllToGraph}
                        className="px-2 py-0.5 rounded text-[7px] font-mono font-bold flex items-center gap-1"
                        style={{ backgroundColor: 'rgba(179,136,255,0.2)', color: '#B388FF' }}>
                        <Plus className="w-2 h-2" /> ADD ALL TO GRAPH
                      </button>
                    </div>
                    {aiEntities.map(entity => (
                      <div key={entity.id} className="p-2 rounded text-[8px] font-mono" style={{ backgroundColor: `${PERSONAL_TYPE_COLORS[entity.type]}10`, border: `1px solid ${PERSONAL_TYPE_COLORS[entity.type]}25` }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PERSONAL_TYPE_COLORS[entity.type] }} />
                            <span className="font-bold text-white text-[9px]">{entity.label}</span>
                            <span className="text-[7px] px-1 py-0.5 rounded" style={{ backgroundColor: `${PERSONAL_TYPE_COLORS[entity.type]}20`, color: PERSONAL_TYPE_COLORS[entity.type] }}>
                              {PERSONAL_TYPE_LABELS[entity.type]}
                            </span>
                          </div>
                          {selectedForGraph.has(entity.id) && (
                            <button onClick={() => handleAddToGraph(entity)}
                              className="px-1.5 py-0.5 rounded text-[7px] font-mono font-bold flex items-center gap-0.5"
                              style={{ backgroundColor: 'rgba(57,255,20,0.15)', color: '#39FF14' }}>
                              <Plus className="w-2 h-2" /> ADD
                            </button>
                          )}
                        </div>
                        {entity.description && <p className="text-[7px] text-white/50 mt-0.5">{entity.description}</p>}
                        {Object.keys(entity.properties).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(entity.properties).map(([k, v]) => (
                              <span key={k} className="text-[6px] px-1 py-0.5 rounded bg-black/30 text-white/60">
                                {k}: {String(v).slice(0, 30)}
                              </span>
                            ))}
                          </div>
                        )}
                        {entity.coordinates && (
                          <button onClick={() => onLocate(entity.coordinates!.lat, entity.coordinates!.lng)}
                            className="flex items-center gap-0.5 mt-1 text-[7px] font-mono" style={{ color: '#00E5FF' }}>
                            <Crosshair className="w-2 h-2" />
                            {entity.coordinates.lat.toFixed(4)}, {entity.coordinates.lng.toFixed(4)}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── RESULTS ── */}
            {loading && (
              <div className="px-3 py-4 text-center">
                <div className="w-4 h-4 border-2 rounded-full animate-spin mx-auto mb-2" style={{ borderColor: '#FF3D3D', borderTopColor: 'transparent' }} />
                <span className="text-[9px] font-mono" style={{ color: '#FF3D3D' }}>PROCESSING INTELLIGENCE...</span>
              </div>
            )}

            {error && (
              <div className="mx-3 mb-3 p-2 rounded" style={{ backgroundColor: 'rgba(255,61,61,0.1)', border: '1px solid rgba(255,61,61,0.2)' }}>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 text-[var(--alert-red)]" />
                  <span className="text-[8px] font-mono text-[var(--alert-red)]">{error}</span>
                </div>
              </div>
            )}

            {result && !loading && !aiEntities.length && (
              <div className="mx-3 mb-3 p-2.5 rounded" style={{ backgroundColor: 'rgba(255,61,61,0.05)', border: '1px solid rgba(255,61,61,0.15)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CheckCircle className="w-3 h-3 text-[var(--cyan-primary)]" />
                  <span className="text-[9px] font-mono font-bold text-[var(--cyan-primary)]">PROCESSED</span>
                  {result.extractedCoords && (
                    <button onClick={() => onLocate(result.extractedCoords.lat, result.extractedCoords.lng)}
                      className="ml-auto flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] font-mono"
                      style={{ backgroundColor: 'rgba(0,229,255,0.15)', color: '#00E5FF' }}>
                      <Crosshair className="w-2 h-2" /> {result.extractedCoords.lat.toFixed(3)}, {result.extractedCoords.lng.toFixed(3)}
                    </button>
                  )}
                </div>
                <p className="text-[8px] font-mono text-[var(--text-muted)] leading-relaxed">{result.summary || ''}</p>
                {result.analysis && maximized && (
                  <div className="mt-1.5 p-1.5 rounded bg-black/30">
                    <p className="text-[8px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto styled-scrollbar">{result.analysis.slice(0, 2000)}</p>
                  </div>
                )}
                <div className="flex gap-1.5 mt-2">
                  {['info', 'watch', 'alert', 'critical'].map(s => (
                    <button key={s} onClick={() => handleIngest(s)}
                      className="flex-1 py-1 rounded text-[7px] font-mono font-bold transition-colors"
                      style={{
                        backgroundColor: s === 'critical' ? 'rgba(255,61,61,0.2)' : s === 'alert' ? 'rgba(255,149,0,0.2)' : s === 'watch' ? 'rgba(255,213,0,0.2)' : 'rgba(57,255,20,0.15)',
                        color: s === 'critical' ? '#FF3D3D' : s === 'alert' ? '#FF9500' : s === 'watch' ? '#FFD500' : '#39FF14',
                        border: `1px solid ${s === 'critical' ? 'rgba(255,61,61,0.3)' : s === 'alert' ? 'rgba(255,149,0,0.3)' : s === 'watch' ? 'rgba(255,213,0,0.3)' : 'rgba(57,255,20,0.3)'}`,
                      }}>
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  if (maximized && mounted && typeof document !== 'undefined' && !embedded) {
    return createPortal(panelContent, document.body);
  }
  return panelContent;
}

export default memo(ClausedPipelinePanelInner);
