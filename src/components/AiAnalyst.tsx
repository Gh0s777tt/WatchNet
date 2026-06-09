'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Send,
  Sparkles,
  Settings,
  X,
  Bot,
  User,
  AlertTriangle,
  Shield,
  ChevronDown,
  Loader2,
  Key,
  Check,
  Trash2,
} from 'lucide-react';
import type { IntelligenceContext } from '@/lib/ai-engine';

/* ═══════════════════════════════════════════════════════════════
   OSIRIS — Pannello Analista Intelligence IA
   Interfaccia chat premium glass-panel per analisi intelligence
   in tempo reale basata su Gemini 2.0 Flash
   ═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   Interfacce
   ───────────────────────────────────────────────────────────── */

interface DashboardData {
  earthquakes?: EarthquakeItem[];
  news?: NewsItem[];
  gdelt?: GdeltEvent[];
  markets?: MarketData;
  [key: string]: unknown;
}

interface EarthquakeItem {
  id: string;
  magnitude: number;
  location: string;
  lat: number;
  lng: number;
  depth: number;
  time: string;
  tsunami: boolean;
  felt: number | null;
  alert: string | null;
}

interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  published: string;
  source: string;
  risk_score: number;
  coords: [number, number] | null;
  machine_assessment: string | null;
}

interface GdeltEvent {
  title: string;
  type: string;
  lat: number;
  lng: number;
  date: string;
  source: string;
  tone: number;
}

interface MarketData {
  indices?: MarketIndex[];
  commodities?: MarketCommodity[];
}

interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

interface MarketCommodity {
  name: string;
  price: number;
  change: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'analyst';
  content: string;
  timestamp: string;
  isError?: boolean;
}

interface AiAnalystProps {
  data: DashboardData;
}

interface ToolConfig {
  pattern: RegExp
  label: string
  buildUrl: (match: RegExpMatchArray) => string
  formatResult: (data: any, query: string) => string
}

