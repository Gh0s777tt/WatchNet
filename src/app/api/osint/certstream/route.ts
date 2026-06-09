import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  if (!domain) return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });
  try {
    const resp = await fetch(`https://crt.sh/?q=${encodeURIComponent(`%.${domain}`)}&output=json`, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      return NextResponse.json({ domain, certificates: [], count: 0, note: 'No data from crt.sh' });
    }
    const text = await resp.text();
    if (!text || text.trim() === '') {
      return NextResponse.json({ domain, certificates: [], count: 0 });
    }
    const data = JSON.parse(text);
    const certs = (Array.isArray(data) ? data : []).slice(0, 50).map((c: any) => ({
      issuer: c.issuer_name,
      common_name: c.common_name,
      not_before: c.not_before,
      not_after: c.not_after,
      serial: c.serial_number,
      fingerprint: c.fingerprint,
    }));
    return NextResponse.json({ domain, certificates: certs, count: certs.length, timestamp: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ domain, certificates: [], count: 0, error: 'Query failed' }, { status: 500 });
  }
}
