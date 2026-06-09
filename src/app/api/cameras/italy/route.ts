import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CATEGORIES: Record<string, { categoria: string; colore: string }> = {
  mountain: { categoria: 'Montagna', colore: '#FFFFFF' },
  coastal: { categoria: 'Mare', colore: '#00BFFF' },
  urban: { categoria: 'Città', colore: '#FFD700' },
  marina: { categoria: 'Porto', colore: '#FF6B35' },
  lake: { categoria: 'Lago', colore: '#4FC3F7' },
  waterway: { categoria: 'Fiume', colore: '#00E5FF' },
  nature: { categoria: 'Natura', colore: '#76FF03' },
  transport: { categoria: 'Traffico', colore: '#FF3D3D' },
  webcam: { categoria: 'Webcam', colore: '#E040FB' },
};

const DEFAULT = { categoria: 'Natura', colore: '#39FF14' };

let cachedData: any[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

function getStreamType(urlType: string | null | undefined): string {
  if (urlType === 'hls') return 'hls';
  if (urlType === 'html_page') return 'iframe';
  return 'jpg';
}

async function fetchItalianCameras(): Promise<any[]> {
  const now = Date.now();
  if (cachedData && now - cacheTime < CACHE_TTL) {
    return cachedData;
  }

  const res = await fetch(
    'https://raw.githubusercontent.com/willytop8/Live-Environment-Streams/main/data/IT.json',
    { signal: AbortSignal.timeout(15000) },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch IT.json: ${res.status}`);
  }

  const data = await res.json();
  const features = data.features || [];

  const enriched = features
    .map((f: any) => {
      const props = f.properties || {};
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) return null;

      const environment = props.environment || '';
      const cat = CATEGORIES[environment] || DEFAULT;

      const url = props.url || '';
      const urlType = props.url_type || '';

      return {
        ...f,
        properties: {
          ...props,
          categoria: cat.categoria,
          colore: cat.colore,
          stream_type: getStreamType(urlType),
          stream_url: url,
          feed_url: url,
          source: 'SkylineWebcams Italia',
        },
      };
    })
    .filter((f: any) => f !== null);

  cachedData = enriched;
  cacheTime = now;
  return enriched;
}

export async function GET() {
  try {
    const cameras = await fetchItalianCameras();
    return NextResponse.json(cameras);
  } catch (error) {
    console.error('Cameras Italy fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Italian cameras' },
      { status: 500 },
    );
  }
}
