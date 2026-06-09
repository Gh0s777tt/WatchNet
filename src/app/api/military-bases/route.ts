import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const bases = [
    { id: 'mb-001', name: 'Pentagon', lat: 38.8719, lng: -77.0563, country: 'USA', type: 'HQ', branch: 'Joint' },
    { id: 'mb-002', name: 'Norfolk Naval Station', lat: 36.9468, lng: -76.3170, country: 'USA', type: 'Naval Base', branch: 'Navy' },
    { id: 'mb-003', name: 'Fort Bragg', lat: 35.1390, lng: -79.0060, country: 'USA', type: 'Army Base', branch: 'Army' },
    { id: 'mb-004', name: 'Ramstein AFB', lat: 49.4369, lng: 7.6003, country: 'Germany', type: 'Air Base', branch: 'Air Force' },
    { id: 'mb-005', name: 'RAF Mildenhall', lat: 52.3619, lng: 0.4864, country: 'UK', type: 'Air Base', branch: 'Air Force' },
    { id: 'mb-006', name: 'Camp Lemonnier', lat: 11.5420, lng: 43.1420, country: 'Djibouti', type: 'Naval Base', branch: 'Navy' },
    { id: 'mb-007', name: 'Diego Garcia', lat: -7.3133, lng: 72.4111, country: 'UK/BIOT', type: 'Naval Base', branch: 'Navy' },
    { id: 'mb-008', name: 'Guantanamo Bay', lat: 19.9000, lng: -75.1528, country: 'Cuba', type: 'Naval Base', branch: 'Navy' },
    { id: 'mb-009', name: 'Kadena AB', lat: 26.3556, lng: 127.7675, country: 'Japan', type: 'Air Base', branch: 'Air Force' },
    { id: 'mb-010', name: 'Yokosuka Naval Base', lat: 35.2896, lng: 139.6730, country: 'Japan', type: 'Naval Base', branch: 'Navy' },
    { id: 'mb-011', name: 'Osan AB', lat: 37.0906, lng: 127.0296, country: 'South Korea', type: 'Air Base', branch: 'Air Force' },
    { id: 'mb-012', name: 'Camp Humphreys', lat: 36.9619, lng: 127.0264, country: 'South Korea', type: 'Army Base', branch: 'Army' },
    { id: 'mb-013', name: 'Naval Base Guam', lat: 13.4653, lng: 144.6872, country: 'Guam', type: 'Naval Base', branch: 'Navy' },
    { id: 'mb-014', name: 'Thule Air Base', lat: 76.5312, lng: -68.7030, country: 'Greenland', type: 'Air Base', branch: 'Air Force' },
    { id: 'mb-015', name: 'Ascension Island', lat: -7.9467, lng: -14.3700, country: 'UK/ASC', type: 'Air Base', branch: 'Air Force' },
    { id: 'mb-016', name: 'Al Udeid AB', lat: 25.1170, lng: 51.3140, country: 'Qatar', type: 'Air Base', branch: 'Air Force' },
    { id: 'mb-017', name: 'Incirlik AB', lat: 37.0010, lng: 35.4250, country: 'Turkey', type: 'Air Base', branch: 'Air Force' },
    { id: 'mb-018', name: 'Naval Station Rota', lat: 36.6230, lng: -6.3590, country: 'Spain', type: 'Naval Base', branch: 'Navy' },
    { id: 'mb-019', name: 'Camp Bondsteel', lat: 42.3740, lng: 21.2500, country: 'Kosovo', type: 'Army Base', branch: 'Army' },
    { id: 'mb-020', name: 'Sigonella NAS', lat: 37.4010, lng: 14.9220, country: 'Italy', type: 'Naval Base', branch: 'Navy' },
    { id: 'mb-021', name: 'Aviano AB', lat: 46.0310, lng: 12.5950, country: 'Italy', type: 'Air Base', branch: 'Air Force' },
    { id: 'mb-022', name: 'Lajes Field', lat: 38.7610, lng: -27.0900, country: 'Portugal', type: 'Air Base', branch: 'Air Force' },
    { id: 'mb-023', name: 'Camp Bucca', lat: 30.4160, lng: 47.8000, country: 'Iraq', type: 'Army Base', branch: 'Army' },
    { id: 'mb-024', name: 'Bagram Airfield', lat: 34.9460, lng: 69.2650, country: 'Afghanistan', type: 'Air Base', branch: 'Air Force' },
    { id: 'mb-025', name: 'NAF Misawa', lat: 40.7080, lng: 141.3700, country: 'Japan', type: 'Air Base', branch: 'Air Force' },
  ];
  return NextResponse.json({ military_bases: bases, total: bases.length, timestamp: new Date().toISOString() });
}
