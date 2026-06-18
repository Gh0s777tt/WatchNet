import { Panel } from './Panel';
import { unsafeRawHtml } from '@/utils/sanitize';

/**
 * RECON Toolkit panel — interactive OSINT lookups (ported from OSIRIS).
 *
 * Tabbed multi-tool panel. Each tool maps to a self-contained `/api/recon/*`
 * edge function. Slice 2 ships WHOIS, DNS, IP intel, and CVE. Adding a tool =
 * one ReconTool entry + one renderer + one `/api/recon/<id>.ts` endpoint.
 *
 * NOTES (slice-scoped):
 *  - i18n: literal English strings for now; extract to locale keys later.
 *  - styling: `.recon-*` classes are unstyled until a recon stylesheet lands.
 *  - every dynamic value is escaped (we render via unsafeRawHtml).
 *  - OFAC SDN cross-check (OSIRIS had it on whois/ip) arrives with the entity
 *    (intel) domain in a later slice.
 */

interface ReconTool {
  id: string;
  label: string;
  placeholder: string;
  param: string;
  endpoint: string;
  validate: (v: string) => boolean;
  render: (data: Record<string, any>) => string;
}

const WHOIS_TOOL: ReconTool = {
  id: 'whois',
  label: 'WHOIS',
  placeholder: 'domain (example.com)',
  param: 'domain',
  endpoint: '/api/recon/whois',
  validate: isDomain,
  render: renderWhois,
};
const DNS_TOOL: ReconTool = {
  id: 'dns',
  label: 'DNS',
  placeholder: 'domain (example.com)',
  param: 'domain',
  endpoint: '/api/recon/dns',
  validate: isDomain,
  render: renderDns,
};
const IP_TOOL: ReconTool = {
  id: 'ip',
  label: 'IP',
  placeholder: 'IP address (8.8.8.8)',
  param: 'ip',
  endpoint: '/api/recon/ip',
  validate: isIp,
  render: renderIp,
};
const CVE_TOOL: ReconTool = {
  id: 'cve',
  label: 'CVE',
  placeholder: 'CVE-2021-44228',
  param: 'cve',
  endpoint: '/api/recon/cve',
  validate: isCve,
  render: renderCve,
};
const CRYPTO_TOOL: ReconTool = {
  id: 'crypto',
  label: 'CRYPTO',
  placeholder: 'BTC or ETH address',
  param: 'address',
  endpoint: '/api/recon/crypto',
  validate: isCrypto,
  render: renderCrypto,
};
const CERTS_TOOL: ReconTool = {
  id: 'certs',
  label: 'CERTS',
  placeholder: 'domain (example.com)',
  param: 'domain',
  endpoint: '/api/recon/certs',
  validate: isDomain,
  render: renderCerts,
};
const BGP_TOOL: ReconTool = {
  id: 'bgp',
  label: 'BGP',
  placeholder: 'IP or ASN (AS15169)',
  param: 'query',
  endpoint: '/api/recon/bgp',
  validate: isBgp,
  render: renderBgp,
};
const SHODAN_TOOL: ReconTool = {
  id: 'shodan',
  label: 'SHODAN',
  placeholder: 'IP address (1.1.1.1)',
  param: 'ip',
  endpoint: '/api/recon/shodan',
  validate: isIp,
  render: renderShodan,
};
const SANCTIONS_TOOL: ReconTool = {
  id: 'sanctions',
  label: 'SANCTIONS',
  placeholder: 'name / org / vessel',
  param: 'q',
  endpoint: '/api/recon/sanctions',
  validate: isQuery,
  render: renderSanctions,
};
const TOOLS: ReconTool[] = [
  WHOIS_TOOL,
  DNS_TOOL,
  IP_TOOL,
  CVE_TOOL,
  CRYPTO_TOOL,
  CERTS_TOOL,
  BGP_TOOL,
  SHODAN_TOOL,
  SANCTIONS_TOOL,
];

export class ReconPanel extends Panel {
  private active = 'whois';
  private readonly queries: Record<string, string> = {};
  private readonly resultsHtml: Record<string, string> = {};
  private busy = false;

  constructor() {
    super({
      id: 'recon',
      title: 'RECON Toolkit',
      showCount: false,
      trackActivity: true,
      infoTooltip: 'Active OSINT lookups (WHOIS, DNS, IP, CVE). Ported from OSIRIS.',
    });
    this.content.addEventListener('click', (e) => this.onClick(e));
    this.content.addEventListener('keydown', (e) => this.onKeydown(e as KeyboardEvent));
    this.draw();
  }