const TOOL_DISPATCHES: ToolConfig[] = [
  {
    pattern: /(?:scansiona?|analizza?|cerca)\s+(?:l[')]?\s*)?(?:IP\s+)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i,
    label: 'Scansione IP',
    buildUrl: (m) => `/api/scanner?target=${m[1]}&type=quick`,
    formatResult: (data, _query) => {
      const p = data.ports || [];
      return `📡 RISULTATI SCANSIONE IP: ${data.ip || data.target || _query}\n` +
        `Porte aperte: ${p.length > 0 ? p.map((x: any) => x.port || x).join(', ') : 'nessuna'}\n` +
        `ISP: ${data.isp || data.org || 'N/D'}\n` +
        `Paese: ${data.country || 'N/D'}`
    },
  },
  {
    pattern: /(?:whois|dominio)\s+([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,})/i,
    label: 'WHOIS Dominio',
    buildUrl: (m) => `/api/osint/whois?domain=${m[1]}`,
    formatResult: (data, _query) =>
      `📋 RISULTATI WHOIS: ${data.domain || _query}\n` +
      `Registrar: ${data.registrar || 'N/D'}\n` +
      `Creazione: ${data.creation_date || 'N/D'}\n` +
      `Scadenza: ${data.expiration_date || 'N/D'}\n` +
      `Organizzazione: ${data.org || 'N/D'}\n` +
      `Paese: ${data.country || 'N/D'}`,
  },
  {
    pattern: /dns\s+(?:di\s+)?([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,})/i,
    label: 'DNS Lookup',
    buildUrl: (m) => `/api/osint/dns?domain=${m[1]}`,
    formatResult: (data, _query) => {
      const recs = data.records || [];
      return `🌐 RISULTATI DNS: ${data.domain || _query}\n` +
        recs.map((r: any) => `  ${r.type || '?'} ${r.name || ''} → ${r.value || ''}`).join('\n')
    },
  },
  {
    pattern: /(?:mac|indirizzo\s+mac)\s+([0-9a-fA-F]{2}(?:[:-][0-9a-fA-F]{2}){5})/i,
    label: 'Indirizzo MAC',
    buildUrl: (m) => `/api/osint/mac?mac=${m[1]}`,
    formatResult: (data, _query) =>
      `🔍 RISULTATI MAC: ${data.mac || _query}\n` +
      `Vendor: ${data.vendor || 'N/D'}\n` +
      `Tipo: ${data.device_type || 'N/D'}`,
  },
  {
    pattern: /(?:bluetooth|bt)\s+(.+)/i,
    label: 'Bluetooth',
    buildUrl: (m) => `/api/osint/bluetooth?q=${encodeURIComponent(m[1].trim())}`,
    formatResult: (data, _query) => {
      const devs = data.devices || [];
      return `📶 RISULTATI BLUETOOTH (${devs.length} dispositivi)\n` +
        devs.slice(0, 10).map((d: any) =>
          `  ${d.name || '?'} | ${d.vendor || '?'} | MAC:${d.mac || '?'} | Segnale:${d.signal_strength ?? '?'}dBm | ${d.paired ? 'Accoppiato' : 'Non accoppiato'}`
        ).join('\n')
    },
  },
  {
    pattern: /(?:rete|network|scan\s+rete)\s+(.+)/i,
    label: 'Scansione Rete',
    buildUrl: (m) => `/api/osint/network-scan?ip=${encodeURIComponent(m[1].trim())}`,
    formatResult: (data, _query) => {
      const devs = data.devices || [];
      return `🌍 RISULTATI SCANSIONE RETE (${devs.length} dispositivi)\n` +
        `Subnet: ${data.network?.subnet || 'N/D'}\n` +
        devs.map((d: any) =>
          `  ${d.ip || '?'} | ${d.hostname || d.mdns_name || '?'} | ${d.vendor || '?'} | ${d.os || '?'} | Porte: ${(d.open_ports || []).map((p: any) => p.port).join(',')}`
        ).join('\n')
    },
  },
  {
    pattern: /(?:threats|minacce|threat)\s+(.+)/i,
    label: 'Threat Intelligence',
    buildUrl: (m) => `/api/osint/threats?query=${encodeURIComponent(m[1].trim())}`,
    formatResult: (data, _query) => {
      const t = data.threats || [];
      return `🚨 RISULTATI THREAT INTELLIGENCE (${t.length} minacce)\n` +
        t.slice(0, 15).map((x: any) =>
          `  ${x.severity || '?'} | ${x.type || '?'} | ${x.ioc || x.ip || x.domain || '?'} | ${x.source || '?'}`
        ).join('\n')
    },
  },
  {
    pattern: /(?:certificati|certs|ssl)\s+(.+)/i,
    label: 'Certificati SSL',
    buildUrl: (m) => `/api/osint/certs?domain=${encodeURIComponent(m[1].trim())}`,
    formatResult: (data, _query) => {
      const certs = data.certificates || [];
      return `🔐 RISULTATI CERTIFICATI (${certs.length} trovati)\n` +
        certs.slice(0, 10).map((c: any) =>
          `  CN:${c.common_name || c.name || '?'} | Valido:${c.issued || c.not_before || '?'} → ${c.expires || c.not_after || '?'}`
        ).join('\n')
    },
  },
  {
    pattern: /(?:username|user)\s+([a-zA-Z0-9_-]{3,})/i,
    label: 'Username Search',
    buildUrl: (m) => `/api/osint/username?username=${m[1]}`,
    formatResult: (data, _query) => {
      const sites = data.results || [];
      const found = sites.filter((s: any) => s.found);
      return `👤 RISULTATI USERNAME (${found.length}/${sites.length} trovati)\n` +
        found.slice(0, 20).map((s: any) =>
          `  ${s.site || '?'}: ${s.url || s.profile_url || 'trovato'}`
        ).join('\n')
    },
  },
  {
    pattern: /(?:correla|correlation)\s+(.+)/i,
    label: 'Correlazione BT+Rete',
    buildUrl: (m) => `/api/osint/correlate?q=${encodeURIComponent(m[1].trim())}`,
    formatResult: (data, _query) => {
      const devs = data.devices || [];
      const s = data.stats || {};
      return `🔗 RISULTATI CORRELAZIONE (${devs.length} dispositivi)\n` +
        `MAC match: ${s.mac_matches || 0} | Vendor match: ${s.vendor_matches || 0} | Solo BT: ${s.bt_only || 0} | Solo rete: ${s.net_only || 0}\n` +
        devs.slice(0, 10).map((d: any) =>
          `  ${d.name || d.hostname || d.mac || '?'} | ${d.vendor || '?'} | ${d.ip ? d.ip + ' ' : ''}${d.correlation_type === 'mac_match' ? '✅ MAC' : d.correlation_type === 'vendor_match' ? '🔶 VENDOR' : '⚪'}` + (d.ip ? ` | Porte: ${(d.open_ports || []).map((p: any) => p.port).join(',')}` : '') + (d.bluetooth_signal ? ` | BT:${d.bluetooth_signal}dBm` : '')
        ).join('\n')
    },
  },
]

async function runOsintTool(query: string): Promise<{ toolResults: string; toolLabel: string } | null> {
  for (const tool of TOOL_DISPATCHES) {
    const match = query.match(tool.pattern)
    if (match) {
      const url = tool.buildUrl(match)
      try {
        const res = await fetch(url)
        if (!res.ok) continue
        const data = await res.json()
        return {
          toolResults: tool.formatResult(data, match[1]),
          toolLabel: tool.label,
        }
      } catch {
        continue
      }
    }
  }
  return null
}

/* ─────────────────────────────────────────────────────────────
   Helper
   ───────────────────────────────────────────────────────────── */

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildContext(data: DashboardData): IntelligenceContext {
  const earthquakes = (data.earthquakes || []).slice(0, 20).map((eq) => ({
    id: eq.id || generateId(),
    magnitude: eq.magnitude,
    location: eq.location,
    latitude: eq.lat,
    longitude: eq.lng,
    depth: eq.depth,
    timestamp: eq.time,
    tsunami: eq.tsunami ?? false,
    felt: eq.felt ?? null,
    alert: eq.alert ?? null,
  }));

  const news = (data.news || []).slice(0, 15).map((item) => ({
    id: item.id || generateId(),
    title: item.title,
    description: item.description || '',
    link: item.link || '',
    published: item.published,
    source: item.source,
    risk_score: item.risk_score,
    coords: item.coords,
    machine_assessment: item.machine_assessment,
  }));

  const threats = (data.gdelt || []).slice(0, 15).map((ev) => ({
    id: generateId(),
    type: ev.type || 'INCIDENT',
    title: ev.title,
    description: ev.title,
    severity: (ev.tone < -5 ? 'CRITICAL' : ev.tone < -2 ? 'HIGH' : ev.tone < 0 ? 'ELEVATED' : 'LOW') as
      | 'CRITICAL'
      | 'HIGH'
      | 'ELEVATED'
      | 'LOW',
    region: ev.source || 'Unknown',
    latitude: ev.lat,
    longitude: ev.lng,
    timestamp: ev.date,
    source: ev.source || 'GDELT',
  }));

  return {
    earthquakes,
    news,
    threats,
    cyberAlerts: [],
    timestamp: new Date().toISOString(),
  };
}

/** Render markdown-lite: grassetto, intestazioni, elenchi */
function renderMarkdown(text: string): string {
  // Escape HTML base per prevenire XSS
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  return escaped
    .replace(/### (.+)/g, '<h4 class="text-[11px] font-bold text-[var(--gold-primary)] mt-3 mb-1 tracking-wider uppercase font-mono">$1</h4>')
    .replace(/## (.+)/g, '<h3 class="text-[12px] font-bold text-[var(--gold-primary)] mt-3 mb-1.5 tracking-wider uppercase font-mono border-b border-[var(--border-secondary)] pb-1">$1</h3>')
    .replace(/# (.+)/g, '<h2 class="text-[13px] font-bold text-[var(--gold-primary)] mt-3 mb-1.5 tracking-wider uppercase font-mono">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text-heading)] font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-[var(--text-secondary)] italic">$1</em>')
    .replace(/^- (.+)/gm, '<div class="flex items-start gap-1.5 ml-1 my-0.5"><span class="text-[var(--gold-dim)] mt-[3px] text-[8px]">◆</span><span>$1</span></div>')
    .replace(/\n/g, '<br />');
}

/* ─────────────────────────────────────────────────────────────
   Componente
   ───────────────────────────────────────────────────────────── */

export default function AiAnalyst({ data }: AiAnalystProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Carica chiave salvata all'avvio
  useEffect(() => {
    const saved = localStorage.getItem('osiris-openrouter-key');
    if (saved) {
      setApiKeyInput(saved);
      setKeySaved(true);
    }
  }, []);

  // Scorrimento automatico in basso
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input quando aperto
  useEffect(() => {
    if (isOpen && !showSettings) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, showSettings]);

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const savedKey = localStorage.getItem('osiris-openrouter-key');
    if (savedKey) {
      headers['x-openrouter-key'] = savedKey;
    }
    return headers;
  }, []);

  const handleSend = useCallback(async () => {
    const query = inputText.trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const context = buildContext(data);

      // Rileva ed esegui tool OSINT autonomamente
      const toolResult = await runOsintTool(query);

      let augmentedQuery = query;
      if (toolResult) {
        augmentedQuery = `${query}\n\n## RISULTATI STRUMENTO OSINT (${toolResult.toolLabel})\n${toolResult.toolResults}\n\nAnalizza questi risultati e fornisci una valutazione di intelligence.`;
      }

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ query: augmentedQuery, context }),
      });

      const json = await res.json();

      if (!res.ok) {
        const errorBody = json as { error: string; code: string; retryAfter?: number };
        throw new Error(errorBody.error || `HTTP ${res.status}`);
      }

      const responseBody = json as { analysis: string; model: string; timestamp: string };

      const analystMsg: ChatMessage = {
        id: generateId(),
        role: 'analyst',
        content: responseBody.analysis,
        timestamp: responseBody.timestamp,
      };
      setMessages((prev) => [...prev, analystMsg]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'analyst',
        content: `⚠ ERRORE ANALISI INTELLIGENCE\n\n${message}`,
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, data, getHeaders]);

  const handleBriefing = useCallback(async () => {
    if (isLoading) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: '📋 Genera briefing intelligence completo dai dati operativi correnti',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const context = buildContext(data);
      const res = await fetch('/api/ai/briefing', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ context }),
      });

      const json = await res.json();

      if (!res.ok) {
        const errorBody = json as { error: string; code: string };
        throw new Error(errorBody.error || `HTTP ${res.status}`);
      }

      const responseBody = json as { briefing: string; generatedAt: string };

      const analystMsg: ChatMessage = {
        id: generateId(),
        role: 'analyst',
        content: responseBody.briefing,
        timestamp: responseBody.generatedAt,
      };
      setMessages((prev) => [...prev, analystMsg]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Briefing generation failed';
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'analyst',
        content: `⚠ ERRORE GENERAZIONE BRIEFING\n\n${message}`,
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, data, getHeaders]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const saveApiKey = useCallback(() => {
    const key = apiKeyInput.trim();
    if (key) {
      localStorage.setItem('osiris-openrouter-key', key);
      setKeySaved(true);
      setTimeout(() => setShowSettings(false), 600);
    }
  }, [apiKeyInput]);

  const clearApiKey = useCallback(() => {
    localStorage.removeItem('osiris-openrouter-key');
    setApiKeyInput('');
    setKeySaved(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /* ── Pulsante Trigger Fluttuante ── */
  const triggerButton = (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 3, type: 'spring', stiffness: 200, damping: 15 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setIsOpen(true)}
      className="fixed bottom-[90px] right-5 md:bottom-8 md:right-8 z-[500] w-14 h-14 rounded-full flex items-center justify-center cursor-pointer border-0"
      style={{
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.08) 100%)',
        border: '1px solid rgba(212, 175, 55, 0.4)',
        boxShadow:
          '0 0 30px rgba(212, 175, 55, 0.2), 0 0 60px rgba(212, 175, 55, 0.1), 0 4px 20px rgba(0, 0, 0, 0.5)',
      }}
      aria-label="Apri Analista Intelligence IA"
    >
      <Brain className="w-6 h-6 text-[var(--gold-primary)]" />
      {/* Anelli pulsanti */}
      <div className="absolute inset-0 rounded-full animate-glow-pulse" />
      <motion.div
        className="absolute inset-[-4px] rounded-full border border-[var(--gold-primary)]"
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ opacity: 0.3 }}
      />
    </motion.button>
  );

  /* ── Pannello ── */
  return (
    <>
      {/* Trigger — mostra solo quando pannello chiuso */}
      <AnimatePresence>{!isOpen && triggerButton}</AnimatePresence>

      {/* Pannello */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Sfondo su mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[600] md:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Pannello Principale */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed bottom-0 right-0 md:bottom-6 md:right-6 z-[700] w-full md:w-[440px] h-[85vh] md:h-[680px] md:max-h-[85vh] flex flex-col md:rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, rgba(8, 10, 20, 0.96) 0%, rgba(6, 6, 12, 0.98) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                boxShadow:
                  '0 0 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(212, 175, 55, 0.08), 0 1px 0 rgba(212, 175, 55, 0.1) inset',
                backdropFilter: 'blur(40px) saturate(1.5)',
              }}
            >
              {/* ── Intestazione ── */}
              <div
                className="relative flex items-center justify-between px-4 py-3 shrink-0"
                style={{
                  background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.06) 0%, transparent 50%, rgba(0, 229, 255, 0.04) 100%)',
                  borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
                }}
              >
                {/* Accento linea scansione */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-[1px]"
                  style={{ background: 'linear-gradient(90deg, transparent, var(--gold-primary), transparent)' }}
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />

                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Shield className="w-4.5 h-4.5 text-[var(--gold-primary)]" />
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--alert-green)] animate-osiris-pulse" />
                  </div>
                  <div className="flex flex-col">
                    <span className="hud-text text-[11px] text-[var(--text-heading)]">ANALISTA OSIRIS</span>
                    <span className="text-[7px] font-mono tracking-[0.2em] text-[var(--text-muted)]">
                      PHI-3 MINI • HF INFERENCE
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button
                      onClick={clearMessages}
                      className="p-1.5 rounded-lg hover:bg-[var(--hover-accent)] transition-colors group"
                      title="Cancella conversazione"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--alert-red)]" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1.5 rounded-lg hover:bg-[var(--hover-accent)] transition-colors group"
                    title="Impostazioni"
                  >
                    <Settings
                      className={`w-3.5 h-3.5 transition-colors ${
                        showSettings ? 'text-[var(--gold-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-[var(--hover-accent)] transition-colors group"
                    title="Chiudi"
                  >
                    <X className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
                  </button>
                </div>
              </div>

              {/* ── Pannello Impostazioni ── */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden shrink-0"
                  >
                    <div
                      className="px-4 py-3 space-y-2.5"
                      style={{
                        background: 'rgba(212, 175, 55, 0.03)',
                        borderBottom: '1px solid rgba(212, 175, 55, 0.1)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Key className="w-3 h-3 text-[var(--gold-dim)]" />
                        <span className="hud-label" style={{ fontSize: '8px' }}>
                          CHIAVE API OPENROUTER (OPZIONALE)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={apiKeyInput}
                          onChange={(e) => {
                            setApiKeyInput(e.target.value);
                            setKeySaved(false);
                          }}
                          placeholder="sk-or-v1-..."
                          className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-lg px-3 py-2 text-[11px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-dim)] transition-colors"
                        />
                        {apiKeyInput.trim() && (
                          <>
                            <button
                              onClick={saveApiKey}
                              className="px-3 rounded-lg text-[9px] font-mono tracking-wider transition-all"
                              style={{
                                background: keySaved ? 'rgba(0, 230, 118, 0.15)' : 'rgba(212, 175, 55, 0.1)',
                                border: `1px solid ${keySaved ? 'rgba(0, 230, 118, 0.3)' : 'rgba(212, 175, 55, 0.2)'}`,
                                color: keySaved ? 'var(--alert-green)' : 'var(--gold-primary)',
                              }}
                            >
                              {keySaved ? <Check className="w-3 h-3" /> : 'SALVA'}
                            </button>
                            <button
                              onClick={clearApiKey}
                              className="px-2 rounded-lg text-[9px] font-mono tracking-wider transition-all hover:bg-red-500/10"
                              style={{
                                border: '1px solid rgba(255, 61, 61, 0.2)',
                                color: 'var(--alert-red)',
                              }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                      <p className="text-[8px] font-mono text-[var(--text-muted)] leading-relaxed">
                        La tua chiave è salvata localmente e inviata solo al server OSIRIS. Ottieni una chiave gratuita su{' '}
                        <a
                          href="https://openrouter.ai/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--cyan-primary)] hover:underline"
                        >
                          openrouter.ai/keys
                        </a>
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Area Messaggi ── */}
              <div className="flex-1 overflow-y-auto styled-scrollbar px-4 py-3 space-y-3">
                {/* Stato vuoto */}
                {messages.length === 0 && !isLoading && (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-5">
                    {/* Icona cervello animata */}
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-[-10px] rounded-full border border-[var(--gold-primary)]"
                        style={{ opacity: 0.15 }}
                      />
                      <motion.div
                        animate={{ rotate: [0, -360] }}
                        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-[-20px] rounded-full border border-[var(--cyan-primary)]"
                        style={{ opacity: 0.08 }}
                      />
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(0, 229, 255, 0.05) 100%)',
                          border: '1px solid rgba(212, 175, 55, 0.2)',
                        }}
                      >
                        <Brain className="w-7 h-7 text-[var(--gold-primary)]" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="hud-text text-[12px] text-[var(--text-heading)]">
                        ANALISTA INTELLIGENCE PRONTO
                      </h3>
                      <p className="text-[10px] font-mono text-[var(--text-muted)] leading-relaxed max-w-[280px]">
                        Correlo dati sismici, OSINT, minacce e cyber in tempo reale per fornire valutazioni di intelligence utilizzabili.
                      </p>
                    </div>

                    {/* Prompt rapidi */}
                    <div className="w-full space-y-1.5">
                      <span className="hud-label block text-center mb-2" style={{ fontSize: '7px' }}>
                        RICERCHE SUGGERITE
                      </span>
                      {[
                        'Quali sono le 3 principali minacce ora?',
                        'Ci sono pattern sismici correlati ai conflitti?',
                        'Scansiona IP 8.8.8.8',
                        'Cerca minacce per esempio.com',
                        'Whois dominio google.com',
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => {
                            setInputText(prompt);
                            setTimeout(() => inputRef.current?.focus(), 50);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-mono text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] hover:bg-[var(--hover-accent)]"
                          style={{
                            border: '1px solid rgba(212, 175, 55, 0.08)',
                          }}
                        >
                          <span className="text-[var(--gold-dim)] mr-1.5">›</span>
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messaggi */}
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-xl px-3.5 py-2.5 ${
                        msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
                      }`}
                      style={
                        msg.role === 'user'
                          ? {
                              background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.12) 0%, rgba(0, 229, 255, 0.06) 100%)',
                              border: '1px solid rgba(0, 229, 255, 0.2)',
                            }
                          : msg.isError
                          ? {
                              background: 'linear-gradient(135deg, rgba(255, 61, 61, 0.1) 0%, rgba(255, 61, 61, 0.05) 100%)',
                              border: '1px solid rgba(255, 61, 61, 0.2)',
                            }
                          : {
                              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%)',
                              border: '1px solid rgba(212, 175, 55, 0.12)',
                            }
                      }
                    >
                      {/* Intestazione messaggio */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {msg.role === 'user' ? (
                          <User className="w-3 h-3 text-[var(--cyan-primary)]" />
                        ) : msg.isError ? (
                          <AlertTriangle className="w-3 h-3 text-[var(--alert-red)]" />
                        ) : (
                          <Bot className="w-3 h-3 text-[var(--gold-primary)]" />
                        )}
                        <span
                          className="text-[8px] font-mono tracking-[0.15em] uppercase"
                          style={{
                            color: msg.role === 'user'
                              ? 'var(--cyan-primary)'
                              : msg.isError
                              ? 'var(--alert-red)'
                              : 'var(--gold-primary)',
                          }}
                        >
                          {msg.role === 'user' ? 'OPERATORE' : 'ANALISTA OSIRIS'}
                        </span>
                        <span className="text-[7px] font-mono text-[var(--text-muted)] ml-auto">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Contenuto messaggio */}
                      {msg.role === 'analyst' && !msg.isError ? (
                        <div
                          className="text-[11px] font-mono text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                        />
                      ) : (
                        <p className="text-[11px] font-mono text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Indicatore caricamento */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div
                      className="rounded-xl rounded-bl-sm px-4 py-3 flex items-center gap-2.5"
                      style={{
                        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%)',
                        border: '1px solid rgba(212, 175, 55, 0.12)',
                      }}
                    >
                      <Loader2 className="w-3.5 h-3.5 text-[var(--gold-primary)] animate-spin" />
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-mono tracking-[0.15em] text-[var(--gold-primary)] uppercase">
                          Analisi intelligence in corso
                        </span>
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="text-[var(--gold-primary)]"
                        >
                          ...
                        </motion.span>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ── Area Input ── */}
              <div
                className="shrink-0 px-3 py-2.5"
                style={{
                  borderTop: '1px solid rgba(212, 175, 55, 0.1)',
                  background: 'rgba(6, 6, 12, 0.8)',
                }}
              >
                {/* Azione rapida */}
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={handleBriefing}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono tracking-[0.1em] uppercase transition-all disabled:opacity-40"
                    style={{
                      background: 'rgba(212, 175, 55, 0.08)',
                      border: '1px solid rgba(212, 175, 55, 0.2)',
                      color: 'var(--gold-primary)',
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                    GENERA BRIEFING
                  </button>
                  <div className="flex-1" />
                  <span className="flex items-center text-[7px] font-mono text-[var(--text-muted)] tracking-wider">
                    <ChevronDown className="w-2.5 h-2.5 mr-0.5" />
                    SHIFT+INVIO PER NUOVA RIGA
                  </span>
                </div>

                {/* Riga input */}
                <div className="flex gap-2 items-end">
                  <div
                    className="flex-1 rounded-xl overflow-hidden transition-colors"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid rgba(212, 175, 55, 0.1)',
                    }}
                  >
                    <textarea
                      ref={inputRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Interroga l'analista intelligence..."
                      rows={1}
                      className="w-full bg-transparent px-3 py-2.5 text-[11px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none resize-none"
                      style={{ maxHeight: '120px', minHeight: '36px' }}
                      disabled={isLoading}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                      }}
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={!inputText.trim() || isLoading}
                    className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                    style={{
                      background:
                        inputText.trim() && !isLoading
                          ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(0, 229, 255, 0.1) 100%)'
                          : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${
                        inputText.trim() && !isLoading ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255, 255, 255, 0.06)'
                      }`,
                    }}
                  >
                    <Send
                      className="w-3.5 h-3.5"
                      style={{
                        color: inputText.trim() && !isLoading ? 'var(--cyan-primary)' : 'var(--text-muted)',
                      }}
                    />
                  </motion.button>
                </div>

                {/* Piè di pagina */}
                <div className="flex items-center justify-between mt-1.5 px-1">
                  <span className="text-[7px] font-mono text-[var(--text-muted)] tracking-wider">
                    {keySaved ? '🔑 CHIAVE PERSONALE' : '🔧 CHIAVE SERVER'} • {messages.filter((m) => m.role === 'user').length} RICERCHE
                  </span>
                  <span className="text-[7px] font-mono text-[var(--text-muted)] tracking-wider">
                    FLUSSI: {(data.earthquakes?.length || 0) + (data.news?.length || 0) + (data.gdelt?.length || 0)} ITEMS
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
