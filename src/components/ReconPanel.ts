import { Panel } from './Panel';
import { unsafeRawHtml } from '@/utils/sanitize';

/**
 * RECON Toolkit panel — interactive OSINT lookups (ported from OSIRIS).
 *
 * Slice 1 ships the WHOIS / domain-intel tool, backed by the `/api/recon/whois`
 * edge endpoint (RDAP registration data + live HTTP security-header grading).
 *
 * The OSIRIS OsintPanel had 14 tabs (DNS, IP, CVE, sweep, certs, threats, BGP,
 * …). This is the vanilla-TS rewrite scaffold — `ReconTool` widens to a union
 * and each new tool slots in as a tab + an `/api/recon/*` endpoint in later
 * slices.
 *
 * NOTES (slice-scoped, follow-ups tracked in the merge plan):
 *  - i18n: literal English strings for now. Extract to locale keys and run
 *    `npm run sync:locales` so all 24 languages stay in sync.
 *  - styling: `.recon-*` classes are unstyled until a `recon` stylesheet is
 *    added to the design system. The panel is functional regardless.
 *  - OFAC SDN cross-check of registrants arrives with the `entity` (intel)
 *    domain in a later slice.
 */

interface WhoisResponse {
  domain: string;
  timestamp?: string;
  rdap?: {
    handle?: string;
    name?: string;
    status?: string[];
    nameservers?: string[];
    entities?: { name?: string; org?: string; roles?: string[] }[];
  };
  registration?: string;
  expiration?: string;
  last_changed?: string;
  http?: {
    status: number;
    headers: Record<string, string>;
    redirected: boolean;
    final_url: string;
  };
  security_score?: { score: number; max: number; grade: string };
  error?: string;
}

const DOMAIN_RE = /^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/;

export class ReconPanel extends Panel {
  private query = '';
  private busy = false;

  constructor() {
    super({
      id: 'recon',
      title: 'RECON Toolkit',
      showCount: false,
      trackActivity: true,
      infoTooltip: 'Active OSINT lookups (WHOIS / RDAP). Ported from OSIRIS.',
    });
    // A single delegated listener on the stable `content` element survives the
    // innerHTML swaps that setSafeContent() performs on every render.
    this.content.addEventListener('click', (e) => this.onClick(e));
    this.content.addEventListener('keydown', (e) => this.onKeydown(e as KeyboardEvent));
    this.renderForm();
  }

  private onClick(e: Event): void {
    if ((e.target as HTMLElement).closest('[data-recon-scan]')) {
      void this.runScan();
    }
  }

  private onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && (e.target as HTMLElement).matches('[data-recon-input]')) {
      e.preventDefault();
      void this.runScan();
    }
  }

  private currentInputValue(): string {
    const el = this.content.querySelector<HTMLInputElement>('[data-recon-input]');
    return el?.value.trim().toLowerCase() ?? '';
  }

  private async runScan(): Promise<void> {
    if (this.busy) return;
    const domain = this.currentInputValue();
    this.query = domain;
    if (!DOMAIN_RE.test(domain)) {
      this.renderForm('Enter a valid domain, e.g. example.com');
      return;
    }
    this.busy = true;
    this.renderForm(null, true);
    try {
      const res = await fetch(`/api/recon/whois?domain=${encodeURIComponent(domain)}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      });
      const data = (await res.json()) as WhoisResponse;
      if (!res.ok || data.error) {
        this.renderForm(data.error ?? `Lookup failed (HTTP ${res.status})`);
        return;
      }
      this.renderResults(data);
    } catch {
      this.renderForm('Network error or timeout — try again.');
    } finally {
      this.busy = false;
    }
  }

  private renderForm(error: string | null = null, loading = false): void {
    const q = escapeAttr(this.query);
    const errHtml = error ? `<div class="recon-error">${escapeHtml(error)}</div>` : '';
    const btn = loading
      ? '<button class="recon-btn" disabled>Scanning…</button>'
      : '<button class="recon-btn" data-recon-scan>SCAN</button>';
    this.setSafeContent(
      unsafeRawHtml(
        `<div class="recon-panel">
          <div class="recon-tabs"><span class="recon-tab active">WHOIS</span></div>
          <div class="recon-form">
            <input class="recon-input" data-recon-input type="text" inputmode="url"
                   placeholder="domain (example.com)" value="${q}"
                   autocomplete="off" spellcheck="false" />
            ${btn}
          </div>
          ${errHtml}
          <div class="recon-hint">RDAP registration data + live HTTP security-header grade.</div>
        </div>`,
        'RECON panel: every dynamic value is escaped; migrate to h()/safeHtml in a follow-up',
      ),
    );
  }

  private renderResults(d: WhoisResponse): void {
    const rows: string[] = [];
    const add = (k: string, v?: string): void => {
      if (v) rows.push(`<tr><td class="recon-k">${escapeHtml(k)}</td><td class="recon-v">${escapeHtml(v)}</td></tr>`);
    };
    add('Domain', d.domain);
    add('Registrar', d.rdap?.name);
    add('Status', d.rdap?.status?.join(', '));
    add('Registered', fmtDate(d.registration));
    add('Expires', fmtDate(d.expiration));
    add('Last changed', fmtDate(d.last_changed));
    add('Nameservers', d.rdap?.nameservers?.join(', '));

    const entities = (d.rdap?.entities ?? [])
      .map((en) => {
        const label = [en.org, en.name].filter(Boolean).join(' · ');
        const roles = en.roles?.length ? ` (${en.roles.join('/')})` : '';
        return label ? `<li>${escapeHtml(label + roles)}</li>` : '';
      })
      .filter(Boolean)
      .join('');

    let sec = '';
    if (d.security_score) {
      const g = d.security_score.grade;
      sec = `<div class="recon-grade recon-grade-${escapeAttr(g)}">Security headers: <b>${escapeHtml(g)}</b> (${d.security_score.score}/${d.security_score.max})</div>`;
      const hdrs = Object.entries(d.http?.headers ?? {})
        .map(([k, v]) => `<tr><td class="recon-k">${escapeHtml(k)}</td><td class="recon-v">${escapeHtml(v)}</td></tr>`)
        .join('');
      if (hdrs) sec += `<table class="recon-table recon-headers">${hdrs}</table>`;
    }

    this.setSafeContent(
      unsafeRawHtml(
        `<div class="recon-panel">
          <div class="recon-tabs"><span class="recon-tab active">WHOIS</span></div>
          <div class="recon-form">
            <input class="recon-input" data-recon-input type="text" value="${escapeAttr(d.domain)}"
                   autocomplete="off" spellcheck="false" />
            <button class="recon-btn" data-recon-scan>SCAN</button>
          </div>
          <table class="recon-table">${rows.join('')}</table>
          ${entities ? `<div class="recon-subhead">Registrant entities</div><ul class="recon-entities">${entities}</ul>` : ''}
          ${sec}
          <div class="recon-footer">RDAP via rdap.org${d.timestamp ? ` · ${escapeHtml(fmtDate(d.timestamp) ?? '')}` : ''}</div>
        </div>`,
        'RECON panel: every dynamic value is escaped; migrate to h()/safeHtml in a follow-up',
      ),
    );
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function fmtDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}
