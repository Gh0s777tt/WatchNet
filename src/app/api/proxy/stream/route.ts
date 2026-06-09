import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_DOMAINS = [
  'windy.com',
  'webcams.windy.com',
  'ipcamlive.com',
  'insecam.org',
  'earthcam.com',
  'traffic.ottawa.ca',
  '511on.ca',
  '511.alberta.ca',
  'fl511.com',
  'data.wsdot.wa.gov',
  'cwwp2.dot.ca.gov',
  'api.tfl.gov.uk',
  's3-eu-west-1.amazonaws.com',
  'streaming1.neotel.net.mk',
  'uzivobeograd.rs',
  'opendata.ndw.nu',
  'api.data.gov.sg',
  'raw.githubusercontent.com',
  'wc-heli.chuv.ch',
  'uygulama.ibb.gov.tr',
  'istanbuluseyret.ibb.gov.tr',
  'uym.ibb.gov.tr',
  'youtube.com',
  'www.youtube.com',
  'ytimg.com',
  'i.ytimg.com',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.m3u8', '.ts', '.mp4', '.webm'];

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const referer = request.nextUrl.searchParams.get('referer') || '';
  const userAgent = request.nextUrl.searchParams.get('ua') || '';

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const targetUrl = new URL(url);
    const host = targetUrl.hostname.toLowerCase();

    const isAllowed = ALLOWED_DOMAINS.some(d => host === d || host.endsWith('.' + d));
    const isAllowedExt = ALLOWED_EXTENSIONS.some(ext => targetUrl.pathname.toLowerCase().endsWith(ext));

    if (!isAllowed && !isAllowedExt) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
    }

    const headers: Record<string, string> = {
      'Accept': '*/*',
      'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    };

    if (referer) {
      headers['Referer'] = referer;
    }

    const response = await fetch(targetUrl.toString(), { headers });

    if (!response.ok) {
      return NextResponse.json({ error: 'Upstream fetch failed' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const isImage = contentType.startsWith('image/');
    const isStream = contentType.startsWith('video/') || contentType.includes('mpegurl') || contentType.includes('octet-stream');

    const cacheControl = isImage
      ? 'public, max-age=300, stale-while-revalidate=600'
      : isStream
        ? 'no-cache'
        : 'public, max-age=60';

    const data = await response.arrayBuffer();

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });

  } catch (error) {
    console.error('Stream proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
