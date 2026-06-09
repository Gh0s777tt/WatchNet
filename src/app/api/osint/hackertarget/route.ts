import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  const type = searchParams.get('type') || 'hostsearch';
  if (!domain) return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });
  try {
    let data: any = {};
    
    if (type === 'hostsearch' || type === 'all') {
      const hs = await fetch(`https://api.hackertarget.com/hostsearch/?q=${encodeURIComponent(domain)}`, { signal: AbortSignal.timeout(10000) });
      if (hs.ok) {
        const text = await hs.text();
        data.hostsearch = text.trim().split('\n').filter(l => l).map(l => {
          const [host, ip] = l.split(',');
          return { host, ip };
        });
      }
    }
    
    if (type === 'reverseip' || type === 'all') {
      const ri = await fetch(`https://api.hackertarget.com/reverseiplookup/?q=${encodeURIComponent(domain)}`, { signal: AbortSignal.timeout(10000) });
      if (ri.ok) {
        const text = await ri.text();
        data.reverseip = text.trim().split('\n').filter(l => l && !l.includes('error') && !l.includes('API'));
      }
    }
    
    if (type === 'asn' || type === 'all') {
      const asn = await fetch(`https://api.hackertarget.com/aslookup/?q=${encodeURIComponent(domain)}`, { signal: AbortSignal.timeout(10000) });
      if (asn.ok) {
        const text = await asn.text();
        data.asn = text.trim().split('\n').filter(l => l && !l.includes('error'));
      }
    }

    return NextResponse.json({ domain, type, data, timestamp: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ domain, error: 'HackerTarget query failed' }, { status: 500 });
  }
}
