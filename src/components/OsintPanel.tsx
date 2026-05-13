'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, Globe, Server, Lock, AlertTriangle, X, Loader2, Radar, ChevronRight } from 'lucide-react';

type OsintTab = 'scanner' | 'ip' | 'dns' | 'certs' | 'whois' | 'threats';

const TABS: { id: OsintTab; label: string; icon: any; placeholder: string; desc: string }[] = [
  { id: 'scanner', label: 'NMAP SCAN', icon: Radar, placeholder: 'IP or domain', desc: 'Port scan & service detection' },
  { id: 'ip', label: 'IP INTEL', icon: Globe, placeholder: '8.8.8.8', desc: 'Geolocation & ISP lookup' },
  { id: 'dns', label: 'DNS RECON', icon: Server, placeholder: 'example.com', desc: 'DNS record enumeration' },
  { id: 'certs', label: 'CERT SCAN', icon: Lock, placeholder: 'example.com', desc: 'Subdomain discovery via CT logs' },
  { id: 'whois', label: 'WHOIS', icon: Shield, placeholder: 'example.com', desc: 'Domain registration & security' },
  { id: 'threats', label: 'THREAT INTEL', icon: AlertTriangle, placeholder: '8.8.8.8 or domain', desc: 'OTX reputation & Tor check' },
];

interface OsintPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

