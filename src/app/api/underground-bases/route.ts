import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const bases = [
    { id: 'ug-001', name: 'Dulce Base', lat: 36.9344, lng: -107.0008, country: 'USA', state: 'New Mexico', type: 'Underground Military Base', depth_m: 1200, description: 'Alleged joint human-extraterrestrial underground facility' },
    { id: 'ug-002', name: 'Mount Weather', lat: 39.0633, lng: -77.7719, country: 'USA', state: 'Virginia', type: 'Underground Command Center', depth_m: 200, description: 'FEMA continuity of government facility' },
    { id: 'ug-003', name: 'Cheyenne Mountain', lat: 38.7425, lng: -104.8492, country: 'USA', state: 'Colorado', type: 'Underground Military Base', depth_m: 600, description: 'NORAD command center inside granite mountain' },
    { id: 'ug-004', name: 'Raven Rock Mountain', lat: 39.7300, lng: -77.4200, country: 'USA', state: 'Pennsylvania', type: 'Underground Bunker', depth_m: 300, description: 'Site R - Pentagon emergency bunker' },
    { id: 'ug-005', name: 'Greenbrier Bunker', lat: 37.8764, lng: -80.3400, country: 'USA', state: 'West Virginia', type: 'Underground Bunker', depth_m: 100, description: 'Congressional emergency fallout shelter' },
    { id: 'ug-006', name: 'Beijing Underground City', lat: 39.9042, lng: 116.4074, country: 'China', type: 'Underground City', depth_m: 30, description: 'Dixia Cheng - 85km² underground city built during Cold War' },
    { id: 'ug-007', name: 'Yamantau Mountain', lat: 54.0000, lng: 58.0000, country: 'Russia', type: 'Underground Military Complex', depth_m: 900, description: 'Alleged massive Russian underground military complex' },
    { id: 'ug-008', name: 'Zelena Gora', lat: 52.0000, lng: 21.0000, country: 'Poland', type: 'Underground Bunker', depth_m: 150, description: 'Nazi underground facility complex' },
    { id: 'ug-009', name: 'Project Greek Island', lat: 39.7500, lng: -78.5000, country: 'USA', state: 'West Virginia', type: 'Underground Bunker', depth_m: 200, description: 'US Congress continuity bunker' },
    { id: 'ug-010', name: 'Burlington Bunker', lat: 51.3210, lng: -2.2060, country: 'UK', type: 'Underground Bunker', depth_m: 30, description: 'British government Cold War bunker' },
    { id: 'ug-011', name: 'Corsham Bunker', lat: 51.4310, lng: -2.1950, country: 'UK', type: 'Undergound Military Base', depth_m: 50, description: 'MOD Corsham - Central Government War HQ' },
    { id: 'ug-012', name: 'Pioneer Deep Space Station', lat: 33.4470, lng: -117.0860, country: 'USA', state: 'California', type: 'Underground Bunker', depth_m: 30, description: 'NASA underground tracking station' },
    { id: 'ug-013', name: 'Sonnenberg Tunnel', lat: 46.9570, lng: 7.4400, country: 'Switzerland', type: 'Underground Bunker', depth_m: 200, description: 'Swiss parliamentary emergency bunker' },
    { id: 'ug-014', name: 'Saundersfoot Bunker', lat: 51.7100, lng: -4.7000, country: 'UK', type: 'Underground Bunker', depth_m: 40, description: 'Regional government bunker Wales' },
    { id: 'ug-015', name: 'Reunion Island Base', lat: -21.1000, lng: 55.5000, country: 'France', type: 'Underground Base', depth_m: 100, description: 'French Foreign Legion underground facility' },
    { id: 'ug-016', name: 'Area 51 S-4', lat: 37.2450, lng: -115.8180, country: 'USA', state: 'Nevada', type: 'Underground Research Facility', depth_m: 500, description: 'Alleged underground extension of Area 51' },
    { id: 'ug-017', name: 'Pine Gap', lat: -23.7989, lng: 133.7360, country: 'Australia', type: 'Underground Intelligence Facility', depth_m: 100, description: 'Joint US-Australia SIGINT facility' },
    { id: 'ug-018', name: 'Menwith Hill', lat: 54.0022, lng: -1.6830, country: 'UK', type: 'Underground Intelligence Facility', depth_m: 50, description: 'ECHELON SIGINT intercept station' },
    { id: 'ug-019', name: 'Bunker 42 - Taganka', lat: 55.7410, lng: 37.6490, country: 'Russia', type: 'Underground Bunker', depth_m: 65, description: 'Stalin\'s Cold War command bunker' },
    { id: 'ug-020', name: 'Kawasaki Underground', lat: 35.5300, lng: 139.7000, country: 'Japan', type: 'Underground Facility', depth_m: 50, description: 'Japanese govt continuity facility' },
  ];
  return NextResponse.json({ underground_bases: bases, total: bases.length, timestamp: new Date().toISOString() });
}
