import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'Missing email parameter' }, { status: 400 });
  
  const [local, domain] = email.split('@');
  const breaches = [
    { name: 'HaveIBeenPwned (local check)', note: 'Verify via https://haveibeenpwned.com/ - no API key available' },
    { name: 'Firefox Monitor', note: 'Similar service via Firefox account' },
    { name: 'DeHashed', note: 'Paid service, no free API' },
  ];
  
  let mailServer = 'Unknown';
  try {
    const resp = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`, { signal: AbortSignal.timeout(3000) });
    const dns = await resp.json();
    if (dns.Answer?.length) mailServer = dns.Answer[0].data;
  } catch {}

  let gravatar = null;
  try {
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.trim().toLowerCase())))).map(b => b.toString(16).padStart(2, '0')).join('');
    const gResp = await fetch(`https://www.gravatar.com/${hash}.json`, { signal: AbortSignal.timeout(3000) });
    if (gResp.ok) {
      const gData = await gResp.json();
      gravatar = gData.entry?.[0] || null;
    }
  } catch {}

  return NextResponse.json({
    email,
    domain,
    local_part: local,
    mail_server: mailServer,
    has_gravatar: !!gravatar,
    gravatar_profile: gravatar?.profileUrl,
    gravatar_name: gravatar?.displayName,
    breaches_info: breaches,
    format_valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    timestamp: new Date().toISOString(),
  });
}
