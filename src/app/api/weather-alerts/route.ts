import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // NWS API — free, no key
    const resp = await fetch('https://api.weather.gov/alerts/active?limit=100', {
      headers: { 'Accept': 'application/json', 'User-Agent': 'OSIRIS/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    const data = await resp.json();
    const alerts = (data.features || []).filter((f: any) => f.geometry?.coordinates?.length === 2 || f.properties?.polygon).map((f: any) => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates || (p.polygon ? JSON.parse(p.polygon)[0][0] : [0, 0]);
      return {
        id: p.id,
        headline: p.headline || p.event || 'Alert',
        severity: p.severity || 'Unknown',
        event: p.event,
        type: p.certainty,
        area: p.areaDesc,
        lat: Array.isArray(coords[0]) ? coords[0][1] : (f.geometry?.coordinates[1] || 0),
        lng: Array.isArray(coords[0]) ? coords[0][0] : (f.geometry?.coordinates[0] || 0),
        expires: p.expires,
        description: p.description?.slice(0, 200),
      };
    }).filter((a: any) => a.lat && a.lng);
    return NextResponse.json({ alerts, total: alerts.length, timestamp: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ alerts: [], error: 'NWS unavailable' });
  }
}
