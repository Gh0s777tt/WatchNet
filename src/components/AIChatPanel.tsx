'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Loader2, Crosshair, MapPin } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AIChatPanelProps {
  pins?: { id: string; title: string; lat: number; lng: number; severity?: string; category?: string; tags?: string[] }[];
  activeLayers?: Record<string, boolean>;
  mapView?: { latitude: number; longitude: number; zoom: number };
  onFlyTo?: (lat: number, lng: number, zoom?: number) => void;
}

/** Parse action markers from LLM response */
const ACTION_RE = /\[FLY_TO:([\d.-]+),([\d.-]+)(?::(\d+))?\]/g;

export default function AIChatPanel({ pins = [], activeLayers = {}, mapView, onFlyTo }: AIChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: '**OSIRIS AI ready.** I can see your pins and all live data. Try:\n- "give me the coordinate of MyHome"\n- "what is the distance between MyHome and construction site"\n- "go to MyHome"\n- "list all aircraft near MyHome"\n- "find all cell towers near this point"',
    timestamp: Date.now(),
  }]);
  const [streaming, setStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [maximized, setMaximized] = useState(false);
  const [pendingActions, setPendingActions] = useState<{ lat: number; lng: number; zoom?: number }[]>([]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  // Execute pending fly-to actions
  useEffect(() => {
    if (pendingActions.length > 0 && onFlyTo) {
      const action = pendingActions[0];
      onFlyTo(action.lat, action.lng, action.zoom || 15);
      setPendingActions(prev => prev.slice(1));
    }
  }, [pendingActions, onFlyTo]);

  const sendMessage = useCallback(async () => {
    const q = query.trim();
    if (!q || streaming) return;

    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: q, timestamp: Date.now() }]);
    setStreaming(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const res = await fetch('/api/ai/osiris-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          context: {
            pins: pins.map(p => ({
              title: p.title, lat: p.lat, lng: p.lng,
              severity: p.severity || 'info',
              category: p.category || 'general',
              tags: p.tags || [],
            })),
            mapView: mapView ? { lat: mapView.latitude, lng: mapView.longitude, zoom: mapView.zoom } : null,
            activeLayers: Object.entries(activeLayers)
              .filter(([, v]) => v).map(([k]) => k),
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ **Error:** ${err.error || 'Request failed'}`,
          timestamp: Date.now(),
        }]);
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let responseText = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now() }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.done) break;
            if (parsed.error) {
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: `⚠️ **Error:** ${parsed.error}` };
                return copy;
              });
              break;
            }
            if (parsed.content) {
              responseText += parsed.content;
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: responseText };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ **Connection Error:** ${err.message}`,
          timestamp: Date.now(),
        }]);
      }
    } finally {
      setStreaming(false);
      setAbortController(null);
    }
  }, [query, streaming, pins, mapView, activeLayers]);

  // Parse and execute actions from latest assistant message
  useEffect(() => {
    if (streaming || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant') return;

    const actions: { lat: number; lng: number; zoom?: number }[] = [];
    let match;
    ACTION_RE.lastIndex = 0;
    while ((match = ACTION_RE.exec(last.content)) !== null) {
      actions.push({
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
        zoom: match[3] ? parseInt(match[3]) : 15,
      });
    }
    if (actions.length > 0) {
      setPendingActions(actions);
    }
  }, [messages, streaming]);

  const stopStreaming = useCallback(() => {
    abortController?.abort();
    setStreaming(false);
  }, [abortController]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Strip action markers from display content
  const displayContent = (content: string) => content.replace(ACTION_RE, '').trim();

  // Markdown renderer with clickable coordinate links
  const renderContent = (raw: string) => {
    const content = displayContent(raw);
    if (!content) return null;

    // Replace coordinate pairs with clickable buttons
    const coordRe = /\(?([\d.-]+)°,?\s*([\d.-]+)°\)?/g;
    const parts: { type: 'text' | 'coord'; text: string; lat?: number; lng?: number }[] = [];
    let lastIdx = 0;
    let m;
    while ((m = coordRe.exec(content)) !== null) {
      if (m.index > lastIdx) parts.push({ type: 'text', text: content.slice(lastIdx, m.index) });
      const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        parts.push({ type: 'coord', text: `${m[1]}°, ${m[2]}°`, lat, lng });
      } else {
        parts.push({ type: 'text', text: m[0] });
      }
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < content.length) parts.push({ type: 'text', text: content.slice(lastIdx) });

    const renderParts = () => parts.map((p, i) => {
      if (p.type === 'coord') {
        return (
          <button key={i} onClick={() => onFlyTo?.(p.lat!, p.lng!, 15)}
            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-[var(--cyan-primary)]/10 text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)]/20 transition-colors font-bold mx-0.5"
            title="Click to fly to this coordinate">
            <Crosshair className="w-2.5 h-2.5" />
            {p.text}
          </button>
        );
      }
      // Render markdown segments
      const lines = p.text.split('\n');
      return lines.map((line, j) => {
        if (line.startsWith('### ')) return <p key={`${i}-${j}`} className="text-[10px] font-bold text-[var(--gold-primary)] mt-2 mb-1 tracking-wider">{line.slice(4)}</p>;
        if (line.startsWith('## ')) return <p key={`${i}-${j}`} className="text-[11px] font-bold text-[var(--gold-primary)] mt-2.5 mb-1 tracking-wider">{line.slice(3)}</p>;
        if (line.startsWith('# ')) return <p key={`${i}-${j}`} className="text-[12px] font-bold text-[var(--gold-primary)] mt-3 mb-1 tracking-wider">{line.slice(2)}</p>;
        if (line.startsWith('**') && line.endsWith('**')) return <p key={`${i}-${j}`} className="text-[9px] font-bold text-[var(--cyan-primary)] mt-1.5 mb-0.5">{line.slice(2, -2)}</p>;
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return <p key={`${i}-${j}`} className="pl-3 text-[8px] text-[var(--text-secondary)] my-0.5">{line.trim().slice(2)}</p>;
        }
        if (line.match(/^\d+\.\s/)) {
          return <p key={`${i}-${j}`} className="pl-3 text-[8px] text-[var(--text-secondary)] my-0.5">{line.replace(/^\d+\.\s/, '')}</p>;
        }
        const boldParts = line.split(/(\*\*[^*]+\*\*)/g);
        if (boldParts.length > 1) {
          return <p key={`${i}-${j}`} className="text-[8px] text-[var(--text-secondary)] my-0.5 leading-relaxed">
            {boldParts.map((bp, k) => bp.startsWith('**') && bp.endsWith('**')
              ? <span key={k} className="font-bold text-white">{bp.slice(2, -2)}</span>
              : <span key={k}>{bp}</span>)}
          </p>;
        }
        if (line.trim() === '') return <div key={`${i}-${j}`} className="h-1" />;
        return <p key={`${i}-${j}`} className="text-[8px] text-[var(--text-secondary)] my-0.5 leading-relaxed">{line}</p>;
      });
    });

    return <>{renderParts()}</>;
  };

  return (
    <>
      {/* Toggle button */}
      <div className="relative group">
        <button
          onClick={() => setOpen(!open)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            open ? 'bg-[var(--cyan-primary)]/20' : 'hover:bg-white/10'
          }`}
          title="OSIRIS AI CHAT"
        >
          <MessageSquare className={`w-4 h-4 ${open ? 'text-[var(--cyan-primary)]' : 'text-white/60'}`} />
        </button>
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`${
              maximized
                ? 'fixed inset-4 z-[9999] bg-[#0a0a09]/95 backdrop-blur-3xl'
                : 'absolute right-12 top-1/2 -translate-y-1/2 w-[380px]'
            } glass-panel flex flex-col overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)]`}
            style={{ maxHeight: maximized ? 'none' : 'min(600px, 85vh)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border-secondary)] shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-[var(--cyan-primary)]" />
                <span className="text-[10px] font-mono font-bold text-[var(--text-primary)] tracking-wider">OSIRIS AI</span>
                {streaming && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-pulse" />
                    <span className="text-[7px] font-mono text-[#39FF14] tracking-widest">STREAMING</span>
                  </div>
                )}
                {pins.length > 0 && (
                  <span className="text-[7px] font-mono text-[var(--text-muted)]">{pins.length} pins</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setMessages([{
                      role: 'assistant',
                      content: '**OSIRIS AI ready.** I can see your pins and all live data. Try:\n- "give me the coordinate of MyHome"\n- "what is the distance between MyHome and construction site"\n- "go to MyHome"\n- "list all aircraft near MyHome"\n- "find all cell towers near this point"',
                      timestamp: Date.now(),
                    }]);
                  }}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--gold-primary)] transition-colors text-[7px] font-mono"
                  title="CLEAR"
                >
                  CLEAR
                </button>
                <button onClick={() => setMaximized(!maximized)}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <span className="text-[10px]">{maximized ? '⊞' : '⊡'}</span>
                </button>
                <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto styled-scrollbar px-3 py-2 space-y-2">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === 'user' ? 'bg-[var(--gold-primary)]/20' : 'bg-[var(--cyan-primary)]/20'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-3 h-3 text-[var(--gold-primary)]" />
                    ) : (
                      <Bot className="w-3 h-3 text-[var(--cyan-primary)]" />
                    )}
                  </div>
                  <div className={`flex-1 min-w-0 ${
                    msg.role === 'user'
                      ? 'bg-white/[0.06] rounded-lg px-2.5 py-1.5 max-w-[85%] ml-auto'
                      : 'max-w-[92%]'
                  }`}>
                    {msg.role === 'user' ? (
                      <p className="text-[8px] font-mono text-[var(--text-primary)] whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="text-[8px] font-mono text-[var(--text-secondary)] leading-relaxed">
                        {renderContent(msg.content)}
                        {i === messages.length - 1 && streaming && (
                          <span className="inline-block w-1.5 h-3 bg-[var(--cyan-primary)] animate-pulse ml-0.5 align-text-bottom" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-2 border-t border-[var(--border-secondary)] shrink-0 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about entities, pins, distances..."
                disabled={streaming}
                className="flex-1 bg-[var(--bg-void)] border border-[var(--border-secondary)] rounded px-2.5 py-2 text-[8px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--cyan-primary)]/40 disabled:opacity-50 placeholder:text-[var(--text-muted)]"
              />
              {streaming ? (
                <button onClick={stopStreaming}
                  className="p-2 rounded bg-[var(--alert-red)]/20 text-[var(--alert-red)] hover:bg-[var(--alert-red)]/30 transition-colors"
                  title="STOP">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </button>
              ) : (
                <button onClick={sendMessage} disabled={!query.trim()}
                  className="p-2 rounded bg-[var(--cyan-primary)]/10 text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)]/20 transition-colors disabled:opacity-30"
                  title="SEND">
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-1 border-t border-[var(--border-secondary)]/50 bg-[var(--bg-void)]/50 shrink-0 flex items-center gap-2">
              <span className="text-[6px] font-mono text-[var(--text-muted)]/60 tracking-wider">
                {pins.length} pins · {Object.values(activeLayers).filter(Boolean).length} layers active
              </span>
              {mapView && (
                <span className="text-[6px] font-mono text-[var(--text-muted)]/40 ml-auto">
                  @{mapView.latitude.toFixed(1)},{mapView.longitude.toFixed(1)} z{mapView.zoom.toFixed(1)}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
