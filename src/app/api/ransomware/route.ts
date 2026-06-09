import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GROUPS = [
  { name: 'LockBit', color: '#FF1744', countries: ['US', 'UK', 'DE', 'FR', 'IT', 'CA', 'AU', 'JP'] },
  { name: 'BlackCat/ALPHV', color: '#D500F9', countries: ['US', 'ES', 'BR', 'MX', 'IN', 'CN'] },
  { name: 'CL0P', color: '#FF6D00', countries: ['US', 'CA', 'UK', 'DE', 'AU', 'NZ', 'SE', 'NO'] },
  { name: 'BianLian', color: '#00E5FF', countries: ['US', 'AU', 'UK', 'FR', 'DE', 'NL', 'CH'] },
  { name: 'Royal', color: '#76FF03', countries: ['US', 'UK', 'CA', 'DE', 'FR', 'IT', 'ES'] },
  { name: 'Play', color: '#FFAB00', countries: ['US', 'BR', 'IN', 'DE', 'FR', 'AR', 'CO'] },
  { name: 'Akira', color: '#2979FF', countries: ['US', 'CA', 'UK', 'DE', 'FR', 'IT', 'AU', 'NZ'] },
  { name: 'Qilin', color: '#00BCD4', countries: ['GB', 'US', 'AU', 'DE', 'FR', 'IT', 'JP'] },
  { name: 'RansomHouse', color: '#FF3D00', countries: ['US', 'DE', 'FR', 'NL', 'BE', 'SE', 'DK', 'PL'] },
  { name: 'Trigona', color: '#AA00FF', countries: ['US', 'CN', 'TW', 'JP', 'DE'] },
];

const CITIES: Record<string, [number, number][]> = {
  US: [[40.7128, -74.006], [34.0522, -118.244], [41.8781, -87.6298], [29.7604, -95.3698], [33.7490, -84.3880], [47.6062, -122.332], [39.7392, -104.990], [32.7157, -117.161], [38.9072, -77.0369], [42.3601, -71.0589], [27.9506, -82.4572], [39.9526, -75.1652], [37.7749, -122.419]],
  UK: [[51.5074, -0.1278], [53.4808, -2.2426], [52.4862, -1.8904], [55.9533, -3.1883], [53.8008, -1.5491]],
  DE: [[52.5200, 13.4050], [53.5511, 9.9937], [48.1351, 11.5820], [50.1109, 8.6821], [53.5753, 10.0153]],
  FR: [[48.8566, 2.3522], [45.7640, 4.8357], [43.2965, 5.3698], [43.6047, 1.4442], [48.6921, 6.1844]],
  IT: [[41.9028, 12.4964], [45.4642, 9.1900], [43.7696, 11.2558], [40.8518, 14.2681], [45.0703, 7.6869]],
  CA: [[43.6532, -79.3832], [45.5017, -73.5673], [49.2827, -123.1207], [51.0447, -114.0719], [45.4209, -75.6903]],
  AU: [[-33.8688, 151.2093], [-37.8136, 144.9631], [-27.4698, 153.0251], [-31.9505, 115.8605], [-34.9285, 138.6007]],
  JP: [[35.6762, 139.6503], [34.6937, 135.5023], [35.0116, 135.7681]],
  CN: [[31.2304, 121.4737], [39.9042, 116.4074], [22.5431, 114.0579], [30.5728, 104.0668]],
  BR: [[-23.5505, -46.6333], [-22.9068, -43.1729], [-15.8267, -47.9218]],
  ES: [[40.4168, -3.7038], [41.3874, 2.1686], [39.4699, -0.3763]],
  MX: [[19.4326, -99.1332], [20.6597, -103.3496], [25.6866, -100.3161]],
  IN: [[19.0760, 72.8777], [28.7041, 77.1025], [12.9716, 77.5946], [13.0827, 80.2707]],
  NL: [[52.3676, 4.9041], [51.9244, 4.4777]],
  SE: [[59.3293, 18.0686], [57.7089, 11.9746]],
  NO: [[59.9139, 10.7522]],
  DK: [[55.6761, 12.5683]],
  PL: [[52.2297, 21.0122]],
  CH: [[46.9480, 7.4474]],
  BE: [[50.8503, 4.3517]],
  NZ: [[-36.8485, 174.7633], [-41.2865, 174.7762]],
  AR: [[-34.6037, -58.3816]],
  CO: [[4.7110, -74.0721]],
  TW: [[25.0330, 121.5654]],
  KR: [[37.5665, 126.9780]],
  ZA: [[-26.2041, 28.0473]],
  IL: [[31.0461, 34.8516]],
  SG: [[1.3521, 103.8198]],
};

function randomTimestamp(daysBack: number): string {
  const d = new Date(Date.now() - Math.random() * daysBack * 86400000);
  return d.toISOString();
}

export async function GET() {
  try {
    const alerts: any[] = [];

    for (const group of GROUPS) {
      // Each group has 3-8 active incidents
      const count = 3 + Math.floor(Math.random() * 6);
      for (let i = 0; i < count; i++) {
        const country = group.countries[Math.floor(Math.random() * group.countries.length)];
        const cities = CITIES[country] || [[0, 0]];
        const city = cities[Math.floor(Math.random() * cities.length)];

        const sectors = ['Healthcare', 'Education', 'Government', 'Finance', 'Manufacturing',
          'Energy', 'Technology', 'Transportation', 'Legal', 'Retail', 'Media', 'Telecom'];

        alerts.push({
          lat: city[0] + (Math.random() - 0.5) * 0.5,
          lng: city[1] + (Math.random() - 0.5) * 0.5,
          group: group.name,
          color: group.color,
          sector: sectors[Math.floor(Math.random() * sectors.length)],
          country,
          city: 'Unknown',
          status: Math.random() > 0.3 ? 'active' : 'contained',
          severity: Math.random() > 0.6 ? 'critical' : Math.random() > 0.3 ? 'high' : 'medium',
          ransom_usd: Math.round(Math.random() * 5000000 + 100000),
          reported_at: randomTimestamp(14),
          description: `${group.name} ransomware attack on ${sectors[Math.floor(Math.random() * sectors.length)]} sector in ${country}`,
        });
      }
    }

    return NextResponse.json({
      alerts,
      total: alerts.length,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('Ransomware data error:', error);
    return NextResponse.json({ alerts: [], error: 'Failed to generate ransomware data' }, { status: 500 });
  }
}
