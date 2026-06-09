import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const centers = [
    { id: 'dc-001', name: 'Equinix NY4', lat: 40.7178, lng: -74.0060, city: 'New York', country: 'US', operator: 'Equinix', capacity_mw: 100 },
    { id: 'dc-002', name: 'Equinix SV1', lat: 37.3861, lng: -122.0838, city: 'San Jose', country: 'US', operator: 'Equinix', capacity_mw: 120 },
    { id: 'dc-003', name: 'LHR 1-8', lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK', operator: 'Telehouse', capacity_mw: 80 },
    { id: 'dc-004', name: 'PAO 1-3', lat: 37.4419, lng: -122.1430, city: 'Palo Alto', country: 'US', operator: 'Equinix', capacity_mw: 60 },
    { id: 'dc-005', name: 'FRA 1-15', lat: 50.1109, lng: 8.6821, city: 'Frankfurt', country: 'DE', operator: 'Equinix', capacity_mw: 150 },
    { id: 'dc-006', name: 'AMS 1-9', lat: 52.3702, lng: 4.8952, city: 'Amsterdam', country: 'NL', operator: 'Equinix', capacity_mw: 90 },
    { id: 'dc-007', name: 'SG1-5', lat: 1.3521, lng: 103.8198, city: 'Singapore', country: 'SG', operator: 'Equinix', capacity_mw: 110 },
    { id: 'dc-008', name: 'HKG 1-3', lat: 22.3193, lng: 114.1694, city: 'Hong Kong', country: 'HK', operator: 'Equinix', capacity_mw: 70 },
    { id: 'dc-009', name: 'TYO 1-5', lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'JP', operator: 'Equinix', capacity_mw: 130 },
    { id: 'dc-010', name: 'SYD 1-3', lat: -33.8688, lng: 151.2093, city: 'Sydney', country: 'AU', operator: 'Equinix', capacity_mw: 60 },
    { id: 'dc-011', name: 'IAD Campus', lat: 38.9545, lng: -77.4423, city: 'Ashburn', country: 'US', operator: 'Equinix', capacity_mw: 200 },
    { id: 'dc-012', name: 'Digital Realty LAX', lat: 33.9425, lng: -118.4081, city: 'Los Angeles', country: 'US', operator: 'Digital Realty', capacity_mw: 85 },
    { id: 'dc-013', name: 'NAP Africa', lat: -26.2041, lng: 28.0473, city: 'Johannesburg', country: 'ZA', operator: 'Teraco', capacity_mw: 40 },
    { id: 'dc-014', name: 'Moscow MMTS-9', lat: 55.7558, lng: 37.6173, city: 'Moscow', country: 'RU', operator: 'DataLine', capacity_mw: 50 },
    { id: 'dc-015', name: 'Sao Paulo SP1', lat: -23.5505, lng: -46.6333, city: 'Sao Paulo', country: 'BR', operator: 'Elea Digital', capacity_mw: 45 },
    { id: 'dc-016', name: 'Mumbai MG1', lat: 19.0760, lng: 72.8777, city: 'Mumbai', country: 'IN', operator: 'STT GDC', capacity_mw: 55 },
    { id: 'dc-017', name: 'Seoul KIX', lat: 37.5665, lng: 126.9780, city: 'Seoul', country: 'KR', operator: 'KINX', capacity_mw: 35 },
    { id: 'dc-018', name: 'Barcelona BCN1', lat: 41.3874, lng: 2.1686, city: 'Barcelona', country: 'ES', operator: 'Equinix', capacity_mw: 35 },
    { id: 'dc-019', name: 'Milan ML1', lat: 45.4642, lng: 9.1900, city: 'Milan', country: 'IT', operator: 'Equinix', capacity_mw: 40 },
    { id: 'dc-020', name: 'Cape Town CT1', lat: -33.9249, lng: 18.4241, city: 'Cape Town', country: 'ZA', operator: 'Teraco', capacity_mw: 25 },
  ];
  return NextResponse.json({ datacenters: centers, total: centers.length, timestamp: new Date().toISOString() });
}
