import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword');
  const cveId = searchParams.get('cve');
  try {
    if (cveId) {
      const resp = await fetch(`https://cve.circl.lu/api/cve/${cveId}`, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) throw new Error('CVE not found');
      const d = await resp.json();
      return NextResponse.json({
        id: d.id, summary: d.summary, cvss: d.cvss,
        severity: d.cvss >= 9 ? 'CRITICAL' : d.cvss >= 7 ? 'HIGH' : d.cvss >= 4 ? 'MEDIUM' : 'LOW',
        published: d.published, last_modified: d.last_modified, references: d.references?.slice(0, 10), cwe: d.cwe, exploit: d.exploit,
      });
    }
    if (keyword) {
      const resp = await fetch(`https://cve.circl.lu/api/search/${encodeURIComponent(keyword)}`, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) throw new Error('Search failed');
      const d = await resp.json();
      const results = (Array.isArray(d) ? d : []).slice(0, 20).map((c: any) => ({
        id: c.id, summary: c.summary?.slice(0, 200), cvss: c.cvss,
        severity: c.cvss >= 9 ? 'CRITICAL' : c.cvss >= 7 ? 'HIGH' : c.cvss >= 4 ? 'MEDIUM' : 'LOW', published: c.published,
      }));
      return NextResponse.json({ keyword, results, total: results.length, timestamp: new Date().toISOString() });
    }
    return NextResponse.json({ error: 'Provide keyword or cve parameter' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'CVE query failed' }, { status: 500 });
  }
}
