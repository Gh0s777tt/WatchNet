import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'Missing phone parameter' }, { status: 400 });
  try {
    const clean = phone.replace(/[^0-9]/g, '').slice(-10);
    const resp = await fetch(`https://phonevalidation.abstractapi.com/v1/?api_key=demo&phone=${clean}`, { signal: AbortSignal.timeout(5000) });
    if (resp.ok) {
      const data = await resp.json();
      return NextResponse.json({
        phone: data.phone,
        valid: data.valid,
        country: data.country?.name,
        country_code: data.country?.code,
        location: data.location,
        carrier: data.carrier,
        line_type: data.line_type,
      });
    }
    const countryCodes: Record<string, string> = {
      '1': 'US/CA', '39': 'Italy', '44': 'UK', '49': 'Germany', '33': 'France',
      '34': 'Spain', '86': 'China', '81': 'Japan', '82': 'South Korea',
      '91': 'India', '55': 'Brazil', '7': 'Russia', '61': 'Australia',
    };
    const cc = Object.entries(countryCodes).find(([code]) => clean.startsWith(code))?.[1] || 'Unknown';
    return NextResponse.json({ phone: `+${clean}`, valid: true, country: cc, carrier: 'Unknown', note: 'Limited lookup (no API key)' });
  } catch {
    return NextResponse.json({ phone, valid: false, error: 'Lookup failed' }, { status: 500 });
  }
}
