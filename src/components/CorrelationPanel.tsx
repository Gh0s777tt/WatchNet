'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crosshair, Network, Bluetooth, Search, Loader2, AlertTriangle,
  Download, ChevronDown, ChevronUp, Share2, Wifi, Smartphone,
  Cpu, Monitor, Watch, Speaker, Home, MapPin, Maximize2, Minimize2,
} from 'lucide-react';
import {
  downloadMaltego,
  entitiesFromBluetoothDevices,
  entitiesFromSweepDevices,
  type MaltegoLink,
} from '@/lib/maltego-export';

interface CorrelationPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

type Tab = 'correlate' | 'export';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  smartphone: <Smartphone className="w-3.5 h-3.5" />,
  computer: <Monitor className="w-3.5 h-3.5" />,
  audio: <Speaker className="w-3.5 h-3.5" />,
  wearable: <Watch className="w-3.5 h-3.5" />,
  smart_home: <Home className="w-3.5 h-3.5" />,
  tracker: <MapPin className="w-3.5 h-3.5" />,
  router: <Wifi className="w-3.5 h-3.5" />,
  nas: <Cpu className="w-3.5 h-3.5" />,
  iot: <Home className="w-3.5 h-3.5" />,
  console: <Monitor className="w-3.5 h-3.5" />,
  printer: <Monitor className="w-3.5 h-3.5" />,
};

const CORRELATION_COLORS: Record<string, string> = {
  mac_match: '#00E676',
  vendor_match: '#FFD700',
  bt_only: '#448AFF',
  net_only: '#FF6B35',
};

const CORRELATION_LABELS: Record<string, string> = {
  mac_match: 'MAC IDENTICO',
  vendor_match: 'STESSO VENDOR (OUI)',
  bt_only: 'SOLO BLUETOOTH',
  net_only: 'SOLO RETE',
};

