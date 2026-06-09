import { NextResponse } from 'next/server';
import { isRateLimited, getClientIp } from '@/lib/ssrf-guard';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  if (!domain) return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp, 20, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=ALL`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/dns-json' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'DNS query failed' }, { status: res.status });
    }

    const data = await res.json();
    const records: Record<string, { name: string; ttl: number; data: string }[]> = {};

    for (const answer of data.Answer || []) {
      const typeName: Record<number, string> = {
        1: 'A', 28: 'AAAA', 15: 'MX', 16: 'TXT', 5: 'CNAME',
        2: 'NS', 6: 'SOA', 33: 'SRV', 257: 'CAA', 65: 'HTTPS',
      };
      const key = typeName[answer.type] || `TYPE${answer.type}`;
      if (!records[key]) records[key] = [];
      records[key].push({ name: answer.name, ttl: answer.TTL, data: answer.data });
    }

    const summary: Record<string, string[]> = {};
    if (records.A) summary.ip_addresses = records.A.map(r => r.data);
    if (records.AAAA) summary.ipv6_addresses = records.AAAA.map(r => r.data);
    if (records.MX) summary.mail_servers = records.MX.map(r => r.data);
    if (records.NS) summary.nameservers = records.NS.map(r => r.data);

    return NextResponse.json({
      domain,
      status: data.Status,
      records,
      summary,
      total_records: (data.Answer || []).length,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'DNS over HTTPS lookup failed' }, { status: 500 });
  }
}
