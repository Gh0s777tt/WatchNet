import { NextResponse } from 'next/server';
import {
  fetchCampingSites,
  type CampingBbox,
} from '@/lib/integrations/camping-sites';
import {
  errorSourceStatus,
  okSourceStatus,
} from '@/lib/integrations/source-metadata';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bbox = parseBbox(searchParams);

  if (!bbox) {
    return NextResponse.json({
      error: 'Missing bbox parameters. Use south,west,north,east or bbox=west,south,east,north.',
    }, { status: 400 });
  }

  try {
    const sites = await fetchCampingSites(bbox);
    return NextResponse.json({
      sites,
      total: sites.length,
      bbox,
      timestamp: new Date().toISOString(),
      sources: {
        overpass: okSourceStatus('OpenStreetMap/Overpass', 'https://overpass-api.de/api/interpreter'),
      },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Overpass camping lookup failed';
    return NextResponse.json({
      sites: [],
      total: 0,
      bbox,
      timestamp: new Date().toISOString(),
      sources: {
        overpass: errorSourceStatus('OpenStreetMap/Overpass', message, 'https://overpass-api.de/api/interpreter'),
      },
      error: message,
    }, { status: message.includes('bbox') ? 400 : 502 });
  }
}

function parseBbox(searchParams: URLSearchParams): CampingBbox | null {
  const rawBbox = searchParams.get('bbox');
  if (rawBbox) {
    const [west, south, east, north] = rawBbox.split(',').map(Number);
    if ([south, west, north, east].every(Number.isFinite)) return { south, west, north, east };
  }

  const south = Number(searchParams.get('south'));
  const west = Number(searchParams.get('west'));
  const north = Number(searchParams.get('north'));
  const east = Number(searchParams.get('east'));
  if ([south, west, north, east].every(Number.isFinite)) return { south, west, north, east };

  return null;
}
