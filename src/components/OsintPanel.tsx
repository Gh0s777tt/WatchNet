'use client';

import { useState, useCallback, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Radar, Globe, Shield, FileText, Radio,
  ChevronDown, ChevronUp, Loader2, AlertTriangle, Server,
  Wifi, Lock, MapPin, Bug, Code, Layers, Network, Fingerprint,
  CheckCircle, XCircle, Clock, ExternalLink, Crosshair,
  Maximize2, Minimize2, Gavel, Bitcoin, Phone, Terminal, ShieldAlert,
FileKey, User, Mail, History, AtSign, CloudSun
} from 'lucide-react';
import { ipToNumber, numberToIp, calculateSubnetStart, classifyDevice, assessRisk, batchFetch, ShodanInternetDBResponse, SweepDevice } from '@/lib/osint-utils';
import { downloadMaltego, entitiesFromSearchResults, entitiesFromSweepDevices, type MaltegoLink } from '@/lib/maltego-export';

const TABS = [
  { id: 'scanner', label: 'SCANSIONE PORTE', icon: Radar, placeholder: 'IP o hostname', color: '#00E5FF' },
  { id: 'vuln', label: 'SCANSIONE VULNERABILITÀ', icon: Bug, placeholder: 'IP o hostname', color: '#FF3D3D' },

  { id: 'dns', label: 'DNS', icon: Server, placeholder: 'Nome dominio', color: '#448AFF' },
  { id: 'doh', label: 'DNS DoH', icon: Server, placeholder: 'Nome dominio', color: '#00E5FF' },
  { id: 'whois', label: 'WHOIS', icon: FileText, placeholder: 'Nome dominio', color: '#FFD700' },
  { id: 'certs', label: 'CERTIFICATI', icon: Lock, placeholder: 'Nome dominio', color: '#E040FB' },
  { id: 'certstream', label: 'CERTIFICATI', icon: FileKey, placeholder: 'Dominio (es. esempio.com)', color: '#39FF14' },
  { id: 'threats', label: 'MINACCE', icon: AlertTriangle, placeholder: 'IP, dominio o hash', color: '#FF9500' },
  { id: 'headers', label: 'HEADER HTTP', icon: Code, placeholder: 'URL da ispezionare', color: '#87CEEB' },
  { id: 'urlscan', label: 'SCANSIONE URL', icon: Globe, placeholder: 'URL da ispezionare', color: '#76FF03' },
  { id: 'ssl', label: 'SSL/TLS', icon: Shield, placeholder: 'Nome dominio', color: '#76FF03' },
  { id: 'subdomains', label: 'SOTTODOMINI', icon: Layers, placeholder: 'Dominio da enumerare', color: '#00BCD4' },
  { id: 'sub-brute', label: 'FORZA BRUTA SUB', icon: Layers, placeholder: 'Dominio da forzare', color: '#FF9500' },
  { id: 'tech', label: 'RILEVA TECNOLOGIE', icon: Code, placeholder: 'URL da analizzare', color: '#9C27B0' },
  { id: 'shodan', label: 'SHODAN IOT', icon: Network, placeholder: 'Indirizzo IP', color: '#FF3D3D' },
  { id: 'bgp', label: 'ROUTING BGP', icon: Globe, placeholder: 'IP o ASN', color: '#00E5FF' },
  { id: 'mac', label: 'INDIRIZZO MAC', icon: Fingerprint, placeholder: 'Indirizzo MAC', color: '#FFD700' },
  { id: 'phone', label: 'TELEFONO', icon: Phone, placeholder: 'Telefono (+39 123 456 7890)', color: '#FF6B35' },
  { id: 'username', label: 'USERNAME', icon: User, placeholder: 'Username da cercare', color: '#39FF14' },
  { id: 'email', label: 'EMAIL', icon: Mail, placeholder: 'Indirizzo email', color: '#FF3D3D' },
  { id: 'leaks', label: 'FUGA DATI', icon: ShieldAlert, placeholder: 'Indirizzo email', color: '#E040FB' },
  { id: 'github', label: 'RICOGNIZIONE GITHUB', icon: Terminal, placeholder: 'GitHub username', color: '#87CEEB' },
  { id: 'iprange', label: 'RANGE IP', icon: Crosshair, placeholder: 'Range CIDR (es. 192.168.1.0/24)', color: '#FF9500' },
  { id: 'sweep', label: 'SCANSIONE IP', icon: Crosshair, placeholder: 'Inserisci IP (es. 8.8.8.8)', color: '#FF3D3D' },
  { id: 'weather', label: 'METEO', icon: CloudSun, placeholder: 'lat,lon (es. 41.9,12.5)', color: '#00BFFF' },
  { id: 'wayback', label: 'WAYBACK MACHINE', icon: History, placeholder: 'URL (es. esempio.com)', color: '#FF6B35' },
  { id: 'hackertarget', label: 'HACKERTARGET', icon: Globe, placeholder: 'dominio + tipo:hostsearch|reverseip|asn|all', color: '#39FF14' },
  { id: 'bgp2', label: 'BGP/ASN', icon: Globe, placeholder: 'asn|ip|prefisso (es. asn15169)', color: '#00BFFF' },
  { id: 'cve', label: 'RICERCA CVE', icon: ShieldAlert, placeholder: 'parola chiave o ID CVE', color: '#FF3D3D' },
  { id: 'permutator', label: 'PERMUTATORE', icon: AtSign, placeholder: 'nome,cognome,dominio (es. mario,rossi,esempio.com)', color: '#FF9500' },
];

interface OsintPanelProps { isOpen?: boolean; onClose?: () => void; isMobile?: boolean; onSweepVisualize?: (data: any) => void; onScanGeolocate?: (target: string, data: any) => void; }

