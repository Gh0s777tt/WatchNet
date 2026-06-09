import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const radio_towers = [
    { id: 1, name: 'Tokyo Skytree', lat: 35.71, lng: 139.81, height_m: 634, type: 'Broadcasting/Tourism', country: 'Japan', city: 'Tokyo' },
    { id: 2, name: 'KVLY-TV Mast', lat: 47.35, lng: -97.29, height_m: 629, type: 'Television', country: 'USA', city: 'Blanchard' },
    { id: 3, name: 'CN Tower', lat: 43.64, lng: -79.39, height_m: 553, type: 'Broadcasting/Tourism', country: 'Canada', city: 'Toronto' },
    { id: 4, name: 'Ostankino Tower', lat: 55.82, lng: 37.61, height_m: 540, type: 'Broadcasting', country: 'Russia', city: 'Moscow' },
    { id: 5, name: 'Eiffel Tower', lat: 48.86, lng: 2.29, height_m: 330, type: 'Broadcasting/Tourism', country: 'France', city: 'Paris' },
    { id: 6, name: 'Canton Tower', lat: 23.11, lng: 113.32, height_m: 600, type: 'Broadcasting/Tourism', country: 'China', city: 'Guangzhou' },
    { id: 7, name: 'Oriental Pearl Tower', lat: 31.24, lng: 121.50, height_m: 468, type: 'Broadcasting/Tourism', country: 'China', city: 'Shanghai' },
    { id: 8, name: 'KCTV Tower', lat: 39.03, lng: -94.59, height_m: 317, type: 'Television', country: 'USA', city: 'Kansas City' },
    { id: 9, name: 'Sydney Tower', lat: -33.87, lng: 151.21, height_m: 309, type: 'Broadcasting/Tourism', country: 'Australia', city: 'Sydney' },
    { id: 10, name: 'Berlin TV Tower', lat: 52.52, lng: 13.41, height_m: 368, type: 'Broadcasting/Tourism', country: 'Germany', city: 'Berlin' },
    { id: 11, name: 'Milad Tower', lat: 35.74, lng: 51.37, height_m: 435, type: 'Broadcasting/Tourism', country: 'Iran', city: 'Tehran' },
    { id: 12, name: 'Kuala Lumpur Tower', lat: 3.15, lng: 101.70, height_m: 421, type: 'Broadcasting/Tourism', country: 'Malaysia', city: 'Kuala Lumpur' },
    { id: 13, name: 'Tashkent Tower', lat: 41.35, lng: 69.29, height_m: 375, type: 'Broadcasting', country: 'Uzbekistan', city: 'Tashkent' },
    { id: 14, name: 'Riga TV Tower', lat: 56.92, lng: 24.14, height_m: 368, type: 'Broadcasting', country: 'Latvia', city: 'Riga' },
    { id: 15, name: 'Kiev TV Tower', lat: 50.48, lng: 30.45, height_m: 385, type: 'Broadcasting', country: 'Ukraine', city: 'Kyiv' },
    { id: 16, name: 'Vilnius TV Tower', lat: 54.68, lng: 25.21, height_m: 326, type: 'Broadcasting', country: 'Lithuania', city: 'Vilnius' },
    { id: 17, name: 'St. Petersburg TV Tower', lat: 59.97, lng: 30.32, height_m: 326, type: 'Broadcasting', country: 'Russia', city: 'St. Petersburg' },
    { id: 18, name: 'Yerevan TV Tower', lat: 40.17, lng: 44.48, height_m: 300, type: 'Broadcasting', country: 'Armenia', city: 'Yerevan' },
    { id: 19, name: 'Almaty Tower', lat: 43.22, lng: 76.98, height_m: 372, type: 'Broadcasting', country: 'Kazakhstan', city: 'Almaty' },
    { id: 20, name: 'Lotus Tower', lat: 6.93, lng: 79.86, height_m: 350, type: 'Broadcasting/Tourism', country: 'Sri Lanka', city: 'Colombo' },
    { id: 21, name: 'Borj-e Milad', lat: 35.74, lng: 51.37, height_m: 435, type: 'Telecommunications', country: 'Iran', city: 'Tehran' },
    { id: 22, name: 'Abraj Al-Bait Clock Tower', lat: 21.42, lng: 39.83, height_m: 601, type: 'Mixed-use', country: 'Saudi Arabia', city: 'Mecca' },
    { id: 23, name: 'Sky Tower Auckland', lat: -36.85, lng: 174.76, height_m: 328, type: 'Broadcasting/Tourism', country: 'New Zealand', city: 'Auckland' },
    { id: 24, name: 'Macau Tower', lat: 22.18, lng: 113.54, height_m: 338, type: 'Broadcasting/Tourism', country: 'China', city: 'Macau' },
    { id: 25, name: 'Dragon Tower', lat: 45.75, lng: 126.68, height_m: 336, type: 'Broadcasting/Tourism', country: 'China', city: 'Harbin' },
  ];
  return NextResponse.json({ radio_towers, total: radio_towers.length, timestamp: new Date().toISOString() });
}
