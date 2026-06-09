import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const resp = await fetch('https://volcanoes.usgs.gov/hans-public/api/volcanoes', { signal: AbortSignal.timeout(10000) });
    const data = await resp.json();
    const volcanoes = (Array.isArray(data) ? data : []).map((v: any) => ({
      id: v.id || v.volcano_id,
      name: v.name || v.volcano_name,
      lat: v.latitude || v.lat,
      lng: v.longitude || v.lon,
      elevation: v.elevation,
      country: v.country,
      region: v.region,
      status: v.status || 'unknown',
      type: v.type || 'volcano',
    })).filter((v: any) => v.lat && v.lng);
    return NextResponse.json({ volcanoes, total: volcanoes.length, timestamp: new Date().toISOString() });
  } catch (e) {
    // Fallback: hardcoded major volcanoes
    const fallback = [
      { id: 'v-001', name: 'Mount Vesuvius', lat: 40.821, lng: 14.426, elevation: 1281, country: 'Italy', region: 'Campania', status: 'active' },
      { id: 'v-002', name: 'Mount Etna', lat: 37.751, lng: 14.993, elevation: 3357, country: 'Italy', region: 'Sicily', status: 'active' },
      { id: 'v-003', name: 'Krakatoa', lat: -6.102, lng: 105.393, elevation: 813, country: 'Indonesia', region: 'Sunda Strait', status: 'active' },
      { id: 'v-004', name: 'Mount Fuji', lat: 35.361, lng: 138.727, elevation: 3776, country: 'Japan', region: 'Honshu', status: 'dormant' },
      { id: 'v-005', name: 'Mount St. Helens', lat: 46.191, lng: -122.195, elevation: 2549, country: 'USA', region: 'Washington', status: 'active' },
      { id: 'v-006', name: 'Mauna Loa', lat: 19.475, lng: -155.608, elevation: 4169, country: 'USA', region: 'Hawaii', status: 'active' },
      { id: 'v-007', name: 'Yellowstone Caldera', lat: 44.428, lng: -110.670, elevation: 2805, country: 'USA', region: 'Wyoming', status: 'dormant' },
      { id: 'v-008', name: 'Mount Merapi', lat: -7.540, lng: 110.445, elevation: 2968, country: 'Indonesia', region: 'Central Java', status: 'active' },
      { id: 'v-009', name: 'Eyjafjallajökull', lat: 63.633, lng: -19.623, elevation: 1666, country: 'Iceland', region: 'Iceland', status: 'dormant' },
      { id: 'v-010', name: 'Popocatépetl', lat: 19.023, lng: -98.622, elevation: 5393, country: 'Mexico', region: 'Puebla', status: 'active' },
      { id: 'v-011', name: 'Mount Pinatubo', lat: 15.142, lng: 120.350, elevation: 1486, country: 'Philippines', region: 'Luzon', status: 'dormant' },
      { id: 'v-012', name: 'Mount Rainier', lat: 46.853, lng: -121.760, elevation: 4392, country: 'USA', region: 'Washington', status: 'active' },
      { id: 'v-013', name: 'Sakurajima', lat: 31.581, lng: 130.658, elevation: 1117, country: 'Japan', region: 'Kyushu', status: 'active' },
      { id: 'v-014', name: 'Kilauea', lat: 19.421, lng: -155.287, elevation: 1247, country: 'USA', region: 'Hawaii', status: 'active' },
      { id: 'v-015', name: 'Nyiragongo', lat: -1.517, lng: 29.250, elevation: 3470, country: 'DRC', region: 'North Kivu', status: 'active' },
    ];
    return NextResponse.json({ volcanoes: fallback, total: fallback.length, source: 'fallback', timestamp: new Date().toISOString() });
  }
}
