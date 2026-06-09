import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ixps = [
    { id: 'ixp-001', name: 'AMS-IX', lat: 52.3702, lng: 4.8952, city: 'Amsterdam', country: 'NL', members: 900, peak_gbps: 12000 },
    { id: 'ixp-002', name: 'DE-CIX Frankfurt', lat: 50.1109, lng: 8.6821, city: 'Frankfurt', country: 'DE', members: 1100, peak_gbps: 14000 },
    { id: 'ixp-003', name: 'LINX London', lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK', members: 800, peak_gbps: 8000 },
    { id: 'ixp-004', name: 'Equinix Internet Exchange (NY)', lat: 40.7178, lng: -74.0060, city: 'New York', country: 'US', members: 400, peak_gbps: 5000 },
    { id: 'ixp-005', name: 'Equinix Internet Exchange (SV)', lat: 37.3861, lng: -122.0838, city: 'San Jose', country: 'US', members: 450, peak_gbps: 5500 },
    { id: 'ixp-006', name: 'JPNAP Tokyo', lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'JP', members: 350, peak_gbps: 4000 },
    { id: 'ixp-007', name: 'SGIX Singapore', lat: 1.3521, lng: 103.8198, city: 'Singapore', country: 'SG', members: 200, peak_gbps: 3000 },
    { id: 'ixp-008', name: 'HKIX Hong Kong', lat: 22.3193, lng: 114.1694, city: 'Hong Kong', country: 'HK', members: 280, peak_gbps: 3500 },
    { id: 'ixp-009', name: 'Seoul KINX', lat: 37.5665, lng: 126.9780, city: 'Seoul', country: 'KR', members: 180, peak_gbps: 2500 },
    { id: 'ixp-010', name: 'PTT Sao Paulo', lat: -23.5505, lng: -46.6333, city: 'Sao Paulo', country: 'BR', members: 220, peak_gbps: 2800 },
    { id: 'ixp-011', name: 'NAP Africa JHB', lat: -26.2041, lng: 28.0473, city: 'Johannesburg', country: 'ZA', members: 120, peak_gbps: 1500 },
    { id: 'ixp-012', name: 'MSK-IX Moscow', lat: 55.7558, lng: 37.6173, city: 'Moscow', country: 'RU', members: 300, peak_gbps: 3200 },
    { id: 'ixp-013', name: 'Mumbai IX', lat: 19.0760, lng: 72.8777, city: 'Mumbai', country: 'IN', members: 150, peak_gbps: 2000 },
    { id: 'ixp-014', name: 'BCIX Berlin', lat: 52.5200, lng: 13.4050, city: 'Berlin', country: 'DE', members: 160, peak_gbps: 1800 },
    { id: 'ixp-015', name: 'NETNOD Stockholm', lat: 59.3293, lng: 18.0686, city: 'Stockholm', country: 'SE', members: 200, peak_gbps: 2200 },
    { id: 'ixp-016', name: 'MIX Milan', lat: 45.4642, lng: 9.1900, city: 'Milan', country: 'IT', members: 140, peak_gbps: 1600 },
    { id: 'ixp-017', name: 'Ecorē Dallas', lat: 32.7767, lng: -96.7970, city: 'Dallas', country: 'US', members: 180, peak_gbps: 2000 },
    { id: 'ixp-018', name: 'Any2 Los Angeles (One Wilshire)', lat: 34.0522, lng: -118.2437, city: 'Los Angeles', country: 'US', members: 250, peak_gbps: 3000 },
    { id: 'ixp-019', name: 'CHIXX Chicago', lat: 41.8781, lng: -87.6298, city: 'Chicago', country: 'US', members: 150, peak_gbps: 1800 },
    { id: 'ixp-020', name: 'Equinix Internet Exchange (IAD)', lat: 38.9545, lng: -77.4423, city: 'Ashburn', country: 'US', members: 350, peak_gbps: 4500 },
  ];
  return NextResponse.json({ ixps, total: ixps.length, timestamp: new Date().toISOString() });
}
