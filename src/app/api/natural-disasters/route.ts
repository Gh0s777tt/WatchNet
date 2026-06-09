import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // NASA EONET — free, no key
    const resp = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events/geojson', { signal: AbortSignal.timeout(10000) });
    const data = await resp.json();
    const events = (data.features || []).map((f: any) => {
      const coords = f.geometry?.coordinates || [0, 0];
      const cat = f.properties?.categories?.[0] || {};
      return {
        id: f.id,
        title: f.properties?.title || 'Event',
        type: cat.title || 'Unknown',
        category: cat.id || 'unknown',
        lat: Array.isArray(coords[0]) ? (f.properties?.centroid?.coordinates?.[1] || coords[0][1]) : coords[1],
        lng: Array.isArray(coords[0]) ? (f.properties?.centroid?.coordinates?.[0] || coords[0][0]) : coords[0],
        link: f.properties?.link,
        description: f.properties?.description,
      };
    }).filter((e: any) => e.lat && e.lng);
    return NextResponse.json({ disasters: events, total: events.length, timestamp: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ disasters: [], error: 'EONET unavailable' });
  }
}
