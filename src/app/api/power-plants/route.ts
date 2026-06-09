import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const power_plants = [
    { id: 1, name: 'Three Gorges', lat: 30.82, lng: 111.00, type: 'Hydroelectric', capacity_mw: 22500, country: 'China' },
    { id: 2, name: 'Itaipu', lat: -25.41, lng: -54.59, type: 'Hydroelectric', capacity_mw: 14000, country: 'Brazil/Paraguay' },
    { id: 3, name: 'Kashiwazaki-Kariwa', lat: 37.42, lng: 138.58, type: 'Nuclear', capacity_mw: 7965, country: 'Japan' },
    { id: 4, name: 'Zaporizhzhia', lat: 47.51, lng: 34.59, type: 'Nuclear', capacity_mw: 6000, country: 'Ukraine' },
    { id: 5, name: 'Palo Verde', lat: 33.39, lng: -112.86, type: 'Nuclear', capacity_mw: 3942, country: 'USA' },
    { id: 6, name: 'Hoover Dam', lat: 36.02, lng: -114.73, type: 'Hydroelectric', capacity_mw: 2080, country: 'USA' },
    { id: 7, name: 'Guri', lat: 7.77, lng: -62.99, type: 'Hydroelectric', capacity_mw: 10235, country: 'Venezuela' },
    { id: 8, name: 'Tucuruí', lat: -3.83, lng: -49.64, type: 'Hydroelectric', capacity_mw: 8370, country: 'Brazil' },
    { id: 9, name: 'Grand Coulee', lat: 47.96, lng: -119.00, type: 'Hydroelectric', capacity_mw: 6809, country: 'USA' },
    { id: 10, name: 'Xiluodu', lat: 28.26, lng: 103.63, type: 'Hydroelectric', capacity_mw: 13860, country: 'China' },
    { id: 11, name: 'Baihetan', lat: 27.22, lng: 102.87, type: 'Hydroelectric', capacity_mw: 16000, country: 'China' },
    { id: 12, name: 'Taichung', lat: 24.25, lng: 120.52, type: 'Coal', capacity_mw: 5824, country: 'Taiwan' },
    { id: 13, name: 'Rogun', lat: 38.68, lng: 69.77, type: 'Hydroelectric', capacity_mw: 3600, country: 'Tajikistan' },
    { id: 14, name: 'Belchatow', lat: 51.27, lng: 19.33, type: 'Coal', capacity_mw: 5102, country: 'Poland' },
    { id: 15, name: 'Hinkley Point C', lat: 51.21, lng: -3.14, type: 'Nuclear', capacity_mw: 3200, country: 'UK' },
    { id: 16, name: 'Shin Nagoya', lat: 35.06, lng: 136.86, type: 'Natural Gas', capacity_mw: 4826, country: 'Japan' },
    { id: 17, name: 'Ivahoe', lat: 34.58, lng: -118.25, type: 'Natural Gas', capacity_mw: 1050, country: 'USA' },
    { id: 18, name: 'Surgut-2', lat: 61.28, lng: 73.40, type: 'Natural Gas', capacity_mw: 5681, country: 'Russia' },
    { id: 19, name: 'Kudankulam', lat: 8.17, lng: 77.69, type: 'Nuclear', capacity_mw: 2000, country: 'India' },
    { id: 20, name: 'Bruce', lat: 44.33, lng: -81.59, type: 'Nuclear', capacity_mw: 6550, country: 'Canada' },
    { id: 21, name: 'Jebel Ali M-Station', lat: 25.02, lng: 55.08, type: 'Natural Gas', capacity_mw: 9730, country: 'UAE' },
    { id: 22, name: 'Jinsha', lat: 26.82, lng: 101.86, type: 'Hydroelectric', capacity_mw: 6000, country: 'China' },
    { id: 23, name: 'Sayano-Shushenskaya', lat: 52.82, lng: 91.45, type: 'Hydroelectric', capacity_mw: 6400, country: 'Russia' },
    { id: 24, name: 'Krasnoyarsk', lat: 56.01, lng: 93.04, type: 'Hydroelectric', capacity_mw: 6000, country: 'Russia' },
    { id: 25, name: 'Robert-Bourassa', lat: 53.78, lng: -77.53, type: 'Hydroelectric', capacity_mw: 5616, country: 'Canada' },
    { id: 26, name: 'Churchill Falls', lat: 53.08, lng: -64.00, type: 'Hydroelectric', capacity_mw: 5428, country: 'Canada' },
    { id: 27, name: 'Tarbela', lat: 34.09, lng: 72.69, type: 'Hydroelectric', capacity_mw: 4888, country: 'Pakistan' },
    { id: 28, name: 'Aswan High Dam', lat: 23.97, lng: 32.88, type: 'Hydroelectric', capacity_mw: 2100, country: 'Egypt' },
    { id: 29, name: 'Koeberg', lat: -33.67, lng: 18.47, type: 'Nuclear', capacity_mw: 1940, country: 'South Africa' },
    { id: 30, name: 'Longyangxia', lat: 36.12, lng: 100.60, type: 'Hydroelectric', capacity_mw: 1280, country: 'China' },
    { id: 31, name: 'Rihand', lat: 24.03, lng: 82.79, type: 'Coal', capacity_mw: 3000, country: 'India' },
    { id: 32, name: 'Mundra', lat: 22.84, lng: 69.70, type: 'Coal', capacity_mw: 4620, country: 'India' },
  ];
  return NextResponse.json({ power_plants, total: power_plants.length, timestamp: new Date().toISOString() });
}
