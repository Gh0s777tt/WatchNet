import { NextResponse } from 'next/server';
import { safeFetch, isRateLimited, getClientIp } from '@/lib/ssrf-guard';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp, 20, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let targetUrl: string;
  try {
    targetUrl = new URL(url).href;
    if (!['http:', 'https:'].includes(new URL(targetUrl).protocol)) {
      return NextResponse.json({ error: 'Only HTTP and HTTPS URLs are allowed' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  try {
    const res = await safeFetch(targetUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
      maxRedirects: 5,
      headers: { 'User-Agent': 'Osiris-OSINT/3.0' },
    });

    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const securityHeaders = {
      hsts: res.headers.get('strict-transport-security') || null,
      x_frame_options: res.headers.get('x-frame-options') || null,
      x_content_type_options: res.headers.get('x-content-type-options') || null,
      csp: res.headers.get('content-security-policy') || null,
    };

    return NextResponse.json({
      url: targetUrl,
      final_url: res.url,
      status: res.status,
      status_text: res.statusText,
      headers,
      content_type: res.headers.get('content-type') || null,
      security_headers: securityHeaders,
      server: res.headers.get('server') || null,
      powered_by: res.headers.get('x-powered-by') || null,
      redirect_chain: res.redirected ? [{ from: targetUrl, to: res.url }] : [],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'URL scan failed', detail: error.message }, { status: 502 });
  }
}
