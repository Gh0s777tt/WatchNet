import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const asn = searchParams.get('asn');
  const ip = searchParams.get('ip');
  const prefix = searchParams.get('prefix');
  try {
    if (asn) {
      const resp = await fetch(`https://bgpview.io/api/v1/asn/${asn.replace('AS','').replace('asn','')}`, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) throw new Error('BGPView error');
      const d = await resp.json();
      return NextResponse.json({
        asn: d.data?.asn,
        name: d.data?.name,
        description: d.data?.description,
        country: d.data?.country_code,
        prefixes: d.data?.prefixes?.length || 0,
        prefixes_v6: d.data?.prefixes_v6?.length || 0,
        org: d.data?.organization?.name,
      });
    }
    if (ip) {
      const resp = await fetch(`https://bgpview.io/api/v1/ip/${ip}`, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) throw new Error('BGPView error');
      const d = await resp.json();
      return NextResponse.json({
        ip: d.data?.ip,
        asn: d.data?.asn?.asn,
        asn_name: d.data?.asn?.name,
        country: d.data?.asn?.country_code,
        prefixes: d.data?.prefixes?.map((p: any) => p.prefix),
      });
    }
    if (prefix) {
      const resp = await fetch(`https://bgpview.io/api/v1/prefix/${prefix}`, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) throw new Error('BGPView error');
      const d = await resp.json();
      return NextResponse.json({ prefix: d.data?.prefix, asn: d.data?.asn?.asn, name: d.data?.asn?.name, country: d.data?.asn?.country_code });
    }
    return NextResponse.json({ error: 'Provide asn, ip, or prefix parameter' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'BGP query failed' }, { status: 500 });
  }
}
