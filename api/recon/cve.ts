/**
 * RECON · CVE intelligence  (ported from OSIRIS `osint/cve`)
 *
 * Self-contained Vercel Edge Function. Fetches vulnerability details from the
 * MITRE CVE 5.0 API with a CIRCL fallback (both keyless). Part of the
 * OSIRIS → WatchNet merge. Hand-written (exceptions: `deferred`) pending proto
 * migration — see whois.ts.
 */

export const config = { runtime: 'edge' };

const CVE_RE = /^CVE-\d{4}-\d{4,}$/i;

function cors(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}
function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, s-maxage=86400, stale-while-revalidate=172800' : 'no-store',
      ...cors(origin),
    },
  });
}

function severityFromScore(score: number | null): string | null {
  if (score === null) return null;
  return score >= 9 ? 'CRITICAL' : score >= 7 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW';
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405, origin);

  const raw = new URL(req.url).searchParams.get('cve')?.trim();
  if (!raw) return json({ error: 'Missing cve parameter' }, 400, origin);
  if (!CVE_RE.test(raw)) {
    return json({ error: 'Invalid CVE format. Expected: CVE-YYYY-NNNNN' }, 400, origin);
  }
  const cve = raw.toUpperCase();

  try {
    const res = await fetch(`https://cveawg.mitre.org/api/cve/${encodeURIComponent(cve)}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = (await res.json()) as Record<string, any>;
      const cna = data.containers?.cna;
      const description =
        cna?.descriptions?.find((d: any) => d.lang === 'en')?.value ??
        cna?.descriptions?.[0]?.value ??
        'No description available.';

      let cvss: number | null = null;
      let cvssVector: string | null = null;
      let severity: string | null = null;
      for (const m of cna?.metrics ?? []) {
        const v31 = m.cvssV3_1 || m.cvssV3_0 || m.cvssV31;
        if (v31) {
          cvss = v31.baseScore ?? null;
          cvssVector = v31.vectorString ?? null;
          severity = v31.baseSeverity ?? null;
          break;
        }
        const v2 = m.cvssV2_0 || m.cvssV2;
        if (v2) {
          cvss = v2.baseScore ?? null;
          cvssVector = v2.vectorString ?? null;
          break;
        }
      }

      const pt = cna?.problemTypes?.[0]?.descriptions?.[0];
      const cwe: string | null = pt?.cweId ?? pt?.description ?? null;
      const references = (cna?.references ?? []).slice(0, 5).map((r: any) => r.url).filter(Boolean);
      const affected = (cna?.affected ?? []).slice(0, 5).map((a: any) => ({
        vendor: a.vendor ?? 'Unknown',
        product: a.product ?? 'Unknown',
        versions: (a.versions ?? []).slice(0, 3).map((v: any) => v.version).filter(Boolean),
      }));

      return json(
        {
          id: data.cveMetadata?.cveId ?? cve,
          description,
          cvss,
          cvss_vector: cvssVector,
          severity: severity ?? severityFromScore(cvss),
          cwe,
          affected,
          references,
          published: data.cveMetadata?.datePublished ?? null,
          modified: data.cveMetadata?.dateUpdated ?? null,
          source: 'mitre',
        },
        200,
        origin,
      );
    }

    // Fallback: CIRCL
    const circl = await fetch(`https://cve.circl.lu/api/cve/${encodeURIComponent(cve)}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
    if (circl.ok) {
      const data = (await circl.json()) as Record<string, any>;
      return json(
        {
          id: data.id ?? cve,
          description: data.summary ?? 'No description available.',
          cvss: data.cvss ?? null,
          cvss_vector: data.cvss_vector ?? null,
          severity: severityFromScore(data.cvss ?? null),
          cwe: data.cwe ?? null,
          affected: [],
          references: (data.references ?? []).slice(0, 5),
          published: data.Published ?? null,
          modified: data.Modified ?? null,
          source: 'circl',
        },
        200,
        origin,
      );
    }

    return json(
      { id: cve, description: 'CVE details could not be retrieved at this time.', cvss: null, references: [], source: 'unavailable' },
      200,
      origin,
    );
  } catch {
    return json({ error: 'CVE lookup failed' }, 500, origin);
  }
}
