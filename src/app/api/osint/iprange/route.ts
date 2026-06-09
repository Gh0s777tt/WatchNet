import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function parseCIDR(cidr: string): string[] {
  const [ipStr, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  if (!ipStr || isNaN(bits) || bits < 0 || bits > 32) return [];

  const octets = ipStr.split('.').map(Number);
  if (octets.length !== 4 || octets.some(o => isNaN(o) || o < 0 || o > 255)) return [];

  const ipNum = ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
  const mask = ~(0xFFFFFFFF >>> bits) >>> 0;
  const network = (ipNum & mask) >>> 0;

  const total = Math.min(Math.pow(2, 32 - bits) - 2, 30);
  const ips: string[] = [];
  for (let i = 1; i <= total; i++) {
    const addr = (network + i) >>> 0;
    ips.push(`${(addr >>> 24) & 255}.${(addr >>> 16) & 255}.${(addr >>> 8) & 255}.${addr & 255}`);
  }
  return ips;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cidr = searchParams.get('cidr');

  if (!cidr) {
    return NextResponse.json({ error: 'Missing cidr parameter (e.g. ?cidr=192.168.1.0/24)' }, { status: 400 });
  }

  try {
    const ips = parseCIDR(cidr);
    if (ips.length === 0) {
      return NextResponse.json({ error: 'Invalid CIDR notation' }, { status: 400 });
    }

    const results = await Promise.allSettled(
      ips.map(ip =>
        fetch(`https://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,org,as,query`, {
          signal: AbortSignal.timeout(5000),
        }).then(r => r.json())
      )
    );

    const data = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value)
      .filter(d => d.status === 'success')
      .map(d => ({
        ip: d.query,
        country: d.country,
        region: d.regionName,
        city: d.city,
        isp: d.isp,
        org: d.org,
        as: d.as,
      }));

    return NextResponse.json({
      range: cidr,
      ips: data,
      total: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ ips: [], error: 'Scan failed' }, { status: 500 });
  }
}
