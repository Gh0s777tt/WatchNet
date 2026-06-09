import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NAMES = ['HBAL-01', 'HBAL-02', 'HBAL-03', 'HBAL-04', 'HBAL-05', 'HBAL-06', 'HBAL-07', 'HBAL-08',
  'SONDE-A1', 'SONDE-B2', 'SONDE-C3', 'SONDE-D4', 'SONDE-E5', 'RADIOSONDE-01', 'RADIOSONDE-02',
  'PROJ-LOON-01', 'PROJ-LOON-02', 'WEATHER-BAL-01', 'WEATHER-BAL-02', 'STRATO-01'];

const TYPES = ['High-Altitude Balloon', 'Weather Balloon', 'Radiosonde', 'Stratospheric Balloon'];
const COLORS = ['#FF6B35', '#00E5FF', '#D4AF37', '#39FF14', '#FF69B4', '#AB47BC'];

function randomAround(lat: number, lng: number, range: number) {
  return {
    lat: Math.round((lat + (Math.random() - 0.5) * range) * 10000) / 10000,
    lng: Math.round((lng + (Math.random() - 0.5) * range) * 10000) / 10000,
  };
}

export async function GET() {
  try {
    const balloons: any[] = [];

    // Real-world high-altitude balloon launch sites
    const clusters = [
      { lat: 40.0, lng: -105.0, count: 4, range: 8 },   // Colorado (NOAA)
      { lat: 35.0, lng: -118.0, count: 3, range: 10 },  // California
      { lat: 48.0, lng: 2.0, count: 2, range: 6 },      // Francia (Meteo-France)
      { lat: 52.0, lng: 14.0, count: 2, range: 8 },     // Germania (DWD)
      { lat: -20.0, lng: 30.0, count: 2, range: 8 },    // Africa Meridionale
      { lat: 60.0, lng: 30.0, count: 2, range: 10 },    // Finlandia/Nordico
      { lat: -40.0, lng: 175.0, count: 2, range: 6 },   // Nuova Zelanda
      { lat: 45.0, lng: -75.0, count: 2, range: 8 },    // Canada (Environment Canada)
      { lat: -30.0, lng: -60.0, count: 2, range: 8 },   // Argentina
      { lat: 35.0, lng: 140.0, count: 2, range: 8 },    // Giappone
    ];

    for (const cluster of clusters) {
      for (let i = 0; i < cluster.count; i++) {
        const pos = randomAround(cluster.lat, cluster.lng, cluster.range);
        const typeIdx = Math.floor(Math.random() * TYPES.length);
        balloons.push({
          ...pos,
          callsign: NAMES[Math.floor(Math.random() * NAMES.length)] + `-${String(i + 1).padStart(2, '0')}`,
          type: TYPES[typeIdx],
          status: Math.random() > 0.2 ? 'active' : 'idle',
          altitude: Math.round(15000 + Math.random() * 25000),
          speed: Math.round(Math.random() * 80 * 10) / 10,
          verticalRate: Math.round((Math.random() - 0.5) * 10 * 10) / 10,
          temperature: Math.round((-50 + Math.random() * 20) * 10) / 10,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    }

    return NextResponse.json({
      balloons,
      total: balloons.length,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Balloon data error:', error);
    return NextResponse.json({ balloons: [], error: 'Failed to generate balloon data' }, { status: 500 });
  }
}
