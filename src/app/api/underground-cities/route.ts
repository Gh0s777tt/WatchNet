import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const cities = [
    { id: 'uc-001', name: 'Derinkuyu', lat: 38.3740, lng: 34.7340, country: 'Turkey', region: 'Cappadocia', depth_m: 85, levels: 18, description: 'Largest excavated underground city, 20,000 people capacity' },
    { id: 'uc-002', name: 'Kaymaklı', lat: 38.4600, lng: 34.7500, country: 'Turkey', region: 'Cappadocia', depth_m: 40, levels: 8, description: 'Second largest Cappadocia underground city' },
    { id: 'uc-003', name: 'Özkonak', lat: 38.8500, lng: 34.8500, country: 'Turkey', region: 'Cappadocia', depth_m: 30, levels: 10, description: 'Ancient underground settlement with communication tunnels' },
    { id: 'uc-004', name: 'Matiate (Orvieto)', lat: 42.7180, lng: 12.1100, country: 'Italy', region: 'Umbria', depth_m: 20, levels: 3, description: 'Etruscan underground city beneath Orvieto' },
    { id: 'uc-005', name: 'Naples Underground', lat: 40.8500, lng: 14.2650, country: 'Italy', region: 'Campania', depth_m: 40, levels: 5, description: 'Greek-Roman aqueducts and WWII shelters' },
    { id: 'uc-006', name: 'Paris Catacombs', lat: 48.8340, lng: 2.3320, country: 'France', region: 'Ile-de-France', depth_m: 20, levels: 2, description: '300km of tunnels, 6 million skeletons' },
    { id: 'uc-007', name: 'Coober Pedy', lat: -29.0100, lng: 134.7500, country: 'Australia', region: 'South Australia', depth_m: 10, levels: 1, description: 'Modern underground town, opal mining' },
    { id: 'uc-008', name: 'Setenil de las Bodegas', lat: 36.8600, lng: -5.1800, country: 'Spain', region: 'Andalusia', depth_m: 5, levels: 1, description: 'Town built under massive rock overhangs' },
    { id: 'uc-009', name: 'Cappadocia Cave Dwellings', lat: 38.6500, lng: 34.8300, country: 'Turkey', region: 'Cappadocia', depth_m: 20, levels: 5, description: 'Thousands of cave dwellings and churches' },
    { id: 'uc-010', name: 'Petra', lat: 30.3280, lng: 35.4440, country: 'Jordan', region: 'Ma\'an', depth_m: 30, levels: 2, description: 'Nabatean rock-cut city' },
    { id: 'uc-011', name: 'Lalibela', lat: 12.0300, lng: 39.0400, country: 'Ethiopia', region: 'Amhara', depth_m: 15, levels: 2, description: 'Monolithic rock-hewn churches' },
    { id: 'uc-012', name: 'Beijing Underground City', lat: 39.9200, lng: 116.3800, country: 'China', region: 'Beijing', depth_m: 30, levels: 3, description: '85 km² Cold War underground city' },
    { id: 'uc-013', name: 'Burlington Bunker City', lat: 51.3210, lng: -2.2060, country: 'UK', region: 'Wiltshire', depth_m: 40, levels: 3, description: 'British govt underground city for 4,000 people' },
    { id: 'uc-014', name: 'Subterranean Shanghai', lat: 31.2300, lng: 121.4700, country: 'China', region: 'Shanghai', depth_m: 60, levels: 5, description: 'Massive underground network of bunkers and tunnels' },
    { id: 'uc-015', name: 'Moscow Metro-2', lat: 55.7558, lng: 37.6176, country: 'Russia', region: 'Moscow', depth_m: 200, levels: 3, description: 'Secret deep metro system for government evacuation' },
  ];
  return NextResponse.json({ underground_cities: cities, total: cities.length, timestamp: new Date().toISOString() });
}
