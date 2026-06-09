import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let cachedData: any = null;
let cacheTime = 0;

export async function GET() {
  try {
    if (Date.now() - cacheTime < 300000 && cachedData) {
      return NextResponse.json(cachedData);
    }
    const resp = await fetch('https://check.torproject.org/torbulkexitlist', { signal: AbortSignal.timeout(10000) });
    const text = await resp.text();
    const ips = text.trim().split('\n').filter(l => l && !l.startsWith('#'));
    const shuffled = ips.sort(() => Math.random() - 0.5).slice(0, 30);
    const results = await Promise.allSettled(
      shuffled.map(ip => fetch(`https://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,org,query,lat,lon`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()))
    );
    const nodes = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as any).value)
      .filter(d => d.status === 'success')
      .map(d => ({ ip: d.query, country: d.country, region: d.regionName, city: d.city, isp: d.isp, org: d.org, lat: d.lat, lon: d.lon }));
    const data = { tor_exit_nodes: nodes, total_known: ips.length, sampled: nodes.length, timestamp: new Date().toISOString() };
    cachedData = data;
    cacheTime = Date.now();
    return NextResponse.json(data);
  } catch (e) {
    if (cachedData) return NextResponse.json(cachedData);
    return NextResponse.json({ tor_exit_nodes: [], error: 'Failed to fetch' }, { status: 500 });
  }
}