export default function CorrelationPanel({ isMobile }: CorrelationPanelProps) {
  const [tab, setTab] = useState<Tab>('correlate');
  const [query, setQuery] = useState('');
  const [targetIP, setTargetIP] = useState('192.168.1.1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any>(null);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [history, setHistory] = useState<{ query: string; time: string; stats: any }[]>([]);

  const runCorrelation = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      params.set('ip', targetIP.trim());
      const res = await fetch(`/api/osint/correlate?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `Errore ${res.status}`);
      }
      const data = await res.json();
      setResults(data);
      setHistory(prev => [{
        query: query || '(tutti)',
        time: new Date().toLocaleTimeString(),
        stats: data.stats,
      }, ...prev.slice(0, 9)]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query, targetIP, loading]);

  const handleExport = useCallback((format: 'csv' | 'trx') => {
    if (!results?.devices) return;
    const btEntities = entitiesFromBluetoothDevices(
      results.devices.filter((d: any) => d.correlation_type !== 'net_only')
    );
    const netEntities = entitiesFromSweepDevices(
      results.devices.filter((d: any) => d.correlation_type !== 'bt_only')
    );
    const entities = [...btEntities, ...netEntities];
    const links: MaltegoLink[] = [];
    results.devices.forEach((d: any) => {
      if (d.correlation_type === 'mac_match' || d.correlation_type === 'vendor_match') {
        links.push({
          source: d.mac,
          target: d.ip || d.hostname || d.name,
          label: CORRELATION_LABELS[d.correlation_type],
        });
      }
    });
    downloadMaltego({ entities, links }, `correlazione-${Date.now()}`, format);
  }, [results]);

  const handleExportAllData = useCallback((format: 'csv' | 'trx') => {
    if (!results?.devices) return;
    const entities = results.devices.map((d: any) => ({
      type: d.ip ? 'maltego.NetworkDevice' : 'maltego.BluetoothDevice',
      value: d.ip || d.mac || d.name || '',
      properties: {
        mac: d.mac || '',
        name: d.name || '',
        vendor: d.vendor || '',
        ip: d.ip || '',
        hostname: d.hostname || '',
        os: d.os || '',
        category: d.category || '',
        correlation: d.correlation_type || '',
        ports: (d.open_ports || []).map((p: any) => `${p.port}/${p.service}`).join(';'),
      },
    }));
    const links: MaltegoLink[] = [];
    results.devices.forEach((d: any) => {
      if (d.correlation_type === 'mac_match' || d.correlation_type === 'vendor_match') {
        links.push({
          source: d.mac,
          target: d.ip || d.hostname || d.name,
          label: CORRELATION_LABELS[d.correlation_type],
        });
      }
    });
    downloadMaltego({ entities, links }, `correlazione-completa-${Date.now()}`, format);
  }, [results]);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-2 border-b border-[var(--border-secondary)]" style={{ borderColor: 'rgba(255,107,53,0.15)' }}>
        {[
          { id: 'correlate' as Tab, label: 'CORRELAZIONE', icon: Crosshair },
          { id: 'export' as Tab, label: 'EXPORT', icon: Download },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono tracking-wider uppercase transition-all"
            style={{
              background: tab === t.id ? 'rgba(255,107,53,0.12)' : 'transparent',
              border: `1px solid ${tab === t.id ? 'rgba(255,107,53,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: tab === t.id ? '#FF6B35' : 'var(--text-muted)',
            }}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'correlate' ? (
          <motion.div
            key="correlate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Input Area */}
            <div className="p-3 space-y-2 shrink-0">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Bluetooth className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#448AFF]" />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Filtro Bluetooth (MAC, nome, vendor)..."
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-lg pl-8 pr-3 py-2 text-[11px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
                    onKeyDown={e => e.key === 'Enter' && runCorrelation()}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Network className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#FF6B35]" />
                  <input
                    type="text"
                    value={targetIP}
                    onChange={e => setTargetIP(e.target.value)}
                    placeholder="IP rete (es. 192.168.1.1)..."
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-lg pl-8 pr-3 py-2 text-[11px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
                    onKeyDown={e => e.key === 'Enter' && runCorrelation()}
                  />
                </div>
                <button
                  onClick={runCorrelation}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9px] font-mono tracking-wider uppercase transition-all disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,107,53,0.15) 0%, rgba(255,107,53,0.05) 100%)',
                    border: '1px solid rgba(255,107,53,0.3)',
                    color: '#FF6B35',
                  }}
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  {loading ? 'CORRELAZIONE...' : 'CORRELA'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-3 mb-2 px-3 py-2 rounded-lg text-[10px] font-mono flex items-center gap-2"
                style={{ background: 'rgba(255,61,61,0.1)', border: '1px solid rgba(255,61,61,0.2)', color: '#FF3D3D' }}
              >
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {error}
              </div>
            )}

            {/* Loading */}
            {loading && !results && (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#FF6B35]" />
                  Correlazione Bluetooth + Rete in corso...
                </div>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="flex-1 overflow-y-auto px-3 pb-3 styled-scrollbar space-y-2">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 mb-3">
                  {[
                    { label: 'TOTALE', value: results.stats.total, color: '#FF6B35' },
                    { label: 'MAC OK', value: results.stats.mac_matches, color: '#00E676' },
                    { label: 'VENDOR', value: results.stats.vendor_matches, color: '#FFD700' },
                    { label: 'SOLO BT', value: results.stats.bt_only, color: '#448AFF' },
                    { label: 'SOLO RETE', value: results.stats.net_only, color: '#FF3D3D' },
                  ].map(s => (
                    <div key={s.label}
                      className="px-2 py-1.5 rounded-lg text-center"
                      style={{ background: `rgba(255,255,255,0.03)`, border: `1px solid rgba(255,255,255,0.06)` }}
                    >
                      <div className="text-[16px] font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[7px] font-mono tracking-wider text-[var(--text-muted)]">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Export buttons */}
                <div className="flex gap-2 mb-2">
                  <button onClick={() => handleExport('csv')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-mono tracking-wider uppercase transition-all"
                    style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)', color: '#00E676' }}
                  >
                    <Download className="w-2.5 h-2.5" /> CSV Maltego
                  </button>
                  <button onClick={() => handleExport('trx')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-mono tracking-wider uppercase transition-all"
                    style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)', color: '#FF6B35' }}
                  >
                    <Share2 className="w-2.5 h-2.5" /> TRX Maltego
                  </button>
                </div>

                {/* Device list */}
                {results.devices.map((d: any, i: number) => (
                  <motion.div
                    key={d.mac + i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <button
                      onClick={() => setExpandedDevice(expandedDevice === d.mac ? null : d.mac)}
                      className="w-full px-3 py-2 rounded-lg text-left transition-all hover:bg-[var(--hover-accent)]"
                      style={{
                        border: `1px solid ${CORRELATION_COLORS[d.correlation_type] || 'rgba(255,255,255,0.08)'}40`,
                        background: expandedDevice === d.mac ? 'rgba(255,255,255,0.03)' : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ color: CORRELATION_COLORS[d.correlation_type] }}>
                          {TYPE_ICONS[d.category] || TYPE_ICONS[d.network_type] || <Bluetooth className="w-3.5 h-3.5" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono text-[var(--text-primary)] truncate">
                              {d.name || d.hostname || d.mac}
                            </span>
                            <span className="text-[7px] font-mono px-1 py-0.5 rounded"
                              style={{
                                background: `${CORRELATION_COLORS[d.correlation_type]}20`,
                                color: CORRELATION_COLORS[d.correlation_type],
                              }}
                            >
                              {CORRELATION_LABELS[d.correlation_type]}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] font-mono text-[var(--text-muted)]">{d.vendor}</span>
                            {d.ip && <span className="text-[8px] font-mono text-[var(--text-muted)]">{d.ip}</span>}
                            {d.bluetooth_signal !== undefined && (
                              <span className="text-[8px] font-mono" style={{ color: d.bluetooth_signal > -50 ? '#00E676' : d.bluetooth_signal > -70 ? '#FFD700' : '#FF3D3D' }}>
                                {d.bluetooth_signal} dBm
                              </span>
                            )}
                          </div>
                        </div>
                        {expandedDevice === d.mac ? <ChevronUp className="w-3 h-3 text-[var(--text-muted)]" /> : <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedDevice === d.mac && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-4 px-3 py-2 space-y-1.5 rounded-b-lg"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                          >
                            <DetailRow label="MAC" value={d.mac} color="#448AFF" />
                            <DetailRow label="Vendor" value={d.vendor} color="#FFD700" />
                            <DetailRow label="Categoria" value={d.category || d.network_type} color="#FF6B35" />
                            {d.ip && <DetailRow label="IP" value={d.ip} color="#00E5FF" />}
                            {d.hostname && <DetailRow label="Hostname" value={d.hostname} color="#00E676" />}
                            {d.os && <DetailRow label="OS" value={d.os} color="#FF69B4" />}
                            {d.bluetooth_signal !== undefined && (
                              <DetailRow label="Segnale BT" value={`${d.bluetooth_signal} dBm`} color={d.bluetooth_signal > -50 ? '#00E676' : d.bluetooth_signal > -70 ? '#FFD700' : '#FF3D3D'} />
                            )}
                            {d.bluetooth_services?.length > 0 && (
                              <DetailRow label="Servizi BT" value={d.bluetooth_services.join(', ')} color="#E040FB" />
                            )}
                            {d.open_ports?.length > 0 && (
                              <DetailRow label="Porte Aperte" value={d.open_ports.map((p: any) => `${p.port}/${p.service}`).join(', ')} color="#FF3D3D" />
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && !results && !error && (
              <div className="flex-1 flex items-center justify-center text-center px-6">
                <div className="space-y-3">
                  <Crosshair className="w-10 h-10 mx-auto" style={{ color: 'rgba(255,107,53,0.3)' }} />
                  <p className="text-[10px] font-mono text-[var(--text-muted)]">
                    Correla dispositivi Bluetooth e Rete per identificare device condivisi tra i due spettri.
                    Le corrispondenze per MAC e Vendor OUI sono evidenziate automaticamente.
                  </p>
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="shrink-0 px-3 py-2 border-t" style={{ borderColor: 'rgba(255,107,53,0.1)' }}>
                <div className="flex gap-1 flex-wrap">
                  {history.map((h, i) => (
                    <span key={i} className="text-[7px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(255,107,53,0.08)', color: 'var(--text-muted)' }}
                    >
                      {h.query} · {h.stats.total} disp · {h.time}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="export"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 p-4 space-y-4 overflow-y-auto"
          >
            <p className="text-[10px] font-mono text-[var(--text-muted)] leading-relaxed">
              Esporta i risultati della correlazione in formato compatibile con Maltego.
              Puoi importare i file CSV o TRX direttamente in Maltego per visualizzare le relazioni tra dispositivi.
            </p>

            {results ? (
              <div className="space-y-3">
                <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.1)' }}>
                  <p className="text-[10px] font-mono text-[var(--text-primary)]">
                    {results.stats.total} dispositivi trovati ({results.stats.mac_matches} MAC match, {results.stats.vendor_matches} vendor match)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleExportAllData('csv')}
                    className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.15)' }}
                  >
                    <Download className="w-6 h-6 text-[#00E676]" />
                    <span className="text-[9px] font-mono text-[var(--text-primary)]">CSV Maltego</span>
                    <span className="text-[7px] font-mono text-[var(--text-muted)]">Entità + Proprietà</span>
                  </button>
                  <button onClick={() => handleExportAllData('trx')}
                    className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.15)' }}
                  >
                    <Share2 className="w-6 h-6 text-[#FF6B35]" />
                    <span className="text-[9px] font-mono text-[var(--text-primary)]">TRX Maltego</span>
                    <span className="text-[7px] font-mono text-[var(--text-muted)]">XML Entità + Collegamenti</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[10px] font-mono text-[var(--text-muted)]">
                  Esegui prima una correlazione per poter esportare i dati.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono tracking-wider shrink-0" style={{ color: color || 'var(--text-muted)', minWidth: 60 }}>
        {label}
      </span>
      <span className="text-[9px] font-mono text-[var(--text-primary)] break-all">{value}</span>
    </div>
  );
}
