import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const nuclear_facilities = [
    { id: 1, name: 'Fukushima Daiichi', lat: 37.42, lng: 141.03, type: 'Nuclear Power Plant', capacity_mw: 4696, country: 'Japan', status: 'Decommissioning after meltdown' },
    { id: 2, name: 'Chernobyl', lat: 51.39, lng: 30.10, type: 'Nuclear Power Plant', capacity_mw: 4000, country: 'Ukraine', status: 'Decommissioned after disaster' },
    { id: 3, name: 'Zaporizhzhia', lat: 47.51, lng: 34.59, type: 'Nuclear Power Plant', capacity_mw: 6000, country: 'Ukraine', status: 'Operational (occupied)' },
    { id: 4, name: 'Three Mile Island', lat: 40.15, lng: -76.72, type: 'Nuclear Power Plant', capacity_mw: 880, country: 'USA', status: 'Partially decommissioned' },
    { id: 5, name: 'Los Alamos National Lab', lat: 35.88, lng: -106.30, type: 'Research/Weapons', country: 'USA', status: 'Active' },
    { id: 6, name: 'Sellafield', lat: 54.42, lng: -3.50, type: 'Reprocessing/Storage', country: 'UK', status: 'Decommissioning' },
    { id: 7, name: 'La Hague', lat: 49.68, lng: -1.88, type: 'Reprocessing Plant', country: 'France', status: 'Operational' },
    { id: 8, name: 'Yongbyon', lat: 39.80, lng: 125.76, type: 'Research/Weapons', capacity_mw: 5, country: 'North Korea', status: 'Operational' },
    { id: 9, name: 'Natanz', lat: 33.72, lng: 51.72, type: 'Enrichment Facility', country: 'Iran', status: 'Operational' },
    { id: 10, name: 'Dimona', lat: 31.08, lng: 35.00, type: 'Research/Weapons', country: 'Israel', status: 'Operational' },
    { id: 11, name: 'Kashiwazaki-Kariwa', lat: 37.42, lng: 138.58, type: 'Nuclear Power Plant', capacity_mw: 7965, country: 'Japan', status: 'Shutdown after Fukushima' },
    { id: 12, name: 'Palo Verde', lat: 33.39, lng: -112.86, type: 'Nuclear Power Plant', capacity_mw: 3942, country: 'USA', status: 'Operational' },
    { id: 13, name: 'Hanford Site', lat: 46.65, lng: -119.40, type: 'Weapons Production', country: 'USA', status: 'Decommissioning' },
    { id: 14, name: 'Mayak', lat: 55.72, lng: 60.90, type: 'Reprocessing/Weapons', country: 'Russia', status: 'Operational' },
    { id: 15, name: 'Kola Peninsula', lat: 67.47, lng: 32.47, type: 'Nuclear Power Plant', capacity_mw: 1760, country: 'Russia', status: 'Operational' },
    { id: 16, name: 'Leningrad NPP', lat: 59.85, lng: 29.05, type: 'Nuclear Power Plant', capacity_mw: 4000, country: 'Russia', status: 'Operational' },
    { id: 17, name: 'Bruce', lat: 44.33, lng: -81.59, type: 'Nuclear Power Plant', capacity_mw: 6550, country: 'Canada', status: 'Operational' },
    { id: 18, name: 'Graves', lat: 47.12, lng: -0.32, type: 'Nuclear Power Plant', capacity_mw: 3660, country: 'France', status: 'Operational' },
    { id: 19, name: 'Koeberg', lat: -33.67, lng: 18.47, type: 'Nuclear Power Plant', capacity_mw: 1940, country: 'South Africa', status: 'Operational' },
    { id: 20, name: 'Akkuyu', lat: 36.14, lng: 33.54, type: 'Nuclear Power Plant', capacity_mw: 4800, country: 'Turkey', status: 'Under construction' },
    { id: 21, name: 'Bushehr', lat: 28.83, lng: 50.89, type: 'Nuclear Power Plant', capacity_mw: 1000, country: 'Iran', status: 'Operational' },
    { id: 22, name: 'Tianwan', lat: 34.69, lng: 119.46, type: 'Nuclear Power Plant', capacity_mw: 4170, country: 'China', status: 'Operational' },
    { id: 23, name: 'Kudankulam', lat: 8.17, lng: 77.69, type: 'Nuclear Power Plant', capacity_mw: 2000, country: 'India', status: 'Operational' },
    { id: 24, name: 'Barakah', lat: 23.97, lng: 52.23, type: 'Nuclear Power Plant', capacity_mw: 5600, country: 'UAE', status: 'Operational' },
    { id: 25, name: 'Rooppur', lat: 24.07, lng: 89.05, type: 'Nuclear Power Plant', capacity_mw: 2400, country: 'Bangladesh', status: 'Under construction' },
  ];
  return NextResponse.json({ nuclear_facilities, total: nuclear_facilities.length, timestamp: new Date().toISOString() });
}