function OsintPanelInner({ isMobile, onSweepVisualize, onScanGeolocate }: OsintPanelProps) {
  const [activeTab, setActiveTab] = useState('scanner');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanType, setScanType] = useState('quick');
  const [expanded, setExpanded] = useState(true);
  const [history, setHistory] = useState<{tab:string;query:string;time:string}[]>([]);
  const [sweepResult, setSweepResult] = useState<any>(null);
  const [sweepProgress, setSweepProgress] = useState<{ current: number; total: number } | null>(null);
  const [sweepCidr, setSweepCidr] = useState(24);
  const [cveCache, setCveCache] = useState<Record<string, any>>({});
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);

  // Recupera dettagli CVE quando un dispositivo viene espanso in modalità schermo intero
  const fetchCveDetails = useCallback(async (cveIds: string[]) => {
    const missing = cveIds.filter(id => !cveCache[id]);
    if (missing.length === 0) return;
    // Segna come caricamento
    setCveCache(prev => {
      const next = { ...prev };
      for (const id of missing) next[id] = { loading: true };
      return next;
    });
    // Recupera in parallelo
    const results = await Promise.allSettled(
      missing.map(id => fetch(`/api/osint/cve?cve=${encodeURIComponent(id)}`).then(r => r.json()).then(data => ({ id, data })))
    );
    setCveCache(prev => {
      const next = { ...prev };
      for (const r of results) {
        if (r.status === 'fulfilled') {
          next[r.value.id] = r.value.data;
        }
      }
      return next;
    });
  }, [cveCache]);

  const runLookup = useCallback(async () => {
    if (!query.trim() || loading) return;
    setLoading(true); setError(''); setResults(null);

    // Scansione IP / Vulnerabilità — flusso separato
    if (activeTab === 'sweep' || activeTab === 'vuln') {
      setSweepResult(null);
      const cidr = sweepCidr;
      const totalHosts = Math.pow(2, 32 - cidr);
      setSweepProgress({ current: 0, total: totalHosts });
      try {
        const t0 = Date.now();
        const res = await fetch(`/api/osint/sweep?ip=${encodeURIComponent(query)}&cidr=${cidr}`);
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Sweep failed (${res.status})`); }
        const initData = await res.json();

        const ipParts = initData.target_ip.split('.').map(Number) as [number, number, number, number];
        const ipNum = ipToNumber(ipParts);
        const subnetStart = calculateSubnetStart(ipNum, cidr);
        const subnet = numberToIp(subnetStart);

        const urls: string[] = [];
        for (let i = 0; i < totalHosts; i++) {
          urls.push(`https://internetdb.shodan.io/${numberToIp((subnetStart + i) >>> 0)}`);
        }

        const shodanResults = await batchFetch<ShodanInternetDBResponse>(urls, 15, async (u) => {
          try {
            const r = await fetch(u, { cache: 'no-store' });
            if (r.status === 404) return null;
            if (!r.ok) return null;
            return await r.json();
          } catch {
            return null;
          }
        }, (done) => setSweepProgress({ current: done, total: totalHosts }));

        const devices: SweepDevice[] = [];
        const deviceBreakdown: Record<string, number> = {};
        for (const sr of shodanResults) {
          if (!sr) continue;
          const classification = classifyDevice(sr.ports, sr.cpes, sr.tags);
          const risk = assessRisk({ ports: sr.ports, vulns: sr.vulns });
          devices.push({
            ip: sr.ip, ports: sr.ports, hostnames: sr.hostnames,
            cpes: sr.cpes, vulns: sr.vulns, tags: sr.tags,
            device_type: classification.device_type,
            device_icon: classification.device_icon,
            device_color: classification.device_color,
            risk_level: risk
          });
          deviceBreakdown[classification.device_type] = (deviceBreakdown[classification.device_type] || 0) + 1;
        }

        setSweepResult({
          center: initData.center,
          subnet: `${subnet}/${cidr}`,
          cidr,
          target_ip: initData.target_ip,
          devices,
          summary: { total_hosts: totalHosts, total_responsive: devices.length, device_breakdown: deviceBreakdown },
          sweep_time_ms: Date.now() - t0
        });
        setSweepProgress(null);
        setHistory(prev => [{ tab: activeTab, query, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
      } catch (err: any) {
        setError(err.message);
        setSweepProgress(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      let url = '';
      switch (activeTab) {

        case 'dns': url = `/api/osint/dns?domain=${encodeURIComponent(query)}`; break;
        case 'doh': url = `/api/osint/doh?domain=${encodeURIComponent(query)}`; break;
        case 'certs': url = `/api/osint/certs?domain=${encodeURIComponent(query)}`; break;
        case 'certstream': url = `/api/osint/certstream?domain=${encodeURIComponent(query)}`; break;
        case 'whois': url = `/api/osint/whois?domain=${encodeURIComponent(query)}`; break;
        case 'threats': url = `/api/osint/threats?query=${encodeURIComponent(query)}`; break;
        case 'bgp': url = `/api/osint/bgp?query=${encodeURIComponent(query)}`; break;
        case 'mac': url = `/api/osint/mac?mac=${encodeURIComponent(query)}`; break;
        case 'phone': url = `/api/osint/phone?phone=${encodeURIComponent(query)}`; break;
        case 'username': url = `/api/osint/username?username=${encodeURIComponent(query)}`; break;
        case 'email': url = `/api/osint/email?email=${encodeURIComponent(query)}`; break;
        case 'leaks': url = `https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(query)}`; break;
        case 'crypto': url = `/api/osint/crypto?address=${encodeURIComponent(query)}`; break;
        case 'github': url = `/api/osint/github?user=${encodeURIComponent(query)}`; break;
        case 'scanner': url = `/api/scanner?target=${encodeURIComponent(query)}&type=${scanType}`; break;
        case 'headers': url = `/api/scanner?target=${encodeURIComponent(query)}&type=headers`; break;
        case 'urlscan': url = `/api/osint/urlscan?url=${encodeURIComponent(query)}`; break;
        case 'ssl': url = `/api/scanner?target=${encodeURIComponent(query)}&type=ssl`; break;
        case 'subdomains': url = `/api/scanner?target=${encodeURIComponent(query)}&type=subdomains`; break;
        case 'sub-brute': url = `/api/osint/sub-brute?domain=${encodeURIComponent(query)}`; break;
        case 'tech': url = `/api/scanner?target=${encodeURIComponent(query)}&type=tech`; break;
        case 'iprange': url = `/api/osint/iprange?cidr=${encodeURIComponent(query)}`; break;
        case 'shodan': url = `https://internetdb.shodan.io/${encodeURIComponent(query)}`; break;
        case 'weather': url = `/api/osint/weather?lat=${query.split(',')[0]}&lon=${query.split(',')[1]}`; break;
        case 'wayback': url = `/api/osint/wayback?url=${encodeURIComponent(query)}`; break;
        case 'hackertarget': { const parts = query.split(','); url = `/api/osint/hackertarget?domain=${encodeURIComponent(parts[0].trim())}&type=${(parts[1]||'all').trim()}`; break; }
        case 'bgp': { const q = query.trim(); if (q.startsWith('asn')) url = `/api/osint/bgp?asn=${encodeURIComponent(q)}`; else if (q.match(/^\d{1,3}\.\d/)) url = `/api/osint/bgp?ip=${encodeURIComponent(q)}`; else if (q.includes('/')) url = `/api/osint/bgp?prefix=${encodeURIComponent(q)}`; else url = `/api/osint/bgp?asn=${encodeURIComponent(q)}`; break; }
        case 'cve': { if (query.toUpperCase().startsWith('CVE-')) url = `/api/osint/cve?cve=${encodeURIComponent(query.toUpperCase())}`; else url = `/api/osint/cve?keyword=${encodeURIComponent(query)}`; break; }
        case 'permutator': { const parts = query.split(',').map(s => s.trim()); url = `/api/osint/permutator?first=${encodeURIComponent(parts[0]||'')}&last=${encodeURIComponent(parts[1]||'')}&domain=${encodeURIComponent(parts[2]||'')}`; break; }
      }
      const res = await fetch(url, activeTab === 'shodan' ? { cache: 'no-store' } : undefined);
      if (activeTab === 'shodan' && res.status === 404) {
        setResults({ ip: query, status: 'Nessun record Shodan InternetDB trovato', ports: [], cpes: [], hostnames: [], tags: [], vulns: [] });
        setLoading(false);
        return;
      }
      if (activeTab === 'leaks' && res.status === 404) {
        setResults({ email: query, breached: false, breaches: [], data_exposed: [] });
        setHistory(prev => [{ tab: activeTab, query, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        let parsedData = data;
        if (activeTab === 'leaks') {
           let breachList: string[] = [];
           const dataExposed = new Set<string>();
           if (data.BreachesSummary && data.BreachesSummary.site) {
              breachList = data.BreachesSummary.site.split(';').filter(Boolean);
           }
           if (data.ExposedData && Array.isArray(data.ExposedData)) {
              data.ExposedData.forEach((item: any) => {
                 if (item.data_classes && Array.isArray(item.data_classes)) {
                    item.data_classes.forEach((dc: string) => dataExposed.add(dc));
                 }
              });
           }
           parsedData = {
              email: query,
              breached: breachList.length > 0,
              breaches: breachList,
              data_exposed: Array.from(dataExposed).sort()
           };
        }

        setResults(parsedData);
        setHistory(prev => [{ tab: activeTab, query, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
        
        // Geolocalizza il target in background
        if (activeTab === 'phone') {
          if (data.lat && data.lng && onScanGeolocate) {
             onScanGeolocate(query, { lat: data.lat, lng: data.lng, type: 'phone', region: data.region });
          }
        } else if (activeTab !== 'sweep' && activeTab !== 'vuln' && activeTab !== 'crypto' && activeTab !== 'mac' && activeTab !== 'bgp' && activeTab !== 'github' && activeTab !== 'leaks' && activeTab !== 'phone') {
          fetch(`/api/osint/ip?ip=${encodeURIComponent(query)}`)
            .then(r => r.json())
            .then(locData => {
              if (locData && locData.geo && locData.geo.lat && locData.geo.lon && onScanGeolocate) {
                // ip-api restituisce lat/lon, lo passiamo su
                onScanGeolocate(query, { lat: locData.geo.lat, lng: locData.geo.lon, ...locData, type: activeTab });
              }
            })
            .catch(() => {});
        }
      } else {
        setError(data.error || 'Ricerca fallita');
      }
    } catch { setError('Errore di rete'); }
    finally { setLoading(false); }
  }, [query, activeTab, scanType, loading, sweepCidr]);

  const currentTab = TABS.find(t => t.id === activeTab);

  // ── Renderer risultati strutturati stile Shodan ──

  const ResultRow = ({ label, value, color, mono = true }: { label: string; value: any; color?: string; mono?: boolean }) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div className="flex items-start gap-3 py-1.5 border-b border-[var(--border-secondary)]/20 last:border-0">
        <span className="text-[13px] font-mono text-[var(--text-muted)] uppercase tracking-wider w-[90px] flex-shrink-0 pt-0.5">{label}</span>
        <span className={`text-[12px] ${mono ? 'font-mono' : ''} break-all flex-1`} style={{ color: color || 'var(--text-primary)' }}>
          {String(value)}
        </span>
      </div>
    );
  };

  const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[13px] font-mono font-bold ${ok ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
      {ok ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
      {label}
    </span>
  );

  // Mostra un hit OFAC-SDN inline (usato dalle route WHOIS e IP-intel
  // quando il cross-check trova un registrante/proprietario ASN sanzionato).
  const SanctionsBadge = ({ match }: { match: any }) => {
    if (!match || !Array.isArray(match.hits) || match.hits.length === 0) return null;
    return (
      <div className="mb-2 px-2 py-2 rounded border border-red-500/40 bg-red-500/15">
        <div className="flex items-center gap-2 mb-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[12px] font-mono font-bold text-red-400 tracking-wider">
            SANZIONATO — {match.source || 'OFAC SDN'}
          </span>
        </div>
        {match.hits.slice(0, 5).map((h: any, i: number) => (
          <div key={i} className="text-[13px] font-mono text-red-200 break-all leading-tight">
            <span className="text-[var(--text-muted)]">↳ {h.matched_value}:</span>{' '}
            {(h.entries || []).slice(0, 2).map((e: any) => e.name).join('; ')}
          </div>
        ))}
      </div>
    );
  };

  const SectionHeader = ({ title, icon: Icon, color }: { title: string; icon: any; color: string }) => (
    <div className="flex items-center gap-2 mt-3 mb-1.5 first:mt-0">
      <Icon className="w-3.5 h-3.5" style={{ color }} />
      <span className="text-[12px] font-mono font-bold tracking-widest" style={{ color }}>{title}</span>
      <div className="flex-1 h-px" style={{ background: `${color}30` }} />
    </div>
  );

  const PortRow = ({ port, state, service, version }: { port: number; state: string; service?: string; version?: string }) => (
    <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[var(--hover-accent)] transition-colors">
      <span className="text-[13px] font-mono font-bold text-[var(--cyan-primary)] w-[60px]">{port}</span>
      <StatusBadge ok={state === 'open'} label={state.toUpperCase()} />
      <span className="text-[12px] font-mono text-[var(--text-secondary)] flex-1">{service || 'unknown'}</span>
      {version && <span className="text-[13px] font-mono text-[var(--text-muted)]">{version}</span>}
    </div>
  );

  const renderStructuredResults = () => {
    if (!results) return null;
    const r = results;

    // ── SCANSIONE PORTE ──
    if (activeTab === 'scanner') {
      const ports = r.ports || r.open_ports || r.results || [];
      const host = r.host || r.target || query;
      return (
        <div>
          <SectionHeader title="INFO HOST" icon={Server} color="#00E5FF" />
          <ResultRow label="Bersaglio" value={host} color="#00E5FF" />
          <ResultRow label="Tipo Scansione" value={r.scan_type || scanType} />
          <ResultRow label="Durata" value={r.duration || r.scan_time} />
          {Array.isArray(ports) && ports.length > 0 && (
            <>
              <SectionHeader title={`PORTE APERTE (${ports.length})`} icon={Wifi} color="#00E676" />
              <div className="space-y-0.5">
                {ports.map((p: any, i: number) => (
                  <PortRow key={i} port={p.port || p} state={p.state || 'open'} service={p.service || p.name} version={p.version} />
                ))}
              </div>
            </>
          )}
          {(!Array.isArray(ports) || ports.length === 0) && renderFallback()}
        </div>
      );
    }

    // ── SCANSIONE VULNERABILITÀ ──
    if (activeTab === 'vuln') {
      const vulns = r.vulnerabilities || r.vulns || r.cves || [];
      const exploits = vulns.filter((v: any) => v.is_exploit);
      const regularVulns = vulns.filter((v: any) => !v.is_exploit);
      
      return (
        <div>
          <SectionHeader title="VALUTAZIONE VULNERABILITÀ" icon={Bug} color="#FF3D3D" />
          <ResultRow label="Bersaglio" value={r.target || query} color="#FF3D3D" />
          <ResultRow label="Total CVEs" value={Array.isArray(vulns) ? vulns.length : 0} color={Array.isArray(vulns) && vulns.length > 0 ? '#FF3D3D' : '#00E676'} />
          <ResultRow label="Risk Level" value={r.risk_level || r.severity} />
          {Array.isArray(regularVulns) && regularVulns.length > 0 && (
            <div className="mt-2 space-y-1">
              {regularVulns.slice(0, 20).map((v: any, i: number) => (
                <div key={i} className="p-2 rounded-lg border border-red-500/20 bg-red-500/5 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-mono font-bold text-red-400">{v.id || v.cve || v.name}</span>
                    {v.severity && <span className={`text-[12px] font-mono font-bold px-1.5 py-0.5 rounded ${v.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : v.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{v.severity}</span>}
                  </div>
                  {v.cvss && <div className="text-[13px] font-mono text-[var(--text-muted)] mt-1">CVSS: {v.cvss} ({v.type || 'cve'})</div>}
                  {v.description && <p className="text-[13px] font-mono text-[var(--text-muted)] mt-1 line-clamp-2">{v.description}</p>}
                </div>
              ))}
            </div>
          )}
          
          {exploits.length > 0 && (
            <div className="mt-4">
              <SectionHeader title={`POSSIBILI EXPLOIT (${exploits.length})`} icon={AlertTriangle} color="#FF9500" />
              <div className="mt-2 space-y-1">
                {exploits.slice(0, 10).map((e: any, i: number) => (
                  <div key={i} className="p-2 rounded-lg border border-orange-500/30 bg-orange-500/10 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-mono font-bold text-orange-400">{e.id}</span>
                      <span className="text-[12px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">EXPLOIT</span>
                    </div>
                    <div className="text-[13px] font-mono text-[var(--text-muted)] mt-1 flex justify-between">
                      <span>Fonte: {e.type?.toUpperCase() || 'SCONOSCIUTO'}</span>
                      {e.cvss && <span>CVSS: {e.cvss}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {(!Array.isArray(vulns) || vulns.length === 0) && renderFallback()}
        </div>
      );
    }



    // ── DNS ──
    if (activeTab === 'dns') {
      return (
        <div>
          <SectionHeader title="RECORD DNS" icon={Server} color="#448AFF" />
          <ResultRow label="Dominio" value={r.domain || query} color="#448AFF" />
          {r.A && <ResultRow label="Record A" value={Array.isArray(r.A) ? r.A.join(', ') : r.A} />}
          {r.AAAA && <ResultRow label="AAAA" value={Array.isArray(r.AAAA) ? r.AAAA.join(', ') : r.AAAA} />}
          {r.MX && <ResultRow label="MX" value={Array.isArray(r.MX) ? r.MX.map((m:any) => m.exchange || m).join(', ') : r.MX} />}
          {r.NS && <ResultRow label="NS" value={Array.isArray(r.NS) ? r.NS.join(', ') : r.NS} />}
          {r.TXT && <ResultRow label="TXT" value={Array.isArray(r.TXT) ? r.TXT.join(' | ') : r.TXT} />}
          {r.CNAME && <ResultRow label="CNAME" value={Array.isArray(r.CNAME) ? r.CNAME.join(', ') : r.CNAME} />}
          {r.SOA && <ResultRow label="SOA" value={typeof r.SOA === 'object' ? `${r.SOA.nsname} (${r.SOA.hostmaster})` : r.SOA} />}
          {renderFallbackExcluding(['domain','A','AAAA','MX','NS','TXT','CNAME','SOA','timestamp','cached'])}
        </div>
      );
    }

    // ── WHOIS ──
    if (activeTab === 'whois') {
      return (
        <div>
          <SectionHeader title="INTELLIGENCE WHOIS" icon={FileText} color="#FFD700" />
          <SanctionsBadge match={r.sanctions_match} />
          <ResultRow label="Dominio" value={r.domain_name || r.domainName || query} color="#FFD700" />
          <ResultRow label="Registrar" value={r.registrar} />
          <ResultRow label="Creato" value={r.creation_date || r.createdDate} />
          <ResultRow label="Scade" value={r.expiration_date || r.expiresDate} />
          <ResultRow label="Aggiornato" value={r.updated_date || r.updatedDate} />
          <ResultRow label="Stato" value={Array.isArray(r.status) ? r.status.join(', ') : r.status} />
          <ResultRow label="Nameserver" value={Array.isArray(r.name_servers || r.nameServers) ? (r.name_servers || r.nameServers).join(', ') : r.name_servers} />
          {renderFallbackExcluding(['domain_name','domainName','registrar','creation_date','createdDate','expiration_date','expiresDate','updated_date','updatedDate','status','name_servers','nameServers','timestamp','cached','raw','sanctions_match'])}
        </div>
      );
    }

    // ── SHODAN ──
    if (activeTab === 'shodan') {
      return (
        <div>
          <SectionHeader title="INTELLIGENCE SHODAN IOT" icon={Network} color="#FF3D3D" />
          <ResultRow label="IP Target" value={r.ip || query} color="#FF3D3D" />
          {r.hostnames?.length > 0 && <ResultRow label="Hostname" value={r.hostnames.join(', ')} />}
          {r.ports?.length > 0 && <ResultRow label="Porte Aperte" value={r.ports.join(', ')} color="#00E5FF" />}
          {r.tags?.length > 0 && <ResultRow label="Tag" value={r.tags.join(', ')} color="#FF9500" />}
          {r.vulns?.length > 0 && (
            <div className="mt-2 p-2 border border-red-500/30 bg-red-500/10 rounded">
              <span className="text-[12px] font-mono text-red-400 font-bold mb-1 block">VULNERABILITÀ ({r.vulns.length})</span>
              <div className="flex flex-wrap gap-1">
                {r.vulns.slice(0, 10).map((v: string) => (
                  <a key={v} href={`https://nvd.nist.gov/vuln/detail/${v}`} target="_blank" rel="noreferrer" className="text-[13px] font-mono px-1.5 py-0.5 rounded bg-[#1A1A18] text-[#8A8880] hover:text-[#FF3D3D]">{v}</a>
                ))}
                {r.vulns.length > 10 && <span className="text-[13px] font-mono text-[#8A8880]">+{r.vulns.length - 10} altri</span>}
              </div>
            </div>
          )}
          {renderFallbackExcluding(['ip','hostnames','ports','tags','vulns','cpes'])}
        </div>
      );
    }

    // ── BGP ──
    if (activeTab === 'bgp') {
      return (
        <div>
          <SectionHeader title="INTELLIGENCE ROUTING BGP" icon={Globe} color="#00E5FF" />
          <ResultRow label="Query" value={r.query} color="#00E5FF" />
          {r.type === 'ip' && r.ip && (
            <>
              {r.ip.prefixes?.map((p: any, i: number) => (
                <div key={i} className="mt-2 p-2 border border-[#00E5FF]/20 bg-[#00E5FF]/5 rounded">
                  <ResultRow label="ASN" value={`AS${p.asn.asn} - ${p.asn.name}`} color="#00E5FF" />
                  <ResultRow label="Prefisso" value={p.prefix} />
                  <ResultRow label="Paese" value={p.asn.country_code} />
                  <ResultRow label="Descrizione" value={p.asn.description} />
                </div>
              ))}
            </>
          )}
          {r.type === 'asn' && r.asn && (
            <div className="mt-2 p-2 border border-[#00E5FF]/20 bg-[#00E5FF]/5 rounded">
              <ResultRow label="ASN" value={`AS${r.asn.asn}`} color="#00E5FF" />
              <ResultRow label="Nome" value={r.asn.name} />
              <ResultRow label="Descrizione" value={r.asn.description} />
              <ResultRow label="Paese" value={r.asn.country_code} />
              {r.prefixes && <ResultRow label="Prefissi" value={`IPv4: ${r.prefixes.total_v4} | IPv6: ${r.prefixes.total_v6}`} />}
              {r.peers && <ResultRow label="Peer" value={r.peers.total} />}
            </div>
          )}
          {renderFallbackExcluding(['query', 'type', 'ip', 'asn', 'prefixes', 'peers', 'timestamp'])}
        </div>
      );
    }

    // ── MAC ──
    if (activeTab === 'mac') {
      return (
        <div>
          <SectionHeader title="RICERCA VENDITOR MAC" icon={Fingerprint} color="#FFD700" />
          <ResultRow label="Indirizzo MAC" value={r.mac} color="#FFD700" />
          <ResultRow label="Vendor" value={r.vendor} color={r.vendor === 'Not Found' ? '#FF3D3D' : '#00E676'} />
        </div>
      );
    }

    // ── TELEFONO ──
    if (activeTab === 'phone') {
      return (
        <div>
          <SectionHeader title="INTELLIGENCE TELEFONICA" icon={Phone} color="#FF9500" />
          <ResultRow label="Query" value={r.query} color="#FF9500" />
          <ResultRow label="Valido" value={r.valid ? 'SÌ' : 'NO'} color={r.valid ? '#00E676' : '#FF3D3D'} />
          {r.valid && (
            <>
              <ResultRow label="Formato E.164" value={r.number} />
              <ResultRow label="Formato Internazionale" value={r.international} />
              <ResultRow label="Formato Nazionale" value={r.national} />
              <ResultRow label="Paese" value={`${r.region} (${r.country_code})`} />
              <ResultRow label="Tipo Linea" value={r.line_type} color={r.line_type === 'MOBILE' ? '#00E5FF' : r.line_type === 'VOIP' ? '#FF9500' : undefined} />
            </>
          )}
        </div>
      );
    }

    // ── RICOGNIZIONE GITHUB ──
    if (activeTab === 'github') {
      return (
        <div>
          <SectionHeader title="RICOGNIZIONE GITHUB" icon={Terminal} color="#87CEEB" />
          <div className="flex items-center gap-3 mb-2">
            {r.avatar_url && <img src={r.avatar_url} alt="avatar" className="w-10 h-10 rounded-full border border-[#87CEEB]/30" />}
            <div>
              <div className="text-[12px] font-mono font-bold text-[#87CEEB]">{r.name || r.username}</div>
              <div className="text-[13px] font-mono text-[var(--text-muted)]">@{r.username} • {r.followers} followers</div>
            </div>
          </div>
          <ResultRow label="Azienda" value={r.company} />
          <ResultRow label="Posizione" value={r.location} />
          <ResultRow label="Email" value={r.email} color="#00E676" />
          <ResultRow label="Twitter" value={r.twitter} color="#448AFF" />
          <ResultRow label="Sito Web" value={r.blog} />
          <ResultRow label="Bio" value={r.bio} />
          {r.recent_repos?.length > 0 && (
            <div className="mt-2 p-2 border border-[#87CEEB]/20 bg-[#87CEEB]/5 rounded">
              <span className="text-[13px] font-mono text-[#87CEEB] block mb-1">REPOSITORY RECENTI</span>
              {r.recent_repos.map((repo: any, i: number) => (
                <div key={i} className="flex justify-between text-[13px] font-mono mb-0.5">
                  <span className="text-[#E8E6E0]">{repo.name}</span>
                  <span className="text-[var(--text-muted)]">{repo.language || 'Unknown'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ── FUGA DATI ──
    if (activeTab === 'leaks') {
      return (
        <div>
          <SectionHeader title="SCANSIONE FUGA DATI" icon={ShieldAlert} color="#E040FB" />
          <ResultRow label="Email Target" value={r.email} color="#E040FB" />
          <ResultRow label="Stato" value={r.breached ? 'COMPROMESSO' : 'SICURO'} color={r.breached ? '#FF1744' : '#00E676'} />
          
          {r.breached && r.data_exposed?.length > 0 && (
            <div className="mt-2 p-2 border border-[#E040FB]/30 bg-[#E040FB]/10 rounded">
              <span className="text-[12px] font-mono text-[#E040FB] font-bold mb-1 block">DATI ESPOSTI</span>
              <div className="flex flex-wrap gap-1">
                {r.data_exposed.map((dc: string) => (
                  <span key={dc} className="text-[13px] font-mono px-1.5 py-0.5 rounded bg-[#1A1A18] text-[#E8E6E0] border border-[#E040FB]/20">{dc}</span>
                ))}
              </div>
            </div>
          )}

          {r.breached && r.breaches?.length > 0 && (
            <div className="mt-2 p-2 border border-red-500/30 bg-red-500/10 rounded">
              <span className="text-[12px] font-mono text-red-400 font-bold mb-1 block">VIOLAZIONI NOTE ({r.breaches.length})</span>
              <div className="flex flex-col gap-1">
                {r.breaches.map((b: string) => (
                  <a key={b} href={`https://haveibeenpwned.com/PwnedWebsites#${b}`} target="_blank" rel="noreferrer" className="text-[13px] font-mono px-2 py-1 rounded bg-[#1A1A18] text-red-300 hover:text-white hover:bg-red-500/30 flex items-center justify-between transition-colors">
                    <span>{b}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── CERTIFICATI ──
    if (activeTab === 'certs') {
      const certs = r.certificates || r.certs || (Array.isArray(r) ? r : []);
      return (
        <div>
          <SectionHeader title="TRASPARENZA CERTIFICATI" icon={Lock} color="#E040FB" />
          <ResultRow label="Dominio" value={query} color="#E040FB" />
          <ResultRow label="Certificati" value={Array.isArray(certs) ? certs.length : 0} />
          {Array.isArray(certs) && certs.slice(0, 15).map((c: any, i: number) => (
            <div key={i} className="mt-1.5 p-2 rounded border border-[var(--border-secondary)]/30 bg-[var(--bg-tertiary)]/30">
              <ResultRow label="Emittente" value={c.issuer_name || c.issuer} />
              <ResultRow label="Nome Comune" value={c.common_name || c.name_value} />
              <ResultRow label="Non Prima" value={c.not_before} />
              <ResultRow label="Non Dopo" value={c.not_after} />
            </div>
          ))}
          {(!Array.isArray(certs) || certs.length === 0) && renderFallback()}
        </div>
      );
    }

    // ── MINACCE ──
    if (activeTab === 'threats') {
      return (
        <div>
          <SectionHeader title="INTELLIGENCE MINACCE" icon={AlertTriangle} color="#FF9500" />
          <ResultRow label="Query" value={query} color="#FF9500" />
          <ResultRow label="Punteggio Rischio" value={r.risk_score || r.score} color={
            (r.risk_score || r.score || 0) > 70 ? '#FF3D3D' : (r.risk_score || r.score || 0) > 40 ? '#FF9500' : '#00E676'
          } />
          <ResultRow label="Maligno" value={r.malicious !== undefined ? (r.malicious ? 'SÌ' : 'NO') : undefined} color={r.malicious ? '#FF3D3D' : '#00E676'} />
          <ResultRow label="Categoria" value={r.category || r.type} />
          <ResultRow label="Report" value={r.total_reports || r.reports} />
          <ResultRow label="Ultima Visualizzazione" value={r.last_seen || r.last_analysis} />
          {r.tags && <ResultRow label="Tag" value={Array.isArray(r.tags) ? r.tags.join(', ') : r.tags} />}
          {renderFallbackExcluding(['risk_score','score','malicious','category','type','total_reports','reports','last_seen','last_analysis','tags','timestamp','cached','query'])}
        </div>
      );
    }

    // ── SSL ──
    if (activeTab === 'ssl') {
      return (
        <div>
          <SectionHeader title="ANALISI SSL/TLS" icon={Shield} color="#76FF03" />
          <ResultRow label="Bersaglio" value={query} color="#76FF03" />
          <ResultRow label="Protocollo" value={r.protocol || r.tls_version} />
          <ResultRow label="Cifratura" value={r.cipher || r.cipher_suite} />
          <ResultRow label="Valido" value={r.valid !== undefined ? (r.valid ? 'SÌ' : 'NO') : undefined} color={r.valid ? '#00E676' : '#FF3D3D'} />
          <ResultRow label="Emittente" value={r.issuer} />
          <ResultRow label="Soggetto" value={r.subject} />
          <ResultRow label="Scadenza" value={r.expires || r.not_after} />
          <ResultRow label="SAN" value={Array.isArray(r.sans) ? r.sans.join(', ') : r.sans} />
          {renderFallback()}
        </div>
      );
    }



    // Fallback per altri strumenti
    return renderFallback();
  };

  const renderFallback = () => {
    if (!results) return null;
    return (
      <div className="space-y-1">
        {Object.entries(results).filter(([k]) => !['timestamp','cached'].includes(k)).map(([key, value]) => (
          <ResultRow key={key} label={key.replace(/_/g, ' ')} value={typeof value === 'object' ? JSON.stringify(value, null, 1) : String(value)} />
        ))}
      </div>
    );
  };

  const renderFallbackExcluding = (exclude: string[]) => {
    if (!results) return null;
    const extra = Object.entries(results).filter(([k]) => !exclude.includes(k));
    if (extra.length === 0) return null;
    return (
      <div className="mt-2 space-y-1">
        {extra.map(([key, value]) => (
          <ResultRow key={key} label={key.replace(/_/g, ' ')} value={typeof value === 'object' ? JSON.stringify(value, null, 1) : String(value)} />
        ))}
      </div>
    );
  };

  const renderContent = () => (
    <div className="flex flex-col gap-2.5">
      {/* Griglia Strumenti */}
      <div className="flex flex-col gap-1">
        {/* Sweep - Azione Principale */}
        {TABS.filter(t => t.id === 'sweep').map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setQuery(''); setResults(null); setError(''); }}
            className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-[12px] font-mono tracking-widest font-bold transition-all border ${activeTab === tab.id ? 'border-opacity-60 bg-opacity-20' : 'border-[var(--border-secondary)] hover:bg-[var(--hover-accent)]'}`}
            style={{ 
              borderColor: activeTab === tab.id ? tab.color : 'rgba(255,61,61,0.3)', 
              backgroundColor: activeTab === tab.id ? `${tab.color}20` : 'rgba(255,61,61,0.05)', 
              color: activeTab === tab.id ? tab.color : tab.color,
              boxShadow: activeTab === tab.id ? `0 0 15px ${tab.color}30` : 'none'
            }}>
            <tab.icon className="w-5 h-5" />
            <span title={tab.label}>{tab.label} GLOBALE</span>
          </button>
        ))}
        {/* Altri Strumenti */}
        <div className="grid grid-cols-4 gap-1 mt-1">
          {TABS.filter(t => t.id !== 'sweep').map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setQuery(''); setResults(null); setError(''); }}
              className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-lg text-[12px] font-mono tracking-wider transition-all border ${activeTab === tab.id ? 'border-opacity-40 bg-opacity-15' : 'border-transparent hover:bg-[var(--hover-accent)]'}`}
              style={{ borderColor: activeTab === tab.id ? tab.color : 'transparent', backgroundColor: activeTab === tab.id ? `${tab.color}15` : undefined, color: activeTab === tab.id ? tab.color : 'var(--text-muted)' }}
              title={tab.label}>
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-tight text-center w-full text-[11px]">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Area Input */}
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runLookup()}
              placeholder={currentTab?.placeholder}
              className="w-full bg-[var(--bg-primary)]/60 border border-[var(--border-primary)] rounded-lg pl-8 pr-3 py-2.5 text-[13px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 focus:outline-none transition-colors"
              style={{ borderColor: query ? `${currentTab?.color}40` : undefined }} />
          </div>
          <button onClick={runLookup} disabled={loading || !query.trim()}
            className="px-4 py-2 rounded-lg text-[12px] font-mono font-bold tracking-wider disabled:opacity-30 transition-all flex items-center justify-center min-w-[70px]"
            style={{ backgroundColor: `${currentTab?.color}20`, border: `1px solid ${currentTab?.color}40`, color: currentTab?.color }}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'SCANSIONA'}
          </button>
        </div>
        
        {/* Controlli Secondari */}
        {activeTab === 'scanner' && (
          <select value={scanType} onChange={e => setScanType(e.target.value)}
            className="bg-[var(--bg-primary)]/60 border border-[var(--border-primary)] rounded-lg px-2 py-1.5 text-[12px] font-mono text-[var(--text-muted)] outline-none w-full">
            <option value="quick">SCANSIONE VELOCE</option><option value="deep">SCANSIONE PROFONDA</option><option value="ports">TOP 1000 PORTE</option>
          </select>
        )}
        {(activeTab === 'sweep' || activeTab === 'vuln') && (
          <div className="flex items-center justify-between bg-[var(--bg-primary)]/60 border border-[var(--border-primary)] rounded-lg p-1">
            <span className="text-[13px] font-mono text-[var(--text-muted)] pl-2">MASCHERA SOTTORETE:</span>
            <div className="flex items-center gap-0.5">
              {[24, 25, 26, 27, 28].map(c => (
                <button key={c} onClick={() => setSweepCidr(c)}
                  className={`px-2 py-1 text-[12px] font-mono rounded transition-all ${
                    sweepCidr === c ? 'bg-[#FF3D3D]/20 text-[#FF3D3D]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >/{c}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-[13px] font-mono text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </div>
      )}

      {/* Avanzamento Sweep */}
      {sweepProgress && loading && (
        <div className="p-3 rounded-lg border border-[#FF3D3D]/30 bg-[#FF3D3D]/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-mono tracking-wider text-[#FF3D3D]">SCANSIONE SOTTORETE IN CORSO...</span>
            <span className="text-[12px] font-mono text-[#E8E6E0]">{sweepProgress.total} hosts</span>
          </div>
          <div className="w-full h-1.5 bg-[#1A1A18] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg, #FF3D3D, #FF6B00, #FFD700)', animation: 'sweep-pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      )}

      {/* Risultati Sweep */}
      {sweepResult && !loading && (
        <div className="bg-[var(--bg-primary)]/40 border border-[var(--border-primary)] rounded-lg overflow-hidden max-h-[55vh] overflow-y-auto styled-scrollbar">
          {/* Riepilogo */}
          <div className="p-3 border-b border-[#2A2A28]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[13px] font-mono tracking-wider text-[#E8E6E0]">{sweepResult.subnet}</div>
                <div className="text-[13px] font-mono text-[#5C5A54]">{sweepResult.center.city}, {sweepResult.center.country} · {sweepResult.center.isp}</div>
              </div>
              <div className="text-right">
                <div className="text-[18px] font-mono font-bold text-[#FF3D3D]">{sweepResult.summary.total_responsive}</div>
                <div className="text-[12px] font-mono text-[#5C5A54] tracking-wider">DISPOSITIVI TROVATI</div>
              </div>
            </div>
            {/* Barra Ripartizione */}
            <div className="flex h-2 rounded-full overflow-hidden bg-[#1A1A18] mb-2">
              {Object.entries(sweepResult.summary.device_breakdown).map(([type, count]: [string, any]) => {
                const device = sweepResult.devices.find((d: any) => d.device_type === type);
                return <div key={type} style={{ width: `${(count / sweepResult.summary.total_responsive) * 100}%`, backgroundColor: device?.device_color || '#666' }} title={`${type}: ${count}`} />;
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(sweepResult.summary.device_breakdown).map(([type, count]: [string, any]) => {
                const device = sweepResult.devices.find((d: any) => d.device_type === type);
                return (
                  <div key={type} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: device?.device_color || '#666' }} />
                    <span className="text-[13px] font-mono text-[#8A8880]">{type}</span>
                    <span className="text-[13px] font-mono text-[#E8E6E0] font-bold">{String(count)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Pulsante Visualizza */}
          <div className="p-3 border-b border-[#2A2A28]">
            <button onClick={() => onSweepVisualize?.(sweepResult)}
              className="w-full py-2.5 rounded-lg font-mono text-[13px] tracking-wider font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, rgba(255,61,61,0.2), rgba(255,107,0,0.2))', border: '1px solid rgba(255,61,61,0.5)', color: '#FF3D3D', textShadow: '0 0 10px rgba(255,61,61,0.5)' }}
            >
              <Globe className="w-4 h-4" /> VISUALIZZA SUL GLOBO
            </button>
          </div>
          {/* Elenco Dispositivi */}
          <div className={isFullScreen ? "flex flex-col gap-3 p-4" : "divide-y divide-[#2A2A28]"}>
            {sweepResult.devices.map((device: any) => {
              const isExpanded = expandedDevice === device.ip;
              return (
              <div key={device.ip} className={isFullScreen
                ? "bg-[#0D0D0C] border border-[#2A2A28] rounded-lg overflow-hidden hover:border-[#3A3A38] transition-colors"
                : "px-3 py-2.5 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              }>
                {/* Intestazione Dispositivo */}
                <div
                  className={isFullScreen
                    ? "flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#151514] transition-colors"
                    : "flex items-center justify-between mb-1"
                  }
                  onClick={() => {
                    if (!isFullScreen) return;
                    const next = isExpanded ? null : device.ip;
                    setExpandedDevice(next);
                    if (next && device.vulns.length > 0) fetchCveDetails(device.vulns);
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: device.device_color }} />
                    <span className={`flex-shrink-0 ${isFullScreen ? "text-[14px]" : "text-[13px]"} font-mono font-bold text-[#E8E6E0]`}>{device.ip}</span>
                    {device.hostnames.length > 0 && (
                      <span className={`${isFullScreen ? "text-[13px]" : "text-[13px]"} font-mono text-[#5C5A54] truncate min-w-0`}>{device.hostnames[0]}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {device.vulns.length > 0 && (
                      <span className={`${isFullScreen ? "text-[12px]" : "text-[12px]"} font-mono px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap`}>
                        {device.vulns.length} CVEs
                      </span>
                    )}
                    <span className={`${isFullScreen ? "text-[12px]" : "text-[12px]"} font-mono px-1.5 py-0.5 rounded whitespace-nowrap`} style={{ backgroundColor: device.device_color + '20', color: device.device_color, border: `1px solid ${device.device_color}40` }}>{device.device_type}</span>
                    {isFullScreen && (
                      <ChevronDown className={`w-4 h-4 text-[#5C5A54] transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </div>

                {/* Info compatte (modalità laterale) */}
                {!isFullScreen && (
                  <>
                    <div className="flex items-center gap-2 text-[13px] font-mono text-[#5C5A54]">
                      <span>Ports: {device.ports.slice(0, 8).join(', ')}{device.ports.length > 8 ? ` +${device.ports.length - 8}` : ''}</span>
                      {device.vulns.length > 0 && (
                        <div className="group relative flex items-center gap-1 cursor-help">
                          <span className="text-[#FF3D3D] flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> {device.vulns.length} CVEs
                          </span>
                          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 p-2 bg-[#1A1A18] border border-[#FF3D3D50] rounded-md shadow-xl min-w-[140px] max-w-[220px] max-h-[150px] overflow-y-auto styled-scrollbar">
                            <div className="text-[12px] font-mono text-[#FF3D3D] mb-1 tracking-wider uppercase border-b border-[#FF3D3D30] pb-1">Vulnerabilità Identificate</div>
                            <div className="flex flex-col gap-0.5">
                              {device.vulns.map((cve: string) => (
                                <a key={cve} href={`https://nvd.nist.gov/vuln/detail/${cve}`} target="_blank" rel="noreferrer" className="text-[13px] font-mono text-[#E8E6E0] hover:text-[#FF3D3D] transition-colors truncate">
                                  {cve}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {device.hostnames.length > 0 && <div className="text-[13px] font-mono text-[#8A8880] mt-0.5 truncate">{device.hostnames[0]}</div>}
                  </>
                )}

                {/* Dettaglio Espanso Schermo Intero */}
                {isFullScreen && isExpanded && (
                  <div className="border-t border-[#2A2A28]">
                    {/* Riga Porte + Hostname */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#2A2A28]">
                      <div className="bg-[#0D0D0C] p-4">
                        <div className="text-[12px] font-mono text-[#5C5A54] tracking-widest uppercase mb-2">Porte Aperte</div>
                        <div className="flex flex-wrap gap-1.5">
                          {device.ports.map((port: number) => (
                            <span key={port} className="px-2 py-1 bg-[#1A1A18] border border-[#2A2A28] rounded text-[13px] font-mono text-[var(--cyan-primary)]">{port}</span>
                          ))}
                        </div>
                      </div>
                      <div className="bg-[#0D0D0C] p-4">
                        <div className="text-[12px] font-mono text-[#5C5A54] tracking-widest uppercase mb-2">Hostname</div>
                        {device.hostnames.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {device.hostnames.map((h: string) => (
                              <span key={h} className="text-[13px] font-mono text-[#E8E6E0]">{h}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[13px] font-mono text-[#3A3A38]">Nessun DNS inverso</span>
                        )}
                      </div>
                    </div>

                    {/* Intelligence CVE */}
                    {device.vulns.length > 0 && (
                      <div className="p-4 border-t border-[#2A2A28]">
                        <div className="text-[12px] font-mono text-[#5C5A54] tracking-widest uppercase mb-3">Vulnerabilità ({device.vulns.length})</div>
                        <div className="flex flex-col gap-2">
                          {device.vulns.map((cveId: string) => {
                            const info = cveCache[cveId];
                            const isLoading = !info || info.loading;
                            const severityColor = !info?.severity ? '#5C5A54'
                              : info.severity === 'CRITICAL' ? '#FF3D3D'
                              : info.severity === 'HIGH' ? '#FF6B00'
                              : info.severity === 'MEDIUM' ? '#FFD700'
                              : '#76FF03';
                            return (
                              <div key={cveId} className="bg-[#111] border border-[#2A2A28] rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-mono font-bold text-[#E8E6E0]">{cveId}</span>
                                    {info?.cvss != null && (
                                      <span className="text-[12px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: severityColor + '15', color: severityColor, border: `1px solid ${severityColor}40` }}>CVSS {info.cvss}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {info?.severity && (
                                      <span className="text-[13px] font-mono font-bold px-2 py-0.5 rounded" style={{ backgroundColor: severityColor + '15', color: severityColor, border: `1px solid ${severityColor}40` }}>{info.severity}</span>
                                    )}
                                    <a href={`https://nvd.nist.gov/vuln/detail/${cveId}`} target="_blank" rel="noreferrer" className="text-[#5C5A54] hover:text-[#E8E6E0] transition-colors">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                                {isLoading ? (
                                  <div className="flex items-center gap-2 py-1">
                                    <Loader2 className="w-3 h-3 animate-spin text-[#5C5A54]" />
                                    <span className="text-[12px] font-mono text-[#5C5A54]">Recupero intelligence vulnerabilità...</span>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-[13px] font-mono text-[#8A8880] leading-relaxed">{info.description}</p>
                                    {info.cwe && <div className="text-[12px] font-mono text-[#5C5A54] mt-2">Debolezza: {info.cwe}</div>}
                                    {info.affected && info.affected.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {info.affected.map((a: any, i: number) => (
                                          <span key={i} className="text-[13px] font-mono px-1.5 py-0.5 bg-[#1A1A18] border border-[#2A2A28] rounded text-[#8A8880]">
                                            {a.vendor}/{a.product}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
          <div className="px-3 py-2 border-t border-[#2A2A28]">
            <div className="text-[12px] font-mono text-[#5C5A54] tracking-wider">SWEPT {sweepResult.summary.total_hosts} HOSTS IN {(sweepResult.sweep_time_ms / 1000).toFixed(1)}s · ASN {sweepResult.center.asn}</div>
          </div>
        </div>
      )}

      {results && !(sweepResult && !loading) && (
        <div className="bg-[var(--bg-primary)]/40 border border-[var(--border-primary)] rounded-lg p-3 max-h-[50vh] overflow-y-auto styled-scrollbar">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-mono tracking-widest" style={{ color: currentTab?.color }}>{currentTab?.label} RISULTATI</span>
            <div className="flex items-center gap-2">
              <button onClick={() => {
                const entities = entitiesFromSearchResults(results, activeTab);
                if (entities.length > 0) downloadMaltego({ entities, links: [] }, `osint-${activeTab}-${Date.now()}`, 'csv');
              }} className="text-[8px] font-mono px-1.5 py-0.5 rounded tracking-wider uppercase transition-all"
                style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)', color: '#00E676' }}
                title="Esporta in formato Maltego CSV"
              >M</button>
              <span className="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          {renderStructuredResults()}
        </div>
      )}

      {history.length > 0 && !results && (
        <div className="space-y-1">
          <span className="text-[13px] font-mono tracking-widest text-[var(--text-muted)]">SCANSIONI RECENTI</span>
          {history.slice(0, 5).map((h, i) => (
            <button key={i} onClick={() => { setActiveTab(h.tab); setQuery(h.query); }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[var(--hover-accent)] transition-colors text-left">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-mono" style={{ color: TABS.find(t => t.id === h.tab)?.color }}>{TABS.find(t => t.id === h.tab)?.label}</span>
                <span className="text-[12px] font-mono text-[var(--text-secondary)]">{h.query}</span>
              </div>
              <span className="text-[12px] font-mono text-[var(--text-muted)]">{h.time}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (isMobile) return renderContent();

  if (isFullScreen) {
    const fullScreenNode = (
      <div className="fixed top-4 bottom-4 right-4 w-[40vw] min-w-[600px] max-w-[800px] z-[999] glass-panel bg-[#0a0a09]/95 backdrop-blur-2xl border border-[var(--cyan-primary)]/40 rounded-xl flex flex-col overflow-hidden shadow-2xl shadow-[var(--cyan-primary)]/20 transition-all duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-secondary)] bg-[#111]">
          <div className="flex items-center gap-3">
            <Radar className="w-5 h-5 text-[var(--cyan-primary)]" />
            <span className="hud-text text-[16px] text-[var(--text-primary)]">KIT RICOGNIZIONE OSIRIS</span>
            <span className="gotham-tag gotham-tag--info" style={{ fontSize: '9px' }}>VISTA ESPANSA</span>
            <span className="gotham-tag gotham-tag--classified" style={{ fontSize: '8px' }}>{TABS.length} MODULI</span>
          </div>
          <button onClick={() => setIsFullScreen(false)} className="p-2 hover:bg-white/5 rounded transition-colors text-[var(--text-muted)] hover:text-white">
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 styled-scrollbar">
          <div className="w-full full-screen-mode-content">
             {renderContent()}
          </div>
        </div>
      </div>
    );
    return typeof document !== 'undefined' ? createPortal(fullScreenNode, document.body) : fullScreenNode;
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="glass-panel flex flex-col overflow-hidden pointer-events-auto shrink-0 h-[500px] max-h-[80vh] resize-y">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.3)] hover:bg-[var(--hover-accent)] transition-colors">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1">
          <Radar className="w-3.5 h-3.5 text-[var(--cyan-primary)]" />
          <span className="hud-text text-[12px] text-[var(--text-primary)]">KIT RICOGNIZIONE</span>
          <span className="gotham-tag gotham-tag--info" style={{ fontSize: '7px', padding: '1px 5px' }}>{TABS.length} STRUMENTI</span>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsFullScreen(true)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Schermo Intero">
             <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan-primary)] animate-osiris-pulse" />
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-y-auto px-3 py-3 flex-1 min-h-0 styled-scrollbar">
            {renderContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const OsintPanel = memo(OsintPanelInner);
export default OsintPanel;
