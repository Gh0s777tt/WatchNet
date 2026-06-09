import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat') || '41.9';
  const lon = searchParams.get('lon') || '12.5';
  const radius = searchParams.get('radius') || '10000';
  try {
    const resp = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${radius}&gslimit=50&format=json&origin=*`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await resp.json();
    const pages = data?.query?.geosearch || [];
    const articles = pages.map((p: any) => ({
      id: p.pageid,
      title: p.title,
      lat: p.lat,
      lng: p.lon,
      distance: Math.round(p.dist),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
    }));
    return NextResponse.json({ articles, total: articles.length, center: { lat: parseFloat(lat), lon: parseFloat(lon) }, timestamp: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ articles: [], error: 'Wikipedia API failed' }, { status: 500 });
  }
}
