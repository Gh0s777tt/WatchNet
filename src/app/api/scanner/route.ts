import { NextResponse } from 'next/server';
import { validateHost, isRateLimited, getClientIp } from '@/lib/ssrf-guard';

/**
 * OSIRIS — Scanner Proxy (Hardened)
 * Rate-limited, target-validated, scope-restricted
 */

const SCANNER_URL = process.env.SCANNER_URL || '';
const SCANNER_KEY = process.env.SCANNER_KEY || '';

// La regex basata su stringhe presente in precedenza corrispondeva solo a dotted-quad
// IPv4, non rilevava forme IPv6 e non risolveva mai gli hostname — quindi un attaccante
// poteva bypassarla con `target=metadata.example.com` (DNS A → 169.254.169.254),
// `target=2130706433` (decimale 127.0.0.1), o `target=::1`. La validazione ora
// canonizza l'input e risolve gli hostname prima di decidere. Vedi
// `src/lib/ssrf-guard.ts`.

// ── TIPI SCAN CONSENTITI (solo sottoinsieme sicuro) ──
const ALLOWED_SCANS: Record<string, { endpoint: string; timeout: number }> = {
  quick:      { endpoint: '/scan/quick',      timeout: 15000 },
  ssl:        { endpoint: '/scan/ssl',        timeout: 10000 },
  headers:    { endpoint: '/scan/headers',    timeout: 10000 },
  rdns:       { endpoint: '/scan/rdns',       timeout: 8000  },
  subdomains: { endpoint: '/scan/subdomains', timeout: 15000 },
  tech:       { endpoint: '/scan/tech',       timeout: 15000 },
  whois:      { endpoint: '/scan/whois',      timeout: 10000 },
  geoloc:     { endpoint: '/scan/geoloc',     timeout: 8000  },
  vuln:       { endpoint: '/scan/vuln',       timeout: 90000 },
};

// RIMOSSI dall'accesso pubblico: deep, ports, banner, traceroute
// Questi sono pericolosi in un contesto non autenticato:
//   deep     → scansiona 65.535 porte (amplificatore DDoS)
//   banner   → raccoglie versioni software dai target usando il nostro IP
//   traceroute → rivela l'infrastruttura di hosting
//   ports    → scansione arbitraria di intervalli di porte

export async function GET(req: Request) {
  // 1. Verifica scanner configurato
  if (!SCANNER_KEY) {
    return NextResponse.json({ error: 'Scanner not configured', hint: 'Set SCANNER_URL and SCANNER_KEY in .env' }, { status: 503 });
  }

  // 2. Limite richieste per IP client
  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp, 5, 60_000)) {
    return NextResponse.json({
      error: 'Rate limit exceeded',
      detail: `Maximum 5 scans per minute. Please wait before scanning again.`,
    }, { status: 429 });
  }

  // 3. Valida parametri
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('target')?.trim();
  const scanType = searchParams.get('type') || 'quick';

  if (!target) {
    return NextResponse.json({ error: 'Missing target parameter' }, { status: 400 });
  }

  // 4. Blocca target privati/interni (risolve DNS prima di decidere, quindi un
  //    hostname che punta a un intervallo riservato viene rifiutato, e forme
  //    IPv6 + IPv4 non canoniche non sono più bypass gratuiti).
  const guard = await validateHost(target);
  if (!guard.ok) {
    return NextResponse.json({
      error: 'Target blocked',
      detail: `Target validation failed: ${guard.reason}`,
    }, { status: 403 });
  }

  // 5. Valida tipo scan (solo scan sicuri consentiti)
  const scanConfig = ALLOWED_SCANS[scanType];
  if (!scanConfig) {
    return NextResponse.json({
      error: 'Scan type not available',
      detail: `"${scanType}" is restricted. Available: ${Object.keys(ALLOWED_SCANS).join(', ')}`,
      available_scans: Object.keys(ALLOWED_SCANS),
    }, { status: 403 });
  }

  // 6. Esegui scan con timeout stretto
  try {
    const params = new URLSearchParams({ key: SCANNER_KEY, target });
    const res = await fetch(`${SCANNER_URL}${scanConfig.endpoint}?${params.toString()}`, {
      signal: AbortSignal.timeout(scanConfig.timeout),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({
      error: 'Scanner unreachable',
      detail: e.message,
    }, { status: 502 });
  }
}
