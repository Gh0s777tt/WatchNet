import { NextResponse } from 'next/server';
import { isRateLimited, getClientIp } from '@/lib/ssrf-guard';

const SUBDOMAINS = [
  'www', 'mail', 'ftp', 'ssh', 'admin', 'api', 'dev', 'test', 'stage',
  'blog', 'cdn', 'static', 'assets', 'img', 'images', 'media', 'video',
  'docs', 'help', 'support', 'forum', 'community', 'shop', 'store',
  'payment', 'login', 'account', 'portal', 'webmail', 'vpn', 'ns1', 'ns2',
  'mx', 'smtp', 'pop', 'imap', 'server', 'db', 'mysql', 'redis', 'jenkins',
  'git', 'svn', 'wiki', 'status', 'monitor', 'analytics', 'tracker', 'app',
  'm', 'mobile', 'touch', 'wap', 'backup', 'exchange', 'remote', 'intranet',
  'localhost', 'webdisk', 'gateway', 'proxy', 'mail2', 'news', 'lists',
  'autodiscover', 'owa', 'cpanel', 'whm', 'phpmyadmin', 'pma',
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  if (!domain) return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp, 10, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  try {
    const found: { name: string; ip: string; type: string }[] = [];
    const batchSize = 10;

    for (let i = 0; i < SUBDOMAINS.length; i += batchSize) {
      const batch = SUBDOMAINS.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (sub) => {
          const fqdn = `${sub}.${domain}`;
          try {
            const res = await fetch(
              `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(fqdn)}&type=A`,
              {
                signal: AbortSignal.timeout(5000),
                headers: { 'Accept': 'application/dns-json' },
              }
            );
            if (res.ok) {
              const data = await res.json();
              if (data.Answer && data.Answer.length > 0) {
                const ips = data.Answer
                  .filter((a: any) => a.type === 1)
                  .map((a: any) => a.data);
                if (ips.length > 0) {
                  return { name: fqdn, ip: ips[0], type: 'A' };
                }
              }
            }
          } catch {
            // subdomain didn't resolve, skip
          }
          return null;
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          found.push(r.value);
        }
      }
    }

    return NextResponse.json({
      domain,
      subdomains: found,
      total_found: found.length,
      total_checked: SUBDOMAINS.length,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Subdomain bruteforce failed' }, { status: 500 });
  }
}