export default function OsintPanel({ isOpen, onClose, isMobile = false }: OsintPanelProps) {
  const [activeTab, setActiveTab] = useState<OsintTab>('scanner');
  const [query, setQuery] = useState('');
  const [scanType, setScanType] = useState('quick');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<{ tab: string; query: string; time: string }[]>([]);

  const runLookup = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResults(null);

    try {
      let url = '';
      switch (activeTab) {
        case 'ip': url = `/api/osint/ip?ip=${encodeURIComponent(query)}`; break;
        case 'dns': url = `/api/osint/dns?domain=${encodeURIComponent(query)}`; break;
        case 'certs': url = `/api/osint/certs?domain=${encodeURIComponent(query)}`; break;
        case 'whois': url = `/api/osint/whois?domain=${encodeURIComponent(query)}`; break;
        case 'threats': url = `/api/osint/threats?query=${encodeURIComponent(query)}`; break;
        case 'scanner': url = `/api/scanner?target=${encodeURIComponent(query)}&type=${scanType}`; break;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setHistory(prev => [{ tab: activeTab, query, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Lookup failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [query, activeTab, scanType]);

  // Mobile: render inline content without fixed overlay
  if (isMobile) {
    return (
      <div className="flex flex-col gap-2">
        {/* Tab selector - horizontal scroll */}
        <div className="flex gap-1 overflow-x-auto styled-scrollbar pb-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setQuery(''); setResults(null); setError(''); }}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[7px] font-mono tracking-wider whitespace-nowrap transition-all border ${
                activeTab === tab.id
                  ? 'bg-[var(--cyan-primary)]/15 border-[var(--cyan-primary)]/40 text-[var(--cyan-primary)]'
                  : 'border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--gold-primary)]/30'
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="flex gap-1.5">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runLookup()}
              placeholder={TABS.find(t => t.id === activeTab)?.placeholder}
              className="w-full bg-[var(--bg-primary)]/60 border border-[var(--border-primary)] rounded-md pl-7 pr-3 py-2 text-[10px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 focus:border-[var(--cyan-primary)]/50 outline-none"
            />
          </div>
          {activeTab === 'scanner' && (
            <select
              value={scanType}
              onChange={e => setScanType(e.target.value)}
              className="bg-[var(--bg-primary)]/60 border border-[var(--border-primary)] rounded-md px-1.5 text-[8px] font-mono text-[var(--text-muted)] outline-none"
            >
              <option value="quick">QUICK</option>
              <option value="deep">DEEP</option>
              <option value="stealth">STEALTH</option>
            </select>
          )}
          <button
            onClick={runLookup}
            disabled={loading || !query.trim()}
            className="px-3 py-1.5 bg-[var(--cyan-primary)]/20 border border-[var(--cyan-primary)]/40 rounded-md text-[8px] font-mono font-bold text-[var(--cyan-primary)] tracking-wider hover:bg-[var(--cyan-primary)]/30 disabled:opacity-30 transition-all"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'SCAN'}
          </button>
        </div>

        {/* Results */}
        {error && (
          <div className="p-2 rounded-md border border-red-500/30 bg-red-500/10 text-[9px] font-mono text-red-400">
            ⚠ {error}
          </div>
        )}
        {results && (
          <div className="bg-[var(--bg-primary)]/40 border border-[var(--border-primary)] rounded-md p-2 max-h-[35vh] overflow-y-auto styled-scrollbar">
            <pre className="text-[8px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // Desktop: fixed right panel
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 bottom-0 w-full md:w-[420px] z-[500] flex flex-col"
          style={{ background: 'linear-gradient(180deg, rgba(4,4,10,0.98) 0%, rgba(8,8,18,0.98) 100%)', borderLeft: '1px solid rgba(212,175,55,0.15)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--cyan-primary)]/10 border border-[var(--cyan-primary)]/30 flex items-center justify-center">
                <Radar className="w-4 h-4 text-[var(--cyan-primary)]" />
              </div>
              <div>
                <h2 className="text-[11px] font-mono font-bold text-[var(--text-primary)] tracking-[0.3em]">OSIRIS RECON</h2>
                <span className="text-[7px] font-mono text-[var(--text-muted)] tracking-widest">NMAP POWERED · SHODAN-CLASS OSINT</span>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg border border-[var(--border-primary)] flex items-center justify-center hover:border-[var(--gold-primary)] transition-colors">
              <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Scan Type Tabs — vertical list */}
          <div className="px-3 py-2 border-b border-[var(--border-secondary)]/50">
            <div className="grid grid-cols-3 gap-1">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setActiveTab(t.id); setResults(null); setError(''); setQuery(''); }}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-center transition-all ${
                    activeTab === t.id
                      ? 'bg-[var(--cyan-primary)]/10 border border-[var(--cyan-primary)]/30'
                      : 'border border-transparent hover:border-[var(--border-primary)] hover:bg-[var(--bg-panel)]/50'
                  }`}
                >
                  <t.icon className={`w-3.5 h-3.5 ${activeTab === t.id ? 'text-[var(--cyan-primary)]' : 'text-[var(--text-muted)]'}`} />
                  <span className={`text-[6px] font-mono tracking-wider ${activeTab === t.id ? 'text-[var(--cyan-primary)]' : 'text-[var(--text-muted)]'}`}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scan Type sub-selector for NMAP */}
          {activeTab === 'scanner' && (
            <div className="px-3 py-1.5 border-b border-[var(--border-secondary)]/30 flex gap-1">
              {['quick', 'ports', 'ssl', 'traceroute', 'headers', 'banner'].map(t => (
                <button key={t} onClick={() => setScanType(t)}
                  className={`px-2 py-1 rounded text-[6px] font-mono tracking-wider transition-all ${
                    scanType === t
                      ? 'bg-[var(--gold-primary)]/15 text-[var(--gold-primary)] border border-[var(--gold-primary)]/30'
                      : 'text-[var(--text-muted)] border border-transparent hover:text-[var(--text-primary)] hover:border-[var(--border-primary)]'
                  }`}
                >{t.toUpperCase()}</button>
              ))}
            </div>
          )}

          {/* Search Bar */}
          <div className="px-3 py-2.5 border-b border-[var(--border-secondary)]/50">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runLookup()}
                  placeholder={TABS.find(t => t.id === activeTab)?.placeholder}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-[var(--bg-void)] border border-[var(--border-primary)] text-[9px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 focus:outline-none focus:border-[var(--cyan-primary)]/50 transition-colors"
                />
              </div>
              <button
                onClick={runLookup}
                disabled={loading || !query.trim()}
                className="px-4 py-2 rounded-lg bg-[var(--cyan-primary)]/15 border border-[var(--cyan-primary)]/40 text-[8px] font-mono font-bold text-[var(--cyan-primary)] tracking-[0.2em] hover:bg-[var(--cyan-primary)]/25 disabled:opacity-30 transition-all"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'EXECUTE'}
              </button>
            </div>
            <p className="text-[6px] font-mono text-[var(--text-muted)]/60 mt-1 tracking-wider">{TABS.find(t => t.id === activeTab)?.desc}</p>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto styled-scrollbar px-3 py-2">
            {error && (
              <div className="p-3 rounded-lg bg-[#FF3D3D]/10 border border-[#FF3D3D]/20 text-[8px] font-mono text-[#FF3D3D] mb-2">{error}</div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-[var(--cyan-primary)]/30 border-t-[var(--cyan-primary)] animate-spin" />
                <span className="text-[9px] font-mono text-[var(--cyan-primary)] tracking-[0.3em] animate-pulse">SCANNING TARGET...</span>
                <span className="text-[7px] font-mono text-[var(--text-muted)]">{query}</span>
              </div>
            )}

            {results && !loading && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                {/* Scanner results */}
                {activeTab === 'scanner' && results.ports && (
                  <>
                    <SectionHeader title="TARGET INFO" />
                    <div className="grid grid-cols-2 gap-2">
                      <ResultCard label="TARGET" value={results.target} />
                      <ResultCard label="IP" value={results.ip} />
                      <ResultCard label="OPEN PORTS" value={results.open_ports} highlight />
                      {results.os_guess && <ResultCard label="OS DETECTION" value={results.os_guess} />}
                    </div>
                    {results.ports.length > 0 && (
                      <>
                        <SectionHeader title={`PORT SCAN — ${results.ports.length} SERVICES`} />
                        <div className="space-y-1">
                          {results.ports.map((p: any) => (
                            <div key={p.port} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-void)]/50 border border-[var(--border-secondary)]/30">
                              <span className="text-[10px] font-mono text-[var(--cyan-primary)] font-bold w-12">{p.port}</span>
                              <span className={`text-[6px] font-mono px-1.5 py-0.5 rounded ${p.state === 'open' ? 'bg-[var(--alert-green)]/15 text-[var(--alert-green)]' : 'bg-[#FF3D3D]/15 text-[#FF3D3D]'}`}>{p.state.toUpperCase()}</span>
                              <span className="text-[8px] font-mono text-[var(--text-secondary)] flex-1">{p.service}</span>
                              {p.product && <span className="text-[7px] font-mono text-[var(--text-muted)]">{p.product} {p.version}</span>}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {results.certificate && (
                      <>
                        <SectionHeader title="SSL CERTIFICATE" />
                        <div className="grid grid-cols-1 gap-2">
                          <ResultCard label="SUBJECT" value={results.certificate.subject} />
                          <ResultCard label="ISSUER" value={results.certificate.issuer} />
                          <ResultCard label="EXPIRES" value={results.certificate.not_after} />
                        </div>
                      </>
                    )}
                    {results.hops && (
                      <>
                        <SectionHeader title={`TRACEROUTE — ${results.hop_count} HOPS`} />
                        <div className="space-y-0.5 max-h-40 overflow-y-auto styled-scrollbar">
                          {results.hops.map((h: string, i: number) => (
                            <div key={i} className="text-[7px] font-mono text-[var(--text-muted)] px-2 py-0.5 hover:bg-[var(--bg-panel)]/30 rounded">{h}</div>
                          ))}
                        </div>
                      </>
                    )}
                    {results.headers && (
                      <>
                        <SectionHeader title="HTTP HEADERS" />
                        {Object.entries(results.headers).map(([k, v]: [string, any]) => (
                          <div key={k} className="text-[7px] font-mono px-2 py-0.5">
                            <span className="text-[var(--gold-primary)]">{k}:</span> <span className="text-[var(--text-muted)]">{v}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}

                {/* IP results */}
                {activeTab === 'ip' && results.geo && (
                  <>
                    <SectionHeader title="GEOLOCATION" />
                    <div className="grid grid-cols-2 gap-2">
                      <ResultCard label="COUNTRY" value={`${results.geo.country} (${results.geo.country_code})`} />
                      <ResultCard label="CITY" value={`${results.geo.city}, ${results.geo.region}`} />
                      <ResultCard label="COORDS" value={`${results.geo.lat}, ${results.geo.lon}`} />
                      <ResultCard label="TIMEZONE" value={results.geo.timezone} />
                    </div>
                    <SectionHeader title="NETWORK" />
                    <div className="grid grid-cols-2 gap-2">
                      <ResultCard label="ISP" value={results.geo.isp} />
                      <ResultCard label="ORG" value={results.geo.org} />
                      <ResultCard label="ASN" value={results.geo.as_number} />
                      <ResultCard label="AS NAME" value={results.geo.as_name} />
                    </div>
                    <SectionHeader title="RISK ASSESSMENT" />
                    <div className="flex flex-wrap gap-2">
                      <FlagBadge label="PROXY/VPN" active={results.reputation?.is_proxy} />
                      <FlagBadge label="HOSTING" active={results.reputation?.is_hosting} />
                      <FlagBadge label="MOBILE" active={results.reputation?.is_mobile} />
                    </div>
                    <RiskLevel level={results.reputation?.risk_level || 'LOW'} />
                  </>
                )}

                {/* DNS results */}
                {activeTab === 'dns' && results.summary && (
                  <>
                    <SectionHeader title={`DNS RECORDS — ${results.summary.total_records} FOUND`} />
                    {results.summary.ip_addresses?.length > 0 && <ResultCard label="A RECORDS" value={results.summary.ip_addresses.join(', ')} />}
                    {results.summary.mail_servers?.length > 0 && <ResultCard label="MAIL SERVERS" value={results.summary.mail_servers.join(', ')} />}
                    {results.summary.nameservers?.length > 0 && <ResultCard label="NAMESERVERS" value={results.summary.nameservers.join(', ')} />}
                    {Object.entries(results.records || {}).map(([type, records]: [string, any]) => (
                      records.length > 0 && (
                        <div key={type}>
                          <span className="text-[7px] font-mono text-[var(--gold-primary)] tracking-widest">{type}</span>
                          {records.slice(0, 5).map((r: any, i: number) => (
                            <div key={i} className="text-[7px] font-mono text-[var(--text-muted)] pl-3 truncate">{r.data}</div>
                          ))}
                        </div>
                      )
                    ))}
                  </>
                )}

                {/* Cert results */}
                {activeTab === 'certs' && (
                  <>
                    <SectionHeader title="CERTIFICATE TRANSPARENCY" />
                    <div className="grid grid-cols-2 gap-2">
                      <ResultCard label="TOTAL CERTS" value={results.total_certs} highlight />
                      <ResultCard label="SUBDOMAINS" value={results.unique_subdomains} highlight />
                    </div>
                    {results.subdomains?.length > 0 && (
                      <>
                        <SectionHeader title={`DISCOVERED SUBDOMAINS (${results.subdomains.length})`} />
                        <div className="max-h-48 overflow-y-auto styled-scrollbar space-y-0.5">
                          {results.subdomains.map((s: string) => (
                            <div key={s} className="text-[8px] font-mono text-[var(--cyan-primary)] px-2 py-0.5 rounded hover:bg-[var(--bg-panel)]/30 cursor-pointer">{s}</div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* WHOIS results */}
                {activeTab === 'whois' && (
                  <>
                    <SectionHeader title="DOMAIN REGISTRATION" />
                    <div className="grid grid-cols-2 gap-2">
                      {results.registration && <ResultCard label="REGISTERED" value={new Date(results.registration).toLocaleDateString()} />}
                      {results.expiration && <ResultCard label="EXPIRES" value={new Date(results.expiration).toLocaleDateString()} />}
                    </div>
                    {results.rdap?.nameservers?.length > 0 && <ResultCard label="NAMESERVERS" value={results.rdap.nameservers.join(', ')} />}
                    {results.security_score && (
                      <>
                        <SectionHeader title="SECURITY ASSESSMENT" />
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-void)] border border-[var(--border-primary)]">
                          <span className={`text-2xl font-bold font-mono ${
                            results.security_score.grade === 'A' ? 'text-[var(--alert-green)]' :
                            results.security_score.grade === 'B' ? 'text-[var(--gold-primary)]' : 'text-[#FF3D3D]'
                          }`}>{results.security_score.grade}</span>
                          <div>
                            <div className="text-[8px] font-mono text-[var(--text-primary)]">{results.security_score.score}/{results.security_score.max} checks passed</div>
                            <div className="text-[6px] font-mono text-[var(--text-muted)]">HTTP security headers analysis</div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Threat results */}
                {activeTab === 'threats' && (
                  <>
                    <SectionHeader title="THREAT ASSESSMENT" />
                    <RiskLevel level={results.threat_level || 'LOW'} />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {results.tor_exit_node !== undefined && <FlagBadge label="TOR EXIT NODE" active={results.tor_exit_node} />}
                    </div>
                    {results.otx && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <ResultCard label="OTX PULSES" value={results.otx.pulse_count} highlight />
                        {results.otx.country && <ResultCard label="COUNTRY" value={results.otx.country} />}
                        {results.otx.asn && <ResultCard label="ASN" value={results.otx.asn} />}
                      </div>
                    )}
                  </>
                )}

                {/* Fallback */}
                {!['scanner', 'ip', 'dns', 'certs', 'whois', 'threats'].some(t => activeTab === t && results) && (
                  <pre className="text-[7px] font-mono text-[var(--text-muted)] overflow-auto">{JSON.stringify(results, null, 2)}</pre>
                )}
              </motion.div>
            )}

            {!results && !loading && !error && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full border border-[var(--border-primary)] flex items-center justify-center mb-4 opacity-30">
                  <Radar className="w-8 h-8 text-[var(--cyan-primary)]" />
                </div>
                <p className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest mb-1">READY TO SCAN</p>
                <p className="text-[7px] font-mono text-[var(--text-muted)]/50">Enter a target and press EXECUTE</p>
              </div>
            )}
          </div>

          {/* History bar */}
          {history.length > 0 && (
            <div className="px-3 py-2 border-t border-[var(--border-secondary)]/50">
              <span className="text-[6px] font-mono text-[var(--text-muted)] tracking-widest">RECENT</span>
              <div className="flex gap-1 mt-1 overflow-x-auto">
                {history.slice(0, 5).map((h, i) => (
                  <button key={i} onClick={() => { setQuery(h.query); setActiveTab(h.tab as OsintTab); }}
                    className="px-2 py-0.5 rounded bg-[var(--bg-void)] border border-[var(--border-secondary)]/30 text-[6px] font-mono text-[var(--text-muted)] hover:text-[var(--cyan-primary)] transition-colors whitespace-nowrap"
                  >{h.query}</button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[var(--border-primary)] flex items-center justify-between">
            <span className="text-[5px] font-mono text-[var(--text-muted)]/40 tracking-[0.2em]">OSIRIS RECON v3.2 · NMAP POWERED</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--alert-green)] animate-osiris-pulse" />
              <span className="text-[6px] font-mono text-[var(--alert-green)]">SCANNER ONLINE</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mt-2 mb-1">
      <div className="h-[1px] flex-1 bg-[var(--border-secondary)]/30" />
      <span className="text-[7px] font-mono text-[var(--gold-primary)] tracking-[0.2em] font-bold">{title}</span>
      <div className="h-[1px] flex-1 bg-[var(--border-secondary)]/30" />
    </div>
  );
}

function ResultCard({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-void)]/50 border border-[var(--border-secondary)]/30">
      <div className="text-[6px] font-mono text-[var(--text-muted)] tracking-widest">{label}</div>
      <div className={`text-[9px] font-mono truncate ${highlight ? 'text-[var(--cyan-primary)] font-bold' : 'text-[var(--text-primary)]'}`}>{String(value)}</div>
    </div>
  );
}

function FlagBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`px-2 py-1 rounded-lg text-[7px] font-mono tracking-wider border ${
      active
        ? 'bg-[#FF3D3D]/10 text-[#FF3D3D] border-[#FF3D3D]/30'
        : 'bg-[var(--alert-green)]/10 text-[var(--alert-green)] border-[var(--alert-green)]/20'
    }`}>
      {active ? '⚠' : '✓'} {label}
    </span>
  );
}

function RiskLevel({ level }: { level: string }) {
  const color = level === 'HIGH' ? '#FF3D3D' : level === 'MEDIUM' ? '#FF9500' : '#00E676';
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg border" style={{ background: `${color}08`, borderColor: `${color}25` }}>
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}60` }} />
      <span className="text-[10px] font-mono font-bold tracking-[0.2em]" style={{ color }}>{level}</span>
      <span className="text-[7px] font-mono text-[var(--text-muted)]">THREAT LEVEL</span>
    </div>
  );
}
