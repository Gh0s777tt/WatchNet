import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  try {
    const availResp = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) });
    const availData = await availResp.json();
    const snapshots = availData?.archived_snapshots || {};
    
    const cdxResp = await fetch(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&limit=20&fl=timestamp,original,statuscode,length`, { signal: AbortSignal.timeout(8000) });
    const cdxData = cdxResp.ok ? await cdxResp.json() : [];
    
    const cdxEntries = (Array.isArray(cdxData) ? cdxData.slice(1) : []).map((e: any) => ({
      timestamp: e[0],
      date: new Date(e[0].slice(0,4)+'-'+e[0].slice(4,6)+'-'+e[0].slice(6,8)).toISOString().split('T')[0],
      original: e[1],
      status: parseInt(e[2]),
      length: parseInt(e[3]) || 0,
      archived_url: `https://web.archive.org/web/${e[0]}/${e[1]}`,
    }));

    return NextResponse.json({
      url,
      archived: !!snapshots.closest,
      closest: snapshots.closest ? {
        url: snapshots.closest.url,
        timestamp: snapshots.closest.timestamp,
        status: snapshots.closest.status,
      } : null,
      recent_snapshots: cdxEntries,
      total: cdxEntries.length,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ url, archived: false, recent_snapshots: [], error: 'Wayback Machine query failed' }, { status: 500 });
  }
}