  private tool(): ReconTool {
    return TOOLS.find((t) => t.id === this.active) ?? WHOIS_TOOL;
  }

  private onClick(e: Event): void {
    const target = e.target as HTMLElement;
    const tab = target.closest('[data-recon-tab]');
    if (tab) {
      const id = tab.getAttribute('data-recon-tab');
      if (id && id !== this.active) {
        this.active = id;
        this.draw();
      }
      return;
    }
    if (target.closest('[data-recon-scan]')) void this.runScan();
  }

  private onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && (e.target as HTMLElement).matches('[data-recon-input]')) {
      e.preventDefault();
      void this.runScan();
    }
  }

  private inputValue(): string {
    return this.content.querySelector<HTMLInputElement>('[data-recon-input]')?.value.trim() ?? '';
  }

  private async runScan(): Promise<void> {
    if (this.busy) return;
    const t = this.tool();
    const q = this.inputValue();
    this.queries[t.id] = q;
    if (!t.validate(q)) {
      this.draw(`Invalid input for ${t.label}.`);
      return;
    }
    this.busy = true;
    this.draw(null, true);
    try {
      const res = await fetch(`${t.endpoint}?${t.param}=${encodeURIComponent(q)}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      });
      const data = (await res.json()) as Record<string, any>;
      this.resultsHtml[t.id] =
        !res.ok || data.error
          ? `<div class="recon-error">${esc(data.error ?? `Lookup failed (HTTP ${res.status})`)}</div>`
          : t.render(data);
    } catch {
      this.resultsHtml[t.id] = '<div class="recon-error">Network error or timeout — try again.</div>';
    } finally {
      this.busy = false;
      this.draw();
    }
  }

  private draw(error: string | null = null, loading = false): void {
    const t = this.tool();
    const tabs = TOOLS.map(
      (x) =>
        `<span class="recon-tab${x.id === this.active ? ' active' : ''}" data-recon-tab="${x.id}">${esc(x.label)}</span>`,
    ).join('');
    const q = escAttr(this.queries[t.id] ?? '');
    const btn = loading
      ? '<button class="recon-btn" disabled>Scanning…</button>'
      : '<button class="recon-btn" data-recon-scan>SCAN</button>';
    const body = error
      ? `<div class="recon-error">${esc(error)}</div>`
      : (this.resultsHtml[t.id] ?? `<div class="recon-hint">${esc(t.placeholder)}</div>`);
    this.setSafeContent(
      unsafeRawHtml(
        `<div class="recon-panel">
          <div class="recon-tabs">${tabs}</div>
          <div class="recon-form">
            <input class="recon-input" data-recon-input type="text" placeholder="${escAttr(t.placeholder)}"
                   value="${q}" autocomplete="off" spellcheck="false" />
            ${btn}
          </div>
          ${body}
        </div>`,
        'RECON panel: all dynamic values escaped; migrate to h()/safeHtml in a follow-up',
      ),
    );
  }
}

// ---- validators ----
function isDomain(v: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
}
function isIp(v: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(v) || (/^[0-9a-fA-F:]+$/.test(v) && v.includes(':'));
}
function isCve(v: string): boolean {
  return /^CVE-\d{4}-\d{4,}$/i.test(v);
}
function isCrypto(v: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(v) || /^(bc1[a-z0-9]{20,80}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(v);
}
function isBgp(v: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(v) || /^(AS)?\d+$/i.test(v);
}
function isQuery(v: string): boolean {
  return v.trim().length >= 2;
}

// ---- renderers (all dynamic values escaped) ----
function kvTable(rows: [string, string | undefined][]): string {
  const body = rows
    .filter((r) => r[1])
    .map((r) => `<tr><td class="recon-k">${esc(r[0])}</td><td class="recon-v">${esc(r[1] as string)}</td></tr>`)
    .join('');
  return body ? `<table class="recon-table">${body}</table>` : '';
}

function renderWhois(d: Record<string, any>): string {
  const sec = d.security_score
    ? `<div class="recon-grade recon-grade-${escAttr(String(d.security_score.grade))}">Security headers: <b>${esc(String(d.security_score.grade))}</b> (${esc(String(d.security_score.score))}/${esc(String(d.security_score.max))})</div>`
    : '';
  return (
    kvTable([
      ['Domain', d.domain],
      ['Registrar', d.rdap?.name],
      ['Status', Array.isArray(d.rdap?.status) ? d.rdap.status.join(', ') : undefined],
      ['Registered', fmtDate(d.registration)],
      ['Expires', fmtDate(d.expiration)],
      ['Nameservers', Array.isArray(d.rdap?.nameservers) ? d.rdap.nameservers.join(', ') : undefined],
    ]) + sec
  );
}

function renderDns(d: Record<string, any>): string {
  const records: Record<string, any[]> = d.records ?? {};
  const blocks = Object.keys(records)
    .filter((type) => (records[type] ?? []).length > 0)
    .map((type) => {
      const items = (records[type] ?? [])
        .map(
          (r: any) =>
            `<li>${esc(String(r.data ?? ''))}${r.ttl ? ` <span class="recon-ttl">ttl ${esc(String(r.ttl))}</span>` : ''}</li>`,
        )
        .join('');
      return `<div class="recon-subhead">${esc(type)}</div><ul class="recon-dns">${items}</ul>`;
    })
    .join('');
  return blocks || '<div class="recon-hint">No DNS records found.</div>';
}

function renderIp(d: Record<string, any>): string {
  const g = d.geo ?? {};
  const rep = d.reputation ?? {};
  const flags = [rep.is_proxy ? 'PROXY' : '', rep.is_hosting ? 'HOSTING' : '', rep.is_mobile ? 'MOBILE' : '']
    .filter(Boolean)
    .join(' · ');
  const risk = rep.risk_level
    ? `<div class="recon-grade recon-grade-${escAttr(String(rep.risk_level))}">Risk: <b>${esc(String(rep.risk_level))}</b>${flags ? ` — ${esc(flags)}` : ''}</div>`
    : '';
  const loc = [g.city, g.region, g.country].filter(Boolean).join(', ');
  return (
    kvTable([
      ['IP', d.ip],
      ['Location', loc || undefined],
      ['Coordinates', g.lat != null && g.lon != null ? `${esc(String(g.lat))}, ${esc(String(g.lon))}` : undefined],
      ['Timezone', g.timezone],
      ['ISP', g.isp],
      ['Org', g.org],
      ['ASN', g.as_number],
    ]) + risk
  );
}

function renderCve(d: Record<string, any>): string {
  const sev = d.severity
    ? `<div class="recon-grade recon-grade-${escAttr(String(d.severity))}">Severity: <b>${esc(String(d.severity))}</b>${d.cvss != null ? ` — CVSS ${esc(String(d.cvss))}` : ''}</div>`
    : '';
  const refs =
    Array.isArray(d.references) && d.references.length
      ? `<div class="recon-subhead">References</div><ul class="recon-refs">${d.references
          .map((r: string) => `<li>${esc(String(r))}</li>`)
          .join('')}</ul>`
      : '';
  const desc = d.description ? `<div class="recon-desc">${esc(String(d.description))}</div>` : '';
  return (
    kvTable([
      ['CVE', d.id],
      ['CWE', d.cwe],
      ['Published', fmtDate(d.published)],
      ['Source', d.source],
    ]) +
    sev +
    desc +
    refs
  );
}

function renderCrypto(d: Record<string, any>): string {
  const badge =
    d.sanctioned === true
      ? `<div class="recon-grade recon-grade-CRITICAL">⚠ SANCTIONED — ${esc(String(d.sanctions_source ?? 'OFAC SDN'))}</div>`
      : d.sanctioned === false
        ? '<div class="recon-grade recon-grade-LOW">Not on OFAC SDN list</div>'
        : '<div class="recon-hint">OFAC list unavailable</div>';
  const bal = typeof d.balance === 'number' ? `${d.balance} ${String(d.balance_unit ?? '')}` : undefined;
  return (
    kvTable([
      ['Address', d.address],
      ['Chain', d.chain],
      ['Balance', bal],
      ['Transactions', d.tx_count != null ? String(d.tx_count) : undefined],
      ['Source', d.source],
    ]) + badge
  );
}

function renderCerts(d: Record<string, any>): string {
  if (d.error) return `<div class="recon-hint">${esc(String(d.error))}</div>`;
  const subs = Array.isArray(d.subdomains) ? d.subdomains : [];
  const list = subs
    .slice(0, 40)
    .map((s: string) => `<li>${esc(String(s))}</li>`)
    .join('');
  return (
    kvTable([
      ['Domain', d.domain],
      ['Total certs', d.total_certs != null ? String(d.total_certs) : undefined],
      ['Subdomains found', d.unique_subdomains != null ? String(d.unique_subdomains) : undefined],
    ]) + (list ? `<div class="recon-subhead">Subdomains</div><ul class="recon-dns">${list}</ul>` : '')
  );
}

function renderBgp(d: Record<string, any>): string {
  if (d.type === 'asn' && d.asn) {
    const sample = Array.isArray(d.prefixes?.sample) ? d.prefixes.sample : [];
    const list = sample.map((p: string) => `<li>${esc(String(p))}</li>`).join('');
    return (
      kvTable([
        ['ASN', d.asn.number ? `AS${d.asn.number}` : undefined],
        ['Holder', d.asn.holder],
        ['Announced', d.asn.announced != null ? String(d.asn.announced) : undefined],
        ['Prefixes', d.prefixes ? String(d.prefixes.total) : undefined],
      ]) + (list ? `<div class="recon-subhead">Sample prefixes</div><ul class="recon-dns">${list}</ul>` : '')
    );
  }
  if (d.type === 'ip' && d.ip) {
    const asns = Array.isArray(d.ip.asns) ? d.ip.asns.map((a: any) => `AS${a}`).join(', ') : '';
    return kvTable([
      ['IP', d.ip.address],
      ['Prefix', d.ip.prefix],
      ['ASN(s)', asns || undefined],
      ['Holder', d.ip.holder],
    ]);
  }
  return '<div class="recon-hint">No BGP data found.</div>';
}

function renderShodan(d: Record<string, any>): string {
  if (d.error) return `<div class="recon-error">${esc(String(d.error))}</div>`;
  const ports = Array.isArray(d.ports) ? d.ports : [];
  const vulns = Array.isArray(d.vulns) ? d.vulns : [];
  const cpes = Array.isArray(d.cpes) ? d.cpes : [];
  const hostnames = Array.isArray(d.hostnames) ? d.hostnames : [];
  const tags = Array.isArray(d.tags) ? d.tags : [];
  const vulnBadge = vulns.length
    ? `<div class="recon-grade recon-grade-HIGH">${esc(String(vulns.length))} known CVE(s)</div>`
    : '';
  const section = (title: string, items: any[], limit: number): string =>
    items.length
      ? `<div class="recon-subhead">${esc(title)}</div><ul class="recon-dns">${items
          .slice(0, limit)
          .map((x) => `<li>${esc(String(x))}</li>`)
          .join('')}</ul>`
      : '';
  return (
    kvTable([
      ['IP', d.ip],
      ['Open ports', ports.length ? ports.join(', ') : undefined],
      ['Hostnames', hostnames.length ? hostnames.join(', ') : undefined],
      ['Tags', tags.length ? tags.join(', ') : undefined],
    ]) +
    vulnBadge +
    section('Known CVEs', vulns, 30) +
    section('CPEs', cpes, 15) +
    (ports.length === 0 && vulns.length === 0 ? `<div class="recon-hint">${esc(String(d.status ?? 'No records'))}</div>` : '')
  );
}

function renderSanctions(d: Record<string, any>): string {
  if (d.error) return `<div class="recon-error">${esc(String(d.error))}</div>`;
  const matches = Array.isArray(d.matches) ? d.matches : [];
  if (!matches.length) return `<div class="recon-hint">No OFAC SDN matches for "${esc(String(d.query ?? ''))}".</div>`;
  const items = matches
    .map((m: any) => {
      const meta = [m.type, m.countries, m.programs]
        .filter(Boolean)
        .map((x: any) => esc(String(x)))
        .join(' · ');
      return `<li><b>${esc(String(m.name))}</b>${meta ? `<br><span class="recon-ttl">${meta}</span>` : ''}</li>`;
    })
    .join('');
  return (
    `<div class="recon-grade recon-grade-CRITICAL">${esc(String(matches.length))} OFAC SDN match(es)</div>` +
    `<ul class="recon-dns">${items}</ul>` +
    `<div class="recon-footer">OpenSanctions us_ofac_sdn · ${esc(String(d.total_indexed ?? ''))} indexed</div>`
  );
}

// ---- escaping + format ----
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s: string): string {
  return esc(s).replace(/"/g, '&quot;');
}
function fmtDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}
